/**
 * SaintCentral SDK Security Module
 * Implements advanced security features for the SDK
 */

import {
  escapeHtml,
  escapeJs,
  escapeUrl,
  hashString,
  timingSafeEqual,
  maskSensitiveData,
  SECURITY_CONSTANTS,
  generateSecureToken,
} from "../shared/securityUtils";

// Constants specific to this module
const PATTERN_WINDOW_SIZE = 50;
const MAX_REQUESTS_PER_WINDOW = 100;
const MAX_SIMILAR_REQUESTS = 20;

// Default window time for pattern detection (1 minute in milliseconds)
const DEFAULT_WINDOW_MS = 60000;

// Token storage interface
export interface StoredToken {
  value: string;
  expiresAt: number;
  refreshToken?: string;
}

// For detecting and preventing pen-testing and automated attacks
interface RequestPattern {
  method: string;
  path: string;
  params?: Record<string, any>;
  headers?: Record<string, string[]>;
  timestamp: number;
}

// Stores recent requests for pattern analysis
const recentRequests: RequestPattern[] = [];

/**
 * Secure token storage with encryption
 */
export class SecureTokenStorage {
  private storageKey: string;
  private encryptionKey?: string;
  private useLocalStorage: boolean;

  constructor(
    options: {
      prefix?: string;
      encryptionKey?: string;
      useLocalStorage?: boolean;
    } = {},
  ) {
    this.storageKey = `${options.prefix || "saintcentral"}_auth`;
    this.encryptionKey = options.encryptionKey;
    this.useLocalStorage = options.useLocalStorage !== false;
  }

  /**
   * Store a token securely
   */
  storeToken(token: string, expiresAt: number, refreshToken?: string): boolean {
    try {
      if (!this._isStorageAvailable()) return false;

      const tokenData: StoredToken = {
        value: token,
        expiresAt,
        refreshToken,
      };

      const tokenJson = JSON.stringify(tokenData);
      const secureTokenData = this._encrypt(tokenJson);

      if (this.useLocalStorage) {
        localStorage.setItem(this.storageKey, secureTokenData);
      } else {
        sessionStorage.setItem(this.storageKey, secureTokenData);
      }

      return true;
    } catch (error) {
      console.error("Failed to store token:", error);
      return false;
    }
  }

  /**
   * Retrieve a stored token
   */
  getToken(): StoredToken | null {
    try {
      if (!this._isStorageAvailable()) return null;

      const storage = this.useLocalStorage ? localStorage : sessionStorage;
      const secureTokenData = storage.getItem(this.storageKey);

      if (!secureTokenData) return null;

      const tokenJson = this._decrypt(secureTokenData);
      const tokenData = JSON.parse(tokenJson) as StoredToken;

      // Check if token is expired
      if (tokenData.expiresAt < Date.now()) {
        this.clearToken();
        return null;
      }

      return tokenData;
    } catch (error) {
      console.error("Failed to get token:", error);
      this.clearToken();
      return null;
    }
  }

  /**
   * Clear stored token
   */
  clearToken(): void {
    try {
      if (!this._isStorageAvailable()) return;

      const storage = this.useLocalStorage ? localStorage : sessionStorage;
      storage.removeItem(this.storageKey);
    } catch (error) {
      console.error("Failed to clear token:", error);
    }
  }

  /**
   * Check if storage is available
   */
  private _isStorageAvailable(): boolean {
    try {
      const storage = this.useLocalStorage ? localStorage : sessionStorage;
      const testKey = "__storage_test__";
      storage.setItem(testKey, testKey);
      storage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Encrypt data
   */
  private _encrypt(data: string): string {
    if (!this.encryptionKey) return data;

    try {
      // Simple XOR-based encryption for demonstration
      // In production, use a proper encryption library
      const result = [];
      for (let i = 0; i < data.length; i++) {
        result.push(
          String.fromCharCode(
            data.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length),
          ),
        );
      }
      return btoa(result.join(""));
    } catch (e) {
      console.error("Encryption error:", e);
      return data;
    }
  }

  /**
   * Decrypt data
   */
  private _decrypt(encryptedData: string): string {
    if (!this.encryptionKey) return encryptedData;

    try {
      const decodedData = atob(encryptedData);
      const result = [];
      for (let i = 0; i < decodedData.length; i++) {
        result.push(
          String.fromCharCode(
            decodedData.charCodeAt(i) ^
              this.encryptionKey.charCodeAt(i % this.encryptionKey.length),
          ),
        );
      }
      return result.join("");
    } catch (e) {
      console.error("Decryption error:", e);
      return encryptedData;
    }
  }
}

/**
 * Analyze request patterns to detect and prevent automated attacks
 */
export function analyzeRequestPattern(
  method: string,
  path: string,
  params?: Record<string, any>,
  headers?: Record<string, string[]>,
): { allowed: boolean; reason?: string } {
  const now = Date.now();

  // Add current request to patterns
  recentRequests.push({
    method,
    path,
    params,
    headers,
    timestamp: now,
  });

  // Remove old requests outside the window
  while (recentRequests.length > 0 && now - recentRequests[0].timestamp > DEFAULT_WINDOW_MS) {
    recentRequests.shift();
  }

  // Keep only the latest PATTERN_WINDOW_SIZE requests
  if (recentRequests.length > PATTERN_WINDOW_SIZE) {
    recentRequests.splice(0, recentRequests.length - PATTERN_WINDOW_SIZE);
  }

  // Check for too many requests in the window
  if (recentRequests.length > MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, reason: "Too many requests" };
  }

  // Count similar requests (same path)
  const pathRequests = recentRequests.filter((req) => req.path === path);
  if (pathRequests.length > MAX_SIMILAR_REQUESTS) {
    return { allowed: false, reason: "Too many similar requests" };
  }

  // Additional checks could be added:
  // - Detect sequential parameter scanning
  // - Check for known attack patterns in params
  // - Monitor for distributed patterns

  return { allowed: true };
}

/**
 * Create a signature for a request
 */
async function createRequestSignature(
  body: string,
  secret: string,
  timestamp: number,
): Promise<string> {
  const message = `${body}.${timestamp}`;
  return await hashString(`${message}.${secret}`);
}

/**
 * Secure fetch wrapper that adds security headers and CSRF protection
 */
export async function secureFetch(
  url: string,
  options: RequestInit & {
    csrfToken?: string;
    signRequest?: boolean;
    signatureSecret?: string;
  } = {},
): Promise<Response> {
  // Setup security headers
  const headers = new Headers(options.headers || {});

  // Add CSRF token if provided
  if (options.csrfToken) {
    headers.set(SECURITY_CONSTANTS.CSRF.headerName, options.csrfToken);
  }

  // Add signature if enabled
  if (options.signRequest && options.signatureSecret) {
    const timestamp = Date.now();
    headers.set("X-Request-Timestamp", timestamp.toString());

    // Create signature
    const bodyContent = options.body
      ? typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body)
      : "";

    const signature = await createRequestSignature(bodyContent, options.signatureSecret, timestamp);

    headers.set("X-Request-Signature", signature);
  }

  // Add security headers
  headers.set("X-Requested-With", "XMLHttpRequest");

  // Update options with enhanced headers
  const secureOptions: RequestInit = {
    ...options,
    headers,
    credentials: "include", // For cookies and CSRF
  };

  // Analyze request pattern for security
  const method = options.method || "GET";
  const urlObj = new URL(url);
  const path = urlObj.pathname;

  const analysis = analyzeRequestPattern(method, path);
  if (!analysis.allowed) {
    return Promise.reject(new Error(`Request blocked: ${analysis.reason}`));
  }

  return fetch(url, secureOptions);
}

/**
 * Validate permissions for an operation
 */
export function validatePermissions(
  requiredPermissions: string[],
  userPermissions: string[],
): boolean {
  if (!requiredPermissions.length) return true;
  if (!userPermissions.length) return false;

  return requiredPermissions.every((permission) => userPermissions.includes(permission));
}

/**
 * Secure console logging
 */
export class SecureLogger {
  private enabled: boolean;
  private maskSensitiveInfo: boolean;
  private sensitiveFields: string[];

  constructor(
    options: {
      enabled?: boolean;
      maskSensitiveInfo?: boolean;
      sensitiveFields?: string[];
    } = {},
  ) {
    this.enabled = options.enabled !== false;
    this.maskSensitiveInfo = options.maskSensitiveInfo !== false;
    this.sensitiveFields = options.sensitiveFields || [
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
    ];
  }

  log(...args: any[]): void {
    if (!this.enabled) return;

    const sanitizedArgs = this.maskSensitiveInfo
      ? args.map((arg) => maskSensitiveData(arg, this.sensitiveFields))
      : args;

    console.log(...sanitizedArgs);
  }

  error(...args: any[]): void {
    if (!this.enabled) return;

    const sanitizedArgs = this.maskSensitiveInfo
      ? args.map((arg) => maskSensitiveData(arg, this.sensitiveFields))
      : args;

    console.error(...sanitizedArgs);
  }

  warn(...args: any[]): void {
    if (!this.enabled) return;

    const sanitizedArgs = this.maskSensitiveInfo
      ? args.map((arg) => maskSensitiveData(arg, this.sensitiveFields))
      : args;

    console.warn(...sanitizedArgs);
  }

  info(...args: any[]): void {
    if (!this.enabled) return;

    const sanitizedArgs = this.maskSensitiveInfo
      ? args.map((arg) => maskSensitiveData(arg, this.sensitiveFields))
      : args;

    console.info(...sanitizedArgs);
  }
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

export default {
  SecureTokenStorage,
  secureFetch,
  maskSensitiveData,
  validatePermissions,
  SecureLogger,
  detectBrowserSecurityIssues,
  analyzeRequestPattern,
};
