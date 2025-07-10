// utils/realtimeClient.ts
import { useAuth } from "../contexts/AuthContext";

// Realtime Worker API configuration
const REALTIME_WORKER_URL = "https://realtime-worker.colinmcherney.workers.dev";

export interface RealtimeMessage {
  id: string;
  ministry_id: number;
  user_id: string;
  message_text: string;
  sent_at: string;
  attachment_url?: string;
  sender_name?: string;
  sender_avatar_url?: string;
  is_current_user?: boolean;
}

export interface RealtimeTokenResponse {
  url: string; // WebSocket URL with token
  token: string;
  channels: string[];
  expires_in: number;
  expires_at: string;
  rate_limits?: {
    per_user: string;
    token_generation: string;
  };
}

export interface ChannelConfig {
  name: string;
  type: "public" | "private" | "presence" | "broadcast";
  requiredRole?: string;
  maxConnections?: number;
  messageRateLimit?: number;
  allowedEvents?: string[];
}

export class RealtimeClient {
  private getAccessToken: () => Promise<string | null>;
  private supabase: any = null;
  private subscriptions: Map<string, any> = new Map();
  private token: string | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private onMessageCallback: ((message: RealtimeMessage) => void) | null = null;
  private onPresenceCallback: ((presence: any) => void) | null = null;
  private channels: Set<string> = new Set();

  constructor(getAccessToken: () => Promise<string | null>) {
    this.getAccessToken = getAccessToken;
  }

  async getRealtimeToken(channels: string[]): Promise<RealtimeTokenResponse> {
    const accessToken = await this.getAccessToken();
    
    if (!accessToken) {
      throw new Error("Auth session missing! Please log in.");
    }

    try {
      console.log(`Requesting realtime token for channels: ${channels.join(', ')}`);
      console.log(`Using realtime worker URL: ${REALTIME_WORKER_URL}`);
      
      // First test if the worker is deployed by checking health
      try {
        const healthResponse = await fetch(`${REALTIME_WORKER_URL}/realtime/health`);
        console.log(`Health check status: ${healthResponse.status}`);
        
        if (!healthResponse.ok) {
          console.error(`Health check failed: ${healthResponse.status}`);
          const healthText = await healthResponse.text();
          console.error(`Health response: ${healthText}`);
        }
      } catch (healthError) {
        console.error(`Health check error: ${healthError}`);
        throw new Error(`Realtime worker not accessible at ${REALTIME_WORKER_URL}`);
      }
      
      const response = await fetch(`${REALTIME_WORKER_URL}/realtime/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          channels,
          permissions: ["read", "write"]
        }),
      });

      console.log(`Realtime token response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Realtime token request failed: ${response.status} ${response.statusText}`);
        console.error(`Error response body: ${errorText}`);
        console.error(`Request URL: ${REALTIME_WORKER_URL}/realtime/token`);
        console.error(`Request headers: Authorization: Bearer ${accessToken.substring(0, 20)}...`);
        
        // Try to parse error response
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.request_id) {
            console.error(`Request ID: ${errorData.request_id}`);
          }
        } catch (parseError) {
          console.error(`Could not parse error response as JSON`);
        }
        
        throw new Error(`Token generation failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data: RealtimeTokenResponse = await response.json();
      console.log(`Realtime token received, valid channels: ${data.channels?.join(', ') || 'none'}`);

      return data;
    } catch (error) {
      console.error('Error in getRealtimeToken:', error);
      throw new Error(`Token generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getChannelInfo(channelName: string): Promise<ChannelConfig> {
    const accessToken = await this.getAccessToken();
    
    if (!accessToken) {
      throw new Error("Auth session missing! Please log in.");
    }

    const response = await fetch(`${REALTIME_WORKER_URL}/realtime/channel`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Channel-Name": channelName,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  async connect(channels: string[]): Promise<void> {
    try {
      console.log('Setting up realtime polling for channels:', channels);
      
      // Store valid channels
      this.channels.clear();
      channels.forEach(channel => this.channels.add(channel));
      
      // For now, use polling instead of WebSocket realtime
      // This avoids the RLS/permission issues with Supabase realtime
      this.setupPolling(channels);
      this.isConnected = true;
      
      console.log(`Connected to realtime channels using polling: ${channels.join(', ')}`);

    } catch (error) {
      console.error("Error connecting to realtime:", error);
      throw error;
    }
  }

  private setupPolling(channels: string[]): void {
    // Temporarily disable polling to reduce log spam while debugging
    console.log('Polling temporarily disabled for debugging');
    return;
    
    // Poll for new messages every 2 seconds
    const pollInterval = setInterval(async () => {
      if (!this.isConnected) {
        clearInterval(pollInterval);
        return;
      }

      try {
        const accessToken = await this.getAccessToken();
        if (!accessToken) return;

        // Import CRUD client
        const { createCRUDClient } = await import('./crudClient');
        const crudClient = await createCRUDClient(() => Promise.resolve(accessToken));

        for (const channelName of channels) {
          const ministryId = parseInt(channelName.replace('ministry_chat_', ''));
          
          // Get latest messages (just the most recent one to check for new messages)
          const latestMessages = await crudClient.select("ministry_messages", {
            where: { ministry_id: ministryId },
            orderBy: "sent_at",
            orderDirection: "desc",
            limit: 1
          });

          if (latestMessages && latestMessages.length > 0) {
            const latestMessage = latestMessages[0];
            
            // Check if this is a new message we haven't seen before
            const lastKnownMessageId = this.lastKnownMessageIds?.get(channelName);
            
            if (!this.lastKnownMessageIds) {
              this.lastKnownMessageIds = new Map();
            }

            if (lastKnownMessageId !== latestMessage.id) {
              // This is a new message
              this.lastKnownMessageIds.set(channelName, latestMessage.id);
              
              // Only trigger callback if this isn't the first time we're seeing any message
              // (to avoid triggering on initial load)
              if (lastKnownMessageId !== undefined && this.onMessageCallback) {
                console.log('New message detected via polling:', latestMessage);
                this.onMessageCallback(latestMessage as RealtimeMessage);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error in polling:', error);
      }
    }, 2000); // Poll every 2 seconds

    // Store the interval so we can clean it up
    this.pollingInterval = pollInterval;
  }

  private lastKnownMessageIds?: Map<string, string>;
  private pollingInterval?: NodeJS.Timeout;

  onMessage(callback: (message: RealtimeMessage) => void): void {
    this.onMessageCallback = callback;
  }

  onPresence(callback: (presence: any) => void): void {
    this.onPresenceCallback = callback;
  }

  broadcast(channel: string, event: string, payload: any): void {
    const subscription = this.subscriptions.get(channel);
    if (subscription && this.isConnected) {
      subscription.send({
        type: 'broadcast',
        event: event,
        payload: payload
      });
    }
  }

  updatePresence(channel: string, presence: any): void {
    const subscription = this.subscriptions.get(channel);
    if (subscription && this.isConnected) {
      subscription.track(presence);
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }

    // Unsubscribe from all channels
    this.subscriptions.forEach((subscription, channel) => {
      console.log(`Unsubscribing from channel: ${channel}`);
      subscription.unsubscribe();
    });
    
    this.subscriptions.clear();
    this.isConnected = false;
    this.token = null;
    this.channels.clear();
    this.reconnectAttempts = 0;
    this.supabase = null;
    this.lastKnownMessageIds?.clear();
  }
}

// React hook for using the realtime client
export function useRealtime() {
  const { getAccessToken } = useAuth();
  
  const client = new RealtimeClient(getAccessToken);

  return {
    client,
    connect: client.connect.bind(client),
    onMessage: client.onMessage.bind(client),
    onPresence: client.onPresence.bind(client),
    broadcast: client.broadcast.bind(client),
    updatePresence: client.updatePresence.bind(client),
    disconnect: client.disconnect.bind(client),
    getChannelInfo: client.getChannelInfo.bind(client),
  };
}