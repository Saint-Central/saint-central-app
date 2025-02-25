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
} from "react-native";
import { router } from "expo-router";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { supabase } from "../supabaseClient";
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
  // ... other lent guide events
  {
    date: "April 12",
    title: "Preparation for Holy Week",
    description:
      "Prepare for Holy Week by setting aside time for personal prayer and reflection. Consider creating a sacred space in your home with symbols of the Passion, such as a crucifix or candles, to enhance your prayer experience.",
  },
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
  const day = date.getUTCDate();
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

const formatDateToUTC = (date: Date): string => {
  return date.toISOString().split("T")[0] + "T00:00:00Z";
};

// --------------------
// Lent2025 Screen Component
// --------------------
const Lent2025Screen: React.FC = () => {
  const { width } = useWindowDimensions();
  // For responsiveness, cap the calendar width at 500 minus padding.
  const calendarWidth = Math.min(width, 500) - 32;
  // Adjust threshold to consider all phones as "small devices"
  const isSmallDevice = width < 600;
  // Set number of columns: 2 for phones, 7 for larger screens.
  const columns = isSmallDevice ? 2 : 7;
  const cellSize = calendarWidth / columns;

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
  // For inline date picker in Add Task (iOS)
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

  // Reference for ScrollView to enable scrolling to current day
  const scrollViewRef = useRef<ScrollView>(null);

  // --------------------
  // FRIEND COLORS SETUP (Memoized)
  // --------------------
  const friendTasks = useMemo(
    () => lentTasks.filter((task) => task.user_id !== currentUserId),
    [lentTasks, currentUserId]
  );
  const uniqueFriendEmails = useMemo(
    () => Array.from(new Set(friendTasks.map((task) => task.user.email))),
    [friendTasks]
  );
  const palette = [
    "#F87171",
    "#60A5FA",
    "#34D399",
    "#A78BFA",
    "#FBBF24",
    "#F472B6",
    "#38BDF8",
  ];
  const friendColors = useMemo(() => {
    const colors: { [email: string]: string } = {};
    uniqueFriendEmails.forEach((email, index) => {
      colors[email] = palette[index % palette.length];
    });
    return colors;
  }, [uniqueFriendEmails]);

  // --------------------
  // Keyboard event listeners
  // --------------------
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // --------------------
  // FETCHING FUNCTIONS
  // --------------------
  const fetchCurrentUser = useCallback(async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;
      if (user) setCurrentUserId(user.id);
    } catch (error) {
      console.error("Error fetching current user:", error);
      showNotification("Authentication error. Please log in again.", "error");
    }
  }, []);

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
      setLentTasks(data || []);
    } catch (error: unknown) {
      console.error("Error fetching tasks:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showNotification("Error fetching tasks: " + errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

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
  }, []);

  // Calculate calendar data - moving these calculations up to solve reference issues
  const daysInMonth = useMemo(
    () => getDaysInMonth(currentMonth, currentYear),
    [currentMonth, currentYear]
  );
  // Build full grid (with offset for first day)
  const offset = daysInMonth.length > 0 ? daysInMonth[0].getUTCDay() : 0;

  // For 2-column layout, we don't need offset days
  const fullGrid = isSmallDevice
    ? daysInMonth
    : [...Array(offset).fill(null), ...daysInMonth];

  // On small devices, use a vertical scrolling list of days
  const gridCells = fullGrid;

  // Function to scroll to the current day when page loads
  const scrollToCurrentDay = useCallback(() => {
    if (!scrollViewRef.current || view !== "calendar") return;

    // Find the current date
    const today = new Date();

    // If we're not in the current month/year, don't scroll
    if (
      today.getMonth() !== currentMonth ||
      today.getFullYear() !== currentYear
    )
      return;

    // Find the index of today in the grid
    const todayIndex = fullGrid.findIndex(
      (day) =>
        day &&
        day.getDate() === today.getDate() &&
        day.getMonth() === today.getMonth() &&
        day.getFullYear() === today.getFullYear()
    );

    if (todayIndex === -1) return;

    // Calculate approximate position
    const rowIndex = isSmallDevice
      ? Math.floor(todayIndex / 2)
      : Math.floor(todayIndex / 7);
    const yPosition = rowIndex * (cellSize * 1.5 + 8); // cellHeight + margins

    // Scroll to that position
    scrollViewRef.current.scrollTo({ y: yPosition, animated: true });
  }, [currentMonth, currentYear, fullGrid, isSmallDevice, cellSize, view]);

  // Scroll to current day when component mounts or month/year changes
  useEffect(() => {
    // Small delay to ensure layout is complete
    const timer = setTimeout(() => {
      scrollToCurrentDay();
    }, 300);

    return () => clearTimeout(timer);
  }, [scrollToCurrentDay, currentMonth, currentYear, refreshKey, view]);

  // --------------------
  // TASK CRUD FUNCTIONS
  // --------------------

  interface AdjustDateAndFormatToUTC {
    (date: string): string;
  }

  const adjustDateAndFormatToUTC: AdjustDateAndFormatToUTC = (date) => {
    // Create a new date object
    const adjustedDate = new Date(date);
    // Subtract one day
    adjustedDate.setDate(adjustedDate.getDate() - 1);
    // Format to UTC string
    return adjustedDate.toISOString().split("T")[0] + "T00:00:00Z";
  };

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
      // Use the adjusted date function
      const formattedDate = adjustDateAndFormatToUTC(newTask.date);
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
      setShowTaskModal(false);
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
      // Use the adjusted date function
      const formattedDate = adjustDateAndFormatToUTC(editingTask.date);
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
    } catch (error: unknown) {
      console.error("Error deleting task:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showNotification(`Error deleting task: ${errorMessage}`, "error");
    }
  };

  // --------------------
  // CALENDAR FUNCTIONS
  // --------------------

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

  const handleDayClick = (date: Date) => {
    // Make a copy of the date
    const adjustedDate = new Date(date);

    // Add 1 day
    adjustedDate.setDate(adjustedDate.getDate() + 1);

    // Extract components from the adjusted date
    const year = adjustedDate.getFullYear();
    const month = String(adjustedDate.getMonth() + 1).padStart(2, "0");
    const day = String(adjustedDate.getDate()).padStart(2, "0");

    // Create ISO date string from adjusted date
    const isoDate = `${year}-${month}-${day}`;

    // Create exact date object from adjusted components
    const exactDate = new Date(
      year,
      adjustedDate.getMonth(),
      adjustedDate.getDate()
    );

    setSelectedDate(exactDate);
    setNewTask({ ...newTask, date: isoDate });
    setShowTaskModal(true);
  };

  // Hide weekday header on small devices
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

  // --------------------
  // RENDER
  // --------------------
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
            onPress={() => router.navigate("/")}
          >
            <Feather name="home" size={20} color="#FEFCE8" />
            <Text style={styles.headerButtonText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowTaskModal(true)}
          >
            <Feather name="plus-circle" size={20} color="#FEFCE8" />
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
        <>
          {/* Sticky Month Header */}
          <View style={styles.stickyMonthHeader}>
            <TouchableOpacity
              onPress={prevMonth}
              accessibilityLabel="Previous month"
            >
              <Feather name="chevron-left" size={24} color="#FEFCE8" />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {getMonthName(currentMonth)} {currentYear}
            </Text>
            <TouchableOpacity
              onPress={nextMonth}
              accessibilityLabel="Next month"
            >
              <Feather name="chevron-right" size={24} color="#FEFCE8" />
            </TouchableOpacity>
          </View>

          {/* Sticky Legend */}
          {uniqueFriendEmails.length > 0 && (
            <View style={styles.stickyLegendContainer}>
              <Text style={styles.legendTitle}>Friend tasks:</Text>
              <View style={styles.legendItems}>
                {uniqueFriendEmails.map((email, index) => (
                  <View key={email} style={styles.legendItem}>
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: friendColors[email] },
                      ]}
                    />
                    <Text style={styles.legendText}>
                      {friendTasks.find((t) => t.user.email === email)?.user
                        .first_name || email}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}

      <ScrollView ref={scrollViewRef} style={styles.content}>
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
                  .map((task) => (
                    <View key={task.id} style={styles.taskCard}>
                      <Text style={styles.taskTitle}>{task.event}</Text>
                      <Text style={styles.taskDate}>
                        On {formatDateUTC(task.date)}
                      </Text>
                      <Text style={styles.taskDescription}>
                        {task.description}
                      </Text>
                      <View style={styles.taskActions}>
                        <TouchableOpacity
                          style={styles.taskAction}
                          onPress={() => handleEditTask(task)}
                        >
                          <Feather name="edit" size={16} color="#FEF08A" />
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
                    </View>
                  ))
              )}
            </View>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Friends' Tasks</Text>
              {friendTasks.length === 0 ? (
                <Text style={styles.emptyText}>No tasks from friends yet.</Text>
              ) : (
                friendTasks.map((task) => (
                  <View key={task.id} style={styles.taskCard}>
                    <Text style={styles.taskTitle}>{task.event}</Text>
                    <Text style={styles.taskDate}>
                      By {task.user.first_name} {task.user.last_name} on{" "}
                      {formatDateUTC(task.date)}
                    </Text>
                    <Text style={styles.taskDescription}>
                      {task.description}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        ) : (
          <View style={styles.calendarContainer}>
            {!isSmallDevice && (
              <View style={styles.weekdayHeader}>
                {weekDays.map((day, index) => (
                  <Text
                    key={index}
                    style={[styles.weekdayText, { width: cellSize }]}
                  >
                    {day}
                  </Text>
                ))}
              </View>
            )}
            <View
              style={[
                styles.calendarGrid,
                {
                  width: calendarWidth,
                  alignSelf: "center",
                },
              ]}
            >
              {gridCells.map((day, index) => {
                if (!day) {
                  return (
                    <View
                      key={`empty-${index}`}
                      style={[
                        styles.emptyCell,
                        {
                          width: isSmallDevice
                            ? calendarWidth / 2 - 8
                            : cellSize,
                          height: cellSize * 1.5,
                        },
                      ]}
                    />
                  );
                }
                const today = new Date();
                const isToday =
                  day.getDate() === today.getDate() &&
                  day.getMonth() === today.getMonth() &&
                  day.getFullYear() === today.getFullYear();
                const dayTasks = getTasksForDay(day);
                const guideEvents = getGuideEventsForDate(day);
                return (
                  <TouchableOpacity
                    key={`day-${index}`}
                    style={[
                      styles.dayCell,
                      {
                        width: isSmallDevice ? calendarWidth / 2 - 8 : cellSize,
                        height: cellSize * 1.5,
                      },
                      isToday && styles.todayCell,
                    ]}
                    onPress={() => handleDayClick(day)}
                    accessibilityLabel={`${day.getUTCDate()} ${getMonthName(
                      day.getMonth()
                    )}, ${day.getFullYear()}. ${dayTasks.length} tasks, ${
                      guideEvents.length
                    } events`}
                  >
                    <View style={styles.dayCellHeader}>
                      <Text style={styles.dayNumber}>{day.getUTCDate()}</Text>
                      {isSmallDevice && (
                        <Text style={styles.dayName}>
                          {weekDays[day.getDay()]}
                        </Text>
                      )}
                    </View>
                    <View style={styles.dayContent}>
                      {dayTasks.slice(0, isSmallDevice ? 4 : 2).map((task) =>
                        task.user_id === currentUserId ? (
                          <Text
                            key={task.id}
                            style={styles.dayTaskText}
                            numberOfLines={1}
                          >
                            • {task.event}
                          </Text>
                        ) : (
                          <View
                            key={task.id}
                            style={styles.friendTaskContainer}
                          >
                            <View
                              style={[
                                styles.friendTaskDot,
                                {
                                  backgroundColor:
                                    friendColors[task.user.email],
                                },
                              ]}
                            />
                            <Text
                              style={[
                                styles.friendTaskText,
                                { color: friendColors[task.user.email] },
                              ]}
                              numberOfLines={1}
                            >
                              {task.event}
                            </Text>
                          </View>
                        )
                      )}
                      {dayTasks.length > (isSmallDevice ? 4 : 2) && (
                        <Text style={styles.moreTasks}>
                          +{dayTasks.length - (isSmallDevice ? 4 : 2)} more
                        </Text>
                      )}
                    </View>
                    {guideEvents.length > 0 && (
                      <TouchableOpacity
                        style={styles.guideEventButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectedGuideEvent(guideEvents[0]);
                        }}
                        accessibilityLabel={`Guide event: ${guideEvents[0].title}`}
                      >
                        <Text style={styles.guideEventText} numberOfLines={1}>
                          {guideEvents[0].title}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#EAB308" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
      {/* Add Task Modal with Inline Date Picker for iOS */}
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
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
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
                  style={{ backgroundColor: "#292524" }}
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
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
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
                    style={{ backgroundColor: "#292524" }}
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
      {/* Guide Event Modal */}
      <Modal
        visible={!!selectedGuideEvent}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedGuideEvent(null)}
      >
        {selectedGuideEvent && (
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSelectedGuideEvent(null)}
            accessibilityLabel="Close guide event details"
          >
            <View
              style={styles.guideEventModal}
              onStartShouldSetResponder={() => true}
            >
              <Text style={styles.guideEventModalTitle}>
                {selectedGuideEvent.title}
              </Text>
              <Text style={styles.guideEventModalDesc}>
                {selectedGuideEvent.description}
              </Text>
              <TouchableOpacity
                style={styles.guideEventCloseButton}
                onPress={() => setSelectedGuideEvent(null)}
                accessibilityLabel="Close"
              >
                <Text style={styles.guideEventCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C1917",
  },
  notification: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 8,
    zIndex: 100,
    alignItems: "center",
  },
  errorNotification: { backgroundColor: "#DC2626" },
  successNotification: { backgroundColor: "#16A34A" },
  notificationText: { color: "white", fontWeight: "600" },
  header: { padding: 16, paddingTop: 8 },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FEFCE8",
    marginBottom: 16,
    textAlign: "center",
  },
  headerButtons: { flexDirection: "row", justifyContent: "space-between" },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(234, 179, 8, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.3)",
  },
  headerButtonText: { color: "#FEFCE8", marginLeft: 8, fontWeight: "500" },
  viewSwitcher: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  viewButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#292524",
  },
  activeViewButton: { backgroundColor: "#EAB308" },
  viewButtonText: { color: "#FEFCE8", fontWeight: "500" },
  activeViewText: { color: "#1C1917", fontWeight: "600" },
  content: { flex: 1, paddingHorizontal: 16 },
  listContainer: { paddingBottom: 20 },
  sectionContainer: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FEFCE8",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EAB308",
    paddingBottom: 8,
  },
  emptyText: { color: "rgba(254, 252, 232, 0.7)", fontStyle: "italic" },
  taskCard: {
    backgroundColor: "rgba(41, 37, 36, 0.5)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.2)",
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#FEFCE8",
    marginBottom: 4,
  },
  taskDate: { fontSize: 14, color: "#EAB308", marginBottom: 8 },
  taskDescription: { color: "rgba(254, 252, 232, 0.8)", marginBottom: 12 },
  taskActions: { flexDirection: "row", justifyContent: "flex-start" },
  taskAction: { flexDirection: "row", alignItems: "center", marginRight: 16 },
  editActionText: { color: "#FEF08A", marginLeft: 4 },
  deleteActionText: { color: "#FCA5A5", marginLeft: 4 },
  calendarContainer: { paddingBottom: 20 },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  // New sticky month header
  stickyMonthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#1C1917",
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(234, 179, 8, 0.2)",
  },
  monthTitle: { fontSize: 20, fontWeight: "600", color: "#FEFCE8" },
  weekdayHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  weekdayText: { color: "#EAB308", fontWeight: "600", textAlign: "center" },
  legendContainer: {
    backgroundColor: "#292524",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  // New sticky legend
  stickyLegendContainer: {
    backgroundColor: "#292524",
    borderRadius: 8,
    padding: 12,
    marginTop: 8, // Added padding above the friend key
    marginBottom: 16,
    marginHorizontal: 16,
    zIndex: 9,
  },
  legendTitle: { color: "#FEFCE8", fontWeight: "600", marginBottom: 8 },
  legendItems: { flexDirection: "row", flexWrap: "wrap" },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
    marginBottom: 4,
  },
  colorDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  legendText: { color: "#FEFCE8", fontSize: 12 },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  emptyCell: { margin: 4 },
  dayCell: {
    borderWidth: 1,
    borderColor: "#44403C",
    borderRadius: 8,
    padding: 4,
    margin: 4,
    backgroundColor: "rgba(41, 37, 36, 0.3)",
  },
  dayCellHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayName: {
    color: "#EAB308",
    fontSize: 12,
    fontWeight: "500",
  },
  todayCell: {
    backgroundColor: "rgba(234, 179, 8, 0.2)",
    borderColor: "rgba(234, 179, 8, 0.5)",
  },
  dayNumber: { color: "#FEFCE8", fontWeight: "500", fontSize: 12 },
  dayContent: { flex: 1, marginTop: 2 },
  dayTaskText: { color: "#FEFCE8", fontSize: 10 },
  friendTaskContainer: { flexDirection: "row", alignItems: "center" },
  friendTaskDot: { width: 6, height: 6, borderRadius: 3, marginRight: 2 },
  friendTaskText: { fontSize: 10 },
  moreTasks: { fontSize: 10, color: "#EAB308", marginTop: 2 },
  // Updated guide event button - made larger
  guideEventButton: {
    backgroundColor: "#EAB308",
    borderRadius: 4,
    padding: 4, // Increased padding
    marginTop: 4, // Increased margin
    minHeight: 24, // Added minimum height
  },
  guideEventText: {
    color: "#1C1917",
    fontSize: 10, // Increased font size
    fontWeight: "600", // Made font weight bolder
    textAlign: "center",
    padding: 2, // Added padding
  },
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
    backgroundColor: "#292524",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    maxWidth: 500,
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.2)",
  },
  modalContentKeyboardVisible: {
    marginBottom: 150, // Add extra bottom margin when keyboard is visible
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FEFCE8",
    marginBottom: 16,
  },
  inputLabel: {
    color: "#FEFCE8",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: "#1C1917",
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.2)",
    borderRadius: 8,
    padding: 12,
    color: "#FEFCE8",
    marginBottom: 16,
  },
  textAreaInput: { height: 100, textAlignVertical: "top" },
  dateButton: {
    backgroundColor: "#1C1917",
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.2)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  dateButtonText: { color: "#FEFCE8" },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  cancelButton: { paddingVertical: 8, paddingHorizontal: 16, marginRight: 8 },
  cancelButtonText: { color: "rgba(254, 252, 232, 0.7)" },
  addButton: {
    backgroundColor: "rgba(234, 179, 8, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.3)",
  },
  addButtonText: { color: "#FEFCE8", fontWeight: "500" },
  datePickerContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  datePickerContent: {
    backgroundColor: "#292524",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FEFCE8",
    textAlign: "center",
    marginBottom: 8,
  },
  datePicker: { backgroundColor: "#292524" },
  datePickerCloseButton: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "rgba(234, 179, 8, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.3)",
    marginTop: 16,
  },
  datePickerCloseText: { color: "#FEFCE8", fontWeight: "500" },
  guideEventModal: {
    backgroundColor: "#292524",
    borderRadius: 12,
    padding: 16,
    width: "90%",
    maxWidth: 500,
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.3)",
    alignSelf: "center",
  },
  guideEventModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FEFCE8",
    marginBottom: 8,
  },
  guideEventModalDesc: { color: "#FEFCE8", marginBottom: 16 },
  guideEventCloseButton: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(234, 179, 8, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.3)",
  },
  guideEventCloseText: { color: "#FEFCE8", fontWeight: "500" },
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
  loadingText: { color: "#FEFCE8", fontSize: 18, marginTop: 12 },
});

export default Lent2025Screen;
