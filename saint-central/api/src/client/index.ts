/**
 * SaintCentral SDK
 * A complete client SDK for interacting with the SaintCentral API
 */

import { createClient, SaintCentral } from "./sdk";
import auth, { Auth, User, Session } from "./auth";
import realtime, { RealtimeClient, RealtimeChannel, PresenceState } from "./realtime";
import storage, { StorageClient, BucketClient } from "./storage";
import { SecureTokenStorage, SecureLogger } from "./sdkSecurity";

// Create a unified client instance for easy use
const saintcentral = {
  auth,
  realtime,
  storage,
  createClient,
  // Create a client with the current auth token
  client: auth.createClient(),
};

// Re-export types
export type { User, Session, RealtimeChannel, PresenceState, SaintCentral };

// Re-export classes
export { Auth, RealtimeClient, StorageClient, BucketClient, SecureTokenStorage, SecureLogger };

// Export the default instance
export default saintcentral;
