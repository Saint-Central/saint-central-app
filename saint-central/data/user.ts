import { supabase } from "@/supabaseClient";
import { ChurchMember } from "@/types/church";

export async function getUserData(): Promise<{ first_name: string; profile_image: string } | null> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }
  const user = sessionData?.session?.user;
  if (!user || !user.id) {
    console.log("No valid user in session");
    return null;
  }
  const { data: userData } = await supabase
    .from("users")
    .select("first_name, profile_image")
    .eq("id", user.id)
    .single();
  if (!userData) {
    console.error("could not find user");
    return null;
  }
  return userData;
}

export function isAdminOrOwner(member: ChurchMember): boolean {
  return member.role === "admin" || member.role === "owner";
}
