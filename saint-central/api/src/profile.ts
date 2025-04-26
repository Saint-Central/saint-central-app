import { createClient } from "@supabase/supabase-js";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string; // ADD THIS
}

export async function handleProfile(request: Request, env: Env): Promise<Response> {
  const supabasePublic = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");

  // ✅ Validate token using Public client (Anon Key)
  const {
    data: { user },
    error: authError,
  } = await supabasePublic.auth.getUser(token);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Invalid token or user not found" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ✅ Fetch sensitive data using Admin client (Service Role Key)
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("first_name, last_name, profile_image, denomination")
    .eq("id", user.id)
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
