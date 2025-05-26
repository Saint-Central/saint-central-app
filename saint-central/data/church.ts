import { supabase } from "@/supabaseClient";
import { Church, ChurchMember } from "@/types/church";

export async function getMembershipByUser(
  userId: string,
): Promise<{ church: Church; member: ChurchMember } | null> {
  const { data: memberData } = await supabase
    .from("church_members")
    .select("*")
    .eq("user_id", userId)
    .single();

  const churchId = memberData.church_id;
  if (!churchId) {
    console.error("Error finding church ID", memberData);
    return null;
  }
  const { data: churchData } = await supabase.from("churches").select("*").eq("id", churchId);
  if (!churchData || churchData.length === 0) {
    console.error(`Church with ID ${churchId} not found.`);
    return null;
  }
  const church = churchData[0];

  if (!church || !memberData) {
    console.error("Could not fetch church and membership data");
    return null;
  }

  return { church, member: memberData };
}
