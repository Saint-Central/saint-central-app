import { createClient } from "@supabase/supabase-js";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export async function handleProfile(request: Request, env: Env): Promise<Response> {
  // Auth client for validating the user
  const authClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // Supabase client for querying the DB using service_role
  const dbClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    global: {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      },
    },
  });

  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser(token);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Invalid token or user not found" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Now fetch the user profile with elevated access
  const { data, error } = await dbClient.from("users").select("*").eq("id", user.id).single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      first_name: data.first_name || "",
      last_name: data.last_name || "",
      profile_image: data.profile_image || "",
      denomination: data.denomination || "",
    }),
    {
      headers: { "Content-Type": "application/json" },
      status: 200,
    },
  );
}
