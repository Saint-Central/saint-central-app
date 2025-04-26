import { handleSelect } from "./select";
import { securityMiddleware, createResponse } from "./security";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Add CORS handling for preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const url = new URL(request.url);

    try {
      // Route requests to the universal select API
      if (url.pathname === "/select") {
        return handleSelect(request, env);
      }

      // Handle 404 for unmatched routes
      return createResponse({ error: "Not Found", path: url.pathname }, 404);
    } catch (error) {
      console.error("Unhandled error:", error);
      return createResponse(
        {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
        },
        500,
      );
    }
  },
};
