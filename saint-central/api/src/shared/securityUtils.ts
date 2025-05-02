/**
 * SaintCentral Security Utilities
 * Client-safe security functions for the SDK
 */

// Security constants - client-safe version
export const SECURITY_CONSTANTS = {
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
 * Hash a string (for client-side use)
 */
export async function hashString(input: string): Promise<string> {
  // Use Web Crypto API for client-side hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(input);

  // Use self.crypto for Cloudflare Workers compatibility
  const hashBuffer = await self.crypto.subtle.digest("SHA-256", data);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Sign a request to ensure data integrity
 */
export async function signRequest(
  payload: any,
  secretKey: string,
  timestamp: number,
): Promise<string> {
  const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
  const message = `${payloadStr}.${timestamp}`;
  return await hashString(`${message}.${secretKey}`);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
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
 * Encrypts sensitive data when storage is enabled
 * Simple XOR-based encryption for example purposes
 * In production, use WebCrypto API for better security
 */
export function encryptData(data: string, key?: string): string {
  if (!key) return data;

  try {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      result.push(String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length)));
    }
    return btoa(result.join(""));
  } catch (e) {
    console.error("Encryption error:", e);
    return data;
  }
}

/**
 * Decrypts encrypted data
 */
export function decryptData(encryptedData: string, key?: string): string {
  if (!key) return encryptedData;

  try {
    const decodedData = atob(encryptedData);
    const result = [];
    for (let i = 0; i < decodedData.length; i++) {
      result.push(String.fromCharCode(decodedData.charCodeAt(i) ^ key.charCodeAt(i % key.length)));
    }
    return result.join("");
  } catch (e) {
    console.error("Decryption error:", e);
    return encryptedData;
  }
}

/**
 * Mask sensitive data in logs and error messages
 */
export function maskSensitiveData(
  data: any,
  sensitiveFields: string[] = [
    "password",
    "token",
    "secret",
    "key",
    "auth",
    "credit",
    "card",
    "cvv",
    "ssn",
    "social",
  ],
): any {
  if (!data) return data;

  if (typeof data === "string") {
    // Try to parse as JSON if it looks like it
    if (data.trim().startsWith("{") && data.trim().endsWith("}")) {
      try {
        const parsed = JSON.parse(data);
        return JSON.stringify(maskSensitiveData(parsed, sensitiveFields));
      } catch (e) {
        // Not valid JSON, continue with string masking
      }
    }

    // For normal strings, check if it contains any sensitive words
    // and mask the entire string if it does
    const lowerData = data.toLowerCase();
    for (const field of sensitiveFields) {
      if (lowerData.includes(field.toLowerCase())) {
        return "*** MASKED ***";
      }
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item, sensitiveFields));
  }

  if (typeof data === "object" && data !== null) {
    const result: Record<string, any> = {};

    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        // Check if this key should be masked
        const shouldMask = sensitiveFields.some((field) =>
          key.toLowerCase().includes(field.toLowerCase()),
        );

        result[key] = shouldMask ? "*** MASKED ***" : maskSensitiveData(data[key], sensitiveFields);
      }
    }

    return result;
  }

  return data;
}

/**
 * Detect browser security issues
 */
export function detectBrowserSecurityIssues(): {
  issues: string[];
  securityScore: number;
} {
  const issues: string[] = [];
  let securityScore = 100;

  // Only run in browser environment
  if (typeof window === "undefined") {
    return { issues: ["Not a browser environment"], securityScore: 0 };
  }

  // Check for HTTPS
  if (window.location.protocol !== "https:") {
    issues.push("Not using HTTPS");
    securityScore -= 25;
  }

  // Check if cookies are secure
  if (document.cookie && !document.cookie.includes("Secure")) {
    issues.push("Cookies may not be using Secure flag");
    securityScore -= 15;
  }

  // Check for localStorage/sessionStorage availability
  try {
    const testKey = "__security_test__";
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
  } catch (e) {
    issues.push("localStorage not available");
    securityScore -= 10;
  }

  try {
    const testKey = "__security_test__";
    sessionStorage.setItem(testKey, testKey);
    sessionStorage.removeItem(testKey);
  } catch (e) {
    issues.push("sessionStorage not available");
    securityScore -= 10;
  }

  // Check if browser supports modern security features
  if (!("crypto" in window) || !("subtle" in window.crypto)) {
    issues.push("Web Crypto API not fully supported");
    securityScore -= 20;
  }

  if (!("serviceWorker" in navigator)) {
    issues.push("Service Workers not supported");
    securityScore -= 5;
  }

  // Normalize score
  securityScore = Math.max(0, Math.min(100, securityScore));

  return { issues, securityScore };
}

/**
 * Generate a secure random token
 */
export async function generateSecureToken(lengthBytes = 32): Promise<string> {
  // Use Web Crypto API for secure random generation
  const buffer = new Uint8Array(lengthBytes);

  // Use self.crypto for Cloudflare Workers compatibility
  self.crypto.getRandomValues(buffer);

  // Convert to hex string
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
