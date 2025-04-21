import { useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/supabaseClient";
import { Ministry, MinistryMember } from "../types";
import { MINISTRY_CACHE_KEY, MEMBERSHIP_CACHE_KEY } from "../utils/cacheUtils";
import * as Haptics from "expo-haptics";
import { Alert, Platform } from "react-native";

export const useMinistry = (ministryId: number) => {
  const [ministry, setMinistry] = useState<Ministry | null>(null);
  const [members, setMembers] = useState<MinistryMember[]>([]);
  const [isMember, setIsMember] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [cachedMembershipChecked, setCachedMembershipChecked] = useState<boolean>(false);

  // Check cached membership status on initial load
  useEffect(() => {
    const checkCachedMembership = async () => {
      try {
        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error("No user logged in or error:", userError);
          setCachedMembershipChecked(true);
          return;
        }

        // Check cached membership status first
        const cachedMembership = await AsyncStorage.getItem(
          MEMBERSHIP_CACHE_KEY(ministryId, user.id),
        );

        if (cachedMembership) {
          try {
            const membershipData = JSON.parse(cachedMembership);
            const isUserMember = membershipData.isMember === true;

            // Set the membership status from cache
            setIsMember(isUserMember);
            console.log("Using cached membership status:", isUserMember);

            // If we have cached ministry data, use that too
            const cachedMinistry = await AsyncStorage.getItem(MINISTRY_CACHE_KEY(ministryId));

            if (cachedMinistry) {
              try {
                const ministryData = JSON.parse(cachedMinistry);
                setMinistry({
                  ...ministryData,
                  is_member: isUserMember,
                });
              } catch (e) {
                console.error("Error parsing cached ministry:", e);
              }
            }
          } catch (e) {
            console.error("Error parsing cached membership:", e);
          }
        }

        // Mark cached membership as checked
        setCachedMembershipChecked(true);
      } catch (error) {
        console.error("Error checking cached membership:", error);
        // If there's an error, proceed to fetch data from server anyway
        setCachedMembershipChecked(true);
      }
    };

    checkCachedMembership();
  }, [ministryId]);

  // Function to fetch ministry details
  const fetchMinistryDetails = useCallback(async () => {
    try {
      if (!cachedMembershipChecked) {
        // Wait for cached membership check to complete first
        return;
      }

      setLoading(true);

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError);
        throw userError;
      }

      if (!user) {
        console.error("No user logged in");
        throw new Error("No user logged in");
      }

      // Fetch ministry details
      const { data: ministryData, error: ministryError } = await supabase
        .from("ministries")
        .select("*")
        .eq("id", ministryId)
        .single();

      if (ministryError) {
        console.error("Error fetching ministry data:", ministryError);
        throw ministryError;
      }

      // Verify membership status directly from the database
      const { data: membershipData, error: membershipError } = await supabase
        .from("ministry_members")
        .select("id, role")
        .eq("ministry_id", ministryId)
        .eq("user_id", user.id)
        .eq("role", "member")
        .maybeSingle();

      // Set membership status based on direct query
      const isUserMember = !membershipError && membershipData !== null;

      // Update membership cache
      await AsyncStorage.setItem(
        MEMBERSHIP_CACHE_KEY(ministryId, user.id),
        JSON.stringify({
          isMember: isUserMember,
          lastChecked: new Date().toISOString(),
          role: membershipData?.role || null,
        }),
      );

      setIsMember(isUserMember);

      // Fetch ministry members for member count
      const { data: membersData, error: membersError } = await supabase
        .from("ministry_members")
        .select("*")
        .eq("ministry_id", ministryId)
        .eq("role", "member");

      if (membersError) {
        console.error("Error fetching ministry members:", membersError);
      } else {
        setMembers(membersData || []);
      }

      // Update ministry with member count and membership status
      const updatedMinistry = {
        ...ministryData,
        member_count: membersData?.length || 0,
        is_member: isUserMember,
      };

      setMinistry(updatedMinistry);

      // Update ministry cache
      await AsyncStorage.setItem(MINISTRY_CACHE_KEY(ministryId), JSON.stringify(updatedMinistry));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [ministryId, cachedMembershipChecked]);

  // Function to leave the ministry
  const leaveMinistry = useCallback(async () => {
    return new Promise<void>((resolve, reject) => {
      Alert.alert("Leave Ministry", "Are you sure you want to leave this ministry?", [
        { text: "Cancel", style: "cancel", onPress: () => reject(new Error("User cancelled")) },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);

              const {
                data: { user },
                error: authError,
              } = await supabase.auth.getUser();

              if (authError || !user) {
                console.error("Auth error when leaving ministry:", authError);
                Alert.alert("Error", "Authentication error. Please try again.");
                reject(authError || new Error("No user"));
                return;
              }

              const { error } = await supabase
                .from("ministry_members")
                .delete()
                .eq("ministry_id", ministryId)
                .eq("user_id", user.id);

              if (error) {
                console.error("Error leaving ministry:", error);
                Alert.alert("Error", "Could not leave the ministry. Please try again.");
                reject(error);
                return;
              }

              // Haptic feedback for successful leave
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }

              // Update local state and cache
              setIsMember(false);

              if (ministry) {
                const updatedMinistry = {
                  ...ministry,
                  is_member: false,
                  member_count: (ministry.member_count || 1) - 1,
                };

                setMinistry(updatedMinistry);

                // Update ministry cache
                await AsyncStorage.setItem(
                  MINISTRY_CACHE_KEY(ministryId),
                  JSON.stringify(updatedMinistry),
                );
              }

              // Update membership cache
              await AsyncStorage.setItem(
                MEMBERSHIP_CACHE_KEY(ministryId, user.id),
                JSON.stringify({
                  isMember: false,
                  lastChecked: new Date().toISOString(),
                  role: null,
                }),
              );

              Alert.alert("Success", "You have left the ministry");
              resolve();
            } catch (error) {
              console.error("Error in leaveMinistry:", error);
              Alert.alert("Error", "Could not leave the ministry. Please try again.");
              reject(error);
            } finally {
              setLoading(false);
            }
          },
        },
      ]);
    });
  }, [ministryId, ministry]);

  // Function to refresh membership status
  const refreshMembershipStatus = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Error getting user for membership refresh:", userError);
        return;
      }

      // Get membership status directly with a specific query
      const { data: membershipData, error: membershipError } = await supabase
        .from("ministry_members")
        .select("id, role")
        .eq("ministry_id", ministryId)
        .eq("user_id", user.id)
        .eq("role", "member")
        .maybeSingle();

      // Update membership status based on direct query
      const isUserMember = !membershipError && membershipData !== null;

      // Cache the membership status
      await AsyncStorage.setItem(
        MEMBERSHIP_CACHE_KEY(ministryId, user.id),
        JSON.stringify({
          isMember: isUserMember,
          lastChecked: new Date().toISOString(),
          role: membershipData?.role || null,
        }),
      );

      // Only update if there's a change to avoid unnecessary re-renders
      if (isUserMember !== isMember) {
        console.log("Membership status changed, updating UI...");
        setIsMember(isUserMember);

        // Update ministry state if available
        if (ministry) {
          const updatedMinistry = {
            ...ministry,
            is_member: isUserMember,
          };
          setMinistry(updatedMinistry);

          // Update ministry cache
          await AsyncStorage.setItem(
            MINISTRY_CACHE_KEY(ministryId),
            JSON.stringify(updatedMinistry),
          );
        }
      }
    } catch (error) {
      console.error("Error refreshing membership status:", error);
    }
  }, [ministryId, ministry, isMember]);

  return {
    ministry,
    members,
    isMember,
    loading,
    error,
    cachedMembershipChecked,
    fetchMinistryDetails,
    leaveMinistry,
    refreshMembershipStatus,
  };
};

export default useMinistry;
