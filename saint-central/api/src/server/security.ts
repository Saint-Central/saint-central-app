import { createClient } from "@supabase/supabase-js";
import { Env } from "../index";
import {
  validateInput as validateClientInput,
  generateSecureToken as generateToken,
  timingSafeEqual as clientTimingSafeEqual,
} from "../shared/securityUtils";

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

// Security constants - server-side only
const SECURITY_CONSTANTS = {
  // Token blacklist
  TOKEN_BLACKLIST: {
    maxSize: 1000, // Maximum number of tokens to blacklist
    expiryTime: 86400000, // 24 hours in milliseconds
  },
  // Cookie security settings
  COOKIE: {
    sameSite: "strict", // SameSite policy
    secure: true, // HTTPS only
    httpOnly: true, // Not accessible via JavaScript
    maxAge: 3600, // 1 hour in seconds
  },
};

// Token blacklist storage
interface BlacklistedToken {
  token: string;
  expires: number;
}

const tokenBlacklist: BlacklistedToken[] = [];

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
 * Create a CSRF token
 */
export async function createCsrfToken(userId: string): Promise<string> {
  return await generateToken(64);
}

/**
 * Generate a secure token
 */
export async function generateSecureToken(lengthBytes = 32): Promise<string> {
  return await generateToken(lengthBytes);
}

/**
 * Blacklist a token
 */
export async function blacklistToken(token: string, expiresIn: number = 86400): Promise<void> {
  // Clean up expired tokens first
  cleanupBlacklist();

  // Add token to blacklist
  tokenBlacklist.push({
    token,
    expires: Date.now() + expiresIn * 1000,
  });

  // Trim blacklist if it gets too large
  if (tokenBlacklist.length > SECURITY_CONSTANTS.TOKEN_BLACKLIST.maxSize) {
    // Sort by expiry and remove oldest
    tokenBlacklist.sort((a, b) => b.expires - a.expires);
    tokenBlacklist.splice(SECURITY_CONSTANTS.TOKEN_BLACKLIST.maxSize);
  }
}

/**
 * Clean up expired blacklisted tokens
 */
function cleanupBlacklist(): void {
  const now = Date.now();
  const validTokens = tokenBlacklist.filter((item) => item.expires > now);

  // Only reassign if we actually removed tokens
  if (validTokens.length < tokenBlacklist.length) {
    tokenBlacklist.length = 0;
    tokenBlacklist.push(...validTokens);
  }
}

/**
 * Check if a token is blacklisted
 */
export function isTokenBlacklisted(token: string): boolean {
  return tokenBlacklist.some((item) => item.token === token);
}

/**
 * Security middleware for validating requests
 */
export async function securityMiddleware(
  request: Request,
  env: Env,
  options: {
    requireAuth?: boolean;
    validateCsrf?: boolean;
  } = {},
): Promise<{ userId?: string; error?: Response }> {
  const { requireAuth = false, validateCsrf = false } = options;

  // Extract tokens
  const authHeader = request.headers.get("Authorization");
  const token = authHeader ? authHeader.replace("Bearer ", "") : null;

  // Check for authentication if required
  if (requireAuth) {
    if (!token) {
      return {
        error: createResponse({ error: "Authentication required" }, 401),
      };
    }

    // Check if token is blacklisted
    if (isTokenBlacklisted(token)) {
      return {
        error: createResponse({ error: "Token has been revoked" }, 401),
      };
    }

    // Validate token with Supabase (would normally go here)
    // For now we'll just extract the user ID from the token claim
    try {
      // This is a simplified example - in a real app we would verify with Supabase
      const tokenParts = token.split(".");
      if (tokenParts.length !== 3) {
        return {
          error: createResponse({ error: "Invalid token format" }, 401),
        };
      }

      const payload = JSON.parse(atob(tokenParts[1]));
      const userId = payload.sub || payload.user_id;

      if (!userId) {
        return {
          error: createResponse({ error: "Invalid token claims" }, 401),
        };
      }

      // Check CSRF if required
      if (validateCsrf) {
        const csrfToken = request.headers.get("X-CSRF-Token");

        if (!csrfToken) {
          return {
            error: createResponse({ error: "CSRF token required" }, 403),
          };
        }

        // In a real implementation, we would validate the CSRF token
        // against a stored value for this user/session
      }

      return { userId };
    } catch (error) {
      console.error("Token validation error:", error);
      return {
        error: createResponse({ error: "Invalid authentication token" }, 401),
      };
    }
  }

  return {}; // No auth required, no error
}

/**
 * Create a standardized API response
 */
export function createResponse(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
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
  type: string | RegExp,
  options: {
    maxLength?: number;
    required?: boolean;
    customPattern?: RegExp;
  } = {},
): { isValid: boolean; value: string; error?: string } {
  const { maxLength = 1000, required = false, customPattern } = options;

  // Check if required but not provided
  if (required && (!input || input.trim() === "")) {
    return { isValid: false, value: input, error: "This field is required" };
  }

  // If not required and empty, it's valid
  if (!required && (!input || input.trim() === "")) {
    return { isValid: true, value: input };
  }

  // Check length
  if (input.length > maxLength) {
    return {
      isValid: false,
      value: input,
      error: `Input exceeds maximum length of ${maxLength} characters`,
    };
  }

  // Validate based on type
  let pattern: RegExp;

  if (typeof type === "string") {
    switch (type) {
      case "email":
        pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        break;
      case "password":
        // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
        pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        break;
      case "name":
        pattern = /^[a-zA-Z\s'-]{2,}$/;
        break;
      case "phone":
        pattern = /^\+?[0-9()-\s]{10,15}$/;
        break;
      case "url":
        pattern =
          /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)$/;
        break;
      case "date":
        pattern = /^\d{4}-\d{2}-\d{2}$/;
        break;
      case "token":
        // Any non-empty string for tokens
        pattern = /^.+$/;
        break;
      case "string":
        // Any non-empty string
        pattern = /^.+$/;
        break;
      default:
        // Default to allow any non-empty string
        pattern = /^.+$/;
    }
  } else {
    // Use the RegExp directly
    pattern = type;
  }

  // Use custom pattern if provided
  if (customPattern) {
    pattern = customPattern;
  }

  const isValid = pattern.test(input);

  return {
    isValid,
    value: input,
    error: isValid ? undefined : `Invalid ${typeof type === "string" ? type : "input"} format`,
  };
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
  self.crypto.getRandomValues(randomBytes);

  for (let i = 0; i < length; i++) {
    password += chars.charAt(randomBytes[i] % chars.length);
  }

  return password;
}
