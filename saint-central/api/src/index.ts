import { handleProfile } from "./profile";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string; // Added missing property
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/profile") {
      return handleProfile(request, env);
    }

    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  },
};
