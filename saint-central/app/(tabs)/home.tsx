import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCRUD } from "@/utils/crudClient";
import ChurchPageLayout from "@/components/church/ChurchPageLayout";
import ChurchPageFallback from "@/components/church/ChurchPageFallback";
import { ChurchContext, ChurchContextData } from "@/contexts/church";
import Spinner from "@/components/ui/Spinner";

export default function HomeScreen() {
  const { session, user } = useAuth();
  const { selectOne, select } = useCRUD();
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
      // Don't load if no session or still loading auth
      if (!session || !user?.id) {
        console.log("No valid session or user");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log("Fetching church data for user:", user.id);

        // Get user profile data
        const userProfile = await selectOne("users", {
          select: "first_name, profile_image",
          where: { id: user.id },
        });

        if (userProfile) {
          setUserData((current) => ({
            username: userProfile.first_name || current.username,
            profileImage: userProfile.profile_image || current.profileImage,
          }));
        } else {
          console.warn("User profile data not found");
        }

        // Get church member data
        const memberData = await selectOne("church_members", {
          select: "*",
          where: { user_id: user.id },
        });

        if (!memberData) {
          console.log("No church membership found for user");
          // This is not necessarily an error - user might not be a church member yet
          setLoading(false);
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

        updateChurchData({ church: church, member: memberData });
        console.log("Successfully loaded church data");
      } catch (error) {
        console.error("Error while loading church page:", error);
        setError(error instanceof Error ? error : new Error("Unknown error occurred"));
      } finally {
        setLoading(false);
      }
    }

    fetchChurchData();
  }, [session, user?.id, selectOne, updateChurchData]);

  // Show loading while auth is still loading
  if (!session && loading) {
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
