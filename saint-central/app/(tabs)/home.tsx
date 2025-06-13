import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCRUD } from "@/utils/crudClient";
import ChurchPageLayout from "@/components/church/ChurchPageLayout";
import ChurchPageFallback from "@/components/church/ChurchPageFallback";
import { ChurchContext, ChurchContextData } from "@/contexts/church";
import Spinner from "@/components/ui/Spinner";

export default function HomeScreen() {
  const { session, user, loading: authLoading } = useAuth();
  const { selectOne, select } = useCRUD();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const hasFetchedRef = useRef(false);

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
    let isMounted = true;

    async function fetchChurchData(): Promise<void> {
      // Don't load if auth is still loading or no session/user or already fetched
      if (authLoading || !session || !user?.id || hasFetchedRef.current) {
        console.log("Auth loading, no valid session, no user, or already fetched:", { 
          authLoading, 
          hasSession: !!session, 
          hasUser: !!user?.id,
          alreadyFetched: hasFetchedRef.current 
        });
        if (isMounted && !hasFetchedRef.current) {
          setLoading(false);
        }
        return;
      }

      // Mark as fetching to prevent duplicate calls
      hasFetchedRef.current = true;

      if (isMounted) {
        setLoading(true);
        setError(null);
      }

      try {
        console.log("Fetching church data for user:", user.id);

        // Get user profile data
        try {
          const userProfile = await selectOne("users", {
            select: "first_name, profile_image",
            where: { id: user.id },
          });

          if (isMounted && userProfile) {
            setUserData((current) => ({
              username: userProfile.first_name || current.username,
              profileImage: userProfile.profile_image || current.profileImage,
            }));
            console.log("Successfully fetched user profile");
          } else if (isMounted && !userProfile) {
            console.warn("User profile data not found");
          }
        } catch (profileError) {
          console.error("Error fetching user profile:", profileError);
        }

        // Get church member data
        let memberData;
        try {
          console.log("Attempting to fetch church membership for user:", user.id);
          memberData = await selectOne("church_members", {
            select: "*",
            where: { user_id: user.id },
          });
        } catch (memberError) {
          console.error("Error fetching church membership:", memberError);
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        if (!memberData) {
          console.log("No church membership found for user");
          // This is not necessarily an error - user might not be a church member yet
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        const churchId = memberData.church_id;
        if (!churchId) {
          throw new Error("Church ID not found in membership data");
        }

        // Get church data
        const church = await selectOne("churches", {
          select: "*",
          where: { id: churchId },
        });

        if (!church) {
          throw new Error(`Church with ID ${churchId} not found`);
        }

        if (isMounted) {
          updateChurchData({ church: church, member: memberData });
          console.log("Successfully loaded church data");
        }
      } catch (error) {
        console.error("Error while loading church page:", error);
        if (isMounted) {
          setError(error instanceof Error ? error : new Error("Unknown error occurred"));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchChurchData();

    return () => {
      isMounted = false;
    };
  }, [authLoading, session?.access_token, user?.id]);

  // Show loading while auth is still loading
  if (authLoading) {
    return <Spinner />;
  }

  // Show loading while fetching church data
  if (loading) {
    return <Spinner />;
  }

  // If we have a church member, render the layout
  if (churchData) {
    return (
      <ChurchContext.Provider
        value={{ data: churchData, update: updateChurchData, reset: resetChurchData }}
      >
        <ChurchPageLayout userData={userData} />
      </ChurchContext.Provider>
    );
  }

  // Show fallback (no church membership or error)
  return <ChurchPageFallback error={error} />;
}
