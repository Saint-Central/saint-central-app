import { useState, useEffect, useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { supabase } from "../../supabaseClient";
import LottieView from "lottie-react-native";
import ChurchPageLayout from "@/components/church/ChurchPageLayout";
import ChurchPageFallback from "@/components/church/ChuchPageFallback";
import { ChurchContext, ChurchContextData } from "@/contexts/church";
import { ChurchMember } from "@/types/church";

export default function ChurchMembershipScreen() {
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
        const userId = user.id;
        console.log("Getting member data for user_id:", userId);
        const { data: memberData, error: memberError } = await supabase
          .from("church_members")
          .select("*")
          .eq("user_id", user.id)
          .single();
        console.log(memberData, memberError);
        if (memberData && !memberError) {
          console.log((memberData as ChurchMember).user_id, "is member");
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

  // Loading State
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.lottieWrapper}>
          <LottieView
            source={require("../../assets/lottie/loading.json")}
            autoPlay
            loop
            style={styles.lottieAnimation}
            renderMode="HARDWARE"
            speed={0.8}
            resizeMode="cover"
          />
        </View>
      </View>
    );
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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  lottieWrapper: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  lottieAnimation: {
    width: 120,
    height: 120,
  },
});
