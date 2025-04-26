import { createClient } from "@supabase/supabase-js";
import { Env } from "./index";

interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at?: string;
  updated_at?: string;
  profile_image?: string;
  phone_number?: string;
  denomination?: string;
}

/**
 * Handle profile requests with direct access to the users table
 */
export async function handleProfile(request: Request, env: Env): Promise<Response> {
  try {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Only allow GET requests
    if (request.method !== "GET") {
      return createResponse({ error: "Method not allowed" }, 405);
    }

    // Validate auth header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return createResponse({ error: "Missing or invalid Authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // Initialize Supabase client with service role key
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Properly verify the JWT token and get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Failed to verify token:", authError);
      return createResponse({ error: "Invalid or expired token" }, 401);
    }

    const userId = user.id;
    console.log("Authenticated user ID:", userId);

    // Query the users table directly now that permissions are fixed
    const { data, error } = await supabase
      .from("users")
      .select(
        "id, email, first_name, last_name, created_at, updated_at, profile_image, phone_number, denomination",
      )
      .eq("id", userId)
      .single();

    // Handle database errors
    if (error) {
      console.error("Database error:", error);
      return createResponse(
        {
          error: "Database error",
          message: error.message,
          details: error,
        },
        500,
      );
    }

    // Handle user not found
    if (!data) {
      return createResponse({ error: "User not found" }, 404);
    }

    // Return the user profile
    return createResponse(data, 200);
  } catch (error) {
    // Handle unexpected errors
    console.error("Unexpected error:", error);
    return createResponse(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
}

/**
 * Helper to create a standardized response
 */
function createResponse(body: any, status: number): Response {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": status === 200 ? "private, max-age=30" : "no-store",
    },
  });
}
