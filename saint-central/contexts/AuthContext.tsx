import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Auth Worker API configuration
const AUTH_WORKER_URL = "https://auth-worker.colinmcherney.workers.dev";

// Token storage keys
const ACCESS_TOKEN_KEY = "@auth_access_token";
const REFRESH_TOKEN_KEY = "@auth_refresh_token";
const TOKEN_EXPIRES_AT_KEY = "@auth_expires_at";

interface User {
  id: string;
  email?: string;
  role: string;
  [key: string]: any;
}

interface Session {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  user: User;
}

interface AuthTokens {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User; session: Session } | null>;
  signUp: (
    email: string,
    password: string,
    metadata?: any,
  ) => Promise<{ user: User; session: Session } | null>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  refreshSession: () => Promise<Session | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// For backward compatibility with Supabase
export const useSession = () => {
  const { session } = useAuth();
  return { data: { session }, error: null };
};

export const useUser = () => {
  const { user } = useAuth();
  return { data: { user }, error: null };
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Get stored auth tokens
  const getStoredTokens = async (): Promise<AuthTokens> => {
    try {
      const [accessToken, refreshToken, expiresAt] = await Promise.all([
        AsyncStorage.getItem(ACCESS_TOKEN_KEY),
        AsyncStorage.getItem(REFRESH_TOKEN_KEY),
        AsyncStorage.getItem(TOKEN_EXPIRES_AT_KEY),
      ]);

      return {
        accessToken,
        refreshToken,
        expiresAt: expiresAt ? parseInt(expiresAt) : null,
      };
    } catch (error) {
      console.error("Error getting stored tokens:", error);
      return { accessToken: null, refreshToken: null, expiresAt: null };
    }
  };

  // Store auth tokens
  const storeTokens = async (accessToken: string, refreshToken: string, expiresAt: number) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken),
        AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
        AsyncStorage.setItem(TOKEN_EXPIRES_AT_KEY, expiresAt.toString()),
      ]);
    } catch (error) {
      console.error("Error storing tokens:", error);
    }
  };

  // Clear stored tokens
  const clearTokens = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
        AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
        AsyncStorage.removeItem(TOKEN_EXPIRES_AT_KEY),
      ]);
    } catch (error) {
      console.error("Error clearing tokens:", error);
    }
  };

  // Get current access token, refresh if needed
  const getAccessToken = async (): Promise<string | null> => {
    const tokens = await getStoredTokens();

    if (!tokens.accessToken) {
      return null;
    }

    // Check if token is expired (with 5 minute buffer)
    const now = Math.floor(Date.now() / 1000);
    if (tokens.expiresAt && tokens.expiresAt - 300 < now) {
      if (tokens.refreshToken) {
        const refreshedSession = await refreshSession();
        return refreshedSession?.access_token || null;
      }
      return null;
    }

    return tokens.accessToken;
  };

  // Refresh access token using refresh token
  const refreshSession = async (): Promise<Session | null> => {
    try {
      const tokens = await getStoredTokens();

      if (!tokens.refreshToken) {
        return null;
      }

      const response = await fetch(`${AUTH_WORKER_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh_token: tokens.refreshToken,
          nonce: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        }),
      });

      if (!response.ok) {
        console.error("Token refresh failed:", response.status);
        await signOut();
        return null;
      }

      const data = await response.json();

      if (data.success && data.access_token) {
        const expiresAt = Math.floor(Date.now() / 1000) + data.expires_in;
        await storeTokens(data.access_token, data.refresh_token || tokens.refreshToken, expiresAt);

        const newSession: Session = {
          access_token: data.access_token,
          refresh_token: data.refresh_token || tokens.refreshToken,
          expires_at: expiresAt,
          user: user || { id: "", role: "authenticated" }, // Fallback user
        };

        setSession(newSession);
        return newSession;
      }

      await signOut();
      return null;
    } catch (error) {
      console.error("Error refreshing token:", error);
      await signOut();
      return null;
    }
  };

  // Validate session with auth worker
  const validateSession = async (): Promise<Session | null> => {
    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        return null;
      }

      // Validate session with auth worker
      const response = await fetch(`${AUTH_WORKER_URL}/auth/session`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("Session validation failed:", response.status);
        await signOut();
        return null;
      }

      const sessionData = await response.json();

      if (sessionData.success && sessionData.valid) {
        const tokens = await getStoredTokens();
        const validSession: Session = {
          access_token: accessToken,
          refresh_token: tokens.refreshToken || "",
          expires_at: sessionData.expires_at,
          user: {
            id: sessionData.user_id,
            email: sessionData.email,
            role: sessionData.role,
          },
        };

        setSession(validSession);
        setUser(validSession.user);
        return validSession;
      } else {
        await signOut();
        return null;
      }
    } catch (error) {
      console.error("Session validation error:", error);
      await signOut();
      return null;
    }
  };

  // Sign in with email and password
  const signIn = async (
    email: string,
    password: string,
  ): Promise<{ user: User; session: Session } | null> => {
    try {
      const response = await fetch(`${AUTH_WORKER_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          nonce: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        }),
      });

      if (!response.ok) {
        console.error("Sign in failed:", response.status);
        return null;
      }

      const data = await response.json();

      if (data.success && data.access_token) {
        const expiresAt = Math.floor(Date.now() / 1000) + data.expires_in;
        await storeTokens(data.access_token, data.refresh_token, expiresAt);

        const newUser: User = {
          id: data.user.id,
          email: data.user.email,
          role: "authenticated",
          ...data.user,
        };

        const newSession: Session = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: expiresAt,
          user: newUser,
        };

        setSession(newSession);
        setUser(newUser);

        return { user: newUser, session: newSession };
      }

      return null;
    } catch (error) {
      console.error("Sign in error:", error);
      return null;
    }
  };

  // Sign up with email and password
  const signUp = async (
    email: string,
    password: string,
    metadata?: any,
  ): Promise<{ user: User; session: Session } | null> => {
    try {
      const response = await fetch(`${AUTH_WORKER_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          metadata,
          nonce: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        }),
      });

      if (!response.ok) {
        console.error("Sign up failed:", response.status);
        return null;
      }

      const data = await response.json();

      if (data.success && data.access_token) {
        const expiresAt = Math.floor(Date.now() / 1000) + data.expires_in;
        await storeTokens(data.access_token, data.refresh_token, expiresAt);

        const newUser: User = {
          id: data.user.id,
          email: data.user.email,
          role: "authenticated",
          ...data.user,
        };

        const newSession: Session = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: expiresAt,
          user: newUser,
        };

        setSession(newSession);
        setUser(newUser);

        return { user: newUser, session: newSession };
      }

      return null;
    } catch (error) {
      console.error("Sign up error:", error);
      return null;
    }
  };

  // Sign out
  const signOut = async (): Promise<void> => {
    try {
      const accessToken = await getAccessToken();

      if (accessToken) {
        // Call logout endpoint
        await fetch(`${AUTH_WORKER_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nonce: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          }),
        });
      }
    } catch (error) {
      console.error("Logout API call failed:", error);
    } finally {
      // Always clear local state
      await clearTokens();
      setSession(null);
      setUser(null);
    }
  };

  // Initialize session on mount
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      if (isMounted) {
        setLoading(true);
      }
      
      const validSession = await validateSession();
      
      if (isMounted) {
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const value: AuthContextType = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
    getAccessToken,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
