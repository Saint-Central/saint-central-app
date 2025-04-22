import { useState, useCallback, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/supabaseClient";
import { Message, User } from "../types";
import { MESSAGES_CACHE_KEY } from "../utils/cacheUtils";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export const useMessages = (ministryId: number, currentUser: User | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageLoading, setMessageLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [oldestMessageTimestamp, setOldestMessageTimestamp] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState<string>("");
  const [recentlySentMessageIds, setRecentlySentMessageIds] = useState<Set<string | number>>(
    new Set(),
  );
  const [users, setUsers] = useState<{ [key: string]: User }>({});
  const [cacheLoaded, setCacheLoaded] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [allMessagesLoaded, setAllMessagesLoaded] = useState<boolean>(false);

  // Refs to track loading state without causing dependency changes
  const messageLoadingRef = useRef(messageLoading);
  const isLoadingMoreRef = useRef(isLoadingMore);

  // Keep refs updated with state
  useEffect(() => {
    messageLoadingRef.current = messageLoading;
  }, [messageLoading]);

  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore;
  }, [isLoadingMore]);

  // Reset state when ministry ID changes
  useEffect(() => {
    console.log(`Ministry ID changed to ${ministryId}, resetting message state`);
    // Reset all state when the ministry ID changes
    setMessages([]);
    setMessageLoading(true); // Start loading
    setIsLoadingMore(false);
    setOldestMessageTimestamp(null);
    setCacheLoaded(false);
    setUsers({});
    setRecentlySentMessageIds(new Set());
    // Refs will be updated by their own effects
  }, [ministryId]);

  // Load messages from cache
  const loadMessagesFromCache = useCallback(async () => {
    try {
      console.log(`Loading cached messages for ministry ${ministryId}`);

      const cacheKey = MESSAGES_CACHE_KEY(ministryId);
      const cachedMessagesJson = await AsyncStorage.getItem(cacheKey);

      if (!cachedMessagesJson) {
        console.log(`No cached messages found for ministry ${ministryId}`);
        return false;
      }

      try {
        const cachedMessages = JSON.parse(cachedMessagesJson) as Message[];

        if (!Array.isArray(cachedMessages) || cachedMessages.length === 0) {
          console.log(`Invalid or empty cached messages for ministry ${ministryId}`);
          return false;
        }

        console.log(`Found ${cachedMessages.length} cached messages for ministry ${ministryId}`);

        // Set messages from cache
        setMessages(cachedMessages);

        // Update oldest timestamp for pagination
        if (cachedMessages.length > 0) {
          const oldestMessage = [...cachedMessages].sort(
            (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime(),
          )[0];

          if (oldestMessage) {
            console.log(`Setting oldest timestamp from cache: ${oldestMessage.sent_at}`);
            setOldestMessageTimestamp(oldestMessage.sent_at);
          }

          // Extract user information
          const userMap: { [key: string]: User } = {};
          let userCount = 0;

          cachedMessages.forEach((msg) => {
            if (msg.user) {
              userMap[msg.user.id] = msg.user;
              userCount++;
            }
          });

          console.log(`Extracted ${userCount} users from cached messages`);

          if (userCount > 0) {
            setUsers((prevUsers) => ({ ...prevUsers, ...userMap }));
          }
        }

        return true;
      } catch (parseError) {
        console.error(`Error parsing cached messages for ministry ${ministryId}:`, parseError);
        // Clear the invalid cache
        await AsyncStorage.removeItem(cacheKey);
        return false;
      }
    } catch (error) {
      console.error(`Error loading messages from cache for ministry ${ministryId}:`, error);
      return false;
    } finally {
      setCacheLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ministryId]);

  // Update messages cache
  const updateMessagesCache = useCallback(
    async (messagesToCache: Message[]) => {
      if (!ministryId) {
        console.warn("Cannot update cache: Invalid ministry ID");
        return;
      }

      if (!Array.isArray(messagesToCache)) {
        console.warn("Cannot update cache: Invalid messages format");
        return;
      }

      // Skip empty updates
      if (messagesToCache.length === 0) {
        console.log(`No messages to cache for ministry ${ministryId}, skipping`);
        return;
      }

      try {
        const cacheKey = MESSAGES_CACHE_KEY(ministryId);

        // Deduplicate messages before caching (by ID)
        const uniqueMessages = Array.from(
          new Map(messagesToCache.map((msg) => [msg.id, msg])).values(),
        );

        // Limit cache size to prevent huge storage
        const limitedMessages = uniqueMessages.slice(-100);

        console.log(`Caching ${limitedMessages.length} messages for ministry ${ministryId}`);

        // Use a timeout to let the UI update first, as AsyncStorage operations can be expensive
        setTimeout(async () => {
          try {
            await AsyncStorage.setItem(cacheKey, JSON.stringify(limitedMessages));
          } catch (asyncError) {
            console.error(`Failed to save messages cache for ministry ${ministryId}:`, asyncError);
          }
        }, 50);
      } catch (error) {
        console.error(`Error updating messages cache for ministry ${ministryId}:`, error);
      }
    },
    [ministryId],
  );

  // Function to trigger the ministry-notifications edge function with specific message ID
  const triggerNotificationsEdgeFunction = async (messageId: number) => {
    try {
      const { data, error } = await supabase.functions.invoke("ministry-notifications", {
        method: "POST",
        body: {
          source: "app",
          ministryId: ministryId,
          messageId: messageId,
        },
      });

      if (error) {
        console.error("Error triggering notifications edge function:", error);
      } else {
        console.log("Notifications edge function triggered for message:", messageId, data);
      }
    } catch (error) {
      console.error("Exception triggering notifications edge function:", error);
    }
  };

  // Fetch user data for a message
  const fetchUserForMessage = async (message: Message) => {
    try {
      // Check for duplicates
      const isExactDuplicate = messages.some((m) => m.id === message.id);
      const isContentDuplicate = messages.some(
        (m) =>
          m.message_text === message.message_text &&
          m.user_id === message.user_id &&
          Math.abs(new Date(m.sent_at).getTime() - new Date(message.sent_at).getTime()) < 5000,
      );

      const isDuplicate =
        recentlySentMessageIds.has(message.id) || isExactDuplicate || isContentDuplicate;

      if (isDuplicate) {
        console.log("Skipping duplicate message:", message.id);
        return;
      }

      // Check if we already have the user
      const existingUser = users[message.user_id];

      let userToAttach = existingUser;

      // If we don't have the user, fetch it
      if (!existingUser) {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", message.user_id)
          .single();

        if (userError) {
          console.error("Error fetching user:", userError);
          // Continue with unknown user rather than failing
          userToAttach = {
            id: message.user_id,
            first_name: "Unknown",
            last_name: "User",
            email: "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        } else {
          userToAttach = userData;
          // Update the users object
          setUsers((prev) => ({
            ...prev,
            [userData.id]: userData,
          }));
        }
      }

      // Create new message with user data
      const newMessage = {
        ...message,
        user: userToAttach,
        _status: "sent" as "sending" | "sent" | "error",
      };

      // Update messages with the new message
      setMessages((prev) => {
        const updatedMessages = [...prev, newMessage];
        // Update cache after state is updated
        updateMessagesCache(updatedMessages);
        return updatedMessages;
      });

      // Use haptic feedback for new message notification
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Error in fetchUserForMessage:", error);
    }
  };

  // Fetch messages
  const fetchMessages = useCallback(
    async (loadOlder: boolean = false, isRefresh: boolean = false) => {
      const currentMinistryId = ministryId;
      const MESSAGE_FETCH_LIMIT = 20;
      console.log(
        `Fetching messages for ministry ${currentMinistryId}, loadOlder: ${loadOlder}, isRefresh: ${isRefresh}`,
      );

      // Prevent duplicate loading using refs
      if (loadOlder && isLoadingMoreRef.current) {
        console.log("Already loading older messages (ref check), ignoring request");
        return;
      }
      if (!loadOlder && !isRefresh && messageLoadingRef.current) {
        console.log("Already loading initial messages (ref check), ignoring request");
        return;
      }

      // Set loading state (this will trigger ref updates via useEffect)
      if (loadOlder) {
        console.log(`Setting isLoadingMore to true for ministry ${currentMinistryId}`);
        setIsLoadingMore(true);
      } else {
        console.log(`Setting messageLoading to true for ministry ${currentMinistryId}`);
        setMessageLoading(true);
        if (isRefresh) {
          // Don't reset allMessagesLoaded during refresh to preserve pagination state
        } else {
          setAllMessagesLoaded(false); // Reset on initial load
        }
      }

      try {
        if (loadOlder) {
          console.log(`Using oldest timestamp for pagination: ${oldestMessageTimestamp}`);
        }

        // Build query with count exact
        let query = supabase
          .from("ministry_messages")
          .select("*, user:users(*)", { count: "exact" })
          .eq("ministry_id", currentMinistryId)
          .order("sent_at", { ascending: false })
          .limit(MESSAGE_FETCH_LIMIT);

        if (loadOlder && oldestMessageTimestamp) {
          query = query.lt("sent_at", oldestMessageTimestamp);
        }

        const { data: messagesData, error: messagesError, count } = await query;

        // On initial load (first page), capture the total count of messages
        if (!loadOlder && !isRefresh && count != null) {
          setTotalCount(count);
          console.log(`Total message count for ministry ${ministryId}: ${count}`);
        }

        // Check ministryId consistency after await
        if (ministryId !== currentMinistryId) {
          console.log(
            `Ministry ID changed during fetch for ${currentMinistryId}, aborting state update.`,
          );
          // Reset loading state *if* it was set by this specific instance
          if (loadOlder) setIsLoadingMore(false);
          else setMessageLoading(false);
          return;
        }

        if (messagesError) {
          console.error("Error fetching messages:", messagesError);
          if (loadOlder) setIsLoadingMore(false);
          else setMessageLoading(false);
          return;
        }

        // For initial load, use Supabase count; for pagination, check fetched batch size
        const initialAllLoaded = !loadOlder && count !== null && count <= MESSAGE_FETCH_LIMIT;
        const paginationAllLoaded =
          loadOlder && (!messagesData || messagesData.length < MESSAGE_FETCH_LIMIT);

        if (!messagesData || messagesData.length === 0) {
          console.log(
            `No messages found for ${currentMinistryId} (${loadOlder ? "older" : "initial"})`,
          );
          // If loading older with no data, definitely end
          if (loadOlder) setAllMessagesLoaded(true);
          else if (!loadOlder) setAllMessagesLoaded(true);

          if (loadOlder) setIsLoadingMore(false);
          else setMessageLoading(false);
          return;
        }

        console.log(`Fetched ${messagesData.length} messages for ministry ${currentMinistryId}`);

        // Process messages
        const processedMessages = (messagesData || [])
          .map((msg) => ({
            ...msg,
            user: msg.user || {
              id: msg.user_id,
              first_name: "Unknown",
              last_name: "User",
              email: "",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            _status: "sent" as const,
          }))
          .reverse();

        // Find the oldest message from the fetched data
        if (messagesData.length > 0) {
          // Get the messages in chronological order (oldest first)
          const chronologicalMessages = [...messagesData].sort(
            (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime(),
          );

          const oldestTimestamp = chronologicalMessages[0].sent_at;

          if (
            !oldestMessageTimestamp ||
            new Date(oldestTimestamp) > new Date(chronologicalMessages[0].sent_at)
          ) {
            console.log(`Setting new oldest timestamp: ${oldestTimestamp}`);
            setOldestMessageTimestamp(oldestTimestamp);
          } else {
            console.log(
              `Keeping existing oldest timestamp: ${oldestMessageTimestamp} (older than fetched: ${oldestTimestamp})`,
            );
          }
        }

        // Merge messages (older pages prepend, refresh merges, initial replaces)
        setMessages((prev) => {
          let merged: Message[];
          if (loadOlder) {
            const existingIds = new Set(prev.map((m) => m.id));
            const older = processedMessages.filter((m) => !existingIds.has(m.id));
            merged = [...older, ...prev];
          } else if (isRefresh) {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMsgs = processedMessages.filter((m) => !existingIds.has(m.id));
            const kept = prev.filter((m) => !processedMessages.some((pm) => pm.id === m.id));
            merged = [...kept, ...processedMessages];
          } else {
            merged = processedMessages;
          }
          // Reset loading flags
          setMessageLoading(false);
          setIsLoadingMore(false);
          // Return merged result
          return merged;
        });
      } catch (error) {
        console.error("Error during fetchMessages execution:", error);
        // Ensure loading state is reset if error occurred for current ministry context
        if (ministryId === currentMinistryId) {
          if (loadOlder) setIsLoadingMore(false);
          else setMessageLoading(false);
        }
      }
    },
    // Dependencies: ministryId, oldestTimestamp, and stable callbacks.
    // Loading state refs are used internally, not needed as dependencies.
    [ministryId, oldestMessageTimestamp, updateMessagesCache],
  );

  // Side effect: mark allMessagesLoaded true when we've fetched at least totalCount
  useEffect(() => {
    if (totalCount > 0 && messages.length >= totalCount) {
      console.log(`All ${totalCount} messages loaded.`);
      setAllMessagesLoaded(true);
    } else {
      setAllMessagesLoaded(false);
    }
  }, [messages.length, totalCount]);

  // Initialization and ministry change effect
  useEffect(() => {
    let isMounted = true;
    const currentMinistryId = ministryId;
    console.log(`EFFECT: Initializing/switching to ministry ${currentMinistryId}`);

    // Reset state (already handled by the dedicated ministryId useEffect, but ensure loading starts)
    // setMessageLoading(true); // This is set by the dedicated effect now.
    // setAllMessagesLoaded(false);

    const initialize = async () => {
      if (!isMounted) return;
      console.log(`Initialize function running for ${currentMinistryId}`);

      // Ensure loading is true before starting cache/fetch
      // The ministryId effect should have set this, but double-check
      if (!messageLoadingRef.current) {
        console.log("Initialize: Setting messageLoading true");
        setMessageLoading(true);
      }
      setAllMessagesLoaded(false); // Ensure this is reset

      try {
        const cacheSuccess = await loadMessagesFromCache();

        if (!isMounted || ministryId !== currentMinistryId) {
          console.log(`Initialize aborted post-cache for ${currentMinistryId}`);
          return;
        }

        if (!cacheSuccess) {
          console.log(`Cache miss for ${currentMinistryId}, fetching initial.`);
          await fetchMessages(false); // Initial fetch
        } else {
          console.log(`Cache hit for ${currentMinistryId}, setting messages and refreshing.`);
          // Cache loaded, set messages and mark loading false
          setMessages((prev) => {
            const filtered = prev.filter((msg) => msg.ministry_id === currentMinistryId);
            if (filtered.length !== prev.length) {
              console.log("Filtered cached messages from wrong ministry.");
              updateMessagesCache(filtered);
            }
            // Set loading false AFTER processing cache
            setMessageLoading(false);
            return filtered;
          });

          // Background refresh after cache load
          setTimeout(() => {
            if (isMounted && ministryId === currentMinistryId) {
              console.log(`Background refresh for ${currentMinistryId}`);
              fetchMessages(false); // Refresh
            }
          }, 500);
        }
      } catch (error) {
        console.error(`Error during initialize for ${currentMinistryId}:`, error);
        if (isMounted && ministryId === currentMinistryId) {
          setMessageLoading(false); // Ensure loading stops on error
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
      console.log(`EFFECT CLEANUP: Initializing/switching from ministry ${currentMinistryId}`);
    };
    // Dependencies: ministryId and stable callbacks. fetchMessages is stable enough.
  }, [ministryId, loadMessagesFromCache, updateMessagesCache, fetchMessages]); // Keep fetchMessages here

  // Send a message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const currentMinistryId = ministryId; // Capture ministryId

    // Optimistic UI update needs current user info
    if (!currentUser) {
      console.error("Cannot send message: current user not available.");
      return;
    }

    const messageText = newMessage.trim();
    setNewMessage(""); // Clear input immediately

    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();
    const tempMessage: Message = {
      id: tempId,
      ministry_id: currentMinistryId,
      user_id: currentUser.id,
      sent_at: now,
      message_text: messageText,
      user: currentUser, // Attach current user for optimistic update
      _status: "sending",
    };

    // Add message to state optimistically using functional update
    setMessages((prev) => [...prev, tempMessage]);
    updateMessagesCache([...messages, tempMessage]); // Update cache optimistically

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      // Send message to server
      const { data, error } = await supabase
        .from("ministry_messages")
        .insert({
          ministry_id: currentMinistryId,
          user_id: currentUser.id,
          message_text: messageText,
          push_sent: false, // Assuming push notifications handled separately
        })
        .select("*, user:users(*)") // Fetch the created message with user data
        .single(); // Expecting a single row back

      // After await, check if ministryId has changed
      if (ministryId !== currentMinistryId) {
        console.log(
          `Ministry ID changed after sending message for ${currentMinistryId}, potential UI mismatch.`,
        );
        // Decide how to handle this - maybe just log, or try to update if relevant?
        // For now, just log and let the main subscription handle updates for the *new* ministry.
        return;
      }

      if (error) {
        console.error("Error sending message:", error);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        // Update message status to error using functional update
        setMessages((prev) => {
          const updated = prev.map((msg) =>
            msg.id === tempId ? { ...msg, _status: "error" as const } : msg,
          );
          updateMessagesCache(updated); // Cache the updated status
          return updated;
        });
      } else if (data) {
        // Message sent successfully
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        // Add server ID to recently sent to prevent echo from subscription
        setRecentlySentMessageIds((prev) => {
          const newSet = new Set(prev);
          newSet.add(data.id);
          setTimeout(() => {
            setRecentlySentMessageIds((current) => {
              const updatedSet = new Set(current);
              updatedSet.delete(data.id);
              return updatedSet;
            });
          }, 5000); // Keep track for 5 seconds
          return newSet;
        });

        // Replace temp message with actual server data (including user)
        const serverMessage: Message = {
          ...data,
          user: data.user || currentUser, // Use joined user data, fallback to currentUser
          _status: "sent",
        };

        setMessages((prev) => {
          const updated = prev.map((msg) => (msg.id === tempId ? serverMessage : msg));
          updateMessagesCache(updated); // Cache the final state
          return updated;
        });

        // Trigger edge function for notifications
        if (data.id) {
          try {
            await triggerNotificationsEdgeFunction(data.id);
          } catch (notifError) {
            console.error("Error triggering notification:", notifError);
          }
        }
      }
    } catch (error) {
      console.error("Error during message sending process:", error);
      // Ensure UI reflects error state for the message
      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === tempId ? { ...msg, _status: "error" as const } : msg,
        );
        // Avoid caching potentially duplicate error states if already handled?
        // updateMessagesCache(updated);
        return updated;
      });
    }
  };

  return {
    messages,
    messageLoading,
    isLoadingMore,
    allMessagesLoaded,
    newMessage,
    setNewMessage,
    fetchMessages,
    fetchUserForMessage,
    sendMessage,
    users,
    cacheLoaded,
    loadMessagesFromCache,
    // Expose refs
    messageLoadingRef,
    isLoadingMoreRef,
  };
};

export default useMessages;
