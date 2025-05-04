/**
 * SaintCentral SDK - Authentication Module
 * Provides authentication functions for the SaintCentral API
 */

import { createClient } from "./sdk";
import { SecureTokenStorage } from "./sdkSecurity";
import { hashString, SECURITY_CONSTANTS } from "../shared/securityUtils";

// Token storage interface
interface StoredToken {
  value: string;
  expiresAt: number;
  refreshToken?: string;
}

// Auth response interface
interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: Error | null;
}

// User profile interface
interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

// Session interface
interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}

// Error interface
interface Error {
  message: string;
  status?: number;
}

// Auth configuration interface
interface AuthConfig {
  storagePrefix?: string;
  persistSession?: boolean;
  autoRefreshToken?: boolean;
  tokenExpiryBuffer?: number; // seconds before token expiry to trigger refresh
  encryptTokens?: boolean;
  encryptionKey?: string;
}

/**
 * Authentication client for SaintCentral API
 */
export class Auth {
  private storage: SecureTokenStorage;
  private baseUrl: string;
  private autoRefreshToken: boolean;
  private tokenExpiryBuffer: number;
  private refreshTimerId: ReturnType<typeof setTimeout> | null = null;
  private csrfToken: string | null = null;

  constructor(baseUrl = "", config: AuthConfig = {}) {
    this.baseUrl = baseUrl || "https://saint-central-api.colinmcherney.workers.dev";
    this.autoRefreshToken = config.autoRefreshToken !== false;
    this.tokenExpiryBuffer = (config.tokenExpiryBuffer || 60) * 1000; // convert to ms

    // Initialize secure token storage
    this.storage = new SecureTokenStorage({
      prefix: config.storagePrefix || "saintcentral",
      useLocalStorage: config.persistSession !== false,
      encryptionKey: config.encryptionKey,
    });

    // Setup auto token refresh if enabled
    if (this.autoRefreshToken) {
      this._setupTokenRefresh();
    }
  }

  /**
   * Sign up a new user
   */
  async signUp(credentials: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    [key: string]: any;
  }): Promise<AuthResponse> {
    try {
      const { email, password, ...userData } = credentials;

      const response = await fetch(`${this.baseUrl}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          userData,
        }),
        credentials: "include", // For cookies
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          user: null,
          session: null,
          error: {
            message: data.error || "Failed to sign up",
            status: response.status,
          },
        };
      }

      // Store session if provided
      if (data.session) {
        this._saveSession(data.session);

        // Set up token refresh
        if (this.autoRefreshToken) {
          this._setupTokenRefresh();
        }

        // Store CSRF token if provided
        const csrfToken = response.headers.get(SECURITY_CONSTANTS.CSRF.headerName);
        if (csrfToken) {
          this.csrfToken = csrfToken;
        }
      }

      return {
        user: data.user || null,
        session: data.session || null,
        error: null,
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: {
          message: error instanceof Error ? error.message : "An unexpected error occurred",
        },
      };
    }
  }

  /**
   * Sign in an existing user
   */
  async signIn(credentials: { email: string; password: string }): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
        credentials: "include", // For cookies
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          user: null,
          session: null,
          error: {
            message: data.error || "Failed to sign in",
            status: response.status,
          },
        };
      }

      // Store session
      if (data.session) {
        this._saveSession(data.session);

        // Set up token refresh
        if (this.autoRefreshToken) {
          this._setupTokenRefresh();
        }

        // Store CSRF token if provided
        const csrfToken = response.headers.get(SECURITY_CONSTANTS.CSRF.headerName);
        if (csrfToken) {
          this.csrfToken = csrfToken;
        }
      }

      return {
        user: data.user || null,
        session: data.session || null,
        error: null,
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: {
          message: error instanceof Error ? error.message : "An unexpected error occurred",
        },
      };
    }
  }

  /**
   * Sign in with a third-party provider (OAuth)
   */
  async signInWithProvider(provider: string): Promise<{ url: string; error: Error | null }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/authorize/${provider}`, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          url: "",
          error: {
            message: data.error || `Failed to initialize ${provider} sign in`,
            status: response.status,
          },
        };
      }

      return {
        url: data.url,
        error: null,
      };
    } catch (error) {
      return {
        url: "",
        error: {
          message: error instanceof Error ? error.message : "An unexpected error occurred",
        },
      };
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(queryParams: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/callback?${queryParams}`, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          user: null,
          session: null,
          error: {
            message: data.error || "OAuth callback failed",
            status: response.status,
          },
        };
      }

      // Store session
      if (data.session) {
        this._saveSession(data.session);

        // Set up token refresh
        if (this.autoRefreshToken) {
          this._setupTokenRefresh();
        }

        // Store CSRF token if provided
        const csrfToken = response.headers.get(SECURITY_CONSTANTS.CSRF.headerName);
        if (csrfToken) {
          this.csrfToken = csrfToken;
        }
      }

      return {
        user: data.user || null,
        session: data.session || null,
        error: null,
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: {
          message: error instanceof Error ? error.message : "An unexpected error occurred",
        },
      };
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<{ error: Error | null }> {
    try {
      const session = this.session();

      if (session) {
        // Call server to invalidate the token
        const response = await fetch(`${this.baseUrl}/auth/signout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            ...(this.csrfToken ? { [SECURITY_CONSTANTS.CSRF.headerName]: this.csrfToken } : {}),
          },
          credentials: "include",
        });

        if (!response.ok) {
          const data = await response.json();
          return {
            error: {
              message: data.error || "Failed to sign out",
              status: response.status,
            },
          };
        }
      }

      // Clear local session regardless of server response
      this._clearSession();

      // Clear refresh timer
      this._clearRefreshTimer();

      return { error: null };
    } catch (error) {
      // Still clear local session on error
      this._clearSession();
      this._clearRefreshTimer();

      return {
        error: {
          message: error instanceof Error ? error.message : "An unexpected error occurred",
        },
      };
    }
  }

  /**
   * Get the current session
   */
  session(): Session | null {
    const storedToken = this.storage.getToken();

    if (!storedToken) return null;

    // Check if token is expired
    if (storedToken.expiresAt < Date.now()) {
      this._clearSession();
      return null;
    }

    // Create session object
    return {
      access_token: storedToken.value,
      refresh_token: storedToken.refreshToken || "",
      expires_at: storedToken.expiresAt,
      user: {} as User, // This will be populated when needed through getUser
    };
  }

  /**
   * Get the user details for the current session
   */
  async getUser(): Promise<{ user: User | null; error: Error | null }> {
    const session = this.session();

    if (!session) {
      return {
        user: null,
        error: {
          message: "No active session",
        },
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/user`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          user: null,
          error: {
            message: data.error || "Failed to get user",
            status: response.status,
          },
        };
      }

      return {
        user: data.user || null,
        error: null,
      };
    } catch (error) {
      return {
        user: null,
        error: {
          message: error instanceof Error ? error.message : "An unexpected error occurred",
        },
      };
    }
  }

  /**
   * Refresh the access token
   */
  async refreshToken(): Promise<{ session: Session | null; error: Error | null }> {
    const currentSession = this.session();

    if (!currentSession || !currentSession.refresh_token) {
      return {
        session: null,
        error: {
          message: "No refresh token available",
        },
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh_token: currentSession.refresh_token,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        // Clear session on refresh failure
        this._clearSession();

        return {
          session: null,
          error: {
            message: data.error || "Failed to refresh token",
            status: response.status,
          },
        };
      }

      // Store the new session
      if (data.session) {
        this._saveSession(data.session);

        // Reset refresh timer
        this._setupTokenRefresh();

        // Store CSRF token if provided
        const csrfToken = response.headers.get(SECURITY_CONSTANTS.CSRF.headerName);
        if (csrfToken) {
          this.csrfToken = csrfToken;
        }
      }

      return {
        session: data.session || null,
        error: null,
      };
    } catch (error) {
      return {
        session: null,
        error: {
          message: error instanceof Error ? error.message : "An unexpected error occurred",
        },
      };
    }
  }

  /**
   * Request a password reset
   */
  async resetPassword(email: string): Promise<{ error: Error | null }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: {
            message: data.error || "Failed to request password reset",
            status: response.status,
          },
        };
      }

      return { error: null };
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : "An unexpected error occurred",
        },
      };
    }
  }

  /**
   * Update user password using a recovery token
   */
  async updatePassword(newPassword: string, token: string): Promise<{ error: Error | null }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/update-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: newPassword,
          token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: {
            message: data.error || "Failed to update password",
            status: response.status,
          },
        };
      }

      return { error: null };
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : "An unexpected error occurred",
        },
      };
    }
  }

  /**
   * Update current user's email or password
   */
  async updateUser(updates: {
    email?: string;
    password?: string;
    data?: Record<string, any>;
  }): Promise<{ user: User | null; error: Error | null }> {
    const session = this.session();

    if (!session) {
      return {
        user: null,
        error: {
          message: "No active session",
        },
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          ...(this.csrfToken ? { [SECURITY_CONSTANTS.CSRF.headerName]: this.csrfToken } : {}),
        },
        body: JSON.stringify(updates),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          user: null,
          error: {
            message: data.error || "Failed to update user",
            status: response.status,
          },
        };
      }

      return {
        user: data.user || null,
        error: null,
      };
    } catch (error) {
      return {
        user: null,
        error: {
          message: error instanceof Error ? error.message : "An unexpected error occurred",
        },
      };
    }
  }

  /**
   * Create an SDK client with the current session token
   */
  createClient() {
    const session = this.session();
    const client = createClient(this.baseUrl);

    if (session) {
      return client.auth(session.access_token, {
        expiresIn: Math.floor((session.expires_at - Date.now()) / 1000),
      });
    }

    return client;
  }

  /**
   * Get the auth token for use in custom requests
   */
  getAuthToken(): string | null {
    const session = this.session();
    return session ? session.access_token : null;
  }

  /**
   * Get the CSRF token if available
   */
  getCsrfToken(): string | null {
    return this.csrfToken;
  }

  // PRIVATE METHODS

  /**
   * Save session data to storage
   */
  private _saveSession(session: Session): void {
    if (!session.access_token) return;

    this.storage.storeToken(
      session.access_token,
      session.expires_at || Date.now() + 3600 * 1000, // 1 hour default
      session.refresh_token,
    );
  }

  /**
   * Clear session data from storage
   */
  private _clearSession(): void {
    this.storage.clearToken();
    this.csrfToken = null;
  }

  /**
   * Set up token refresh timer
   */
  private _setupTokenRefresh(): void {
    this._clearRefreshTimer();

    const session = this.session();
    if (!session) return;

    const timeUntilExpiry = session.expires_at - Date.now();
    if (timeUntilExpiry <= 0) return;

    // Schedule refresh before token expires
    const refreshTime = Math.max(0, timeUntilExpiry - this.tokenExpiryBuffer);

    this.refreshTimerId = setTimeout(() => {
      this.refreshToken();
    }, refreshTime);
  }

  /**
   * Clear token refresh timer
   */
  private _clearRefreshTimer(): void {
    if (this.refreshTimerId) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
  }
}

// Create default auth instance
const auth = new Auth();

export default auth;
export type { User, Session, AuthResponse, Error };
