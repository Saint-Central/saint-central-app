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
 * Encrypts sensitive data using Web Crypto API
 * @param data - The string data to encrypt
 * @param key - The encryption key
 * @returns - Base64 encoded encrypted string
 */
export async function encryptData(data: string, key?: string): Promise<string> {
  // If no key is provided, return data unencrypted (maintain same behavior as original)
  if (!key) return data;

  try {
    // Convert the input data to bytes
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);

    // Create a consistent key using PBKDF2 (Password-Based Key Derivation)
    const keyMaterial = await self.crypto.subtle.importKey(
      "raw",
      encoder.encode(key),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"],
    );

    // Derive a proper encryption key using a salt and iterations
    const encryptionKey = await self.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode("saintcentral-salt"), // Use a consistent salt
        iterations: 100000, // Higher is more secure but slower
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 }, // AES-GCM is an authenticated encryption algorithm
      false,
      ["encrypt"],
    );

    // Generate a random initialization vector (IV)
    const iv = self.crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for AES-GCM

    // Encrypt the data
    const encryptedBuffer = await self.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      encryptionKey,
      dataBytes,
    );

    // Combine IV and encrypted data into a single array
    const resultArray = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    resultArray.set(iv, 0);
    resultArray.set(new Uint8Array(encryptedBuffer), iv.length);

    // Convert to Base64 string
    return btoa(String.fromCharCode(...Array.from(resultArray)));
  } catch (err) {
    console.error("Encryption error:", err);
    // Maintain the same error handling as the original
    return data;
  }
}

/**
 * Decrypts encrypted data using Web Crypto API
 * @param encryptedData - Base64 encoded encrypted string
 * @param key - The encryption key
 * @returns - Decrypted string
 */
export async function decryptData(encryptedData: string, key?: string): Promise<string> {
  // If no key is provided, return data as-is (maintain same behavior as original)
  if (!key) return encryptedData;

  try {
    // Convert the Base64 string back to bytes
    const encryptedBytes = new Uint8Array(
      atob(encryptedData)
        .split("")
        .map((char) => char.charCodeAt(0)),
    );

    // Extract the IV and the encrypted data
    const iv = encryptedBytes.slice(0, 12);
    const encryptedBuffer = encryptedBytes.slice(12);

    // Recreate the key using the same derivation method used in encryption
    const encoder = new TextEncoder();
    const keyMaterial = await self.crypto.subtle.importKey(
      "raw",
      encoder.encode(key),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"],
    );

    const decryptionKey = await self.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode("saintcentral-salt"), // Same salt as in encryption
        iterations: 100000, // Same iterations as in encryption
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"],
    );

    // Decrypt the data
    const decryptedBuffer = await self.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      decryptionKey,
      encryptedBuffer,
    );

    // Convert decrypted data back to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.error("Decryption error:", err);
    // Maintain the same error handling as the original
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
