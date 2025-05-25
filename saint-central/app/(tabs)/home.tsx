import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import ChurchPageLayout from "@/components/church/ChurchPageLayout";
import ChurchPageFallback from "@/components/church/ChurchPageFallback";
import { ChurchContext, ChurchContextData } from "@/contexts/church";
import Spinner from "@/components/ui/Spinner";

export default function HomeScreen() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const [churchData, setChurchData] = useState<ChurchContextData | undefined>();
  const [userData, setUserData] = useState<{ username: string; profileImage: string }>({
    username: "Friend",
    profileImage: "",
  });

  const updateChurchData = useCallback((data: ChurchContextData) => {
    setChurchData((curr) => ({ ...curr, ...data }));
  }, []);

  const resetChurchData = useCallback(() => setChurchData(undefined), []);

  useEffect(() => {
    async function fetchChurchData(): Promise<void> {
      setLoading(true);
      try {
        // First get the session to ensure we have the most current session data
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw sessionError;
        }
        // Extract user from session
        const user = sessionData?.session?.user;
        if (!user || !user.id) {
          console.log("No valid user in session");
          return;
        }

        // get user profile data
        const { data: userData } = await supabase
          .from("users")
          .select("first_name, profile_image")
          .eq("id", user.id)
          .single();
        if (!userData) {
          console.error("could not find user");
          return;
        }
        setUserData((current) => ({
          username: userData.first_name || current.username,
          profileImage: userData.profile_image || current.profileImage,
        }));

        // get church member data
        const { data: memberData } = await supabase
          .from("church_members")
          .select("*")
          .eq("user_id", user.id)
          .single();

        const churchId = memberData.church_id;
        if (!churchId) {
          console.error("Error finding church ID", memberData);
          return;
        }
        const { data: churchData } = await supabase.from("churches").select("*").eq("id", churchId);
        if (!churchData || churchData.length === 0) {
          console.error(`Church with ID ${churchId} not found.`);
          return;
        }
        const church = churchData[0];

        if (!church || !memberData) {
          console.error("Could not fetch church and membership data");
          return;
        }
        updateChurchData({ church: church, member: memberData });
      } catch (error) {
        console.error("Error while loading church page:", error);
        setError(error instanceof Error ? error : new Error("Unknown error"));
      }
    }
    fetchChurchData().finally(() => {
      setLoading(false);
    });
  }, [updateChurchData]);

  if (loading) {
    return <Spinner />;
  }

  // if we have a church member, render the layout
  // else render the fallback
  if (!loading && churchData) {
    return (
      <ChurchContext.Provider
        value={{ data: churchData, update: updateChurchData, reset: resetChurchData }}
      >
        <ChurchPageLayout userData={userData} />
      </ChurchContext.Provider>
    );
  }

  return <ChurchPageFallback error={error} />;
}
