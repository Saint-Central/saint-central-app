import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import ChurchPageLayout from "@/components/church/ChurchPageLayout";
import ChurchPageFallback from "@/components/church/ChurchPageFallback";
import { ChurchContext, ChurchContextData } from "@/contexts/church";
import Spinner from "@/components/ui/Spinner";

export default function HomeScreen() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const [churchData, setChurchData] = useState<ChurchContextData>({});
  const [userData, setUserData] = useState<{ username: string; profileImage: string }>({
    username: "Friend",
    profileImage: "",
  });
  const updateChurchData = useCallback((data: ChurchContextData) => {
    setChurchData(data);
  }, []);
  const resetChurchData = useCallback(() => {
    setChurchData({});
  }, []);

  useEffect(() => {
    async function checkChurchMembership(): Promise<void> {
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
        const { data: userData, error: profileError } = await supabase
          .from("users")
          .select("first_name, profile_image")
          .eq("id", user.id)
          .single();
        if (profileError) {
          console.error("Error fetching user profile:", profileError);
        } else if (userData) {
          setUserData((current) => ({
            username: userData.first_name || current.username,
            profileImage: userData.profile_image || current.profileImage,
          }));
        }

        // get church member data
        const { data: memberData, error: memberError } = await supabase
          .from("church_members")
          .select("*")
          .eq("user_id", user.id)
          .single();
        if (memberData && !memberError) {
          updateChurchData({ member: memberData });
        }
      } catch (error) {
        console.error("Error while loading church page:", error);
        setError(error instanceof Error ? error : new Error("Unknown error"));
      }
    }
    checkChurchMembership().finally(() => {
      setLoading(false);
    });
  }, [updateChurchData]);

  if (loading) {
    return <Spinner />;
  }

  // if we have a church member, render the layout
  // else render the fallback
  if (!loading && churchData.member) {
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
