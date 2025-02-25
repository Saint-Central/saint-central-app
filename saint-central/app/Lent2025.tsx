import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
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
  // ... other lent guide events (keeping same data)
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
    days.push(new Date(date)); // clone the date
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

// Format date to ISO format with UTC timezone
const formatDateToUTC = (date: Date): string => {
  return date.toISOString().split("T")[0] + "T00:00:00Z";
};

// --------------------
// Lent2025 Screen Component
// --------------------
const Lent2025Screen: React.FC = () => {
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0); // Added for forcing re-renders when needed

  // --------------------
  // FRIEND COLORS SETUP (Memoized)
  // --------------------
  const friendTasks = useMemo(() => {
    return lentTasks.filter((task) => task.user_id !== currentUserId);
  }, [lentTasks, currentUserId]);

  const uniqueFriendEmails = useMemo(() => {
    return Array.from(new Set(friendTasks.map((task) => task.user.email)));
  }, [friendTasks]);

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
  // FETCHING FUNCTIONS
  // --------------------
  const fetchCurrentUser = useCallback(async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        throw error;
      } else if (user) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
      showNotification(`Authentication error. Please log in again.`, "error");
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!currentUserId) return;

    try {
      setIsLoading(true);

      // 1) Get friend relationships for the current user
      const { data: friendData, error: friendError } = await supabase
        .from("friends")
        .select("user_id_1, user_id_2, status")
        .or(`user_id_1.eq.${currentUserId},user_id_2.eq.${currentUserId}`)
        .eq("status", "accepted");

      if (friendError) throw friendError;

      // 2) Build an array of friend IDs
      const friendIds =
        friendData?.map((f) =>
          f.user_id_1 === currentUserId ? f.user_id_2 : f.user_id_1
        ) || [];

      // Remove duplicates
      const uniqueFriendIds = Array.from(new Set(friendIds));

      // 3) Fetch tasks for current user and friends
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

  // Helper function to show notifications
  const showNotification = (message: string, type: "error" | "success") => {
    setNotification({ message, type });
    // Auto-dismiss notification after 3 seconds
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (currentUserId) {
      fetchTasks();
    }
  }, [currentUserId, fetchTasks]);

  // Clean up notification timer
  useEffect(() => {
    return () => {
      // This ensures any active timeout is cleared when component unmounts
      if (notification) {
        setNotification(null);
      }
    };
  }, []);

  // --------------------
  // TASK CRUD FUNCTIONS
  // --------------------
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
      const formattedDate = formatDateToUTC(new Date(newTask.date));
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

      // Refresh tasks
      fetchTasks();
    } catch (error: unknown) {
      console.error("Error creating task:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showNotification(`Error creating task: ${errorMessage}`, "error");
    }
  };

  const handleEditTask = (task: LentTask) => {
    // Format the date for the date input
    const editTask = {
      ...task,
      date: task.date.split("T")[0],
    };
    setEditingTask(editTask);
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;

    if (
      !editingTask.event.trim() ||
      !editingTask.description.trim() ||
      !editingTask.date.trim()
    ) {
      showNotification("Please fill in all fields.", "error");
      return;
    }

    try {
      const formattedDate = formatDateToUTC(new Date(editingTask.date));

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

      // Refresh tasks
      fetchTasks();
    } catch (error: unknown) {
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

      // Refresh tasks
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
  const daysInMonth = useMemo(() => {
    return getDaysInMonth(currentMonth, currentYear);
  }, [currentMonth, currentYear]);

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
    setSelectedDate(date);
    const isoDate = date.toISOString().split("T")[0];
    setNewTask({ ...newTask, date: isoDate });
    setShowTaskModal(true);
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const isoDate = selectedDate.toISOString().split("T")[0];
      if (editingTask) {
        setEditingTask({ ...editingTask, date: isoDate } as LentTask);
      } else {
        setNewTask({ ...newTask, date: isoDate });
      }
      setSelectedDate(selectedDate);
    }
  };

  const showConfirmDelete = (taskId: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this task?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: () => handleDeleteTask(taskId),
          style: "destructive",
        },
      ]
    );
  };

  // Force refresh after orientation change or other layout changes
  useEffect(() => {
    const handleOrientationChange = () => {
      setRefreshKey((prev) => prev + 1);
    };

    // This would normally hook into an event listener for orientation changes
    // For example: Dimensions.addEventListener('change', handleOrientationChange);

    return () => {
      // Clean up would go here
      // Dimensions.removeEventListener('change', handleOrientationChange);
    };
  }, []);

  // --------------------
  // RENDER
  // --------------------
  return (
    <SafeAreaView style={styles.container} key={refreshKey}>
      <StatusBar barStyle="light-content" />

      {/* Notification */}
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

      {/* View Switcher */}
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

      <ScrollView style={styles.content}>
        {view === "list" ? (
          // LIST VIEW
          <View style={styles.listContainer}>
            {/* My Tasks */}
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

            {/* Friends' Tasks */}
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
          // CALENDAR VIEW
          <View style={styles.calendarContainer}>
            <View style={styles.monthHeader}>
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

            {/* Weekday Headers */}
            <View style={styles.weekdayHeader}>
              {weekDays.map((day, index) => (
                <Text key={index} style={styles.weekdayText}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Friend Legend */}
            {uniqueFriendEmails.length > 0 && (
              <View style={styles.legendContainer}>
                <Text style={styles.legendTitle}>Friend Key:</Text>
                <View style={styles.legendItems}>
                  {uniqueFriendEmails.map((email) => {
                    const friend = friendTasks.find(
                      (task) => task.user.email === email
                    )?.user;
                    return friend ? (
                      <View key={email} style={styles.legendItem}>
                        <View
                          style={[
                            styles.colorDot,
                            { backgroundColor: friendColors[email] },
                          ]}
                        />
                        <Text style={styles.legendText}>
                          {friend.first_name} {friend.last_name}
                        </Text>
                      </View>
                    ) : null;
                  })}
                </View>
              </View>
            )}

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {/* Empty cells for first week */}
              {(() => {
                const firstDay = daysInMonth[0].getUTCDay();
                return Array.from({ length: firstDay }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.emptyCell} />
                ));
              })()}

              {/* Day cells */}
              {daysInMonth.map((day, index) => {
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
                    style={[styles.dayCell, isToday && styles.todayCell]}
                    onPress={() => handleDayClick(day)}
                    accessibilityLabel={`${day.getUTCDate()} ${getMonthName(
                      day.getMonth()
                    )}, ${day.getFullYear()}. ${dayTasks.length} tasks, ${
                      guideEvents.length
                    } events`}
                  >
                    <Text style={styles.dayNumber}>{day.getUTCDate()}</Text>
                    <View style={styles.dayContent}>
                      {dayTasks.slice(0, 2).map((task) =>
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
                      {dayTasks.length > 2 && (
                        <Text style={styles.moreTasks}>
                          +{dayTasks.length - 2} more
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

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#EAB308" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {/* Add Task Modal */}
      <Modal
        visible={showTaskModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTaskModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
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
              onPress={() => setShowDatePicker(true)}
              accessibilityLabel={`Select date, current date: ${new Date(
                newTask.date
              ).toLocaleDateString()}`}
            >
              <Text style={styles.dateButtonText}>
                {new Date(newTask.date).toLocaleDateString()}
              </Text>
            </TouchableOpacity>

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
                onPress={() => setShowTaskModal(false)}
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
        </View>
      </Modal>

      {/* Edit Task Modal */}
      <Modal
        visible={!!editingTask}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditingTask(null)}
      >
        {editingTask && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
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
                onPress={() => setShowDatePicker(true)}
                accessibilityLabel={`Select date, current date: ${new Date(
                  editingTask.date
                ).toLocaleDateString()}`}
              >
                <Text style={styles.dateButtonText}>
                  {new Date(editingTask.date).toLocaleDateString()}
                </Text>
              </TouchableOpacity>

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
                  onPress={() => setEditingTask(null)}
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
          </View>
        )}
      </Modal>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerContent}>
              <Text style={styles.datePickerTitle}>Select Date</Text>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={onDateChange}
                style={styles.datePicker}
              />
              <TouchableOpacity
                style={styles.datePickerCloseButton}
                onPress={() => setShowDatePicker(false)}
                accessibilityLabel="Close date picker"
              >
                <Text style={styles.datePickerCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

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

const { width } = Dimensions.get("window");
const cellSize = width / 7 - 8; // 7 days per week with some padding

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
  errorNotification: {
    backgroundColor: "#DC2626",
  },
  successNotification: {
    backgroundColor: "#16A34A",
  },
  notificationText: {
    color: "white",
    fontWeight: "600",
  },
  header: {
    padding: 16,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FEFCE8",
    marginBottom: 16,
    textAlign: "center",
  },
  headerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
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
  headerButtonText: {
    color: "#FEFCE8",
    marginLeft: 8,
    fontWeight: "500",
  },
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
  activeViewButton: {
    backgroundColor: "#EAB308",
  },
  viewButtonText: {
    color: "#FEFCE8",
    fontWeight: "500",
  },
  activeViewText: {
    color: "#1C1917",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  // List View Styles
  listContainer: {
    paddingBottom: 20,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FEFCE8",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EAB308",
    paddingBottom: 8,
  },
  emptyText: {
    color: "rgba(254, 252, 232, 0.7)",
    fontStyle: "italic",
  },
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
  taskDate: {
    fontSize: 14,
    color: "#EAB308",
    marginBottom: 8,
  },
  taskDescription: {
    color: "rgba(254, 252, 232, 0.8)",
    marginBottom: 12,
  },
  taskActions: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  taskAction: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  editActionText: {
    color: "#FEF08A",
    marginLeft: 4,
  },
  deleteActionText: {
    color: "#FCA5A5",
    marginLeft: 4,
  },
  // Calendar View Styles
  calendarContainer: {
    paddingBottom: 20,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FEFCE8",
  },
  weekdayHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  weekdayText: {
    color: "#EAB308",
    fontWeight: "600",
    width: cellSize,
    textAlign: "center",
  },
  legendContainer: {
    backgroundColor: "#292524",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  legendTitle: {
    color: "#FEFCE8",
    fontWeight: "600",
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
    marginBottom: 4,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    color: "#FEFCE8",
    fontSize: 12,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  emptyCell: {
    width: cellSize,
    height: cellSize * 1.5,
    margin: 4,
  },
  dayCell: {
    width: cellSize,
    height: cellSize * 1.5,
    borderWidth: 1,
    borderColor: "#44403C",
    borderRadius: 8,
    padding: 4,
    margin: 4,
    backgroundColor: "rgba(41, 37, 36, 0.3)",
  },
  todayCell: {
    backgroundColor: "rgba(234, 179, 8, 0.2)",
    borderColor: "rgba(234, 179, 8, 0.5)",
  },
  dayNumber: {
    color: "#FEFCE8",
    fontWeight: "500",
    fontSize: 12,
  },
  dayContent: {
    flex: 1,
    marginTop: 2,
  },
  dayTaskText: {
    color: "#FEFCE8",
    fontSize: 10,
  },
  friendTaskContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  friendTaskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 2,
  },
  friendTaskText: {
    fontSize: 10,
  },
  moreTasks: {
    fontSize: 10,
    color: "#EAB308",
    marginTop: 2,
  },
  guideEventButton: {
    backgroundColor: "#EAB308",
    borderRadius: 4,
    padding: 2,
    marginTop: 2,
  },
  guideEventText: {
    color: "#1C1917",
    fontSize: 9,
    fontWeight: "500",
    textAlign: "center",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
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
  textAreaInput: {
    height: 100,
    textAlignVertical: "top",
  },
  dateButton: {
    backgroundColor: "#1C1917",
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.2)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  dateButtonText: {
    color: "#FEFCE8",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  cancelButtonText: {
    color: "rgba(254, 252, 232, 0.7)",
  },
  addButton: {
    backgroundColor: "rgba(234, 179, 8, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.3)",
  },
  addButtonText: {
    color: "#FEFCE8",
    fontWeight: "500",
  },
  // Date Picker Styles
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
  datePicker: {
    backgroundColor: "#292524",
  },
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
  datePickerCloseText: {
    color: "#FEFCE8",
    fontWeight: "500",
  },
  // Guide Event Modal
  guideEventModal: {
    backgroundColor: "#292524",
    borderRadius: 12,
    padding: 16,
    width: "90%",
    maxWidth: 500,
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.3)",
  },
  guideEventModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FEFCE8",
    marginBottom: 8,
  },
  guideEventModalDesc: {
    color: "#FEFCE8",
    marginBottom: 16,
  },
  guideEventCloseButton: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(234, 179, 8, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.3)",
  },
  guideEventCloseText: {
    color: "#FEFCE8",
    fontWeight: "500",
  },
  // Loading Overlay
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
    color: "#FEFCE8",
    fontSize: 18,
    marginTop: 12,
  },
});

export default Lent2025Screen;
