/**
 * SaintCentral API - Realtime Server
 * Handles WebSocket connections for realtime functionality
 */

import { Env } from "../index";
import { authMiddleware } from "./middleware/auth";
import { createClient } from "@supabase/supabase-js";
import { createResponse } from "./security";

// Types
interface WebSocketClient {
  id: string;
  socket: WebSocket;
  userId?: string;
  subscriptions: Set<string>;
  channels: Set<string>;
  lastHeartbeat: number;
  metadata: Record<string, any>;
}

interface PresenceState {
  [userId: string]: {
    online_at: string;
    presence_ref: string;
    user_id: string;
    metadata: Record<string, any>;
  }[];
}

// Constants
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const CLIENT_TIMEOUT = 60000; // 60 seconds with no heartbeat = disconnect

// Global state
const clients = new Map<string, WebSocketClient>();
const channelPresence = new Map<string, PresenceState>();
const databaseSubscriptions = new Map<string, Set<string>>();

/**
 * Handle WebSocket connections and manage the realtime server
 */
export async function handleRealtimeConnection(request: Request, env: Env): Promise<Response> {
  // Only allow WebSocket connections
  if (request.headers.get("Upgrade") !== "websocket") {
    return createResponse({ error: "Expected websocket connection" }, 400);
  }

  // Create WebSocket pair - this is Cloudflare Workers specific
  // @ts-ignore - Cloudflare Workers specific API
  const pair = new WebSocketPair();
  const client = pair[0];
  const server = pair[1];

  // Parse token from query string if provided
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  // Authenticate the connection if token is provided
  let userId: string | undefined;

  if (token) {
    try {
      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
      const { data, error } = await supabase.auth.getUser(token);

      if (!error && data.user) {
        userId = data.user.id;
      }
    } catch (error) {
      console.error("Authentication error:", error);
      // Continue without authentication
    }
  }

  // Set up WebSocket handlers
  const clientId = crypto.randomUUID();

  // Add client to the connected clients map
  clients.set(clientId, {
    id: clientId,
    socket: server,
    userId: userId,
    subscriptions: new Set(),
    channels: new Set(),
    lastHeartbeat: Date.now(),
    metadata: {},
  });

  // Handle new connection
  server.accept();

  // Set up message handler
  server.addEventListener("message", async (event: MessageEvent) => {
    try {
      const client = clients.get(clientId);
      if (!client) return;

      // Update last heartbeat time
      client.lastHeartbeat = Date.now();

      // Parse the message
      const message = JSON.parse(event.data);
      const { type, event: eventName, topic, payload } = message;

      // Handle different message types
      switch (type) {
        case "system":
          await handleSystemMessage(client, eventName, topic, payload, env);
          break;

        case "presence":
          await handlePresenceMessage(client, eventName, topic, payload);
          break;

        case "broadcast":
          await handleBroadcastMessage(client, topic, eventName, payload);
          break;

        default:
          sendErrorToClient(client, "Unknown message type");
      }
    } catch (error) {
      console.error("Error handling message:", error);
      const client = clients.get(clientId);
      if (client) {
        sendErrorToClient(client, "Error processing message");
      }
    }
  });

  // Handle close event
  server.addEventListener("close", () => {
    handleClientDisconnect(clientId);
  });

  // Handle error event
  server.addEventListener("error", (error: Event) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
    handleClientDisconnect(clientId);
  });

  // Send welcome message
  const welcomeMessage = {
    type: "system",
    event: "welcome",
    topic: "realtime:system",
    payload: {
      client_id: clientId,
      server_time: new Date().toISOString(),
      authenticated: !!userId,
    },
  };

  server.send(JSON.stringify(welcomeMessage));

  // Return the client socket for the caller to use
  // Using any type to work around the ResponseInit limitation
  return new Response(null, {
    status: 101,
    // @ts-ignore - Cloudflare Workers specific property
    webSocket: client,
  } as ResponseInit);
}

/**
 * Handle system messages (ping, join, subscribe, etc.)
 */
async function handleSystemMessage(
  client: WebSocketClient,
  event: string,
  topic: string,
  payload: any,
  env: Env,
): Promise<void> {
  switch (event) {
    case "ping":
      // Respond with pong
      sendToClient(client, {
        type: "system",
        event: "pong",
        topic: "realtime:system",
        payload: { timestamp: Date.now() },
      });
      break;

    case "join":
      // Join a channel
      handleChannelJoin(client, topic);
      break;

    case "leave":
      // Leave a channel
      handleChannelLeave(client, topic);
      break;

    case "subscribe":
      // Subscribe to a topic
      handleSubscribe(client, topic, payload?.filter, env);
      break;

    case "unsubscribe":
      // Unsubscribe from a topic
      handleUnsubscribe(client, topic);
      break;

    default:
      sendErrorToClient(client, `Unknown system event: ${event}`);
  }
}

/**
 * Handle presence messages
 */
async function handlePresenceMessage(
  client: WebSocketClient,
  event: string,
  topic: string,
  payload: any,
): Promise<void> {
  // Require authentication for presence features
  if (!client.userId) {
    return sendErrorToClient(client, "Authentication required for presence features");
  }

  // Extract channel from topic
  const channelMatch = topic.match(/^realtime:presence:(.+)$/);
  if (!channelMatch) {
    return sendErrorToClient(client, "Invalid presence topic format");
  }

  const channel = channelMatch[1];

  switch (event) {
    case "track":
      // Track user presence in a channel
      trackPresence(client, channel, payload);
      break;

    case "untrack":
      // Untrack user presence
      untrackPresence(client, channel);
      break;

    default:
      sendErrorToClient(client, `Unknown presence event: ${event}`);
  }
}

/**
 * Handle broadcast messages
 */
async function handleBroadcastMessage(
  client: WebSocketClient,
  topic: string,
  event: string,
  payload: any,
): Promise<void> {
  // Extract channel from topic
  const channelMatch = topic.match(/^realtime:broadcast:(.+)$/);
  if (!channelMatch) {
    return sendErrorToClient(client, "Invalid broadcast topic format");
  }

  const channel = channelMatch[1];

  // Broadcast message to all clients in the channel
  broadcastToChannel(
    channel,
    {
      type: "broadcast",
      topic,
      event,
      payload,
    },
    client.id,
  ); // Exclude sender
}

/**
 * Handle a client joining a channel
 */
function handleChannelJoin(client: WebSocketClient, topic: string): void {
  // Extract channel from topic
  const channelMatch = topic.match(/^realtime:(.+)$/);
  if (!channelMatch) {
    return sendErrorToClient(client, "Invalid channel topic format");
  }

  const channel = channelMatch[1];
  client.channels.add(channel);

  // Send confirmation
  sendToClient(client, {
    type: "system",
    event: "join",
    topic,
    payload: { channel },
  });
}

/**
 * Handle a client leaving a channel
 */
function handleChannelLeave(client: WebSocketClient, topic: string): void {
  // Extract channel from topic
  const channelMatch = topic.match(/^realtime:(.+)$/);
  if (!channelMatch) {
    return sendErrorToClient(client, "Invalid channel topic format");
  }

  const channel = channelMatch[1];
  client.channels.delete(channel);

  // Remove all subscriptions related to this channel
  for (const subscription of [...client.subscriptions]) {
    if (subscription.includes(`:${channel}:`)) {
      client.subscriptions.delete(subscription);
    }
  }

  // Cleanup presence state if needed
  untrackPresence(client, channel);

  // Send confirmation
  sendToClient(client, {
    type: "system",
    event: "leave",
    topic,
    payload: { channel },
  });
}

/**
 * Handle a client subscribing to a topic
 */
function handleSubscribe(
  client: WebSocketClient,
  topic: string,
  filter: string | undefined,
  env: Env,
): void {
  // Validate topic format
  if (!topic.startsWith("realtime:")) {
    return sendErrorToClient(client, "Invalid topic format");
  }

  // Add to client subscriptions
  client.subscriptions.add(topic);

  // For database changes, register with the database listener
  if (topic.startsWith("realtime:database:")) {
    // Extract table and event
    const match = topic.match(/^realtime:database:([^:]+):([^:]+)$/);
    if (match) {
      const [_, table, event] = match;
      registerDatabaseListener(table, event, topic, filter, env);
    }
  }

  // For presence topics, send current state
  if (topic.startsWith("realtime:presence:")) {
    const channelMatch = topic.match(/^realtime:presence:(.+)$/);
    if (channelMatch) {
      const channel = channelMatch[1];
      const state = channelPresence.get(channel) || {};

      // Send current state
      sendToClient(client, {
        type: "presence",
        event: "sync",
        topic,
        payload: state,
      });
    }
  }

  // Send confirmation
  sendToClient(client, {
    type: "system",
    event: "subscribe",
    topic,
    payload: { topic, filter },
  });
}

/**
 * Handle a client unsubscribing from a topic
 */
function handleUnsubscribe(client: WebSocketClient, topic: string): void {
  client.subscriptions.delete(topic);

  // For database changes, cleanup if no more subscribers
  if (topic.startsWith("realtime:database:")) {
    cleanupDatabaseListener(topic);
  }

  // Send confirmation
  sendToClient(client, {
    type: "system",
    event: "unsubscribe",
    topic,
    payload: { topic },
  });
}

/**
 * Register a listener for database changes
 */
function registerDatabaseListener(
  table: string,
  event: string,
  topic: string,
  filter: string | undefined,
  env: Env,
): void {
  // Add to database subscriptions
  const subscriptions = databaseSubscriptions.get(topic) || new Set();
  subscriptions.add(topic);
  databaseSubscriptions.set(topic, subscriptions);

  // In a real system, we would set up an actual database change notification here
  // For Supabase or PostgreSQL, this could use PostgreSQL LISTEN/NOTIFY, logical replication,
  // change data capture, or a webhook system

  // For this example, we'll leave this as a placeholder for the actual integration
  console.log(`Registered database listener for ${table}:${event} (Topic: ${topic})`);
}

/**
 * Clean up a database listener if no more subscribers
 */
function cleanupDatabaseListener(topic: string): void {
  // Check if there are any clients still subscribed
  let hasSubscribers = false;
  for (const client of clients.values()) {
    if (client.subscriptions.has(topic)) {
      hasSubscribers = true;
      break;
    }
  }

  // If no more subscribers, remove from database subscriptions
  if (!hasSubscribers) {
    databaseSubscriptions.delete(topic);
    console.log(`Cleaned up database listener for topic: ${topic}`);
  }
}

/**
 * Track user presence in a channel
 */
function trackPresence(client: WebSocketClient, channel: string, metadata: any): void {
  if (!client.userId) return;

  // Get or create presence state for this channel
  const state = channelPresence.get(channel) || {};
  channelPresence.set(channel, state);

  // Create unique presence reference
  const presenceRef = `${client.id}:${Date.now()}`;

  // Create presence object
  const presence = {
    online_at: new Date().toISOString(),
    presence_ref: presenceRef,
    user_id: client.userId,
    metadata: metadata || {},
  };

  // Add to state
  if (!state[client.userId]) {
    state[client.userId] = [];
  }
  state[client.userId].push(presence);

  // Build presence diff for broadcast
  const diff = {
    joins: {
      [client.userId]: [presence],
    },
    leaves: {},
  };

  // Broadcast presence change
  broadcastToChannel(channel, {
    type: "presence",
    event: "diff",
    topic: `realtime:presence:${channel}`,
    payload: diff,
  });
}

/**
 * Remove user presence tracking in a channel
 */
function untrackPresence(client: WebSocketClient, channel: string): void {
  if (!client.userId) return;

  const state = channelPresence.get(channel);
  if (!state || !state[client.userId]) return;

  // Get the presences for this user
  const presences = state[client.userId];

  // Build diff for broadcast
  const diff = {
    joins: {},
    leaves: {
      [client.userId]: presences,
    },
  };

  // Remove from state
  delete state[client.userId];

  // If state is empty, delete the channel state
  if (Object.keys(state).length === 0) {
    channelPresence.delete(channel);
  } else {
    channelPresence.set(channel, state);
  }

  // Broadcast presence change
  broadcastToChannel(channel, {
    type: "presence",
    event: "diff",
    topic: `realtime:presence:${channel}`,
    payload: diff,
  });
}

/**
 * Broadcast a message to all clients in a channel
 */
function broadcastToChannel(channel: string, message: any, excludeClientId?: string): void {
  for (const client of clients.values()) {
    // Skip excluded client
    if (excludeClientId && client.id === excludeClientId) continue;

    // Check if client is in the channel
    if (client.channels.has(channel) || channel === "*") {
      const topicParts = message.topic.split(":");
      const messageChannel = topicParts[2]; // third segment contains channel name

      // Check if client is subscribed to the specific topic
      if (client.subscriptions.has(message.topic) || messageChannel === "*") {
        sendToClient(client, message);
      }
    }
  }
}

/**
 * Send a message to a client
 */
function sendToClient(client: WebSocketClient, message: any): void {
  try {
    client.socket.send(JSON.stringify(message));
  } catch (error) {
    console.error(`Error sending message to client ${client.id}:`, error);
    // Attempt to handle socket error by cleaning up
    handleClientDisconnect(client.id);
  }
}

/**
 * Send an error message to a client
 */
function sendErrorToClient(client: WebSocketClient, message: string): void {
  sendToClient(client, {
    type: "system",
    event: "error",
    topic: "realtime:system",
    payload: { message },
  });
}

/**
 * Handle client disconnect
 */
function handleClientDisconnect(clientId: string): void {
  const client = clients.get(clientId);
  if (!client) return;

  // Cleanup presence states
  for (const channel of client.channels) {
    untrackPresence(client, channel);
  }

  // Cleanup subscriptions
  for (const topic of client.subscriptions) {
    if (topic.startsWith("realtime:database:")) {
      cleanupDatabaseListener(topic);
    }
  }

  // Remove from clients map
  clients.delete(clientId);
  console.log(`Client ${clientId} disconnected`);
}

/**
 * Start the heartbeat check interval
 */
function startHeartbeatCheck(): void {
  setInterval(() => {
    const now = Date.now();

    for (const [clientId, client] of clients.entries()) {
      // Check if client has timed out
      if (now - client.lastHeartbeat > CLIENT_TIMEOUT) {
        console.log(`Client ${clientId} timed out`);
        handleClientDisconnect(clientId);
        continue;
      }
    }
  }, HEARTBEAT_INTERVAL);
}

// Start heartbeat check when module is loaded
startHeartbeatCheck();

/**
 * Broadcast a database change to all subscribers
 * This would be called by the database change listener in a real system
 */
export function broadcastDatabaseChange(
  table: string,
  event: "INSERT" | "UPDATE" | "DELETE",
  record: any,
  oldRecord?: any,
): void {
  // Create topics for both specific event and wildcard event
  const specificTopic = `realtime:database:${table}:${event}`;
  const wildcardTopic = `realtime:database:${table}:*`;

  // Broadcast to specific event subscribers
  const specificSubs = databaseSubscriptions.get(specificTopic);
  if (specificSubs) {
    broadcastToTopic(specificTopic, {
      table,
      event,
      record,
      old_record: oldRecord,
    });
  }

  // Broadcast to wildcard subscribers
  const wildcardSubs = databaseSubscriptions.get(wildcardTopic);
  if (wildcardSubs) {
    broadcastToTopic(wildcardTopic, {
      table,
      event,
      record,
      old_record: oldRecord,
    });
  }
}

/**
 * Broadcast a message to all subscribers of a topic
 */
function broadcastToTopic(topic: string, payload: any): void {
  for (const client of clients.values()) {
    if (client.subscriptions.has(topic)) {
      sendToClient(client, {
        type: "database",
        topic,
        payload,
      });
    }
  }
}

export function getConnectedClientsCount(): number {
  return clients.size;
}

export function getSubscribersCount(topic: string): number {
  let count = 0;
  for (const client of clients.values()) {
    if (client.subscriptions.has(topic)) {
      count++;
    }
  }
  return count;
}

export function getChannelMembers(channel: string): string[] {
  const members: string[] = [];
  for (const client of clients.values()) {
    if (client.channels.has(channel) && client.userId) {
      members.push(client.userId);
    }
  }
  return members;
}

export function getPresenceState(channel: string): PresenceState {
  return channelPresence.get(channel) || {};
}
