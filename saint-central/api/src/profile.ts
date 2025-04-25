import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Service Role key (full DB access)

export async function handleProfile(request: Request): Promise<Response> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Get Authorization header
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // 2. Verify the access token with Supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token or user not found" }), {
        status: 401,
      });
    }

    // 3. Query the user profile using the authenticated user ID
    const { data, error } = await supabase.from("users").select("*").eq("id", user.id).single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!data) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    // 4. Return the safe profile data
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
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server Error" }), { status: 500 });
  }
}
