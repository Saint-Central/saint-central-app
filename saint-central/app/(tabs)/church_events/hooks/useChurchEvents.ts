import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useCRUD } from "@/utils/crudClient";
import { useRouter } from "expo-router";
import { ChurchEvent, UserChurch } from "../types";

export const useChurchEvents = (initialChurchId?: string | string[] | null) => {
  const { user } = useAuth();
  const crud = useCRUD();
  const router = useRouter();

  // User state
  const [userChurches, setUserChurches] = useState<UserChurch[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<number | null>(
    initialChurchId
      ? Number(Array.isArray(initialChurchId) ? initialChurchId[0] : initialChurchId)
      : null,
  );
  const [hasPermissionToCreate, setHasPermissionToCreate] = useState(false);

  // Event states
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filteredEvents, setFilteredEvents] = useState<ChurchEvent[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch user's churches after user is loaded
  useEffect(() => {
    if (user) {
      fetchUserChurches();
    }
  }, [user]);

  // Update filtered events when events or search query changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredEvents(events);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = events.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.excerpt.toLowerCase().includes(query) ||
          event.author_name?.toLowerCase().includes(query),
      );
      setFilteredEvents(filtered);
    }
  }, [searchQuery, events]);

  // Load events when church selection changes
  useEffect(() => {
    console.log("selectedChurchId changed to:", selectedChurchId);
    if (selectedChurchId) {
      fetchEvents();
      checkPermissionsForChurch(selectedChurchId);
    }
  }, [selectedChurchId]);

  // Check permissions whenever userChurches changes
  useEffect(() => {
    if (selectedChurchId && userChurches.length > 0) {
      checkPermissionsForChurch(selectedChurchId);
    }
  }, [userChurches, selectedChurchId]);

  // Initial fetch of events when component mounts, if we have an initialChurchId
  useEffect(() => {
    console.log("Initial useEffect with initialChurchId:", initialChurchId);
    if (initialChurchId) {
      // Force a fetch even if we haven't loaded the user yet
      const numericChurchId = Number(
        Array.isArray(initialChurchId) ? initialChurchId[0] : initialChurchId,
      );
      console.log("Forcing initial fetch with church ID:", numericChurchId);

      // Directly fetch events for this church ID
      const directFetch = async () => {
        try {
          setLoading(true);
          const data = await crud.select("church_events", {
            select: "*",
            where: { church_id: numericChurchId },
            order: "time"
          });

          console.log(`Initial fetch: got ${data?.length || 0} events`);

          // Process recurrence_days_of_week
          const processedEvents = (data || []).map((event) => {
            let daysOfWeek = null;
            if (event.recurrence_days_of_week !== null) {
              const daysString = event.recurrence_days_of_week.toString();
              daysOfWeek = Array.from(daysString, Number);
            }
            return {
              ...event,
              recurrence_days_of_week: daysOfWeek,
            };
          });

          setEvents(processedEvents);
          setFilteredEvents(processedEvents);
        } catch (error) {
          console.error("Error in initial fetch:", error);
          if (error instanceof Error && (error.message.includes('Auth session missing') || error.message.includes('Please log in'))) {
            Alert.alert('Session Expired', 'Your session has expired. Please log in again.', [
              { text: 'OK', onPress: () => router.push('/auth') }
            ]);
          }
        } finally {
          setLoading(false);
        }
      };

      directFetch();
    }
  }, []);

  // Fetch user's churches with role information
  const fetchUserChurches = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log("Fetching user churches for user ID:", user.id);

      // Get churches where the user is a member
      const memberships = await crud.select("church_members", {
        where: { user_id: user.id }
      });

      console.log("User memberships:", memberships);

      if (memberships && memberships.length > 0) {
        // Fetch church details for each membership
        const churches = await Promise.all(
          memberships.map(async (membership: any) => {
            const church = await crud.selectOne("churches", {
              where: { id: membership.church_id }
            });
            console.log(`Church ${membership.church_id}: role = ${membership.role}`);
            return {
              id: membership.church_id,
              name: church?.name || 'Unknown Church',
              role: membership.role,
            };
          })
        );

        console.log("User churches with roles:", churches);
        setUserChurches(churches);

        // Select the first church by default if none is selected
        if (!selectedChurchId && churches.length > 0) {
          setSelectedChurchId(churches[0].id);
        }
      } else {
        console.log("No church memberships found for user");
        setUserChurches([]);
      }
    } catch (error) {
      console.error("Error fetching user churches:", error);
      if (error instanceof Error && (error.message.includes('Auth session missing') || error.message.includes('Please log in'))) {
        Alert.alert('Session Expired', 'Your session has expired. Please log in again.', [
          { text: 'OK', onPress: () => router.push('/auth') }
        ]);
      } else {
        Alert.alert("Error", "Failed to load church information");
      }
    } finally {
      setLoading(false);
    }
  };

  // Check if user has permission to create/edit events for a specific church
  const checkPermissionsForChurch = async (churchId: number) => {
    console.log(`Checking permissions for church ID: ${churchId}`);
    
    if (!user) {
      console.log("No user, setting permission to false");
      setHasPermissionToCreate(false);
      return;
    }

    try {
      // First check if we have the user's churches loaded
      if (userChurches.length > 0) {
        const church = userChurches.find((c) => c.id === churchId);
        const role = church?.role?.toLowerCase() || "";
        console.log(`Found church in userChurches, role: ${role}`);
        setHasPermissionToCreate(role === "admin" || role === "owner");
        return;
      }

      // If userChurches is not loaded yet, fetch the specific membership
      console.log("User churches not loaded, fetching specific membership");
      const membership = await crud.selectOne("church_members", {
        where: { 
          user_id: user.id,
          church_id: churchId
        }
      });

      console.log("Specific membership:", membership);
      
      if (membership) {
        const role = membership.role?.toLowerCase() || "";
        console.log(`User role for church ${churchId}: ${role}`);
        setHasPermissionToCreate(role === "admin" || role === "owner");
      } else {
        console.log(`No membership found for user in church ${churchId}`);
        setHasPermissionToCreate(false);
      }
    } catch (error) {
      console.error("Error checking permissions:", error);
      setHasPermissionToCreate(false);
    }
  };

  // Legacy function for backward compatibility
  const checkPermissions = () => {
    if (selectedChurchId) {
      checkPermissionsForChurch(selectedChurchId);
    }
  };

  // Fetch events for selected church
  const fetchEvents = async () => {
    console.log("fetchEvents called with selectedChurchId:", selectedChurchId);

    // If no church is selected, we can't fetch events
    if (!selectedChurchId) {
      console.log("No selectedChurchId, clearing events");
      setEvents([]);
      setFilteredEvents([]);
      return;
    }

    try {
      setLoading(true);
      console.log("Fetching events for church ID:", selectedChurchId);

      // Fetch events for the selected church
      const data = await crud.select("church_events", {
        select: "*",
        where: { church_id: selectedChurchId },
        order: "time"
      });

      if (data?.length === 0) {
        setEvents([]);
        setFilteredEvents([]);
        return;
      }

      console.log(`Fetched ${data?.length || 0} events from Supabase`);

      // Process recurrence_days_of_week from int to array
      const processedEvents = (data || []).map((event) => {
        let daysOfWeek = null;
        if (event.recurrence_days_of_week !== null) {
          // Convert integer representation to array
          const daysString = event.recurrence_days_of_week.toString();
          daysOfWeek = Array.from(daysString, Number);
        }

        return {
          ...event,
          recurrence_days_of_week: daysOfWeek,
        };
      });

      setEvents(processedEvents);
      setFilteredEvents(processedEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      if (error instanceof Error && (error.message.includes('Auth session missing') || error.message.includes('Please log in'))) {
        Alert.alert('Session Expired', 'Your session has expired. Please log in again.', [
          { text: 'OK', onPress: () => router.push('/auth') }
        ]);
      } else {
        Alert.alert("Error", "Failed to load church events");
      }
    } finally {
      setLoading(false);
    }
  };

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  }, [selectedChurchId]);

  return {
    user,
    userChurches,
    selectedChurchId,
    setSelectedChurchId,
    hasPermissionToCreate,
    events,
    loading,
    refreshing,
    filteredEvents,
    searchQuery,
    setSearchQuery,
    fetchEvents,
    onRefresh,
  };
};

export default useChurchEvents;
