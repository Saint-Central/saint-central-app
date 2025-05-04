/**
 * SaintCentral API - Authentication Handler
 * Handles authentication requests for the SaintCentral API
 */

import { Env } from "../index";
import { createClient } from "@supabase/supabase-js";
import {
  securityMiddleware,
  createResponse,
  blacklistToken,
  generateSecureToken,
  createCsrfToken,
} from "./security";
import { validateInput, sanitizeInput } from "../shared/securityUtils";
import { SECURITY_CONSTANTS } from "../shared/securityUtils";

/**
 * Handle authentication requests
 */
export async function handleAuthRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const authAction = pathParts[2]; // /auth/{action}

  try {
    switch (authAction) {
      case "signup":
        return handleSignUp(request, env);

      case "signin":
        return handleSignIn(request, env);

      case "signout":
        return handleSignOut(request, env);

      case "user":
        return handleGetUser(request, env);

      case "refresh":
        return handleRefreshToken(request, env);

      case "reset-password":
        return handleResetPassword(request, env);

      case "update-password":
        return handleUpdatePassword(request, env);

      case "update":
        return handleUpdateUser(request, env);

      case "authorize":
        return handleOAuthAuthorize(request, env);

      case "callback":
        return handleOAuthCallback(request, env);

      default:
        return createResponse({ error: "Unknown auth action" }, 400);
    }
  } catch (error) {
    console.error("Auth handler error:", error);
    return createResponse(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      500,
    );
  }
}

/**
 * Handle user sign up
 */
async function handleSignUp(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await request.json();

    // Validate and sanitize inputs
    const email = validateInput(body.email, "email", { required: true });
    const password = validateInput(body.password, "password", { required: true });

    if (!email.isValid || !password.isValid) {
      return createResponse(
        {
          error: "Invalid input",
          details: [
            ...(email.isValid ? [] : [email.error]),
            ...(password.isValid ? [] : [password.error]),
          ],
        },
        400,
      );
    }

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Sign up the user
    const { data, error } = await supabase.auth.admin.createUser({
      email: email.value,
      password: password.value,
      user_metadata: body.userData || {},
      email_confirm: true, // Auto-confirm for now, can be changed for production
    });

    if (error) {
      return createResponse({ error: error.message }, 400);
    }

    // Create a session for the new user
    // First, sign in with the credentials to get a session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });

    if (signInError) {
      return createResponse({ error: signInError.message }, 400);
    }

    // Generate a CSRF token
    const csrfToken = await createCsrfToken(data.user.id);

    // Return the user and session data
    const response = createResponse(
      {
        user: data.user,
        session: {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          expires_at: new Date(signInData.session.expires_at || Date.now() + 3600000).getTime(),
          user: data.user,
        },
      },
      201,
    );

    // Set CSRF token in response header
    response.headers.set(SECURITY_CONSTANTS.CSRF.headerName, csrfToken);

    return response;
  } catch (error) {
    console.error("Sign up error:", error);
    return createResponse({ error: "Failed to sign up" }, 500);
  }
}

/**
 * Handle user sign in
 */
async function handleSignIn(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await request.json();

    // Validate and sanitize inputs
    const email = validateInput(body.email, "email", { required: true });
    const password = validateInput(body.password, "password", { required: true });

    if (!email.isValid || !password.isValid) {
      return createResponse(
        {
          error: "Invalid input",
          details: [
            ...(email.isValid ? [] : [email.error]),
            ...(password.isValid ? [] : [password.error]),
          ],
        },
        400,
      );
    }

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Sign in the user
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });

    if (error) {
      return createResponse({ error: error.message }, 401);
    }

    // Generate a CSRF token
    const csrfToken = await createCsrfToken(data.user.id);

    // Return the user and session data
    const response = createResponse(
      {
        user: data.user,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: new Date(data.session.expires_at || Date.now() + 3600000).getTime(),
          user: data.user,
        },
      },
      200,
    );

    // Set CSRF token in response header
    response.headers.set(SECURITY_CONSTANTS.CSRF.headerName, csrfToken);

    return response;
  } catch (error) {
    console.error("Sign in error:", error);
    return createResponse({ error: "Failed to sign in" }, 500);
  }
}

/**
 * Handle user sign out
 */
async function handleSignOut(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  // Validate CSRF token and authentication
  const security = await securityMiddleware(request, env, {
    requireAuth: true,
    validateCsrf: true,
  });

  if (security.error) {
    return security.error;
  }

  try {
    // Get the token from the Authorization header
    const authHeader = request.headers.get("Authorization");
    const token = authHeader ? authHeader.replace("Bearer ", "") : null;

    if (!token) {
      return createResponse({ error: "No token provided" }, 400);
    }

    // Blacklist the token - 86400 seconds (24 hours)
    await blacklistToken(token, 86400);

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Sign out on Supabase
    if (security.userId) {
      await supabase.auth.admin.signOut(security.userId);
    }

    return createResponse({ message: "Successfully signed out" }, 200);
  } catch (error) {
    console.error("Sign out error:", error);
    return createResponse({ error: "Failed to sign out" }, 500);
  }
}

/**
 * Handle get user request
 */
async function handleGetUser(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  // Validate authentication
  const security = await securityMiddleware(request, env, {
    requireAuth: true,
    validateCsrf: false,
  });

  if (security.error) {
    return security.error;
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Get user data
    const { data, error } = await supabase.auth.admin.getUserById(security.userId!);

    if (error) {
      return createResponse({ error: error.message }, 400);
    }

    return createResponse({ user: data.user }, 200);
  } catch (error) {
    console.error("Get user error:", error);
    return createResponse({ error: "Failed to get user" }, 500);
  }
}

/**
 * Handle token refresh
 */
async function handleRefreshToken(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await request.json();

    // Validate refresh token
    const refreshToken = validateInput(body.refresh_token, "token", { required: true });

    if (!refreshToken.isValid) {
      return createResponse({ error: refreshToken.error }, 400);
    }

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Refresh the token
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken.value,
    });

    if (error) {
      return createResponse({ error: error.message }, 401);
    }

    // Default to 1 hour from now if user or session is null/undefined
    if (!data.user) {
      return createResponse({ error: "Failed to refresh token: no user returned" }, 401);
    }

    // Generate a new CSRF token
    const csrfToken = await createCsrfToken(data.user.id);

    // Return the session data
    const response = createResponse(
      {
        session: {
          access_token: data.session?.access_token || "",
          refresh_token: data.session?.refresh_token || "",
          expires_at: new Date(data.session?.expires_at || Date.now() + 3600000).getTime(),
          user: data.user,
        },
      },
      200,
    );

    // Set CSRF token in response header
    response.headers.set(SECURITY_CONSTANTS.CSRF.headerName, csrfToken);

    return response;
  } catch (error) {
    console.error("Refresh token error:", error);
    return createResponse({ error: "Failed to refresh token" }, 500);
  }
}

/**
 * Handle reset password request
 */
async function handleResetPassword(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await request.json();

    // Validate email
    const email = validateInput(body.email, "email", { required: true });

    if (!email.isValid) {
      return createResponse({ error: email.error }, 400);
    }

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email.value);

    if (error) {
      return createResponse({ error: error.message }, 400);
    }

    return createResponse({ message: "Password reset email sent" }, 200);
  } catch (error) {
    console.error("Reset password error:", error);
    return createResponse({ error: "Failed to send reset password email" }, 500);
  }
}

/**
 * Handle update password request
 */
async function handleUpdatePassword(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await request.json();

    // Validate inputs
    const password = validateInput(body.password, "password", { required: true });
    const token = validateInput(body.token, "token", { required: true });

    if (!password.isValid || !token.isValid) {
      return createResponse(
        {
          error: "Invalid input",
          details: [
            ...(password.isValid ? [] : [password.error]),
            ...(token.isValid ? [] : [token.error]),
          ],
        },
        400,
      );
    }

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Update password
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token.value,
      type: "recovery",
    });

    if (error) {
      return createResponse({ error: error.message }, 400);
    }

    // Return success
    return createResponse({ message: "Password updated successfully" }, 200);
  } catch (error) {
    console.error("Update password error:", error);
    return createResponse({ error: "Failed to update password" }, 500);
  }
}

/**
 * Handle update user request
 */
async function handleUpdateUser(request: Request, env: Env): Promise<Response> {
  if (request.method !== "PUT") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  // Validate CSRF token and authentication
  const security = await securityMiddleware(request, env, {
    requireAuth: true,
    validateCsrf: true,
  });

  if (security.error) {
    return security.error;
  }

  try {
    const body = await request.json();

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Prepare update data
    const updateData: any = {};

    // Add email if provided
    if (body.email) {
      const email = validateInput(body.email, "email");
      if (!email.isValid) {
        return createResponse({ error: email.error }, 400);
      }
      updateData.email = email.value;
    }

    // Add password if provided
    if (body.password) {
      const password = validateInput(body.password, "password");
      if (!password.isValid) {
        return createResponse({ error: password.error }, 400);
      }
      updateData.password = password.value;
    }

    // Add user metadata if provided
    if (body.data) {
      updateData.user_metadata = body.data;
    }

    // Update user
    const { data, error } = await supabase.auth.admin.updateUserById(security.userId!, updateData);

    if (error) {
      return createResponse({ error: error.message }, 400);
    }

    return createResponse({ user: data.user }, 200);
  } catch (error) {
    console.error("Update user error:", error);
    return createResponse({ error: "Failed to update user" }, 500);
  }
}

/**
 * Handle OAuth authorization request
 */
async function handleOAuthAuthorize(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const provider = pathParts[3]; // /auth/authorize/{provider}

    if (!provider) {
      return createResponse({ error: "Provider not specified" }, 400);
    }

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Generate OAuth URL
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: url.origin + "/auth/callback",
      },
    });

    if (error) {
      return createResponse({ error: error.message }, 400);
    }

    return createResponse({ url: data.url }, 200);
  } catch (error) {
    console.error("OAuth authorize error:", error);
    return createResponse({ error: "Failed to authorize with provider" }, 500);
  }
}

/**
 * Handle OAuth callback
 */
async function handleOAuthCallback(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return createResponse({ error: "Authorization code not provided" }, 400);
    }

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Exchange code for session
    // Note: This is a simplified example. In a real implementation,
    // you would need to handle the OAuth callback according to the specific provider.

    // Generate a CSRF token (use a placeholder ID for now)
    const csrfToken = await generateSecureToken();

    // Return a mock success response for now
    // In a real implementation, we would extract the user and session from Supabase
    const response = createResponse(
      {
        user: { id: "mock-user-id" },
        session: {
          access_token: "mock-access-token",
          refresh_token: "mock-refresh-token",
          expires_at: Date.now() + 3600 * 1000,
          user: { id: "mock-user-id" },
        },
      },
      200,
    );

    // Set CSRF token in response header
    response.headers.set(SECURITY_CONSTANTS.CSRF.headerName, csrfToken);

    return response;
  } catch (error) {
    console.error("OAuth callback error:", error);
    return createResponse({ error: "Failed to process OAuth callback" }, 500);
  }
}
