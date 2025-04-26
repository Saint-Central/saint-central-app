import { createClient } from "@supabase/supabase-js";
import { Env } from "./index";

// Type for the rate limiting cache
interface RateLimitEntry {
  count: number;
  timestamp: number;
}

// Global rate limiting cache (memory-based for Cloudflare Workers)
const rateLimitCache = new Map<string, RateLimitEntry>();

// Configuration for rate limiting
const RATE_LIMIT = {
  maxRequests: 60, // Maximum requests allowed
  windowMs: 60000, // Time window in milliseconds (1 minute)
  blockDuration: 300000, // Block duration in milliseconds (5 minutes)
};

/**
 * Security middleware for API requests
 * Handles authentication, validation, and rate limiting
 */
export async function securityMiddleware(
  request: Request,
  env: Env,
  options: {
    requireAuth?: boolean;
    rateLimitByIp?: boolean;
    rateLimitByToken?: boolean;
    customRateLimit?: {
      maxRequests: number;
      windowMs: number;
    };
  } = {},
): Promise<{
  isAuthorized: boolean;
  userId?: string;
  error?: Response;
  clientIp: string;
}> {
  // Default options
  const {
    requireAuth = true,
    rateLimitByIp = true,
    rateLimitByToken = true,
    customRateLimit,
  } = options;

  // Extract client IP (in Cloudflare Workers environment)
  const clientIp =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0] ||
    "127.0.0.1";

  // Handle CORS preflight requests
  if (request.method === "OPTIONS") {
    return {
      isAuthorized: false,
      error: new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      }),
      clientIp,
    };
  }

  // Check rate limiting by IP if enabled
  if (rateLimitByIp) {
    const ipLimitResult = checkRateLimit(`ip:${clientIp}`, customRateLimit);
    if (!ipLimitResult.allowed) {
      return {
        isAuthorized: false,
        error: createResponse(
          {
            error: "Rate limit exceeded",
            message: `Too many requests from this IP. Try again in ${Math.ceil(ipLimitResult.retryAfter / 1000)} seconds.`,
          },
          429,
          {
            "Retry-After": Math.ceil(ipLimitResult.retryAfter / 1000).toString(),
          },
        ),
        clientIp,
      };
    }
  }

  // Skip authentication check if not required
  if (!requireAuth) {
    return { isAuthorized: true, clientIp };
  }

  // Validate auth header
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      isAuthorized: false,
      error: createResponse({ error: "Missing or invalid Authorization header" }, 401),
      clientIp,
    };
  }

  const token = authHeader.replace("Bearer ", "").trim();

  // Check rate limiting by token if enabled
  if (rateLimitByToken) {
    const tokenHash = await hashToken(token);
    const tokenLimitResult = checkRateLimit(`token:${tokenHash}`, customRateLimit);
    if (!tokenLimitResult.allowed) {
      return {
        isAuthorized: false,
        error: createResponse(
          {
            error: "Rate limit exceeded",
            message: `Too many requests with this token. Try again in ${Math.ceil(tokenLimitResult.retryAfter / 1000)} seconds.`,
          },
          429,
          {
            "Retry-After": Math.ceil(tokenLimitResult.retryAfter / 1000).toString(),
          },
        ),
        clientIp,
      };
    }
  }

  // Initialize Supabase client with service role key
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // Verify the JWT token and get the authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    console.error("Failed to verify token:", authError);
    return {
      isAuthorized: false,
      error: createResponse({ error: "Invalid or expired token" }, 401),
      clientIp,
    };
  }

  return {
    isAuthorized: true,
    userId: user.id,
    clientIp,
  };
}

/**
 * Check if a request is within rate limits
 */
function checkRateLimit(
  key: string,
  customConfig?: { maxRequests: number; windowMs: number },
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const config = customConfig || RATE_LIMIT;

  // Get current entry or create new one
  const entry = rateLimitCache.get(key) || { count: 0, timestamp: now };

  // Reset count if the time window has passed
  if (now - entry.timestamp > config.windowMs) {
    entry.count = 1;
    entry.timestamp = now;
    rateLimitCache.set(key, entry);
    return { allowed: true, retryAfter: 0 };
  }

  // Increment request count
  entry.count++;
  rateLimitCache.set(key, entry);

  // Check if rate limit is exceeded
  if (entry.count > config.maxRequests) {
    const retryAfter = config.windowMs - (now - entry.timestamp);
    return { allowed: false, retryAfter };
  }

  return { allowed: true, retryAfter: 0 };
}

/**
 * Simple hash function for tokens (for rate limiting)
 * Note: This is not for cryptographic purposes, just to avoid storing actual tokens
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Helper to create a standardized response
 */
export function createResponse(
  body: any,
  status: number,
  additionalHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": status === 200 ? "private, max-age=30" : "no-store",
      ...additionalHeaders,
    },
  });
}
