import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  StyleSheet,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  useWindowDimensions,
  KeyboardAvoidingView,
  Keyboard,
  FlatList,
  Animated,
  Vibration,
} from "react-native";
import { router } from "expo-router";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { supabase } from "../../supabaseClient";
import { Feather } from "@expo/vector-icons";

// --------------------
// Data Interfaces
// --------------------
interface LentTask {
  id: string;
  user_id: string;
  event: string;
  description: string;
  date: string; // ISO date string in UTC (with T00:00:00Z)
  created_at: string;
  user: {
    first_name: string;
    last_name: string;
    email: string;
  };
  likes_count?: number;
  comments_count?: number;
  liked_by_current_user?: boolean;
}

interface Comment {
  id: string;
  user_id: string;
  commentable_id: string;
  commentable_type: string;
  content: string;
  created_at: string;
  updated_at: string;
  user: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface Like {
  id: string;
  user_id: string;
  likeable_id: string;
  likeable_type: string;
  updated_at: string;
  created_at: string;
}

interface Notification {
  message: string;
  type: "error" | "success";
}

type ViewType = "list" | "calendar";

// --------------------
// Lent Guide Events
// --------------------
interface LentEvent {
  date: string;
  title: string;
  description: string;
}

const lentGuideEvents: LentEvent[] = [
  {
    date: "March 5",
    title: "Ash Wednesday",
    description:
      "Attend an Ash Wednesday service to receive ashes on your forehead, symbolizing repentance and mortality. Reflect on areas in your life needing growth and set a personal intention for Lent.",
  },
  // ...rest of the events remain the same
];

// --------------------
// Helper Functions for Calendar
// --------------------
const getDaysInMonth = (month: number, year: number) => {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

const getMonthName = (month: number) => {
  return new Date(0, month).toLocaleString("default", { month: "long" });
};

const getGuideEventsForDate = (date: Date): LentEvent[] => {
  const monthName = date.toLocaleString("default", { month: "long" });
  const day = date.getDate();
  return lentGuideEvents.filter((event) => {
    const match = event.date.match(/^(\w+)\s+(\d+)/);
    if (match) {
      const [, eventMonth, eventDay] = match;
      return eventMonth === monthName && Number(eventDay) === day;
    }
    return false;
  });
};

const formatDateUTC = (dateStr: string): string => {
  const d = new Date(dateStr);
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  return `${month}/${day}/${year}`;
};

const formatToUTC = (date: string): string => {
  return date + "T00:00:00Z";
};

const formatCommentDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    const hours = Math.floor(diffTime / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diffTime / (1000 * 60));
      return minutes <= 1 ? "just now" : `${minutes} minutes ago`;
    }
    return `${hours} hours ago`;
  } else if (diffDays === 1) {
    return "yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
};

// --------------------
// Enhanced Expanded Day View Component
// --------------------
interface ExpandedDayViewProps {
  day: Date;
  onClose: () => void;
  onAddTask: () => void;
  dayTasks: LentTask[];
  guideEvents: LentEvent[];
  currentUserId: string;
  friendColors: { [email: string]: string };
  handleLikeToggle: (task: LentTask) => void;
  handleOpenComments: (task: LentTask) => void;
  showConfirmDelete: (taskId: string) => void;
}

const ExpandedDayView: React.FC<ExpandedDayViewProps> = ({
  day,
  onClose,
  onAddTask,
  dayTasks,
  guideEvents,
  currentUserId,
  friendColors,
  handleLikeToggle,
  handleOpenComments,
  showConfirmDelete,
}) => {
  const slideAnim = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  const formattedDate = day.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Animated.View
      style={[
        styles.expandedDayContainer,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.expandedDayHeader}>
        <Text style={styles.expandedDayTitle}>{formattedDate}</Text>
        <TouchableOpacity style={styles.closeIconButton} onPress={onClose}>
          <Feather name="x" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <ScrollView style={[styles.expandedDayContent, { width: "100%" }]}>
        {guideEvents.length > 0 && (
          <View style={styles.expandedDaySection}>
            <Text style={styles.expandedDaySectionTitle}>Guide Events</Text>
            {guideEvents.map((event, index) => (
              <TouchableOpacity
                key={`guide-${index}`}
                style={styles.expandedDayGuideEvent}
                onPress={() => {
                  onClose();
                  // Optionally, trigger a detailed guide event modal here
                }}
              >
                <View style={styles.expandedDayGuideEventIcon}>
                  <Feather name="calendar" size={14} color="#E9967A" />
                </View>
                <View style={styles.expandedDayGuideEventContent}>
                  <Text style={styles.expandedDayGuideEventTitle}>
                    {event.title}
                  </Text>
                  <Text
                    style={styles.expandedDayGuideEventDesc}
                    numberOfLines={2}
                  >
                    {event.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.expandedDaySection}>
          <Text style={styles.expandedDaySectionTitle}>
            Tasks {dayTasks.length > 0 ? `(${dayTasks.length})` : ""}
          </Text>
          {dayTasks.length === 0 ? (
            <Text style={styles.expandedDayEmptyText}>
              No tasks for this day. Add one to get started!
            </Text>
          ) : (
            dayTasks.map((task) => {
              const isUserTask = task.user_id === currentUserId;
              return (
                <View key={task.id} style={styles.expandedDayTask}>
                  {!isUserTask && (
                    <View
                      style={[
                        styles.expandedDayTaskUserIndicator,
                        { backgroundColor: friendColors[task.user.email] },
                      ]}
                    />
                  )}
                  <View style={styles.expandedDayTaskContent}>
                    <Text style={styles.expandedDayTaskTitle}>
                      {task.event}
                    </Text>
                    {!isUserTask && (
                      <Text style={styles.expandedDayTaskUser}>
                        By {task.user.first_name} {task.user.last_name}
                      </Text>
                    )}
                    <Text style={styles.expandedDayTaskDesc}>
                      {task.description}
                    </Text>
                    <View style={styles.expandedDayTaskActions}>
                      <TouchableOpacity
                        style={styles.expandedDayTaskAction}
                        onPress={() => handleLikeToggle(task)}
                      >
                        <Feather
                          name="heart"
                          size={16}
                          color={
                            task.liked_by_current_user ? "#E9967A" : "#9CA3AF"
                          }
                        />
                        <Text
                          style={[
                            styles.expandedDayTaskActionText,
                            task.liked_by_current_user &&
                              styles.expandedDayTaskActionTextActive,
                          ]}
                        >
                          {task.likes_count || 0}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.expandedDayTaskAction}
                        onPress={() => handleOpenComments(task)}
                      >
                        <Feather
                          name="message-square"
                          size={16}
                          color="#9CA3AF"
                        />
                        <Text style={styles.expandedDayTaskActionText}>
                          {task.comments_count || 0}
                        </Text>
                      </TouchableOpacity>
                      {isUserTask && (
                        <TouchableOpacity
                          style={styles.expandedDayTaskAction}
                          onPress={() => {
                            onClose();
                            showConfirmDelete(task.id);
                          }}
                        >
                          <Feather name="trash-2" size={16} color="#FCA5A5" />
                          <Text style={styles.expandedDayTaskDeleteText}>
                            Delete
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
      <TouchableOpacity
        style={styles.floatingAddTaskButton}
        onPress={onAddTask}
      >
        <Feather name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
};

// --------------------
// Lent2025 Screen Component
// --------------------
const Lent2025Screen: React.FC = () => {
  const { width } = useWindowDimensions();
  const calendarWidth = Math.min(width, 500) - 32;

  // --------------------
  // State Management
  // --------------------
  const [lentTasks, setLentTasks] = useState<LentTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [newTask, setNewTask] = useState({
    event: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showInlineDatePicker, setShowInlineDatePicker] = useState(false);
  const [editingTask, setEditingTask] = useState<LentTask | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [view, setView] = useState<ViewType>("calendar");
  const [currentMonth, setCurrentMonth] = useState<number>(
    new Date().getMonth()
  );
  const [currentYear, setCurrentYear] = useState<number>(
    new Date().getFullYear()
  );
  const [selectedGuideEvent, setSelectedGuideEvent] =
    useState<LentEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [taskComments, setTaskComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [selectedTaskForComments, setSelectedTaskForComments] =
    useState<LentTask | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);

  // Animation refs
  const likeAnimations = useRef<{ [taskId: string]: Animated.Value }>(
    {}
  ).current;
  const heartAnimations = useRef<{ [taskId: string]: Animated.Value }>(
    {}
  ).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // Memoized friend tasks and colors
  const friendTasks = useMemo(
    () => lentTasks.filter((task) => task.user_id !== currentUserId),
    [lentTasks, currentUserId]
  );
  const uniqueFriendEmails = useMemo(
    () => Array.from(new Set(friendTasks.map((task) => task.user.email))),
    [friendTasks]
  );
  const palette = useMemo(
    () => [
      "#E9967A",
      "#FAC898",
      "#FF8C69",
      "#FFB347",
      "#FFA07A",
      "#F4A460",
      "#FFD700",
    ],
    []
  );
  const friendColors = useMemo(() => {
    const colors: { [email: string]: string } = {};
    uniqueFriendEmails.forEach((email, index) => {
      colors[email] = palette[index % palette.length];
    });
    return colors;
  }, [uniqueFriendEmails, palette]);

  // Keyboard event listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => setKeyboardVisible(false)
    );
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Fetch current user
  const fetchCurrentUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;
      if (user) setCurrentUserId(user.id);
    } catch (error) {
      console.error("Error fetching current user:", error);
      showNotification("Authentication error. Please log in again.", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setIsLoading(true);
      const { data: friendData, error: friendError } = await supabase
        .from("friends")
        .select("user_id_1, user_id_2, status")
        .or(`user_id_1.eq.${currentUserId},user_id_2.eq.${currentUserId}`)
        .eq("status", "accepted");
      if (friendError) throw friendError;
      const friendIds =
        friendData?.map((f) =>
          f.user_id_1 === currentUserId ? f.user_id_2 : f.user_id_1
        ) || [];
      const uniqueFriendIds = Array.from(new Set(friendIds));
      const { data, error } = await supabase
        .from("lent_tasks")
        .select("*, user:users (first_name, last_name, email)")
        .in("user_id", [currentUserId, ...uniqueFriendIds])
        .order("created_at", { ascending: false });
      if (error) throw error;
      const tasksWithMetadata = await Promise.all(
        (data || []).map(async (task) => {
          const [likesResponse, userLikeResponse, commentsResponse] =
            await Promise.all([
              supabase
                .from("likes")
                .select("*", { count: "exact", head: false })
                .eq("likeable_id", task.id)
                .eq("likeable_type", "lent_tasks"),
              supabase
                .from("likes")
                .select("*")
                .eq("likeable_id", task.id)
                .eq("likeable_type", "lent_tasks")
                .eq("user_id", currentUserId)
                .maybeSingle(),
              supabase
                .from("comments")
                .select("*", { count: "exact", head: false })
                .eq("commentable_id", task.id)
                .eq("commentable_type", "lent_tasks"),
            ]);
          const errors = [];
          if (likesResponse.error)
            errors.push(`Likes error: ${likesResponse.error.message}`);
          if (userLikeResponse.error)
            errors.push(`User like error: ${userLikeResponse.error.message}`);
          if (commentsResponse.error)
            errors.push(`Comments error: ${commentsResponse.error.message}`);
          if (errors.length > 0) {
            console.error("Error fetching task metadata:", errors.join(", "));
          }
          return {
            ...task,
            likes_count: likesResponse.count || 0,
            comments_count: commentsResponse.count || 0,
            liked_by_current_user: !!userLikeResponse.data,
          };
        })
      );
      setLentTasks(tasksWithMetadata || []);
    } catch (error: unknown) {
      console.error("Error fetching tasks:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showNotification("Error fetching tasks: " + errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  const fetchComments = async (taskId: string) => {
    if (!taskId) return;
    try {
      setCommentLoading(true);
      const { data, error } = await supabase
        .from("comments")
        .select("*, user:users (first_name, last_name, email)")
        .eq("commentable_id", taskId)
        .eq("commentable_type", "lent_tasks")
        .order("created_at", { ascending: true });
      if (error) throw error;
      setTaskComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showNotification("Error fetching comments: " + errorMessage, "error");
      setTaskComments([]);
    } finally {
      setCommentLoading(false);
    }
  };

  const showNotification = (message: string, type: "error" | "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (currentUserId) fetchTasks();
  }, [currentUserId, fetchTasks]);

  useEffect(() => {
    return () => {
      if (notification) setNotification(null);
    };
  }, [notification]);

  const daysInMonth = useMemo(
    () => getDaysInMonth(currentMonth, currentYear),
    [currentMonth, currentYear]
  );

  const firstDayOfMonth = useMemo(
    () => new Date(currentYear, currentMonth, 1).getDay(),
    [currentYear, currentMonth]
  );

  const lastDayOfPrevMonth = useMemo(
    () => new Date(currentYear, currentMonth, 0).getDate(),
    [currentYear, currentMonth]
  );

  const prevMonthDays = useMemo(
    () =>
      [...Array(firstDayOfMonth)].map((_, i) => {
        const day = new Date(
          currentYear,
          currentMonth - 1,
          lastDayOfPrevMonth - firstDayOfMonth + i + 1
        );
        return { date: day, isCurrentMonth: false };
      }),
    [firstDayOfMonth, lastDayOfPrevMonth, currentYear, currentMonth]
  );

  const currMonthDays = useMemo(
    () =>
      daysInMonth.map((day) => ({
        date: day,
        isCurrentMonth: true,
      })),
    [daysInMonth]
  );

  const totalDaysSoFar = useMemo(
    () => prevMonthDays.length + currMonthDays.length,
    [prevMonthDays.length, currMonthDays.length]
  );

  const rowsNeeded = useMemo(
    () => Math.ceil(totalDaysSoFar / 7),
    [totalDaysSoFar]
  );
  const totalCells = useMemo(() => rowsNeeded * 7, [rowsNeeded]);
  const nextMonthDaysNeeded = useMemo(
    () => totalCells - totalDaysSoFar,
    [totalCells, totalDaysSoFar]
  );

  const nextMonthDays = useMemo(
    () =>
      [...Array(nextMonthDaysNeeded)].map((_, i) => {
        const day = new Date(currentYear, currentMonth + 1, i + 1);
        return { date: day, isCurrentMonth: false };
      }),
    [nextMonthDaysNeeded, currentYear, currentMonth]
  );

  const fullCalendarGrid = useMemo(
    () => [...prevMonthDays, ...currMonthDays, ...nextMonthDays],
    [prevMonthDays, currMonthDays, nextMonthDays]
  );

  const scrollToCurrentDay = useCallback(() => {
    if (!scrollViewRef.current || view !== "calendar") return;
    const today = new Date();
    if (
      today.getMonth() !== currentMonth ||
      today.getFullYear() !== currentYear
    )
      return;
    const todayIndex = fullCalendarGrid.findIndex((dayObj) => {
      const day = dayObj.date;
      return (
        day.getDate() === today.getDate() &&
        day.getMonth() === today.getMonth() &&
        day.getFullYear() === today.getFullYear()
      );
    });
    if (todayIndex === -1) return;
    const rowIndex = Math.floor(todayIndex / 7);
    const yPosition = rowIndex * ((calendarWidth / 7) * 1.5);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: yPosition, animated: true });
    }, 200);
  }, [currentMonth, currentYear, fullCalendarGrid, calendarWidth, view]);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToCurrentDay();
    }, 300);
    return () => clearTimeout(timer);
  }, [scrollToCurrentDay, currentMonth, currentYear, refreshKey, view]);

  const handleCreateTask = async () => {
    if (
      !newTask.event.trim() ||
      !newTask.description.trim() ||
      !newTask.date.trim()
    ) {
      showNotification("Please fill in all fields.", "error");
      return;
    }
    try {
      const formattedDate = formatToUTC(newTask.date);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("lent_tasks").insert([
        {
          user_id: user.id,
          event: newTask.event,
          description: newTask.description,
          date: formattedDate,
        },
      ]);
      if (error) throw error;
      showNotification("Task created successfully!", "success");
      Keyboard.dismiss();
      setShowTaskModal(false);
      setSelectedDay(null);
      setNewTask({
        event: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
      setShowInlineDatePicker(false);
      fetchTasks();
    } catch (error) {
      console.error("Error creating task:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showNotification(`Error creating task: ${errorMessage}`, "error");
    }
  };

  const handleEditTask = (task: LentTask) => {
    setSelectedDay(null);
    const editTask = { ...task, date: task.date.split("T")[0] };
    setEditingTask(editTask);
  };

  const handleUpdateTask = async () => {
    if (
      !editingTask ||
      !editingTask.event.trim() ||
      !editingTask.description.trim() ||
      !editingTask.date.trim()
    ) {
      showNotification("Please fill in all fields.", "error");
      return;
    }
    try {
      const formattedDate = formatToUTC(editingTask.date);
      const { error } = await supabase
        .from("lent_tasks")
        .update({
          event: editingTask.event,
          description: editingTask.description,
          date: formattedDate,
        })
        .eq("id", editingTask.id);
      if (error) throw error;
      showNotification("Task updated successfully!", "success");
      setEditingTask(null);
      fetchTasks();
    } catch (error) {
      console.error("Error updating task:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showNotification(`Error updating task: ${errorMessage}`, "error");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("lent_tasks")
        .delete()
        .eq("id", taskId);
      if (error) throw error;
      showNotification("Task deleted successfully!", "success");
      fetchTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showNotification(`Error deleting task: ${errorMessage}`, "error");
    }
  };

  // ---- Animation Helpers ----
  const animateLikeButton = (taskId: string, liked: boolean) => {
    if (!likeAnimations[taskId]) {
      likeAnimations[taskId] = new Animated.Value(1);
    }
    if (!heartAnimations[taskId]) {
      heartAnimations[taskId] = new Animated.Value(liked ? 1 : 0);
    }
    const scaleAnim = likeAnimations[taskId];
    const heartAnim = heartAnimations[taskId];
    if (Platform.OS !== "web") {
      Vibration.vibrate(liked ? [0, 30, 10, 20] : 20);
    }
    if (liked) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.6,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
    Animated.timing(heartAnim, {
      toValue: liked ? 1 : 0,
      duration: liked ? 400 : 300,
      useNativeDriver: false,
    }).start();
  };

  const handleLikeToggle = async (task: LentTask) => {
    try {
      const willBeLiked = !task.liked_by_current_user;
      setLentTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === task.id
            ? {
                ...t,
                likes_count: willBeLiked
                  ? (t.likes_count || 0) + 1
                  : Math.max(0, (t.likes_count || 0) - 1),
                liked_by_current_user: willBeLiked,
              }
            : t
        )
      );
      animateLikeButton(task.id, willBeLiked);
      if (willBeLiked) {
        const { error } = await supabase.from("likes").insert([
          {
            user_id: currentUserId,
            likeable_id: task.id,
            likeable_type: "lent_tasks",
          },
        ]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("likeable_id", task.id)
          .eq("likeable_type", "lent_tasks")
          .eq("user_id", currentUserId);
        if (error) throw error;
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showNotification(`Error: ${errorMessage}`, "error");
      fetchTasks();
    }
  };

  const handleOpenComments = (task: LentTask) => {
    setSelectedDay(null);
    setSelectedTaskForComments(task);
    setTaskComments([]);
    setCommentLoading(true);
    fetchComments(task.id);
    setShowCommentModal(true);
  };

  const handleAddComment = async () => {
    if (!selectedTaskForComments || !newComment.trim()) return;
    try {
      const { data, error } = await supabase
        .from("comments")
        .insert([
          {
            user_id: currentUserId,
            commentable_id: selectedTaskForComments.id,
            commentable_type: "lent_tasks",
            content: newComment.trim(),
          },
        ])
        .select("*, user:users(first_name, last_name, email)");
      if (error) throw error;
      if (data && data.length > 0) {
        setTaskComments((prev) => [...prev, data[0]]);
      }
      setLentTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === selectedTaskForComments.id
            ? { ...t, comments_count: (t.comments_count || 0) + 1 }
            : t
        )
      );
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showNotification(`Error adding comment: ${errorMessage}`, "error");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedTaskForComments) return;
    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);
      if (error) throw error;
      setTaskComments((prev) =>
        prev.filter((comment) => comment.id !== commentId)
      );
      setLentTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === selectedTaskForComments.id
            ? { ...t, comments_count: Math.max(0, (t.comments_count || 0) - 1) }
            : t
        )
      );
      showNotification("Comment deleted", "success");
    } catch (error) {
      console.error("Error deleting comment:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showNotification(`Error: ${errorMessage}`, "error");
    }
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const getTasksForDay = useCallback(
    (date: Date): LentTask[] => {
      return lentTasks.filter((task) => {
        const taskDate = new Date(task.date);
        return (
          taskDate.getUTCFullYear() === date.getUTCFullYear() &&
          taskDate.getUTCMonth() === date.getUTCMonth() &&
          taskDate.getUTCDate() === date.getUTCDate()
        );
      });
    },
    [lentTasks]
  );

  const handleAddTaskForDay = (day: Date) => {
    setSelectedDay(null);
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, "0");
    const dayNum = String(day.getDate()).padStart(2, "0");
    const isoDate = `${year}-${month}-${dayNum}`;
    setSelectedDate(day);
    setNewTask({ ...newTask, date: isoDate });
    setShowTaskModal(true);
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const showConfirmDelete = (taskId: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this task?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: () => handleDeleteTask(taskId),
          style: "destructive",
        },
      ]
    );
  };

  const showConfirmDeleteComment = (commentId: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: () => handleDeleteComment(commentId),
          style: "destructive",
        },
      ]
    );
  };

  const renderTaskCard = (task: LentTask, isUserTask: boolean) => {
    if (!likeAnimations[task.id]) {
      likeAnimations[task.id] = new Animated.Value(1);
    }
    if (!heartAnimations[task.id]) {
      heartAnimations[task.id] = new Animated.Value(
        task.liked_by_current_user ? 1 : 0
      );
    }
    const scaleAnim = likeAnimations[task.id];
    const heartAnim = heartAnimations[task.id];
    const heartColor = heartAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: ["#9CA3AF", "#FDA4AF", "#E9967A"],
    });
    return (
      <View key={task.id} style={styles.taskCard}>
        <Text style={styles.taskTitle}>{task.event}</Text>
        <Text style={styles.taskDate}>
          {!isUserTask && (
            <>
              By {task.user.first_name} {task.user.last_name}{" "}
            </>
          )}
          on {formatDateUTC(task.date)}
        </Text>
        <Text style={styles.taskDescription}>{task.description}</Text>
        <View style={styles.taskInteractionBar}>
          <TouchableOpacity
            style={[
              styles.likeButton,
              task.liked_by_current_user && styles.likedButton,
            ]}
            onPress={() => handleLikeToggle(task)}
            activeOpacity={0.7}
          >
            <Animated.View
              style={[
                styles.heartIconContainer,
                { transform: [{ scale: scaleAnim }] },
              ]}
            >
              <Feather
                name="heart"
                size={task.liked_by_current_user ? 18 : 16}
                color={task.liked_by_current_user ? "#E9967A" : "#9CA3AF"}
                style={styles.heartIconBase}
              />
              <Animated.View
                style={[styles.heartAnimation, { opacity: heartAnim }]}
              >
                <Feather name="heart" size={18} color="#E9967A" />
              </Animated.View>
            </Animated.View>
            <Animated.Text
              style={[
                styles.likeButtonText,
                {
                  color: heartColor,
                  fontWeight: task.liked_by_current_user ? "600" : "400",
                },
              ]}
            >
              {task.likes_count || 0}
            </Animated.Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.commentButton}
            onPress={() => handleOpenComments(task)}
          >
            <Feather name="message-square" size={16} color="#9CA3AF" />
            <Text style={styles.commentButtonText}>
              {task.comments_count || 0}
            </Text>
          </TouchableOpacity>
          {isUserTask && (
            <View style={styles.taskActions}>
              <TouchableOpacity
                style={styles.taskAction}
                onPress={() => handleEditTask(task)}
              >
                <Feather name="edit" size={16} color="#FAC898" />
                <Text style={styles.editActionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.taskAction}
                onPress={() => showConfirmDelete(task.id)}
              >
                <Feather name="trash-2" size={16} color="#FCA5A5" />
                <Text style={styles.deleteActionText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} key={refreshKey}>
      <StatusBar barStyle="light-content" />
      {notification && (
        <View
          style={[
            styles.notification,
            notification.type === "error"
              ? styles.errorNotification
              : styles.successNotification,
          ]}
        >
          <Text style={styles.notificationText}>{notification.message}</Text>
        </View>
      )}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lent 2025 – Task Tracker</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.navigate("/home")}
          >
            <Feather name="home" size={20} color="#FFFFFF" />
            <Text style={styles.headerButtonText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowTaskModal(true)}
          >
            <Feather name="plus-circle" size={20} color="#FFFFFF" />
            <Text style={styles.headerButtonText}>Add Task</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.viewSwitcher}>
        <TouchableOpacity
          style={[
            styles.viewButton,
            view === "calendar" ? styles.activeViewButton : null,
          ]}
          onPress={() => setView("calendar")}
        >
          <Text
            style={
              view === "calendar"
                ? styles.activeViewText
                : styles.viewButtonText
            }
          >
            Calendar View
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.viewButton,
            view === "list" ? styles.activeViewButton : null,
          ]}
          onPress={() => setView("list")}
        >
          <Text
            style={
              view === "list" ? styles.activeViewText : styles.viewButtonText
            }
          >
            List View
          </Text>
        </TouchableOpacity>
      </View>
      {view === "calendar" && (
        <View style={styles.stickyMonthHeader}>
          <TouchableOpacity
            onPress={prevMonth}
            accessibilityLabel="Previous month"
            style={styles.monthNavButton}
          >
            <Feather name="chevron-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {getMonthName(currentMonth)} {currentYear}
          </Text>
          <TouchableOpacity
            onPress={nextMonth}
            accessibilityLabel="Next month"
            style={styles.monthNavButton}
          >
            <Feather name="chevron-right" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {view === "list" ? (
          <View style={styles.listContainer}>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>My Tasks</Text>
              {lentTasks.filter((task) => task.user_id === currentUserId)
                .length === 0 ? (
                <Text style={styles.emptyText}>
                  You haven't added any tasks yet.
                </Text>
              ) : (
                lentTasks
                  .filter((task) => task.user_id === currentUserId)
                  .map((task) => renderTaskCard(task, true))
              )}
            </View>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Friends' Tasks</Text>
              {friendTasks.length === 0 ? (
                <Text style={styles.emptyText}>No tasks from friends yet.</Text>
              ) : (
                friendTasks.map((task) => renderTaskCard(task, false))
              )}
            </View>
          </View>
        ) : (
          <View style={styles.calendarContainer}>
            <View style={[styles.weekdayHeader, { width: calendarWidth }]}>
              {weekDays.map((day, index) => (
                <Text key={index} style={styles.weekdayText}>
                  {day}
                </Text>
              ))}
            </View>
            <View style={[styles.calendarGrid, { width: calendarWidth }]}>
              {fullCalendarGrid.map((dayObj, index) => {
                const { date: day, isCurrentMonth } = dayObj;
                const today = new Date();
                const isToday =
                  day.getDate() === today.getDate() &&
                  day.getMonth() === today.getMonth() &&
                  day.getFullYear() === today.getFullYear();
                const dayTasks = getTasksForDay(day);
                const guideEvents = getGuideEventsForDate(day);
                const hasTask = dayTasks.length > 0;
                const hasGuideEvent = guideEvents.length > 0;
                return (
                  <View key={`day-${index}`} style={styles.dayCellContainer}>
                    <TouchableOpacity
                      style={[
                        styles.dayCell,
                        !isCurrentMonth && styles.dayCellInactive,
                      ]}
                      onPress={() => isCurrentMonth && setSelectedDay(day)}
                      disabled={!isCurrentMonth}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                          !isCurrentMonth && styles.dayNumberInactive,
                          isToday && styles.todayNumber,
                        ]}
                      >
                        {day.getDate()}
                      </Text>
                      {(hasTask || hasGuideEvent) && isCurrentMonth && (
                        <View style={styles.dayIndicators}>
                          {hasTask && (
                            <View
                              style={[
                                styles.dayIndicator,
                                styles.taskIndicator,
                              ]}
                            />
                          )}
                          {hasGuideEvent && (
                            <View
                              style={[
                                styles.dayIndicator,
                                styles.guideIndicator,
                              ]}
                            />
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#E9967A" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {/* Add Task Modal */}
      <Modal
        visible={showTaskModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowTaskModal(false);
          setShowInlineDatePicker(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={[
                styles.modalContent,
                keyboardVisible && styles.modalContentKeyboardVisible,
              ]}
            >
              <Text style={styles.modalTitle}>Add New Task</Text>
              <Text style={styles.inputLabel}>Event</Text>
              <TextInput
                style={styles.textInput}
                value={newTask.event}
                onChangeText={(text) => setNewTask({ ...newTask, event: text })}
                placeholder="Enter event..."
                placeholderTextColor="#9CA3AF"
                accessibilityLabel="Event name"
              />
              <Text style={styles.inputLabel}>Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  if (Platform.OS === "android") {
                    DateTimePickerAndroid.open({
                      value: new Date(newTask.date),
                      onChange: (event, date) => {
                        if (date) {
                          setNewTask({
                            ...newTask,
                            date: date.toISOString().split("T")[0],
                          });
                        }
                      },
                      mode: "date",
                    });
                  } else {
                    setShowInlineDatePicker((prev) => !prev);
                  }
                }}
                accessibilityLabel={`Select date, current date: ${new Date(
                  newTask.date
                ).toLocaleDateString()}`}
              >
                <Text style={styles.dateButtonText}>
                  {new Date(newTask.date).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
              {Platform.OS !== "android" && showInlineDatePicker && (
                <DateTimePicker
                  value={new Date(newTask.date)}
                  mode="date"
                  display="spinner"
                  onChange={(event, date) => {
                    if (date) {
                      setNewTask({
                        ...newTask,
                        date: date.toISOString().split("T")[0],
                      });
                    }
                  }}
                  style={{ backgroundColor: "#000000" }}
                  textColor="#FFFFFF"
                  themeVariant="dark"
                />
              )}
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                value={newTask.description}
                onChangeText={(text) =>
                  setNewTask({ ...newTask, description: text })
                }
                placeholder="Enter description..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                accessibilityLabel="Event description"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowTaskModal(false);
                    setShowInlineDatePicker(false);
                  }}
                  accessibilityLabel="Cancel"
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleCreateTask}
                  accessibilityLabel="Add task"
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Task Modal */}
      <Modal
        visible={!!editingTask}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditingTask(null)}
      >
        {editingTask && (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View
                style={[
                  styles.modalContent,
                  keyboardVisible && styles.modalContentKeyboardVisible,
                ]}
              >
                <Text style={styles.modalTitle}>Edit Task</Text>
                <Text style={styles.inputLabel}>Event</Text>
                <TextInput
                  style={styles.textInput}
                  value={editingTask.event}
                  onChangeText={(text) =>
                    setEditingTask({ ...editingTask, event: text } as LentTask)
                  }
                  placeholder="Enter event..."
                  placeholderTextColor="#9CA3AF"
                  accessibilityLabel="Event name"
                />
                <Text style={styles.inputLabel}>Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => {
                    if (Platform.OS === "android") {
                      DateTimePickerAndroid.open({
                        value: new Date(editingTask.date),
                        onChange: (event, date) => {
                          if (date) {
                            setEditingTask({
                              ...editingTask,
                              date: date.toISOString().split("T")[0],
                            } as LentTask);
                          }
                        },
                        mode: "date",
                      });
                    } else {
                      setShowEditDatePicker((prev) => !prev);
                    }
                  }}
                  accessibilityLabel={`Select date, current date: ${new Date(
                    editingTask.date
                  ).toLocaleDateString()}`}
                >
                  <Text style={styles.dateButtonText}>
                    {new Date(editingTask.date).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                {Platform.OS !== "android" && showEditDatePicker && (
                  <DateTimePicker
                    value={new Date(editingTask.date)}
                    mode="date"
                    display="spinner"
                    onChange={(event, date) => {
                      if (date) {
                        setEditingTask({
                          ...editingTask,
                          date: date.toISOString().split("T")[0],
                        } as LentTask);
                      }
                    }}
                    style={{ backgroundColor: "#000000" }}
                    textColor="#FFFFFF"
                    themeVariant="dark"
                  />
                )}
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textAreaInput]}
                  value={editingTask.description}
                  onChangeText={(text) =>
                    setEditingTask({
                      ...editingTask,
                      description: text,
                    } as LentTask)
                  }
                  placeholder="Enter description..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  accessibilityLabel="Event description"
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setEditingTask(null);
                      setShowEditDatePicker(false);
                    }}
                    accessibilityLabel="Cancel"
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleUpdateTask}
                    accessibilityLabel="Save changes"
                  >
                    <Text style={styles.addButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </Modal>

      {/* Comments Modal */}
      <Modal
        visible={showCommentModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowCommentModal(false);
          setSelectedTaskForComments(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.commentModalContent}>
            {selectedTaskForComments && (
              <>
                <View style={styles.commentModalHeader}>
                  <Text style={styles.commentModalTitle}>
                    Comments on "{selectedTaskForComments.event}"
                  </Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => {
                      setShowCommentModal(false);
                      setSelectedTaskForComments(null);
                    }}
                  >
                    <Feather name="x" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                {commentLoading ? (
                  <View style={styles.commentLoadingContainer}>
                    <ActivityIndicator size="large" color="#E9967A" />
                    <Text style={styles.commentLoadingText}>
                      Loading comments...
                    </Text>
                  </View>
                ) : taskComments.length > 0 ? (
                  <FlatList
                    data={taskComments}
                    keyExtractor={(item) => item.id}
                    style={styles.commentsList}
                    contentContainerStyle={styles.commentsListContent}
                    ItemSeparatorComponent={() => (
                      <View style={styles.commentSeparator} />
                    )}
                    renderItem={({ item }) => (
                      <View style={styles.commentItem}>
                        <View style={styles.commentHeader}>
                          <View style={styles.commentUserInfo}>
                            <View style={styles.commentAvatar}>
                              <Text style={styles.commentAvatarText}>
                                {item.user?.first_name?.charAt(0) || ""}
                                {item.user?.last_name?.charAt(0) || ""}
                              </Text>
                            </View>
                            <View>
                              <Text style={styles.commentAuthor}>
                                {item.user?.first_name || "User"}{" "}
                                {item.user?.last_name || ""}
                              </Text>
                              <Text style={styles.commentTime}>
                                {formatCommentDate(item.created_at)}
                              </Text>
                            </View>
                          </View>
                          {item.user_id === currentUserId && (
                            <TouchableOpacity
                              style={styles.deleteCommentButton}
                              onPress={() => showConfirmDeleteComment(item.id)}
                            >
                              <Feather
                                name="trash-2"
                                size={14}
                                color="#FCA5A5"
                              />
                            </TouchableOpacity>
                          )}
                        </View>
                        <Text style={styles.commentContent}>
                          {item.content}
                        </Text>
                      </View>
                    )}
                  />
                ) : (
                  <View style={styles.emptyCommentsContainer}>
                    <Feather
                      name="message-circle"
                      size={48}
                      color="rgba(233, 150, 122, 0.2)"
                    />
                    <Text style={styles.emptyCommentsText}>
                      No comments yet. Be the first to add one!
                    </Text>
                  </View>
                )}
                <View style={styles.addCommentContainer}>
                  <TextInput
                    style={styles.commentInput}
                    value={newComment}
                    onChangeText={setNewComment}
                    placeholder="Add a comment..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendCommentButton,
                      !newComment.trim() && styles.disabledSendButton,
                    ]}
                    onPress={handleAddComment}
                    disabled={!newComment.trim()}
                  >
                    <Feather name="send" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Guide Event Detail Modal */}
      <Modal
        visible={!!selectedGuideEvent}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedGuideEvent(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={styles.guideEventModal}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.guideEventModalTitle}>
              {selectedGuideEvent?.title}
            </Text>
            <Text style={styles.guideEventModalDesc}>
              {selectedGuideEvent?.description}
            </Text>
            <TouchableOpacity
              style={styles.guideEventCloseButton}
              onPress={() => setSelectedGuideEvent(null)}
              accessibilityLabel="Close"
            >
              <Text style={styles.guideEventCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Expanded Day Modal (Close only via X) */}
      {selectedDay && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {}}
        >
          <View style={styles.modalOverlay}>
            <ExpandedDayView
              day={selectedDay}
              onClose={() => setSelectedDay(null)}
              onAddTask={() => {
                setSelectedDay(null);
                handleAddTaskForDay(selectedDay);
              }}
              dayTasks={getTasksForDay(selectedDay)}
              guideEvents={getGuideEventsForDate(selectedDay)}
              currentUserId={currentUserId}
              friendColors={friendColors}
              handleLikeToggle={handleLikeToggle}
              handleOpenComments={handleOpenComments}
              showConfirmDelete={showConfirmDelete}
            />
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  notification: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 15,
    zIndex: 100,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  errorNotification: { backgroundColor: "#DC2626" },
  successNotification: { backgroundColor: "#16A34A" },
  notificationText: { color: "white", fontWeight: "500", letterSpacing: 0.5 },
  header: {
    padding: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(233, 150, 122, 0.2)",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "300",
    color: "#FFFFFF",
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: 1,
  },
  headerButtons: { flexDirection: "row", justifyContent: "space-between" },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(233, 150, 122, 0.15)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(233, 150, 122, 0.3)",
  },
  headerButtonText: {
    color: "#FFFFFF",
    marginLeft: 8,
    fontWeight: "400",
    letterSpacing: 0.5,
  },
  viewSwitcher: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  viewButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    borderRadius: 30,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  activeViewButton: {
    backgroundColor: "#E9967A",
    borderColor: "rgba(233, 150, 122, 0.6)",
  },
  viewButtonText: { color: "#FFFFFF", fontWeight: "400", letterSpacing: 0.5 },
  activeViewText: { color: "#000000", fontWeight: "500", letterSpacing: 0.5 },
  content: { flex: 1, paddingHorizontal: 16 },
  contentContainer: { paddingBottom: 80 },
  listContainer: { paddingBottom: 20 },
  sectionContainer: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "300",
    color: "#FFFFFF",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E9967A",
    paddingBottom: 8,
    letterSpacing: 0.5,
  },
  emptyText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontStyle: "italic",
    textAlign: "center",
    padding: 12,
    letterSpacing: 0.5,
  },
  taskCard: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#FFFFFF",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  taskDate: {
    fontSize: 14,
    color: "#FAC898",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  taskDescription: {
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 12,
    letterSpacing: 0.3,
    lineHeight: 20,
  },
  taskInteractionBar: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(233, 150, 122, 0.1)",
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  likedButton: { backgroundColor: "rgba(233, 150, 122, 0.1)" },
  heartIconContainer: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  heartIconBase: { position: "absolute" },
  heartAnimation: { position: "absolute" },
  likeButtonText: { color: "#9CA3AF", fontSize: 14, fontWeight: "400" },
  commentButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  commentButtonText: { color: "#9CA3AF", marginLeft: 4, fontSize: 14 },
  taskActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginLeft: "auto",
  },
  taskAction: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
    padding: 4,
  },
  editActionText: { color: "#FAC898", marginLeft: 4, letterSpacing: 0.3 },
  deleteActionText: { color: "#FCA5A5", marginLeft: 4, letterSpacing: 0.3 },
  calendarContainer: { paddingBottom: 20, marginTop: 8 },
  stickyMonthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#000000",
    zIndex: 10,
    marginBottom: 10,
  },
  monthNavButton: { padding: 8, borderRadius: 20 },
  monthTitle: {
    fontSize: 22,
    fontWeight: "300",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  weekdayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(233, 150, 122, 0.2)",
  },
  weekdayText: {
    color: "#E9967A",
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0.5,
    flexBasis: "14.2857%",
    fontSize: 15,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    margin: 0,
    padding: 0,
  },
  dayCellContainer: {
    position: "relative",
    flexBasis: "14.2857%",
    maxWidth: "14.2857%",
  },
  dayCell: {
    justifyContent: "center",
    alignItems: "center",
    padding: 0,
    margin: 0,
    minHeight: 60,
  },
  dayCellInactive: { opacity: 0.4 },
  dayNumber: {
    fontSize: 17,
    color: "#FFFFFF",
    fontWeight: "400",
    letterSpacing: 0.3,
    textAlign: "center",
    width: 36,
    height: 36,
    lineHeight: 36,
    borderRadius: 18,
  },
  dayNumberInactive: { color: "rgba(255, 255, 255, 0.5)" },
  todayNumber: {
    backgroundColor: "#E9967A",
    color: "#000000",
    fontWeight: "600",
    borderRadius: 18,
    overflow: "hidden",
  },
  dayIndicators: {
    flexDirection: "row",
    position: "absolute",
    bottom: 3,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  dayIndicator: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 1.5 },
  taskIndicator: { backgroundColor: "#E9967A" },
  guideIndicator: { backgroundColor: "#FAC898" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 15,
    padding: 20,
    width: "100%",
    maxWidth: 500,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalContentKeyboardVisible: { marginBottom: 150 },
  modalTitle: {
    fontSize: 22,
    fontWeight: "300",
    color: "#FFFFFF",
    marginBottom: 20,
    textAlign: "center",
    letterSpacing: 1,
  },
  inputLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "400",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 15,
    padding: 14,
    color: "#FFFFFF",
    marginBottom: 16,
    letterSpacing: 0.5,
    fontSize: 16,
  },
  textAreaInput: { height: 120, textAlignVertical: "top" },
  dateButton: {
    backgroundColor: "rgba(255, 255, 0, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 15,
    padding: 14,
    marginBottom: 16,
  },
  dateButtonText: { color: "#FFFFFF", letterSpacing: 0.5, fontSize: 16 },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginRight: 8,
    borderRadius: 30,
  },
  cancelButtonText: {
    color: "rgba(255, 255, 255, 0.7)",
    letterSpacing: 0.5,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: "rgba(233, 150, 122, 0.15)",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(233, 150, 122, 0.3)",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "500",
    letterSpacing: 0.5,
    fontSize: 16,
  },
  commentModalContent: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 15,
    margin: 16,
    height: "80%",
    width: "90%",
    maxWidth: 540,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
    overflow: "hidden",
    flexDirection: "column",
  },
  commentModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(233, 150, 122, 0.15)",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  commentModalTitle: {
    fontSize: 18,
    fontWeight: "300",
    color: "#FFFFFF",
    flex: 1,
    letterSpacing: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  commentsList: { flex: 1, width: "100%" },
  commentsListContent: {
    padding: 16,
    paddingBottom: 24,
    width: "100%",
    flexGrow: 1,
  },
  commentSeparator: { height: 12 },
  commentLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  commentLoadingText: {
    color: "#FFFFFF",
    marginTop: 12,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  emptyCommentsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  emptyCommentsText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 12,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  commentItem: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  commentUserInfo: { flexDirection: "row", alignItems: "center" },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(233, 150, 122, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  commentAvatarText: {
    color: "#FFFFFF",
    fontWeight: "300",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  commentAuthor: { color: "#FFFFFF", fontWeight: "500", letterSpacing: 0.5 },
  commentTime: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  commentContent: {
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 22,
    fontSize: 15,
    paddingHorizontal: 2,
    letterSpacing: 0.3,
  },
  addCommentContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(233, 150, 122, 0.15)",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  commentInput: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 30,
    padding: 12,
    paddingHorizontal: 16,
    color: "#FFFFFF",
    marginRight: 10,
    maxHeight: 120,
    fontSize: 15,
    letterSpacing: 0.3,
  },
  sendCommentButton: {
    backgroundColor: "#E9967A",
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  disabledSendButton: { backgroundColor: "rgba(233, 150, 122, 0.3)" },
  deleteCommentButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  deleteCommentText: {
    color: "#FCA5A5",
    fontSize: 12,
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  // New styles for the enhanced expanded day view
  expandedDayContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    borderRadius: 20,
    width: "90%",
    maxHeight: "90%",
    minHeight: 400,
    padding: 16,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
  expandedDayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(233, 150, 122, 0.3)",
    paddingBottom: 8,
    marginBottom: 12,
  },
  expandedDayTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#E9967A",
  },
  closeIconButton: {
    padding: 8,
  },
  expandedDayContent: {
    flex: 1,
    width: "100%",
  },
  expandedDaySection: { marginBottom: 20 },
  expandedDaySectionTitle: {
    fontSize: 20,
    fontWeight: "500",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  expandedDayEmptyText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontStyle: "italic",
    textAlign: "center",
    padding: 12,
  },
  expandedDayGuideEvent: {
    flexDirection: "row",
    backgroundColor: "rgba(233, 150, 122, 0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(233, 150, 122, 0.2)",
  },
  expandedDayGuideEventIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  expandedDayGuideEventContent: { flex: 1 },
  expandedDayGuideEventTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  expandedDayGuideEventDesc: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    lineHeight: 20,
  },
  expandedDayTask: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  expandedDayTaskUserIndicator: { width: 4, borderRadius: 2, marginRight: 10 },
  expandedDayTaskContent: { flex: 1 },
  expandedDayTaskTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  expandedDayTaskUser: {
    fontSize: 13,
    color: "#FAC898",
    marginBottom: 4,
  },
  expandedDayTaskDesc: {
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  expandedDayTaskActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    paddingTop: 10,
  },
  expandedDayTaskAction: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  expandedDayTaskActionText: { color: "#9CA3AF", marginLeft: 4, fontSize: 13 },
  expandedDayTaskActionTextActive: { color: "#E9967A" },
  expandedDayTaskDeleteText: { color: "#FCA5A5", marginLeft: 4, fontSize: 13 },
  floatingAddTaskButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "#E9967A",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 18,
    marginTop: 12,
    letterSpacing: 0.5,
  },
  guideEventModal: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 15,
    padding: 20,
    width: "90%",
    maxWidth: 500,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  guideEventModalTitle: {
    fontSize: 20,
    fontWeight: "300",
    color: "#FFFFFF",
    marginBottom: 12,
    letterSpacing: 1,
  },
  guideEventModalDesc: {
    color: "#FFFFFF",
    marginBottom: 16,
    lineHeight: 22,
    letterSpacing: 0.5,
    fontSize: 16,
  },
  guideEventCloseButton: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(233, 150, 122, 0.15)",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(233, 150, 122, 0.3)",
  },
  guideEventCloseText: {
    color: "#FFFFFF",
    fontWeight: "500",
    letterSpacing: 0.5,
    fontSize: 16,
  },
});

export default Lent2025Screen;
