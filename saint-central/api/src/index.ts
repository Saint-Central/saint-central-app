import { handleDataRequest } from "./server/dataHandler";
import { handleRealtimeConnection } from "./server/realtime";
import { securityMiddleware, createResponse } from "./server/security";
import { handleAuthRequest } from "./server/authHandler";
import { handleStorageRequest } from "./server/storageHandler";

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
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");

    try {
      // Handle WebSocket connection for realtime functionality
      if (pathParts[1] === "realtime") {
        return handleRealtimeConnection(request, env);
      }

      // Check if path starts with /api
      if (pathParts[1] === "api") {
        return handleDataRequest(request, env);
      }

      // Handle auth endpoints
      if (pathParts[1] === "auth") {
        return handleAuthRequest(request, env);
      }

      // Handle storage endpoints
      if (pathParts[1] === "storage") {
        return handleStorageRequest(request, env);
      }

      // For backward compatibility with existing routes
      if (url.pathname === "/select" || url.pathname === "/update") {
        // Create a modified request with /api prefix
        const newUrl = new URL(request.url);
        newUrl.pathname = `/api${url.pathname}`;

        // Clone the request with the new URL
        const newRequest = new Request(newUrl.toString(), {
          method: request.method,
          headers: request.headers,
          body: request.body,
          redirect: request.redirect,
        });

        return handleDataRequest(newRequest, env);
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
