import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { supabase } from "../../../../supabaseClient";
import { User } from "@supabase/supabase-js";
import { ChurchEvent, UserChurch } from "../types";

export const useChurchEvents = (initialChurchId?: string | string[] | null) => {
  // User state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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

  // Fetch current user on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (data && data.user) {
          setCurrentUser(data.user);
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
    };

    fetchCurrentUser();
  }, []);

  // Fetch user's churches after user is loaded
  useEffect(() => {
    if (currentUser) {
      fetchUserChurches();
    }
  }, [currentUser]);

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
      checkPermissions();
    }
  }, [selectedChurchId]);

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
          const { data, error } = await supabase
            .from("church_events")
            .select("*, churches(id, name)")
            .eq("church_id", numericChurchId)
            .order("time", { ascending: true });

          if (error) throw error;

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
        } finally {
          setLoading(false);
        }
      };

      directFetch();
    }
  }, []);

  // Fetch user's churches with role information
  const fetchUserChurches = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      // Get churches where the user is a member
      const { data, error } = await supabase
        .from("church_members")
        .select("church_id, role, churches(id, name)")
        .eq("user_id", currentUser.id);

      if (error) throw error;

      if (data && data.length > 0) {
        // Transform the data into UserChurch format
        const churches: UserChurch[] = data.map((item) => ({
          id: item.church_id,
          name: (item.churches as unknown as { id: number; name: string }).name,
          role: item.role,
        }));

        setUserChurches(churches);

        // Select the first church by default if none is selected
        if (!selectedChurchId && churches.length > 0) {
          setSelectedChurchId(churches[0].id);
        }

        // Check permissions after setting churches
        checkPermissions();
      }
    } catch (error) {
      console.error("Error fetching user churches:", error);
      Alert.alert("Error", "Failed to load church information");
    } finally {
      setLoading(false);
    }
  };

  // Check if user has permission to create/edit events
  const checkPermissions = () => {
    if (!currentUser || !selectedChurchId) {
      setHasPermissionToCreate(false);
      return;
    }

    const church = userChurches.find((c) => c.id === selectedChurchId);
    const role = church?.role?.toLowerCase() || "";

    setHasPermissionToCreate(role === "admin" || role === "owner");
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
      const { data, error } = await supabase
        .from("church_events")
        .select("*, churches(id, name)")
        .eq("church_id", selectedChurchId)
        .order("time", { ascending: true });

      if (error) throw error;

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
      Alert.alert("Error", "Failed to load church events");
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
    currentUser,
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
