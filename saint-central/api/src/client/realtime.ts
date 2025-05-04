/**
 * SaintCentral SDK - Realtime Module
 * Provides WebSocket-based realtime functionality for the SaintCentral API
 */

import auth from "./auth";
import type { User } from "./auth";

// TYPES

export type RealtimeChannel = string;

export interface RealtimeSubscription {
  id: string;
  topic: string;
  callback: (payload: any) => void;
  type: "database" | "presence" | "broadcast";
  filter?: string;
}

export interface PresenceState {
  [userId: string]: {
    online_at: string;
    presence_ref: string;
    user_id: string;
    user?: User;
  }[];
}

export interface RealtimeConfig {
  endpoint?: string;
  heartbeatIntervalMs?: number;
  reconnectIntervalMs?: number;
  reconnectMaxAttempts?: number;
  debug?: boolean;
}

// CONSTANTS

const DEFAULT_CONFIG: RealtimeConfig = {
  heartbeatIntervalMs: 30000, // 30 seconds
  reconnectIntervalMs: 5000, // 5 seconds
  reconnectMaxAttempts: 10,
  debug: false,
};

// Socket readiness states
const SOCKET_STATES = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

/**
 * RealtimeClient for SaintCentral
 * Handles WebSocket connections for realtime updates
 */
export class RealtimeClient {
  private socket: WebSocket | null = null;
  private subscriptions: Map<string, RealtimeSubscription> = new Map();
  private channels: Set<string> = new Set();
  private endpoint: string;
  private config: Required<RealtimeConfig>;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private closedIntentionally = false;
  private presenceStates: Map<string, PresenceState> = new Map();
  private onConnectCallbacks: Array<() => void> = [];
  private onDisconnectCallbacks: Array<() => void> = [];

  constructor(endpoint?: string, config: RealtimeConfig = {}) {
    this.endpoint = endpoint || "wss://saint-central-api.colinmcherney.workers.dev/realtime";
    this.config = { ...DEFAULT_CONFIG, ...config } as Required<RealtimeConfig>;
  }

  /**
   * Connect to the realtime server
   */
  public connect(): this {
    if (this.socket && this.socket.readyState === SOCKET_STATES.OPEN) {
      this._debug("Socket already connected");
      return this;
    }

    this.closedIntentionally = false;

    try {
      const authToken = auth.getAuthToken();
      const url = new URL(this.endpoint);

      // Add auth token as query parameter if available
      if (authToken) {
        url.searchParams.append("token", authToken);
      }

      this.socket = new WebSocket(url.toString());

      this.socket.onopen = this._onOpen.bind(this);
      this.socket.onclose = this._onClose.bind(this);
      this.socket.onerror = this._onError.bind(this);
      this.socket.onmessage = this._onMessage.bind(this);

      this._debug("Socket connecting...");
    } catch (error) {
      this._debug("Socket connection error:", error);
      this._scheduleReconnect();
    }

    return this;
  }

  /**
   * Disconnect from the realtime server
   */
  public disconnect(): this {
    this.closedIntentionally = true;
    this._clearTimers();

    if (this.socket) {
      if (this.socket.readyState === SOCKET_STATES.OPEN) {
        this.socket.close(1000, "User disconnected");
      }
      this.socket = null;
    }

    return this;
  }

  /**
   * Subscribe to a database table's changes
   */
  public onDatabaseChanges(
    table: string,
    callback: (payload: any) => void,
    options: { event?: "INSERT" | "UPDATE" | "DELETE" | "*"; filter?: string } = {},
  ): { unsubscribe: () => void } {
    const event = options.event || "*";
    const topicName = `realtime:database:${table}:${event}`;

    return this._subscribe({
      topic: topicName,
      callback,
      type: "database",
      filter: options.filter,
    });
  }

  /**
   * Subscribe to presence updates in a channel
   */
  public onPresenceChanges(
    channel: RealtimeChannel,
    callback: (payload: { joins: PresenceState; leaves: PresenceState }) => void,
  ): { unsubscribe: () => void } {
    const topicName = `realtime:presence:${channel}`;

    return this._subscribe({
      topic: topicName,
      callback,
      type: "presence",
    });
  }

  /**
   * Get current presence state for a channel
   */
  public getPresenceState(channel: RealtimeChannel): PresenceState {
    return this.presenceStates.get(`presence:${channel}`) || {};
  }

  /**
   * Track user presence in a channel
   */
  public trackPresence(
    channel: RealtimeChannel,
    presenceData: Record<string, any> = {},
  ): { untrack: () => void } {
    const topicName = `realtime:presence:${channel}`;

    // Register channel if not already
    this._joinChannel(channel);

    // Send track presence message
    this._sendMessage({
      type: "presence",
      event: "track",
      topic: topicName,
      payload: presenceData,
    });

    return {
      untrack: () => {
        this._sendMessage({
          type: "presence",
          event: "untrack",
          topic: topicName,
        });
      },
    };
  }

  /**
   * Subscribe to broadcast messages on a channel
   */
  public onBroadcast(
    channel: RealtimeChannel,
    callback: (payload: any) => void,
  ): { unsubscribe: () => void } {
    const topicName = `realtime:broadcast:${channel}`;

    return this._subscribe({
      topic: topicName,
      callback,
      type: "broadcast",
    });
  }

  /**
   * Broadcast a message to a channel
   */
  public broadcast(channel: RealtimeChannel, event: string, payload: any): boolean {
    if (!this._isConnected()) {
      this._debug("Cannot broadcast, not connected");
      return false;
    }

    this._joinChannel(channel);

    this._sendMessage({
      type: "broadcast",
      topic: `realtime:broadcast:${channel}`,
      event,
      payload,
    });

    return true;
  }

  /**
   * Register a callback to be called when the socket connects
   */
  public onConnect(callback: () => void): this {
    this.onConnectCallbacks.push(callback);

    // If already connected, call immediately
    if (this._isConnected()) {
      callback();
    }

    return this;
  }

  /**
   * Register a callback to be called when the socket disconnects
   */
  public onDisconnect(callback: () => void): this {
    this.onDisconnectCallbacks.push(callback);
    return this;
  }

  /**
   * Remove all listeners and subscriptions
   */
  public removeAllListeners(): this {
    this.subscriptions.clear();
    this.onConnectCallbacks = [];
    this.onDisconnectCallbacks = [];
    return this;
  }

  // PRIVATE METHODS

  /**
   * Handle socket open event
   */
  private _onOpen(): void {
    this._debug("Socket connected");
    this.reconnectAttempts = 0;

    // Start heartbeat
    this._startHeartbeat();

    // Rejoin all channels
    this.channels.forEach((channel) => {
      this._joinChannel(channel);
    });

    // Resubscribe to all topics
    this.subscriptions.forEach((subscription) => {
      this._joinTopic(subscription.topic, subscription.filter);
    });

    // Trigger connect callbacks
    this.onConnectCallbacks.forEach((callback) => callback());
  }

  /**
   * Handle socket close event
   */
  private _onClose(event: CloseEvent): void {
    this._debug("Socket closed:", event);
    this._clearTimers();

    // Only reconnect if not closed intentionally
    if (!this.closedIntentionally) {
      this._scheduleReconnect();
    }

    // Trigger disconnect callbacks
    this.onDisconnectCallbacks.forEach((callback) => callback());
  }

  /**
   * Handle socket error event
   */
  private _onError(event: Event): void {
    this._debug("Socket error:", event);
  }

  /**
   * Handle socket message event
   */
  private _onMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      this._debug("Received message:", message);

      const { type, topic, event: eventName, payload } = message;

      // Handle different message types
      switch (type) {
        case "system":
          this._handleSystemMessage(message);
          break;

        case "database":
          this._handleDatabaseMessage(topic, payload);
          break;

        case "presence":
          this._handlePresenceMessage(topic, eventName, payload);
          break;

        case "broadcast":
          this._handleBroadcastMessage(topic, eventName, payload);
          break;

        default:
          this._debug("Unknown message type:", type);
      }
    } catch (error) {
      this._debug("Error handling message:", error, event.data);
    }
  }

  /**
   * Handle system messages (pong, error, etc.)
   */
  private _handleSystemMessage(message: any): void {
    const { event } = message;

    switch (event) {
      case "pong":
        // Heartbeat response, nothing to do
        break;

      case "error":
        console.error("Realtime error:", message.payload);
        break;

      default:
        this._debug("Unknown system message:", message);
    }
  }

  /**
   * Handle database change messages
   */
  private _handleDatabaseMessage(topic: string, payload: any): void {
    const subscriptions = Array.from(this.subscriptions.values()).filter((s) => s.topic === topic);

    subscriptions.forEach((subscription) => {
      subscription.callback(payload);
    });
  }

  /**
   * Handle presence messages
   */
  private _handlePresenceMessage(topic: string, event: string, payload: any): void {
    // Extract channel from topic (realtime:presence:{channel})
    const channelMatch = topic.match(/^realtime:presence:(.+)$/);
    if (!channelMatch) return;

    const channel = channelMatch[1];
    const presenceKey = `presence:${channel}`;

    // Get or initialize presence state
    let state = this.presenceStates.get(presenceKey) || {};

    if (event === "sync") {
      // Replace entire state
      state = payload;
      this.presenceStates.set(presenceKey, state);

      // Notify subscribers
      this._notifyPresenceSubscribers(topic, {
        joins: payload,
        leaves: {},
      });
    } else if (event === "diff") {
      // Update state with joins/leaves
      const { joins, leaves } = payload;

      // Process joins
      if (joins) {
        Object.entries(joins).forEach(([userId, presences]: [string, any]) => {
          state[userId] = [...(state[userId] || []), ...presences];
        });
      }

      // Process leaves
      if (leaves) {
        Object.entries(leaves).forEach(([userId, leftPresences]: [string, any]) => {
          if (!state[userId]) return;

          // Get references to remove
          const leftRefs = leftPresences.map((p: any) => p.presence_ref);

          // Filter out the leaving presences
          state[userId] = state[userId].filter(
            (presence: any) => !leftRefs.includes(presence.presence_ref),
          );

          // Remove user if no presences left
          if (state[userId].length === 0) {
            delete state[userId];
          }
        });
      }

      // Save updated state
      this.presenceStates.set(presenceKey, state);

      // Notify subscribers
      this._notifyPresenceSubscribers(topic, { joins: joins || {}, leaves: leaves || {} });
    }
  }

  /**
   * Notify presence subscribers about changes
   */
  private _notifyPresenceSubscribers(topic: string, payload: any): void {
    const subscriptions = Array.from(this.subscriptions.values()).filter(
      (s) => s.topic === topic && s.type === "presence",
    );

    subscriptions.forEach((subscription) => {
      subscription.callback(payload);
    });
  }

  /**
   * Handle broadcast messages
   */
  private _handleBroadcastMessage(topic: string, event: string, payload: any): void {
    const subscriptions = Array.from(this.subscriptions.values()).filter((s) => s.topic === topic);

    subscriptions.forEach((subscription) => {
      subscription.callback({
        event,
        payload,
      });
    });
  }

  /**
   * Subscribe to a topic
   */
  private _subscribe(options: Omit<RealtimeSubscription, "id">): { unsubscribe: () => void } {
    const id = crypto.randomUUID();
    const subscription: RealtimeSubscription = {
      id,
      ...options,
    };

    this.subscriptions.set(id, subscription);

    // Join the channel part (first two segments of the topic)
    const topicParts = subscription.topic.split(":");
    if (topicParts.length >= 3) {
      const channel = topicParts[2]; // channel name is the third segment
      this._joinChannel(channel);
    }

    // Join topic if connected
    if (this._isConnected()) {
      this._joinTopic(subscription.topic, subscription.filter);
    }

    return {
      unsubscribe: () => {
        this._unsubscribe(id);
      },
    };
  }

  /**
   * Unsubscribe from a topic
   */
  private _unsubscribe(id: string): void {
    const subscription = this.subscriptions.get(id);
    if (!subscription) return;

    // Leave topic if connected
    if (this._isConnected()) {
      this._leaveTopic(subscription.topic);
    }

    this.subscriptions.delete(id);

    // If no more subscriptions to this topic's channel, leave the channel
    const subscriptionChannel = subscription.topic.split(":")[2];
    const hasMoreSubscriptions = Array.from(this.subscriptions.values()).some((s) =>
      s.topic.includes(`:${subscriptionChannel}:`),
    );

    if (!hasMoreSubscriptions) {
      this._leaveChannel(subscriptionChannel);
    }
  }

  /**
   * Join a channel
   */
  private _joinChannel(channel: string): void {
    this.channels.add(channel);

    if (this._isConnected()) {
      this._sendMessage({
        type: "system",
        event: "join",
        topic: `realtime:${channel}`,
        payload: {},
      });
    }
  }

  /**
   * Leave a channel
   */
  private _leaveChannel(channel: string): void {
    if (this._isConnected()) {
      this._sendMessage({
        type: "system",
        event: "leave",
        topic: `realtime:${channel}`,
        payload: {},
      });
    }

    this.channels.delete(channel);
  }

  /**
   * Join a specific topic
   */
  private _joinTopic(topic: string, filter?: string): void {
    this._sendMessage({
      type: "system",
      event: "subscribe",
      topic,
      payload: { filter },
    });
  }

  /**
   * Leave a specific topic
   */
  private _leaveTopic(topic: string): void {
    this._sendMessage({
      type: "system",
      event: "unsubscribe",
      topic,
      payload: {},
    });
  }

  /**
   * Send a message to the server
   */
  private _sendMessage(message: any): void {
    if (!this._isConnected()) {
      this._debug("Cannot send message, not connected");
      return;
    }

    const messageStr = JSON.stringify(message);
    this.socket?.send(messageStr);
    this._debug("Sent message:", message);
  }

  /**
   * Start heartbeat interval
   */
  private _startHeartbeat(): void {
    this._clearHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this._isConnected()) {
        this._sendMessage({
          type: "system",
          event: "ping",
          topic: "realtime:system",
          payload: {},
        });
      }
    }, this.config.heartbeatIntervalMs);
  }

  /**
   * Clear heartbeat interval
   */
  private _clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private _scheduleReconnect(): void {
    this._clearReconnectTimer();

    if (this.reconnectAttempts >= this.config.reconnectMaxAttempts) {
      this._debug("Max reconnection attempts reached");
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this._debug(
        `Reconnecting (attempt ${this.reconnectAttempts}/${this.config.reconnectMaxAttempts})...`,
      );
      this.connect();
    }, this.config.reconnectIntervalMs);
  }

  /**
   * Clear reconnect timer
   */
  private _clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Clear all timers
   */
  private _clearTimers(): void {
    this._clearHeartbeat();
    this._clearReconnectTimer();
  }

  /**
   * Check if the socket is connected
   */
  private _isConnected(): boolean {
    return !!this.socket && this.socket.readyState === SOCKET_STATES.OPEN;
  }

  /**
   * Debug log if debug is enabled
   */
  private _debug(...args: any[]): void {
    if (this.config.debug) {
      console.log("[SaintCentral Realtime]", ...args);
    }
  }
}

// Create default instance
const realtime = new RealtimeClient();

export default realtime;
