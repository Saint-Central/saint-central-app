/**
 * Authentication middleware for SaintCentral API
 * Handles authentication and authorization checks
 */

import { Env } from "../../index";
import { securityMiddleware, isTokenBlacklisted, SECURITY_CONSTANTS } from "../security";
import { validateInput, sanitizeInput } from "../../shared/securityUtils";

/**
 * Authentication middleware for API requests
 */
export async function authMiddleware(
  request: Request,
  env: Env,
  options: {
    requireAuth?: boolean;
    requiredRole?: string;
  } = {},
): Promise<{
  isAuthorized: boolean;
  userId?: string;
  error?: Response;
}> {
  // Use the main security middleware to check authentication
  const securityCheck = await securityMiddleware(request, env, {
    requireAuth: options.requireAuth ?? true,
    rateLimitByToken: true,
    validateCsrf: true,
  });

  // If security check failed, return the error
  if (securityCheck.error) {
    return {
      isAuthorized: false,
      error: securityCheck.error,
    };
  }

  // If we required auth but don't have a userId, return unauthorized
  if (options.requireAuth && !securityCheck.userId) {
    return {
      isAuthorized: false,
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    };
  }

  // Successfully authenticated
  return {
    isAuthorized: true,
    userId: securityCheck.userId,
  };
}
