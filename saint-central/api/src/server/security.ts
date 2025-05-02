import { createClient } from "@supabase/supabase-js";
import { Env } from "../index";

// Use conditionals to support both Node.js and Web environments
let crypto: any;

// Functions to replace Node.js crypto functionality
async function generateRandomBytes(length: number): Promise<string> {
  // Use Web Crypto API
  const buffer = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(buffer);
  } else {
    // Fallback for Cloudflare Workers
    const randomValues = await self.crypto.getRandomValues(buffer);
    buffer.set(randomValues);
  }
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function createSHA256Hash(input: string): Promise<string> {
  // Use Web Crypto API for hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await self.crypto.subtle.digest("SHA-256", data);

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Type for the rate limiting cache
interface RateLimitEntry {
  count: number;
  timestamp: number;
}

// Global rate limiting cache (memory-based for Cloudflare Workers)
const rateLimitCache = new Map<string, RateLimitEntry>();

// Type for token blacklist
interface BlacklistedToken {
  token: string;
  expiry: number;
}

// Global token blacklist (for revoked tokens)
const tokenBlacklist = new Map<string, BlacklistedToken>();

// Global CSRF token store
const csrfTokens = new Map<string, { token: string; expires: number }>();

// For API key rotation tracking
const apiKeyRotations = new Map<
  string,
  {
    currentKey: string;
    previousKey: string | null;
    rotationTimestamp: number;
  }
>();

// For tracking bruteforce attempts
interface BruteforceTracker {
  attempts: number;
  lastAttempt: number;
  blockedUntil: number;
}

// Global bruteforce tracking
const bruteforceTracking = new Map<string, BruteforceTracker>();

// Content Security Policy default configuration
export const DEFAULT_CSP_CONFIG = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", "data:"],
  connectSrc: ["'self'", "https://saint-central-api.colinmcherney.workers.dev"],
  fontSrc: ["'self'"],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  frameSrc: ["'none'"],
  frameAncestors: ["'none'"],
  formAction: ["'self'"],
  baseUri: ["'self'"],
  upgradeInsecureRequests: true,
  blockAllMixedContent: true,
};

// Security constants
export const SECURITY_CONSTANTS = {
  // Rate limiting configuration
  RATE_LIMIT: {
    maxRequests: 60, // Maximum requests allowed
    windowMs: 60000, // Time window in milliseconds (1 minute)
    blockDuration: 300000, // Block duration in milliseconds (5 minutes)
  },

  // Token configuration
  TOKEN: {
    expiryTime: 3600000, // 1 hour in milliseconds
    refreshExpiryTime: 7 * 24 * 3600000, // 7 days in milliseconds
    maxActiveTokens: 5, // Maximum active tokens per user
    jwtAlgorithm: "HS256", // JWT signing algorithm
  },

  // CSRF protection
  CSRF: {
    tokenLength: 64, // CSRF token length in bytes
    headerName: "X-CSRF-Token", // CSRF header name
    cookieName: "csrf_token", // CSRF cookie name
    expiryTime: 3600000, // 1 hour in milliseconds
  },

  // Cookie security settings
  COOKIE: {
    sameSite: "strict", // SameSite policy
    secure: true, // HTTPS only
    httpOnly: true, // Not accessible via JavaScript
    maxAge: 3600, // 1 hour in seconds
  },
};

/**
 * Generate a secure random token for CSRF protection
 */
export async function generateSecureToken(lengthBytes = 32): Promise<string> {
  return generateRandomBytes(lengthBytes);
}

/**
 * Create a new CSRF token and store it
 */
export async function createCsrfToken(userId: string): Promise<string> {
  const token = await generateSecureToken(SECURITY_CONSTANTS.CSRF.tokenLength);
  const expires = Date.now() + SECURITY_CONSTANTS.CSRF.expiryTime;
  csrfTokens.set(userId, { token, expires });
  return token;
}

/**
 * Validate a CSRF token
 */
export function validateCsrfToken(userId: string, token: string): boolean {
  const storedToken = csrfTokens.get(userId);
  if (!storedToken) return false;

  // Check if token is expired
  if (storedToken.expires < Date.now()) {
    csrfTokens.delete(userId);
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(storedToken.token, token);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Add a token to the blacklist (when logging out or after compromise)
 */
export async function blacklistToken(token: string, expiryInSeconds = 3600): Promise<void> {
  const expiry = Date.now() + expiryInSeconds * 1000;
  const tokenHash = await hashString(token);
  tokenBlacklist.set(tokenHash, { token: tokenHash, expiry });

  // Clean up expired tokens from blacklist
  cleanupBlacklist();
}

/**
 * Check if a token is blacklisted
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const tokenHash = await hashString(token);
  const blacklistedToken = tokenBlacklist.get(tokenHash);

  if (!blacklistedToken) return false;

  // If token is expired, remove from blacklist and return false
  if (blacklistedToken.expiry < Date.now()) {
    tokenBlacklist.delete(tokenHash);
    return false;
  }

  return true;
}

/**
 * Clean up expired entries from the token blacklist
 */
function cleanupBlacklist(): void {
  const now = Date.now();

  for (const [key, value] of tokenBlacklist.entries()) {
    if (value.expiry < now) {
      tokenBlacklist.delete(key);
    }
  }
}

/**
 * Rotate API keys for a user or service
 */
export function rotateApiKey(userId: string, newKey: string): void {
  const currentRotation = apiKeyRotations.get(userId);

  // Store the current key as previous and set new key
  apiKeyRotations.set(userId, {
    currentKey: newKey,
    previousKey: currentRotation?.currentKey || null,
    rotationTimestamp: Date.now(),
  });
}

/**
 * Validate API key against current and previous (recently rotated) keys
 */
export function validateApiKey(userId: string, apiKey: string): boolean {
  const keyInfo = apiKeyRotations.get(userId);
  if (!keyInfo) return false;

  // Check against current key
  if (timingSafeEqual(keyInfo.currentKey, apiKey)) return true;

  // Check against previous key (only valid for a grace period)
  const gracePeriod = 24 * 3600 * 1000; // 24 hours
  if (
    keyInfo.previousKey &&
    Date.now() - keyInfo.rotationTimestamp < gracePeriod &&
    timingSafeEqual(keyInfo.previousKey, apiKey)
  ) {
    return true;
  }

  return false;
}

/**
 * Hash a string using SHA-256
 */
export async function hashString(input: string): Promise<string> {
  return createSHA256Hash(input);
}

/**
 * Sign a request payload
 */
export async function signRequest(
  payload: any,
  secretKey: string,
  timestamp: number,
): Promise<string> {
  const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
  const message = `${payloadStr}.${timestamp}`;
  return createSHA256Hash(`${message}.${secretKey}`);
}

/**
 * Verify a request signature for integrity
 */
export async function verifyRequestSignature(
  payload: any,
  signature: string,
  secretKey: string,
  timestamp: number,
  maxAgeMs = 5 * 60 * 1000, // 5 minutes
): Promise<boolean> {
  // Check if request is too old
  const now = Date.now();
  if (now - timestamp > maxAgeMs) {
    return false;
  }

  // Create expected signature
  const expectedSignature = await signRequest(payload, secretKey, timestamp);

  // Compare signatures (use timing-safe comparison)
  return timingSafeEqual(expectedSignature, signature);
}

/**
 * Sanitize input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, "") // Remove HTML tags
    .replace(/['"\\]/g, "") // Remove quotes and backslashes
    .trim();
}

/**
 * Validate input against expected patterns
 */
export function validateInput(
  input: string,
  pattern: RegExp | string,
  maxLength: number = 1000,
): boolean {
  // Check length
  if (!input || input.length > maxLength) return false;

  // Check against pattern
  const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
  return regex.test(input);
}

/**
 * Create secure HTTP-only cookie options for tokens
 */
export function createSecureCookieOptions(expiresInSeconds: number = 3600): Record<string, any> {
  return {
    httpOnly: SECURITY_CONSTANTS.COOKIE.httpOnly,
    secure: SECURITY_CONSTANTS.COOKIE.secure,
    sameSite: SECURITY_CONSTANTS.COOKIE.sameSite,
    maxAge: expiresInSeconds,
    path: "/",
  };
}

/**
 * Security middleware for API requests
 */
export async function securityMiddleware(
  request: Request,
  env: Env,
  options: {
    requireAuth?: boolean;
    rateLimitByIp?: boolean;
    rateLimitByToken?: boolean;
    validateCsrf?: boolean;
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
  csrfToken?: string;
}> {
  const {
    requireAuth = false,
    rateLimitByIp = true,
    rateLimitByToken = false,
    validateCsrf = false,
    customRateLimit,
  } = options;

  // Get client IP (using Cloudflare-specific headers if available)
  const clientIp =
    request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";

  // Check rate limiting by IP if enabled
  if (rateLimitByIp) {
    const ipLimitResult = checkRateLimit(`ip:${clientIp}`, customRateLimit);
    if (!ipLimitResult.allowed) {
      return {
        isAuthorized: false,
        clientIp,
        error: createResponse(
          { error: "Too many requests", retryAfter: ipLimitResult.retryAfter },
          429,
          { "Retry-After": Math.ceil(ipLimitResult.retryAfter / 1000).toString() },
        ),
      };
    }
  }

  // Check authentication if required
  if (requireAuth || rateLimitByToken || validateCsrf) {
    // Get authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        isAuthorized: false,
        clientIp,
        error: createResponse({ error: "Unauthorized - Missing token" }, 401),
      };
    }

    const token = authHeader.split(" ")[1];

    // Check if token is blacklisted (revoked)
    if (await isTokenBlacklisted(token)) {
      return {
        isAuthorized: false,
        clientIp,
        error: createResponse({ error: "Unauthorized - Token revoked" }, 401),
      };
    }

    // Check rate limiting by token if enabled
    if (rateLimitByToken) {
      const tokenHash = await hashString(token);
      const tokenLimitResult = checkRateLimit(`token:${tokenHash}`, customRateLimit);
      if (!tokenLimitResult.allowed) {
        return {
          isAuthorized: false,
          clientIp,
          error: createResponse(
            { error: "Too many requests", retryAfter: tokenLimitResult.retryAfter },
            429,
            { "Retry-After": Math.ceil(tokenLimitResult.retryAfter / 1000).toString() },
          ),
        };
      }
    }

    // Verify token with Supabase
    try {
      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
      const { data: user, error } = await supabase.auth.getUser(token);

      if (error || !user.user) {
        return {
          isAuthorized: false,
          clientIp,
          error: createResponse({ error: "Unauthorized - Invalid token" }, 401),
        };
      }

      // Check CSRF token if enabled
      if (validateCsrf) {
        const csrfToken = request.headers.get(SECURITY_CONSTANTS.CSRF.headerName);

        // Only validate for mutation operations
        const method = request.method.toUpperCase();
        if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
          if (!csrfToken || !validateCsrfToken(user.user.id, csrfToken)) {
            return {
              isAuthorized: false,
              clientIp,
              error: createResponse({ error: "Forbidden - Invalid CSRF token" }, 403),
            };
          }
        }
      }

      // Generate a new CSRF token if needed
      const newCsrfToken = validateCsrf ? await createCsrfToken(user.user.id) : undefined;

      return {
        isAuthorized: true,
        userId: user.user.id,
        clientIp,
        csrfToken: newCsrfToken,
      };
    } catch (error) {
      console.error("Auth error:", error);
      return {
        isAuthorized: false,
        clientIp,
        error: createResponse(
          {
            error: "Authentication error",
            details: error instanceof Error ? error.message : error,
          },
          500,
        ),
      };
    }
  }

  // If auth not required and no errors, return success
  return {
    isAuthorized: true,
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
  const config = customConfig || SECURITY_CONSTANTS.RATE_LIMIT;

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

/**
 * Generate a Content Security Policy header string
 */
export function generateCSPHeader(config = DEFAULT_CSP_CONFIG): string {
  const parts = [];

  for (const [directive, sources] of Object.entries(config)) {
    // Handle boolean directives
    if (typeof sources === "boolean") {
      if (sources) {
        parts.push(directive);
      }
      continue;
    }

    // Handle array of sources
    if (Array.isArray(sources) && sources.length > 0) {
      parts.push(`${directive} ${sources.join(" ")}`);
    }
  }

  return parts.join("; ");
}

/**
 * XSS protection: escapes HTML characters in user-generated content
 * to be displayed in HTML context
 */
export function escapeHtml(html: string): string {
  return html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * XSS protection: escapes characters in user-generated content
 * to be used in JavaScript context
 */
export function escapeJs(js: string): string {
  return js
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/</g, "\\x3C")
    .replace(/>/g, "\\x3E")
    .replace(/\//g, "\\/");
}

/**
 * XSS protection: escapes characters in user-generated content
 * to be used in CSS context
 */
export function escapeCss(css: string): string {
  return css.replace(/[^a-z0-9-_]/gi, "\\$&");
}

/**
 * XSS protection: escapes characters in user-generated content
 * to be used in URL context
 */
export function escapeUrl(url: string): string {
  // First check if it's a valid URL with an allowed protocol
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "#"; // Invalid protocol
    }
    return encodeURI(url);
  } catch (e) {
    // Not a valid URL, encode it
    return encodeURIComponent(url);
  }
}

/**
 * Bruteforce protection: tracks and limits authentication attempts
 */
export function trackBruteforceAttempt(
  key: string,
  success: boolean,
  options: {
    maxAttempts?: number;
    windowMs?: number;
    blockDurationMs?: number;
  } = {},
): {
  blocked: boolean;
  remainingAttempts: number;
  blockedUntil: number | null;
} {
  const maxAttempts = options.maxAttempts || 5;
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
  const blockDurationMs = options.blockDurationMs || 60 * 60 * 1000; // 1 hour

  const now = Date.now();
  const tracker = bruteforceTracking.get(key) || {
    attempts: 0,
    lastAttempt: now,
    blockedUntil: 0,
  };

  // Check if currently blocked
  if (tracker.blockedUntil > now) {
    return {
      blocked: true,
      remainingAttempts: 0,
      blockedUntil: tracker.blockedUntil,
    };
  }

  // Reset counter if window has passed
  if (now - tracker.lastAttempt > windowMs) {
    tracker.attempts = 0;
  }

  // Update tracking
  tracker.lastAttempt = now;

  // If successful login, reset attempts
  if (success) {
    tracker.attempts = 0;
    bruteforceTracking.set(key, tracker);
    return {
      blocked: false,
      remainingAttempts: maxAttempts,
      blockedUntil: null,
    };
  }

  // Increment attempt counter
  tracker.attempts++;

  // Check if should be blocked
  if (tracker.attempts >= maxAttempts) {
    tracker.blockedUntil = now + blockDurationMs;
    bruteforceTracking.set(key, tracker);
    return {
      blocked: true,
      remainingAttempts: 0,
      blockedUntil: tracker.blockedUntil,
    };
  }

  bruteforceTracking.set(key, tracker);
  return {
    blocked: false,
    remainingAttempts: maxAttempts - tracker.attempts,
    blockedUntil: null,
  };
}

/**
 * Clean up expired bruteforce tracking entries
 */
export function cleanupBruteforceTracking(): void {
  const now = Date.now();
  const windowMs = 24 * 60 * 60 * 1000; // 24 hours

  for (const [key, tracker] of bruteforceTracking.entries()) {
    // Remove if last attempt was more than window ago and not blocked
    if (now - tracker.lastAttempt > windowMs && tracker.blockedUntil < now) {
      bruteforceTracking.delete(key);
    }
  }
}

/**
 * Generate security headers for HTTP responses
 */
export function generateSecurityHeaders(
  options: {
    enableCSP?: boolean;
    cspConfig?: typeof DEFAULT_CSP_CONFIG;
    enableHSTS?: boolean;
    hstsMaxAge?: number;
    includeSubdomains?: boolean;
    preload?: boolean;
  } = {},
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cache-Control": "no-store, max-age=0",
    Pragma: "no-cache",
    "Feature-Policy": "camera 'none'; microphone 'none'; geolocation 'none'",
  };

  // Add Content-Security-Policy if enabled
  if (options.enableCSP !== false) {
    const cspConfig = options.cspConfig || DEFAULT_CSP_CONFIG;
    headers["Content-Security-Policy"] = generateCSPHeader(cspConfig);
  }

  // Add Strict-Transport-Security if enabled
  if (options.enableHSTS !== false) {
    const maxAge = options.hstsMaxAge || 31536000; // 1 year in seconds
    let hstsValue = `max-age=${maxAge}`;

    if (options.includeSubdomains !== false) {
      hstsValue += "; includeSubDomains";
    }

    if (options.preload === true) {
      hstsValue += "; preload";
    }

    headers["Strict-Transport-Security"] = hstsValue;
  }

  return headers;
}

/**
 * Get a secure random password/key of specified length and complexity
 */
export function generateSecurePassword(
  options: {
    length?: number;
    includeUppercase?: boolean;
    includeLowercase?: boolean;
    includeNumbers?: boolean;
    includeSpecial?: boolean;
  } = {},
): string {
  const length = options.length || 16;
  const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
  const numberChars = "0123456789";
  const specialChars = "!@#$%^&*()-_=+[]{}|;:,.<>?";

  let chars = "";
  if (options.includeUppercase !== false) chars += uppercaseChars;
  if (options.includeLowercase !== false) chars += lowercaseChars;
  if (options.includeNumbers !== false) chars += numberChars;
  if (options.includeSpecial === true) chars += specialChars;

  // Ensure we have at least some character set
  if (chars.length === 0) {
    chars = lowercaseChars + numberChars;
  }

  let password = "";
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);

  for (let i = 0; i < length; i++) {
    password += chars.charAt(randomBytes[i] % chars.length);
  }

  return password;
}
