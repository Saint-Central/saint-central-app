import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Easing,
} from "react-native";
import { router } from "expo-router";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Feather, FontAwesome, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/contexts/AuthContext";
import { useCRUD } from "@/utils/crudClient";
import theme from "../../theme";
import LentListView from "./LentListView";

// --------------------
// Data Interfaces
// --------------------
interface DailyTask {
  id: string;
  user_id: string;
  event: string;
  description: string;
  date: string; // Stored in "YYYY-MM-DD" or "YYYY-MM-DDT00:00:00" format
  created_at: string;
  user: {
    first_name: string;
    last_name: string;
    email: string;
  };
  likes_count?: number;
  comments_count?: number;
  liked_by_current_user?: boolean;
  group_info?: Group | null;
  visibility?: "Friends" | "Certain Groups" | "Just Me" | "Friends & Groups";
  selectedGroups?: (number | string)[];
  completed?: boolean;
  // recurrence_id now stored as text
  recurrence_id?: string;
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

interface Group {
  id: string;
  name: string;
  description: string;
  created_at: string;
  created_by: string;
}

type ViewType = "list" | "calendar";
type FilterType = "all" | "friends" | "groups";

// --------------------
// Daily Guide Events
// --------------------
interface DailyEvent {
  date: string;
  title: string;
  description: string;
}

const visibilityOptions = [
  {
    label: "Friends",
    icon: <Feather name="users" size={16} color={theme.neutral50} />,
  },
  {
    label: "Certain Groups",
    icon: <Feather name="grid" size={16} color={theme.neutral50} />,
  },
  {
    label: "Friends & Groups",
    icon: <FontAwesome name="globe" size={16} color={theme.neutral50} />,
  },
  { label: "Just Me", icon: <Feather name="user" size={16} color={theme.neutral50} /> },
];

// Helper: Convert the returned selected_groups field to a proper array.
const parseSelectedGroups = (selected_groups: any): (number | string)[] => {
  if (Array.isArray(selected_groups)) {
    return selected_groups;
  } else if (typeof selected_groups === "string") {
    try {
      return JSON.parse(selected_groups);
    } catch (e) {
      return selected_groups
        .replace(/[\[\]]/g, "")
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");
    }
  }
  return [];
};

const dailyGuideEvents: DailyEvent[] = [
  {
    date: "2025-02-17",
    title: "Daily Goals",
    description:
      "Take time to reflect on your spiritual growth and set a personal intention for your daily goals.",
  },
  {
    date: "2025-02-18",
    title: "Silent Prayer",
    description:
      "Dedicate 20 minutes to silent prayer or meditation. Find a quiet space, focus on your breathing, and invite God's presence. Consider using a guided prayer resource if needed.",
  },
  {
    date: "2025-02-19",
    title: "Group Discussion",
    description:
      "Organize a group discussion with friends or family about your daily spiritual practices. Share personal goals and support each other in your spiritual journeys.",
  },
  {
    date: "March 5",
    title: "Ash Wednesday",
    description:
      "Attend a spiritual service to reflect on personal growth areas. Set a personal intention for your daily spiritual journey.",
  },
  {
    date: "March 6",
    title: "Silent Prayer",
    description:
      "Dedicate 20 minutes to silent prayer or meditation. Find a quiet space, focus on your breathing, and invite God's presence. Consider using a guided prayer resource if needed.",
  },
  {
    date: "March 7",
    title: "Stations of the Cross",
    description:
      "Participate in the Stations of the Cross at your local parish. Reflect on each station, contemplating Jesus' journey to the crucifixion and its significance in your life.",
  },
  {
    date: "March 8",
    title: "Group Discussion",
    description:
      "Organize a group discussion with friends or family about your spiritual journey. Share personal goals and support each other in your daily practices.",
  },
  {
    date: "March 9",
    title: "Meatless Meal",
    description:
      "Prepare and share a simple, meatless meal with loved ones. Use this time to discuss the importance of fasting and how it brings you closer to God.",
  },
  {
    date: "March 10",
    title: "Social Media Fast",
    description:
      "Commit to a day without social media. Use the time to read a passage from the Bible, perhaps starting with the Gospels, and reflect on its message.",
  },
  {
    date: "March 11",
    title: "Charitable Act",
    description:
      "Engage in a charitable act, such as volunteering at a local shelter or donating to a food bank. Reflect on how acts of service embody Christ's love.",
  },
  // ... add other events as needed
];

// --------------------
// Helper Functions for Dates and Calendar
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

const getGuideEventsForDate = (date: Date): DailyEvent[] => {
  const monthName = date.toLocaleString("default", { month: "long" });
  const day = date.getDate();
  return dailyGuideEvents.filter((event) => {
    const match = event.date.match(/^(\w+)\s+(\d+)/);
    if (match) {
      const [, eventMonth, eventDay] = match;
      return eventMonth === monthName && Number(eventDay) === day;
    }
    return false;
  });
};

const formatDateUTC = (dateStr: string): string => {
  const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const [year, month, day] = datePart.split("-");
  return `${Number(month)}/${Number(day)}/${year}`;
};

const parseLocalDate = (dateStr: string): Date => {
  const cleanStr = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const [year, month, day] = cleanStr.split("-").map(Number);
  return new Date(year, month - 1, day);
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
      return `${minutes <= 1 ? "just now" : `${minutes} minutes ago`}`;
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
// Grouping Helper for Recurring Tasks
// --------------------
const groupTasks = (tasks: DailyTask[]) => {
  const groups: { [key: string]: DailyTask[] } = {};
  tasks.forEach((task) => {
    if (task.recurrence_id) {
      if (!groups[task.recurrence_id]) {
        groups[task.recurrence_id] = [];
      }
      groups[task.recurrence_id].push(task);
    } else {
      groups[task.id] = [task];
    }
  });
  return Object.entries(groups).map(([key, tasks]) => ({
    key,
    tasks: tasks.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    }),
  }));
};

// --------------------
// Expanded Day View Component
// --------------------
interface ExpandedDayViewProps {
  day: Date;
  onClose: () => void;
  onAddTask: () => void;
  dayTasks: DailyTask[];
  guideEvents: DailyEvent[];
  currentUserId: string;
  friendColors: { [email: string]: string };
  handleLikeToggle: (task: DailyTask) => void;
  handleOpenComments: (task: DailyTask) => void;
  showConfirmDelete: (taskId: string) => void;
  onGuideEventPress: (event: DailyEvent) => void;
  handleToggleTaskCompletion: (task: DailyTask) => void;
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
  onGuideEventPress,
  handleToggleTaskCompletion,
}) => {
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Run animations in parallel for a smoother entrance
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      // Cleanup animations when component unmounts
      slideAnim.stopAnimation();
      fadeAnim.stopAnimation();
    };
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
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.expandedDayHeader}>
        <Text style={styles.expandedDayTitle}>{formattedDate}</Text>
        <TouchableOpacity style={styles.closeIconButton} onPress={onClose}>
          <Feather name="x" size={24} color={theme.neutral50} />
        </TouchableOpacity>
      </View>
      <ScrollView
        style={[styles.expandedDayContent, { width: "100%" }]}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {guideEvents.length > 0 && (
          <View style={styles.expandedDaySection}>
            <Text style={styles.expandedDaySectionTitle}>Guide Events</Text>
            {guideEvents.map((event, index) => (
              <TouchableOpacity
                key={`guide-${index}`}
                style={styles.expandedDayGuideEvent}
                onPress={() => onGuideEventPress(event)}
                activeOpacity={0.7}
              >
                <View style={styles.expandedDayGuideEventIcon}>
                  <Feather name="calendar" size={14} color={theme.tertiary} />
                </View>
                <View style={styles.expandedDayGuideEventContent}>
                  <Text style={styles.expandedDayGuideEventTitle}>{event.title}</Text>
                  <Text style={styles.expandedDayGuideEventDesc} numberOfLines={2}>
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
                  {isUserTask && (
                    <TouchableOpacity
                      onPress={() => handleToggleTaskCompletion(task)}
                      style={styles.checkboxButton}
                    >
                      <Feather
                        name={task.completed ? "check-square" : "square"}
                        size={20}
                        color={task.completed ? theme.success : theme.neutral400}
                      />
                    </TouchableOpacity>
                  )}
                  {!isUserTask && (
                    <View
                      style={[
                        styles.expandedDayTaskUserIndicator,
                        { backgroundColor: friendColors[task.user.email] },
                      ]}
                    />
                  )}
                  <View style={styles.expandedDayTaskContent}>
                    <Text
                      style={[
                        styles.expandedDayTaskTitle,
                        task.completed && styles.completedTaskTitle,
                      ]}
                    >
                      {task.event}
                    </Text>
                    {!isUserTask && (
                      <Text style={styles.expandedDayTaskUser}>
                        By {task.user.first_name} {task.user.last_name}
                      </Text>
                    )}
                    {task.group_info && (
                      <View style={styles.groupTag}>
                        <Feather name="users" size={12} color={theme.secondary} />
                        <Text style={styles.groupTagText}>
                          Shared group: {task.group_info.name}
                        </Text>
                      </View>
                    )}
                    {task.visibility && (
                      <View style={styles.visibilityTag}>
                        {visibilityOptions.find((option) => option.label === task.visibility)?.icon}
                        <Text style={styles.visibilityTagText}>{task.visibility}</Text>
                      </View>
                    )}
                    <Text style={styles.expandedDayTaskDesc}>{task.description}</Text>
                    <View style={styles.expandedDayTaskActions}>
                      <TouchableOpacity
                        style={styles.expandedDayTaskAction}
                        onPress={() => handleLikeToggle(task)}
                        activeOpacity={0.7}
                      >
                        <Feather
                          name="heart"
                          size={16}
                          color={task.liked_by_current_user ? theme.tertiary : theme.neutral400}
                        />
                        <Text
                          style={[
                            styles.expandedDayTaskActionText,
                            task.liked_by_current_user && styles.expandedDayTaskActionTextActive,
                          ]}
                        >
                          {task.likes_count || 0}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.expandedDayTaskAction}
                        onPress={() => handleOpenComments(task)}
                        activeOpacity={0.7}
                      >
                        <Feather name="message-square" size={16} color={theme.neutral400} />
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
                          activeOpacity={0.7}
                        >
                          <Feather name="trash-2" size={16} color={theme.error} />
                          <Text style={styles.expandedDayTaskDeleteText}>Delete</Text>
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
        activeOpacity={0.8}
      >
        <Feather name="plus" size={24} color={theme.neutral50} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// --------------------
// Confirmation Modal Component
// --------------------
interface ConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmStyle?: "warning" | "success";
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmStyle = "warning",
}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations when modal is hidden
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="none" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.deleteModalContent,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.deleteModalHeader}>
            <Feather
              name={confirmStyle === "warning" ? "alert-triangle" : "check-circle"}
              size={28}
              color={confirmStyle === "warning" ? theme.error : theme.success}
            />
            <Text style={styles.deleteModalTitle}>{title}</Text>
          </View>
          <Text style={styles.deleteModalMessage}>{message}</Text>
          <View style={styles.deleteModalButtons}>
            <TouchableOpacity
              style={styles.deleteModalCancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteModalCancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.deleteModalConfirmButton,
                confirmStyle === "success" && styles.successConfirmButton,
              ]}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteModalConfirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// --------------------
// Render Task Group Card for List View
// --------------------
const renderTaskGroupCard = (
  group: { key: string; tasks: DailyTask[] },
  handleLikeToggle: (task: DailyTask) => void,
  handleOpenComments: (task: DailyTask) => void,
  showConfirmDelete: (taskId: string) => void,
  handleDeleteRecurringGroup: (recurrenceId: string) => void,
  handleToggleRecurringGroupCompletion: (
    recurrenceId: string,
    currentAllCompleted: boolean,
  ) => void,
  currentUserId: string,
  handleToggleTaskCompletion: (task: DailyTask) => void,
  showCompletionConfirm: (recurrenceId: string, allCompleted: boolean, task: DailyTask) => void,
  likeAnimations: { [taskId: string]: Animated.Value },
  heartAnimations: { [taskId: string]: Animated.Value },
) => {
  const task = group.tasks[0];
  const isRecurring = group.tasks.length > 1;
  const allCompleted = group.tasks.every((t) => t.completed);
  const startDate = isRecurring ? formatDateUTC(group.tasks[0].date) : "";
  const endDate = isRecurring ? formatDateUTC(group.tasks[group.tasks.length - 1].date) : "";

  // Initialize animations if needed
  if (!likeAnimations[task.id]) {
    likeAnimations[task.id] = new Animated.Value(1);
  }
  if (!heartAnimations[task.id]) {
    heartAnimations[task.id] = new Animated.Value(task.liked_by_current_user ? 1 : 0);
  }

  const scaleAnim = likeAnimations[task.id];
  const heartAnim = heartAnimations[task.id];
  const heartColor = heartAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [theme.neutral400, theme.tertiary, theme.tertiary],
  });

  return (
    <View key={group.key} style={styles.taskCard}>
      <View style={styles.taskHeaderRow}>
        {isRecurring ? (
          <TouchableOpacity
            onPress={() => showCompletionConfirm(group.key, allCompleted, task)}
            style={styles.checkboxButton}
            activeOpacity={0.7}
          >
            <Feather
              name={allCompleted ? "check-square" : "square"}
              size={20}
              color={allCompleted ? theme.success : theme.neutral400}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => handleToggleTaskCompletion(task)}
            style={styles.checkboxButton}
            activeOpacity={0.7}
          >
            <Feather
              name={task.completed ? "check-square" : "square"}
              size={20}
              color={task.completed ? theme.success : theme.neutral400}
            />
          </TouchableOpacity>
        )}
        <Text
          style={[
            styles.taskTitle,
            isRecurring && styles.recurringTaskTitle,
            task.completed && styles.completedTaskTitle,
          ]}
        >
          {task.event} {isRecurring ? "(Recurring)" : ""}
        </Text>
      </View>
      {isRecurring ? (
        <Text style={styles.taskDate}>
          {startDate} - {endDate}
        </Text>
      ) : (
        <Text style={styles.taskDate}>{formatDateUTC(task.date)}</Text>
      )}
      {task.group_info && (
        <View style={styles.groupTag}>
          <Feather name="users" size={12} color={theme.secondary} />
          <Text style={styles.groupTagText}>Shared group: {task.group_info.name}</Text>
        </View>
      )}
      {task.visibility && (
        <View style={styles.visibilityTag}>
          {visibilityOptions.find((option) => option.label === task.visibility)?.icon}
          <Text style={styles.visibilityTagText}>{task.visibility}</Text>
        </View>
      )}
      <Text style={styles.taskDescription}>{task.description}</Text>
      <View style={styles.taskInteractionBar}>
        <TouchableOpacity
          style={[styles.likeButton, task.liked_by_current_user && styles.likedButton]}
          onPress={() => handleLikeToggle(task)}
          activeOpacity={0.7}
        >
          <Animated.View style={[styles.heartIconContainer, { transform: [{ scale: scaleAnim }] }]}>
            <Feather
              name="heart"
              size={task.liked_by_current_user ? 18 : 16}
              color={task.liked_by_current_user ? theme.tertiary : theme.neutral400}
              style={styles.heartIconBase}
            />
            <Animated.View style={[styles.heartAnimation, { opacity: heartAnim }]}>
              <Feather name="heart" size={18} color={theme.tertiary} />
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
          activeOpacity={0.7}
        >
          <Feather name="message-square" size={16} color={theme.neutral400} />
          <Text style={styles.commentButtonText}>{task.comments_count || 0}</Text>
        </TouchableOpacity>
        <View style={styles.taskActions}>
          {isRecurring ? (
            <TouchableOpacity
              style={styles.taskAction}
              onPress={() => showConfirmDelete(task.recurrence_id ? task.recurrence_id : "")}
              activeOpacity={0.7}
            >
              <Feather name="trash-2" size={16} color={theme.error} />
              <Text style={styles.deleteActionText}>Delete Group</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.taskAction}
              onPress={() => showConfirmDelete(task.id)}
              activeOpacity={0.7}
            >
              <Feather name="trash-2" size={16} color={theme.error} />
              <Text style={styles.deleteActionText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

// --------------------
// DailyTasks2025 Screen Component
// --------------------
const DailyTasks2025: React.FC = () => {
  // Auth and CRUD clients
  const { user, loading: authLoading } = useAuth();
  const { select, insert, update, delete: deleteRecord } = useCRUD();

  const { width } = useWindowDimensions();
  const isIpad = width >= 768;
  const calendarWidth = isIpad ? width - 32 : Math.min(width, 500) - 32;

  const initialDate = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  })();

  // Main state
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [newTask, setNewTask] = useState({
    event: "",
    description: "",
    date: initialDate,
    visibility: "Friends" as "Friends" | "Certain Groups" | "Just Me" | "Friends & Groups",
    selectedGroups: [] as (number | string)[],
  });
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(initialDate);
  const [showInlineRecurrenceDatePicker, setShowInlineRecurrenceDatePicker] = useState(false);

  // UI state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showInlineDatePicker, setShowInlineDatePicker] = useState(false);
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [view, setView] = useState<ViewType>("calendar");
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [selectedGuideEvent, setSelectedGuideEvent] = useState<DailyEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  
  // Comments and interactions
  const [taskComments, setTaskComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [selectedTaskForComments, setSelectedTaskForComments] = useState<DailyTask | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  
  // Filtering and groups
  const [tasksFilter, setTasksFilter] = useState<FilterType>("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [groupsLoaded, setGroupsLoaded] = useState<boolean>(false);
  const [headerHeight, setHeaderHeight] = useState<number>(0);
  const [showVisibilityDropdownNew, setShowVisibilityDropdownNew] = useState<boolean>(false);
  const [showVisibilityDropdownEdit, setShowVisibilityDropdownEdit] = useState<boolean>(false);

  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showCompletionConfirmModal, setShowCompletionConfirmModal] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState({
    id: "",
    isRecurring: false,
    title: "",
    message: "",
  });
  const [completionInfo, setCompletionInfo] = useState({
    recurrenceId: "",
    currentAllCompleted: false,
    taskName: "",
  });

  // Use refs for animations to persist between renders
  const likeAnimations = useRef<{ [taskId: string]: Animated.Value }>({}).current;
  const heartAnimations = useRef<{ [taskId: string]: Animated.Value }>({}).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const headerRef = useRef<any>(null);
  const filterDropdownAnim = useRef(new Animated.Value(0)).current;
  const notificationAnim = useRef(new Animated.Value(0)).current;
  const loadingSpinAnim = useRef(new Animated.Value(0)).current;

  // Add animation refs for the guide event modal
  const guideEventOpacityAnim = useRef(new Animated.Value(0)).current;
  const guideEventScaleAnim = useRef(new Animated.Value(0.9)).current;

  // Start a continuous loading animation
  useEffect(() => {
    if (authLoading || isLoading || commentLoading) {
      Animated.loop(
        Animated.timing(loadingSpinAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      loadingSpinAnim.stopAnimation();
      loadingSpinAnim.setValue(0);
    }
  }, [authLoading, isLoading, commentLoading]);

  // Animate notifications
  useEffect(() => {
    if (notification) {
      Animated.sequence([
        Animated.timing(notificationAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(notificationAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setNotification(null);
      });
    }
  }, [notification]);

  // Add this effect to animate the guide event modal when it's shown
  useEffect(() => {
    if (selectedGuideEvent) {
      // Reset animation values
      guideEventOpacityAnim.setValue(0);
      guideEventScaleAnim.setValue(0.9);

      // Start animations
      Animated.parallel([
        Animated.spring(guideEventScaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(guideEventOpacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [selectedGuideEvent]);

  // Toggle group selection functions
  const toggleNewGroupSelection = useCallback((groupId: string) => {
    setNewTask((prevTask) => {
      const currentSelected = prevTask.selectedGroups || [];
      const updatedGroups = currentSelected.includes(groupId)
        ? currentSelected.filter((id) => id !== groupId)
        : [...currentSelected, groupId];

      return {
        ...prevTask,
        selectedGroups: updatedGroups,
      };
    });
  }, []);

  const toggleEditGroupSelection = useCallback(
    (groupId: string) => {
      if (!editingTask) return;
      setEditingTask((prevTask) => {
        if (!prevTask) return null;
        const currentSelected = prevTask.selectedGroups || [];
        const updatedGroups = currentSelected.includes(groupId)
          ? currentSelected.filter((id) => id !== groupId)
          : [...currentSelected, groupId];

        return {
          ...prevTask,
          selectedGroups: updatedGroups,
        } as DailyTask;
      });
    },
    [editingTask],
  );

  // Get current user ID from AuthContext
  const currentUserId = user?.id || "";

  // Memoized task filters
  const friendTasks = useMemo(
    () => dailyTasks.filter((task) => task.user_id !== currentUserId),
    [dailyTasks, currentUserId],
  );

  const uniqueFriendEmails = useMemo(
    () => Array.from(new Set(friendTasks.map((task) => task.user.email))),
    [friendTasks],
  );

  const palette = useMemo(
    () => [
      theme.tertiary,
      theme.secondary,
      theme.accent1,
      theme.accent2,
      theme.accent3,
      theme.secondary,
      theme.primary,
    ],
    [],
  );

  const friendColors = useMemo(() => {
    const colors: { [email: string]: string } = {};
    uniqueFriendEmails.forEach((email, index) => {
      colors[email] = palette[index % palette.length];
    });
    return colors;
  }, [uniqueFriendEmails, palette]);

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );
    const keyboardDidHideListener = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Filter dropdown animation
  useEffect(() => {
    Animated.timing(filterDropdownAnim, {
      toValue: showFilterDropdown ? 1 : 0,
      duration: 250,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [showFilterDropdown]);

  // Fetch user groups using crudClient
  const fetchUserGroups = useCallback(async () => {
    try {
      if (!currentUserId) return;
      
      // Get group memberships for the current user
      const groupMemberships = await select("group_members", {
        where: { user_id: currentUserId },
        select: "group_id"
      });
      
      if (groupMemberships.length > 0) {
        // Get group details for all groups the user is a member of
        const groupIds = groupMemberships.map((gm: any) => gm.group_id);
        const groups = await select("groups", {
          where: { id: groupIds } // This will need to be handled by the CRUD API for IN queries
        });
        setUserGroups(groups || []);
      } else {
        setUserGroups([]);
      }
      
      setGroupsLoaded(true);
    } catch (error: any) {
      console.error("Error fetching user groups:", error);
      showNotification(`Error fetching groups: ${error.message}`, "error");
      setUserGroups([]);
      setGroupsLoaded(true);
    }
  }, [currentUserId, select]);

  // Get header title based on filter
  const getHeaderTitle = (): string => {
    switch (tasksFilter) {
      case "friends":
        return "Friends' Tasks";
      case "groups":
        return "Group Tasks";
      default:
        return "All Tasks";
    }
  };

  // Show notification with animation
  const showNotification = useCallback((message: string, type: "error" | "success") => {
    setNotification({ message, type });
  }, []);

  // Simplified fetch tasks using crudClient
  const fetchTasks = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setIsLoading(true);
      
      let tasks: DailyTask[] = [];
      
      if (tasksFilter === "all") {
        // Get all tasks for the current user
        tasks = await select("lent_tasks", {
          where: { user_id: currentUserId }
        });
        
        // Also get friend tasks if friends exist
        try {
          const friendData = await select("friends", {
            where: { user_id_1: currentUserId, status: "accepted" }
          });
          const friendData2 = await select("friends", {
            where: { user_id_2: currentUserId, status: "accepted" }
          });
          
          const friendIds = [
            ...friendData.map((f: any) => f.user_id_2),
            ...friendData2.map((f: any) => f.user_id_1)
          ];
          
          for (const friendId of friendIds) {
            const friendTasks = await select("lent_tasks", {
              where: { user_id: friendId },
              limit: 10
            });
            tasks = [...tasks, ...friendTasks];
          }
        } catch (error) {
          console.log("Error fetching friend tasks:", error);
        }
        
      } else if (tasksFilter === "friends") {
        // Get only friend tasks
        try {
          const friendData = await select("friends", {
            where: { user_id_1: currentUserId, status: "accepted" }
          });
          const friendData2 = await select("friends", {
            where: { user_id_2: currentUserId, status: "accepted" }
          });
          
          const friendIds = [
            ...friendData.map((f: any) => f.user_id_2),
            ...friendData2.map((f: any) => f.user_id_1)
          ];
          
          for (const friendId of friendIds) {
            const friendTasks = await select("lent_tasks", {
              where: { user_id: friendId }
            });
            tasks = [...tasks, ...friendTasks];
          }
        } catch (error) {
          console.log("Error fetching friends:", error);
          // Don't return early, continue with user's own tasks
        }
        
      } else if (tasksFilter === "groups") {
        // Get group tasks - simplified for now to just show user's own tasks
        tasks = await select("lent_tasks", {
          where: { user_id: currentUserId }
        });
      }
      
      // Add basic user information for tasks that don't have it
      const tasksWithUsers = tasks.map((task: any) => ({
        ...task,
        user: task.user || { 
          first_name: task.user_id === currentUserId ? "You" : "User",
          last_name: "",
          email: ""
        },
        likes_count: 0,
        comments_count: 0,
        liked_by_current_user: false,
        group_info: null,
        selectedGroups: task.selected_groups || []
      }));
      
      setDailyTasks(tasksWithUsers);
      setIsInitialized(true);
      
    } catch (error) {
      console.error("Error fetching tasks:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showNotification("Error fetching tasks: " + errorMessage, "error");
      setDailyTasks([]);
      setIsInitialized(true);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, tasksFilter, userGroups, select, showNotification]);

  // Fetch comments for a task using crudClient
  const fetchComments = useCallback(async (taskId: string) => {
    if (!taskId) return;
    try {
      setCommentLoading(true);
      const comments = await select("comments", {
        where: { commentable_id: taskId, commentable_type: "lent_tasks" }
      });
      
      // Add basic user info for comments
      const commentsWithUsers = comments.map((comment: any) => ({
        ...comment,
        user: comment.user || {
          first_name: "User",
          last_name: "",
          email: ""
        }
      }));
      
      setTaskComments(commentsWithUsers || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showNotification("Error fetching comments: " + errorMessage, "error");
      setTaskComments([]);
    } finally {
      setCommentLoading(false);
    }
  }, [select]);

  // Reset initialization when user changes
  useEffect(() => {
    setIsInitialized(false);
  }, [currentUserId, tasksFilter]);

  // Fetch user groups when user changes
  useEffect(() => {
    if (currentUserId && !authLoading) {
      fetchUserGroups();
    }
  }, [currentUserId, fetchUserGroups, authLoading]);

  // Fetch tasks when filter or groups change
  useEffect(() => {
    if (currentUserId && groupsLoaded && !authLoading) {
      fetchTasks();
    }
  }, [currentUserId, tasksFilter, groupsLoaded, authLoading]);

  // Clear notification on unmount
  useEffect(() => {
    return () => {
      if (notification) setNotification(null);
    };
  }, [notification]);

  // Calendar data calculations
  const daysInMonth = useMemo(
    () => getDaysInMonth(currentMonth, currentYear),
    [currentMonth, currentYear],
  );

  const firstDayOfMonth = useMemo(
    () => new Date(currentYear, currentMonth, 1).getDay(),
    [currentYear, currentMonth],
  );

  const lastDayOfPrevMonth = useMemo(
    () => new Date(currentYear, currentMonth, 0).getDate(),
    [currentYear, currentMonth],
  );

  const prevMonthDays = useMemo(
    () =>
      [...Array(firstDayOfMonth)].map((_, i) => {
        const day = new Date(
          currentYear,
          currentMonth - 1,
          lastDayOfPrevMonth - firstDayOfMonth + i + 1,
        );
        return { date: day, isCurrentMonth: false };
      }),
    [firstDayOfMonth, lastDayOfPrevMonth, currentYear, currentMonth],
  );

  const currMonthDays = useMemo(
    () => daysInMonth.map((day) => ({ date: day, isCurrentMonth: true })),
    [daysInMonth],
  );

  const totalDaysSoFar = useMemo(
    () => prevMonthDays.length + currMonthDays.length,
    [prevMonthDays.length, currMonthDays.length],
  );

  const rowsNeeded = useMemo(() => Math.ceil(totalDaysSoFar / 7), [totalDaysSoFar]);

  const totalCells = useMemo(() => rowsNeeded * 7, [rowsNeeded]);

  const nextMonthDaysNeeded = useMemo(
    () => totalCells - totalDaysSoFar,
    [totalCells, totalDaysSoFar],
  );

  const nextMonthDays = useMemo(
    () =>
      [...Array(nextMonthDaysNeeded)].map((_, i) => {
        const day = new Date(currentYear, currentMonth + 1, i + 1);
        return { date: day, isCurrentMonth: false };
      }),
    [nextMonthDaysNeeded, currentYear, currentMonth],
  );

  const fullCalendarGrid = useMemo(
    () => [...prevMonthDays, ...currMonthDays, ...nextMonthDays],
    [prevMonthDays, currMonthDays, nextMonthDays],
  );

  // Scroll to current day in calendar
  const scrollToCurrentDay = useCallback(() => {
    if (!scrollViewRef.current || view !== "calendar") return;
    const today = new Date();
    if (today.getMonth() !== currentMonth || today.getFullYear() !== currentYear) return;
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

  // Auto-scroll to today
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToCurrentDay();
    }, 300);
    return () => clearTimeout(timer);
  }, [scrollToCurrentDay, currentMonth, currentYear, refreshKey, view]);

  // Create a new task
  const handleCreateTask = async () => {
    if (
      !newTask.event.trim() ||
      !newTask.description.trim() ||
      !newTask.date.trim() ||
      (isRecurring && !recurrenceEndDate.trim())
    ) {
      showNotification("Please fill in all fields.", "error");
      return;
    }
    try {
      if (!user) throw new Error("Not authenticated");
      
      if (!isRecurring) {
        const formattedDate = newTask.date + "T00:00:00";
        await insert("lent_tasks", {
          user_id: user.id,
          event: newTask.event,
          description: newTask.description,
          date: formattedDate,
          visibility: newTask.visibility,
          selected_groups: newTask.visibility === "Certain Groups" ? newTask.selectedGroups : [],
          completed: false,
        });
      } else {
        // Generate recurrence_id as a string
        const recurrenceId = Date.now().toString();
        const start = new Date(newTask.date);
        start.setDate(start.getDate() + 1);
        const end = new Date(recurrenceEndDate);
        end.setDate(end.getDate() + 1);
        if (end < start) {
          showNotification("End date cannot be before start date.", "error");
          return;
        }
        const tasksToInsert = [];
        for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
          const y = dt.getFullYear();
          const m = String(dt.getMonth() + 1).padStart(2, "0");
          const d = String(dt.getDate()).padStart(2, "0");
          tasksToInsert.push({
            user_id: user.id,
            event: newTask.event,
            description: newTask.description,
            date: `${y}-${m}-${d}T00:00:00`,
            visibility: newTask.visibility,
            selected_groups: newTask.visibility === "Certain Groups" ? newTask.selectedGroups : [],
            recurrence_id: recurrenceId,
            completed: false,
          });
        }
        // Insert all recurring tasks
        for (const task of tasksToInsert) {
          await insert("lent_tasks", task);
        }
      }

      // First dismiss keyboard and close modal
      Keyboard.dismiss();
      showNotification(
        isRecurring ? "Recurring tasks created successfully!" : "Task created successfully!",
        "success",
      );
      setShowTaskModal(false);

      // Then reset all the state values after modal animation would be complete
      setTimeout(() => {
        setSelectedDay(null);
        setNewTask({
          event: "",
          description: "",
          date: initialDate,
          visibility: "Friends",
          selectedGroups: [],
        });
        setIsRecurring(false);
        setRecurrenceEndDate(initialDate);
        setShowInlineDatePicker(false);
        setShowVisibilityDropdownNew(false);
        fetchTasks();
      }, 300);
    } catch (error) {
      console.error("Error creating task:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showNotification(`Error creating task: ${errorMessage}`, "error");
    }
  };

  // Edit task handler
  const handleEditTask = useCallback((task: DailyTask) => {
    setSelectedDay(null);
    const editTask = {
      ...task,
      date: task.date.split("T")[0],
      visibility: task.visibility || "Friends",
      selectedGroups: task.selectedGroups || [],
    };
    setEditingTask(editTask);
  }, []);

  // Update task handler
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
      const formattedDate = editingTask.date + "T00:00:00";
      await update("lent_tasks", {
        event: editingTask.event,
        description: editingTask.description,
        date: formattedDate,
        visibility: editingTask.visibility || "Friends",
        selected_groups:
          editingTask.visibility === "Certain Groups" ? editingTask.selectedGroups : [],
      }, { id: editingTask.id });

      // First show notification and close modal
      showNotification("Task updated successfully!", "success");
      setEditingTask(null);

      // Then clean up other UI states after animation would be complete
      setTimeout(() => {
        setShowVisibilityDropdownEdit(false);
        setShowEditDatePicker(false);
        fetchTasks();
      }, 300);
    } catch (error) {
      console.error("Error updating task:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showNotification(`Error updating task: ${errorMessage}`, "error");
    }
  };

  // Show delete confirmation
  const showConfirmDelete = useCallback(
    (id: string) => {
      const isRecurring = dailyTasks.some((task) => task.recurrence_id === id);
      const title = isRecurring ? "Delete Recurring Tasks" : "Delete Task";
      const message = isRecurring
        ? "Are you sure you want to delete all tasks in this recurring series? This action cannot be undone."
        : "Are you sure you want to delete this task? This action cannot be undone.";
      setDeleteInfo({ id, isRecurring, title, message });
      setShowDeleteConfirmModal(true);
    },
    [dailyTasks],
  );

  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    try {
      if (deleteInfo.isRecurring) {
        await handleDeleteRecurringGroup(deleteInfo.id);
      } else {
        await handleDeleteTask(deleteInfo.id);
      }
      setShowDeleteConfirmModal(false);
    } catch (error) {
      console.error("Error during delete:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showNotification(`Error: ${errorMessage}`, "error");
    }
  };

  // Handle completion confirmation
  const handleConfirmCompletion = () => {
    handleToggleRecurringGroupCompletion(
      completionInfo.recurrenceId,
      completionInfo.currentAllCompleted,
    );
    setShowCompletionConfirmModal(false);
  };

  // Handle cancel completion
  const handleCancelCompletion = () => {
    setDailyTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.recurrence_id === completionInfo.recurrenceId
          ? { ...t, completed: completionInfo.currentAllCompleted }
          : t,
      ),
    );
    setShowCompletionConfirmModal(false);
  };

  // Delete task handler using crudClient
  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteRecord("lent_tasks", { id: taskId });
      showNotification("Task deleted successfully!", "success");
      fetchTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showNotification(`Error deleting task: ${errorMessage}`, "error");
    }
  };

  // Animate like button with a more fluid animation
  const animateLikeButton = useCallback((taskId: string, liked: boolean) => {
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
          easing: Easing.out(Easing.elastic(1.5)),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
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
      duration: liked ? 300 : 200,
      easing: liked ? Easing.out(Easing.quad) : Easing.in(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, []);

  // Toggle like on a task
  const handleLikeToggle = useCallback(
    async (task: DailyTask) => {
      try {
        const willBeLiked = !task.liked_by_current_user;

        // Optimistically update UI
        setDailyTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  likes_count: willBeLiked
                    ? (t.likes_count || 0) + 1
                    : Math.max(0, (t.likes_count || 0) - 1),
                  liked_by_current_user: willBeLiked,
                }
              : t,
          ),
        );

        animateLikeButton(task.id, willBeLiked);

        if (willBeLiked) {
          await insert("likes", {
            user_id: currentUserId,
            likeable_id: task.id,
            likeable_type: "lent_tasks",
          });
        } else {
          await deleteRecord("likes", {
            likeable_id: task.id,
            likeable_type: "lent_tasks",
            user_id: currentUserId
          });
        }
      } catch (error) {
        console.error("Error toggling like:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        showNotification(`Error: ${errorMessage}`, "error");
        fetchTasks(); // Refresh to correct state
      }
    },
    [currentUserId, animateLikeButton],
  );

  // Open comments modal with sequential state updates to prevent flashing
  const handleOpenComments = useCallback(
    (task: DailyTask) => {
      // First close any open day view to prevent UI flash
      if (selectedDay) {
        setSelectedDay(null);
        // Small delay before opening comments to ensure smooth transition
        setTimeout(() => {
          setSelectedTaskForComments(task);
          setTaskComments([]);
          setCommentLoading(true);
          fetchComments(task.id);
          setShowCommentModal(true);
        }, 50);
      } else {
        setSelectedTaskForComments(task);
        setTaskComments([]);
        setCommentLoading(true);
        fetchComments(task.id);
        setShowCommentModal(true);
      }
    },
    [fetchComments, selectedDay],
  );

  // Add comment handler
  const handleAddComment = async () => {
    if (!selectedTaskForComments || !newComment.trim()) return;
    try {
      const newCommentData = await insert("comments", {
        user_id: currentUserId,
        commentable_id: selectedTaskForComments.id,
        commentable_type: "lent_tasks",
        content: newComment.trim(),
      });
      
      if (newCommentData) {
        // Add new comment with animation
        const newCommentObj = {
          ...newCommentData,
          user: {
            first_name: "You",
            last_name: "",
            email: ""
          }
        };
        setTaskComments((prev) => [...prev, newCommentObj]);

        // Update comment count in tasks list
        setDailyTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === selectedTaskForComments.id
              ? { ...t, comments_count: (t.comments_count || 0) + 1 }
              : t,
          ),
        );
      }
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showNotification(`Error adding comment: ${errorMessage}`, "error");
    }
  };

  // Delete comment handler using crudClient
  const handleDeleteComment = async (commentId: string) => {
    if (!selectedTaskForComments) return;
    try {
      await deleteRecord("comments", { id: commentId });

      // Remove comment with fade animation
      setTaskComments((prev) => prev.filter((comment) => comment.id !== commentId));

      // Update task comment count
      setDailyTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTaskForComments.id
            ? { ...t, comments_count: Math.max(0, (t.comments_count || 0) - 1) }
            : t,
        ),
      );

      showNotification("Comment deleted", "success");
    } catch (error) {
      console.error("Error deleting comment:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showNotification(`Error: ${errorMessage}`, "error");
    }
  };

  // Navigation functions
  const prevMonth = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  }, [currentMonth]);

  const nextMonth = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  }, [currentMonth]);

  // Get tasks for a specific day
  const getTasksForDay = useCallback(
    (date: Date): DailyTask[] => {
      return dailyTasks.filter((task) => {
        const taskDate = parseLocalDate(task.date);
        return (
          taskDate.getFullYear() === date.getFullYear() &&
          taskDate.getMonth() === date.getMonth() &&
          taskDate.getDate() === date.getDate()
        );
      });
    },
    [dailyTasks],
  );

  // Add task for a specific day
  const handleAddTaskForDay = useCallback((day: Date) => {
    setSelectedDay(null);
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, "0");
    const dayNum = String(day.getDate()).padStart(2, "0");
    const isoDate = `${year}-${month}-${dayNum}`;
    setSelectedDate(day);
    setNewTask((prev) => ({ ...prev, date: isoDate }));
    setShowTaskModal(true);
  }, []);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Confirm delete comment
  const showConfirmDeleteComment = useCallback(
    (commentId: string) => {
      Alert.alert("Confirm Delete", "Are you sure you want to delete this comment?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: () => handleDeleteComment(commentId),
          style: "destructive",
        },
      ]);
    },
    [handleDeleteComment],
  );

  // Select filter handler
  const handleSelectFilter = useCallback((filter: FilterType) => {
    setTasksFilter(filter);
    setShowFilterDropdown(false);
  }, []);

  // Header layout handler
  const onHeaderLayout = useCallback((event: any) => {
    const { height } = event.nativeEvent.layout;
    setHeaderHeight(height);
  }, []);

  // Show completion confirmation
  const showCompletionConfirm = useCallback(
    (recurrenceId: string, currentAllCompleted: boolean, task: DailyTask) => {
      // Optimistically update UI
      setDailyTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.recurrence_id === recurrenceId ? { ...t, completed: !currentAllCompleted } : t,
        ),
      );

      setCompletionInfo({
        recurrenceId,
        currentAllCompleted,
        taskName: task.event,
      });

      setShowCompletionConfirmModal(true);
    },
    [],
  );

  // Toggle task completion
  const handleToggleTaskCompletion = useCallback(
    async (task: DailyTask) => {
      if (task.user_id !== currentUserId) return;

      const newCompleted = !task.completed;

      // Optimistically update UI
      setDailyTasks((prevTasks) =>
        prevTasks.map((t) => (t.id === task.id ? { ...t, completed: newCompleted } : t)),
      );

      try {
        await update("lent_tasks", { completed: newCompleted }, { id: task.id });
      } catch (error) {
        // Revert on error
        setDailyTasks((prevTasks) =>
          prevTasks.map((t) => (t.id === task.id ? { ...t, completed: !newCompleted } : t)),
        );
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error updating task completion:", errorMessage);
        showNotification(`Error updating task: ${errorMessage}`, "error");
      }
    },
    [currentUserId],
  );

  // Toggle recurring group completion
  const handleToggleRecurringGroupCompletion = useCallback(
    async (recurrenceId: string, currentAllCompleted: boolean) => {
      const newCompleted = !currentAllCompleted;

      // Optimistically update UI
      setDailyTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.recurrence_id === recurrenceId ? { ...t, completed: newCompleted } : t,
        ),
      );

      try {
        await update("lent_tasks", { completed: newCompleted }, { recurrence_id: recurrenceId });
      } catch (error) {
        // Revert on error
        setDailyTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.recurrence_id === recurrenceId ? { ...t, completed: !newCompleted } : t,
          ),
        );
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error updating recurring tasks completion:", errorMessage);
        showNotification(`Error updating tasks: ${errorMessage}`, "error");
      }
    },
    [],
  );

  // Delete recurring group
  const handleDeleteRecurringGroup = async (recurrenceId: string) => {
    try {
      await deleteRecord("lent_tasks", { recurrence_id: recurrenceId });
      showNotification("Recurring group deleted successfully!", "success");
      fetchTasks();
    } catch (error) {
      console.error("Error deleting recurring group:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showNotification(`Error deleting recurring group: ${errorMessage}`, "error");
    }
  };

  // Filter my tasks
  const myTasks = useMemo(
    () => dailyTasks.filter((task) => task.user_id === currentUserId),
    [dailyTasks, currentUserId],
  );

  // Group my tasks
  const groupedMyTasks = useMemo(() => groupTasks(myTasks), [myTasks]);

  // Render task card for non-recurring tasks
  const renderTaskCard = useCallback(
    (task: DailyTask, isUserTask: boolean) => {
      if (!likeAnimations[task.id]) {
        likeAnimations[task.id] = new Animated.Value(1);
      }
      if (!heartAnimations[task.id]) {
        heartAnimations[task.id] = new Animated.Value(task.liked_by_current_user ? 1 : 0);
      }
      const scaleAnim = likeAnimations[task.id];
      const heartAnim = heartAnimations[task.id];
      const heartColor = heartAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [theme.neutral400, theme.tertiary, theme.tertiary],
      });

      return (
        <View key={task.id} style={styles.modernTaskCard}>
          <LinearGradient
            colors={task.completed 
              ? ['rgba(16, 185, 129, 0.1)', 'rgba(5, 150, 105, 0.05)']
              : ['rgba(124, 58, 237, 0.08)', 'rgba(147, 51, 234, 0.04)']}
            style={styles.taskCardGradient}
          >
            {/* Status indicator */}
            <View style={[
              styles.taskStatusIndicator,
              { backgroundColor: task.completed ? '#10B981' : '#7C3AED' }
            ]} />
            
            {/* Header section */}
            <View style={styles.modernTaskHeader}>
              <View style={styles.taskHeaderLeft}>
                {isUserTask && (
                  <TouchableOpacity
                    onPress={() => handleToggleTaskCompletion(task)}
                    style={[
                      styles.modernCheckbox,
                      task.completed && styles.modernCheckboxCompleted
                    ]}
                    activeOpacity={0.8}
                  >
                    {task.completed ? (
                      <MaterialCommunityIcons
                        name="check"
                        size={16}
                        color="#FFFFFF"
                      />
                    ) : (
                      <View style={styles.checkboxInner} />
                    )}
                  </TouchableOpacity>
                )}
                <View style={styles.taskTitleContainer}>
                  <Text style={[
                    styles.modernTaskTitle, 
                    task.completed && styles.completedTaskTitle
                  ]}>
                    {task.event}
                  </Text>
                  <View style={styles.taskMetaRow}>
                    {!isUserTask && (
                      <View style={styles.authorTag}>
                        <MaterialCommunityIcons name="account-circle" size={14} color="#7C3AED" />
                        <Text style={styles.authorText}>
                          {task.user.first_name} {task.user.last_name}
                        </Text>
                      </View>
                    )}
                    <View style={styles.dateTag}>
                      <MaterialCommunityIcons name="calendar" size={14} color="#64748B" />
                      <Text style={styles.dateText}>{formatDateUTC(task.date)}</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              {task.completed && (
                <View style={styles.completedBadge}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#10B981" />
                </View>
              )}
            </View>

            {/* Tags section */}
            <View style={styles.tagsContainer}>
              {task.group_info && (
                <View style={styles.modernGroupTag}>
                  <MaterialCommunityIcons name="account-group" size={12} color="#7C3AED" />
                  <Text style={styles.modernGroupTagText}>{task.group_info.name}</Text>
                </View>
              )}
              {task.visibility && (
                <View style={styles.modernVisibilityTag}>
                  <MaterialCommunityIcons 
                    name={task.visibility === "Friends" ? "account-multiple" : 
                          task.visibility === "Just Me" ? "lock" :
                          task.visibility === "Certain Groups" ? "account-group" : "earth"}
                    size={12} 
                    color="#64748B" 
                  />
                  <Text style={styles.modernVisibilityTagText}>{task.visibility}</Text>
                </View>
              )}
            </View>

            {/* Description */}
            <Text style={styles.modernTaskDescription}>{task.description}</Text>

            {/* Interaction bar */}
            <View style={styles.modernInteractionBar}>
              <TouchableOpacity
                style={[styles.modernLikeButton, task.liked_by_current_user && styles.modernLikedButton]}
                onPress={() => handleLikeToggle(task)}
                activeOpacity={0.8}
              >
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                  <MaterialCommunityIcons
                    name={task.liked_by_current_user ? "heart" : "heart-outline"}
                    size={20}
                    color={task.liked_by_current_user ? "#EF4444" : "#64748B"}
                  />
                </Animated.View>
                <Text style={[
                  styles.modernInteractionText,
                  task.liked_by_current_user && { color: "#EF4444", fontWeight: '600' }
                ]}>
                  {task.likes_count || 0}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modernCommentButton}
                onPress={() => handleOpenComments(task)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="comment-outline" size={20} color="#64748B" />
                <Text style={styles.modernInteractionText}>{task.comments_count || 0}</Text>
              </TouchableOpacity>

              {isUserTask && (
                <View style={styles.modernTaskActions}>
                  <TouchableOpacity
                    style={styles.modernEditButton}
                    onPress={() => handleEditTask(task)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="pencil" size={16} color="#7C3AED" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modernDeleteButton}
                    onPress={() => showConfirmDelete(task.id)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>
      );
    },
    [
      handleToggleTaskCompletion,
      handleLikeToggle,
      handleOpenComments,
      handleEditTask,
      showConfirmDelete,
    ],
  );

  // Loading spinner animation
  const spin = loadingSpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Show loading screen while authenticating, initializing, or if user is not authenticated
  if (authLoading || !user || (!isInitialized && (isLoading || !groupsLoaded))) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.modernLoadingContainer}>
          <LinearGradient
            colors={['#B45309', '#D97706', '#EAB308']}
            style={styles.loadingGradient}
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </Animated.View>
            <Text style={styles.loadingText}>
              {authLoading ? "Loading your journey..." : !user ? "Please sign in to continue" : "Preparing your data..."}
            </Text>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} key={refreshKey}>
      <View style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        {notification && (
          <Animated.View
            style={[
              styles.notification,
              notification.type === "error" ? styles.errorNotification : styles.successNotification,
              {
                opacity: notificationAnim,
                transform: [
                  {
                    translateY: notificationAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.notificationText}>{notification.message}</Text>
          </Animated.View>
        )}
        <LinearGradient
          colors={['#B45309', '#D97706', '#EAB308']}
          style={styles.modernHeader}
          ref={headerRef} 
          onLayout={onHeaderLayout}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerTitleSection}>
              <MaterialCommunityIcons name="calendar-heart" size={28} color="#FFFFFF" />
              <View style={styles.headerTextContainer}>
                <Text style={[styles.modernHeaderTitle, isIpad && { fontSize: 32 }]}>
                  Daily Tasks
                </Text>
                <Text style={styles.modernHeaderSubtitle}>
                  {getHeaderTitle()}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.modernFilterButton}
              onPress={() => setShowFilterDropdown(!showFilterDropdown)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="tune" size={20} color="#FFFFFF" />
              <Feather
                name={showFilterDropdown ? "chevron-up" : "chevron-down"}
                size={16}
                color="rgba(255,255,255,0.7)"
              />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modernHeaderButtons}>
            <TouchableOpacity
              style={styles.modernHeaderButton}
              onPress={() => router.navigate("/home")}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="home-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modernAddButton}
              onPress={() => setShowTaskModal(true)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#7C3AED" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        {showFilterDropdown && (
          <Animated.View
            style={[
              styles.filterDropdown,
              {
                top: headerHeight + 10,
                opacity: filterDropdownAnim,
                transform: [
                  {
                    translateY: filterDropdownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.filterOption, tasksFilter === "all" && styles.activeFilterOption]}
              onPress={() => handleSelectFilter("all")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  tasksFilter === "all" && styles.activeFilterOptionText,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterOption, tasksFilter === "friends" && styles.activeFilterOption]}
              onPress={() => handleSelectFilter("friends")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  tasksFilter === "friends" && styles.activeFilterOptionText,
                ]}
              >
                Friends
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterOption, tasksFilter === "groups" && styles.activeFilterOption]}
              onPress={() => handleSelectFilter("groups")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  tasksFilter === "groups" && styles.activeFilterOptionText,
                ]}
              >
                Groups
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
        <View style={styles.viewSwitcher}>
          <TouchableOpacity
            style={[styles.viewButton, view === "calendar" ? styles.activeViewButton : null]}
            onPress={() => setView("calendar")}
            activeOpacity={0.7}
          >
            <Text style={view === "calendar" ? styles.activeViewText : styles.viewButtonText}>
              Calendar View
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewButton, view === "list" ? styles.activeViewButton : null]}
            onPress={() => setView("list")}
            activeOpacity={0.7}
          >
            <Text style={view === "list" ? styles.activeViewText : styles.viewButtonText}>
              List View
            </Text>
          </TouchableOpacity>
        </View>
        {view === "calendar" && (
          <View style={styles.modernMonthHeader}>
            <TouchableOpacity
              onPress={prevMonth}
              accessibilityLabel="Previous month"
              style={styles.modernMonthNavButton}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="chevron-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.monthTitleContainer}>
              <Text style={styles.modernMonthTitle}>{getMonthName(currentMonth)}</Text>
              <Text style={styles.modernYearTitle}>{currentYear}</Text>
            </View>
            
            <TouchableOpacity
              onPress={nextMonth}
              accessibilityLabel="Next month"
              style={styles.modernMonthNavButton}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="chevron-right" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {view === "list" ? (
            <LentListView
              tasksFilter={tasksFilter}
              groupedMyTasks={groupedMyTasks || []}
              friendTasks={friendTasks || []}
              lentTasks={dailyTasks || []}
              currentUserId={currentUserId || ""}
              handleLikeToggle={handleLikeToggle}
              handleOpenComments={handleOpenComments}
              showConfirmDelete={showConfirmDelete}
              handleDeleteRecurringGroup={handleDeleteRecurringGroup}
              handleToggleRecurringGroupCompletion={handleToggleRecurringGroupCompletion}
              handleToggleTaskCompletion={handleToggleTaskCompletion}
              showCompletionConfirm={showCompletionConfirm}
              handleEditTask={handleEditTask}
              likeAnimations={likeAnimations || {}}
              heartAnimations={heartAnimations || {}}
              getHeaderTitle={getHeaderTitle}
            />
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
                    <View key={`day-${index}`} style={styles.modernDayCellContainer}>
                      <TouchableOpacity
                        style={[
                          styles.modernDayCell,
                          !isCurrentMonth && styles.modernDayCellInactive,
                          isToday && styles.modernTodayCell,
                          hasTask && styles.modernDayWithTask,
                        ]}
                        onPress={() => isCurrentMonth && setSelectedDay(day)}
                        disabled={!isCurrentMonth}
                        activeOpacity={0.8}
                      >
                        {isToday && (
                          <LinearGradient
                            colors={['#7C3AED', '#9333EA']}
                            style={styles.todayGradient}
                          />
                        )}
                        
                        <Text
                          style={[
                            styles.modernDayNumber,
                            !isCurrentMonth && styles.modernDayNumberInactive,
                            isToday && styles.modernTodayNumber,
                            hasTask && !isToday && styles.modernDayNumberWithTask,
                          ]}
                        >
                          {day.getDate()}
                        </Text>
                        
                        {(hasTask || hasGuideEvent) && isCurrentMonth && (
                          <View style={styles.modernDayIndicators}>
                            {hasTask && (
                              <View style={styles.modernTaskIndicator}>
                                <MaterialCommunityIcons 
                                  name="circle" 
                                  size={6} 
                                  color={isToday ? "#FFFFFF" : "#7C3AED"} 
                                />
                              </View>
                            )}
                            {hasGuideEvent && (
                              <View style={styles.modernGuideIndicator}>
                                <MaterialCommunityIcons 
                                  name="star" 
                                  size={8} 
                                  color={isToday ? "#FFFFFF" : "#F59E0B"} 
                                />
                              </View>
                            )}
                          </View>
                        )}
                        
                        {hasTask && (
                          <View style={[
                            styles.taskCountBadge,
                            isToday && styles.taskCountBadgeToday
                          ]}>
                            <Text style={[
                              styles.taskCountText,
                              isToday && styles.taskCountTextToday
                            ]}>
                              {dayTasks.length}
                            </Text>
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
        {(isLoading || commentLoading) && (
          <View style={styles.modernLoadingOverlay}>
            <View style={styles.modernLoadingContainer}>
              <LinearGradient
                colors={['rgba(26, 26, 26, 0.95)', 'rgba(42, 42, 42, 0.95)']}
                style={styles.modernLoadingGradient}
              >
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <MaterialCommunityIcons name="loading" size={40} color="#7C3AED" />
                </Animated.View>
                <Text style={styles.modernLoadingText}>Loading your journey...</Text>
                <View style={styles.loadingProgressBar}>
                  <Animated.View style={[
                    styles.loadingProgress,
                    { transform: [{ scaleX: loadingSpinAnim }] }
                  ]} />
                </View>
              </LinearGradient>
            </View>
          </View>
        )}
        <Modal
          visible={showTaskModal}
          transparent={true}
          animationType="none"
          onRequestClose={() => {
            // Close modal first
            setShowTaskModal(false);
            // Then clean up other UI states after animation would be complete
            setTimeout(() => {
              setShowInlineDatePicker(false);
              setShowVisibilityDropdownNew(false);
            }, 300);
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View
                style={[
                  styles.modalContent,
                  keyboardVisible && styles.modalContentKeyboardVisible,
                  isIpad && { width: "90%" },
                ]}
              >
                <Text style={styles.modalTitle}>Add New Task</Text>
                <Text style={styles.inputLabel}>Event</Text>
                <TextInput
                  style={styles.textInput}
                  value={newTask.event}
                  onChangeText={(text) => setNewTask({ ...newTask, event: text })}
                  placeholder="Enter event..."
                  placeholderTextColor={theme.neutral400}
                  accessibilityLabel="Event name"
                />
                <Text style={styles.inputLabel}>Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => {
                    if (Platform.OS === "android") {
                      DateTimePickerAndroid.open({
                        value: new Date(newTask.date + "T00:00:00"),
                        onChange: (event, date) => {
                          if (date) {
                            const y = date.getFullYear();
                            const m = String(date.getMonth() + 1).padStart(2, "0");
                            const d = String(date.getDate()).padStart(2, "0");
                            setNewTask({ ...newTask, date: `${y}-${m}-${d}` });
                          }
                        },
                        mode: "date",
                      });
                    } else {
                      setShowInlineDatePicker((prev) => !prev);
                    }
                  }}
                  accessibilityLabel={`Select date, current date: ${new Date(
                    newTask.date + "T00:00:00",
                  ).toLocaleDateString()}`}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dateButtonText}>
                    {new Date(newTask.date + "T00:00:00").toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                {Platform.OS !== "android" && showInlineDatePicker && (
                  <DateTimePicker
                    value={new Date(newTask.date + "T00:00:00")}
                    mode="date"
                    display="spinner"
                    onChange={(event, date) => {
                      if (date) {
                        const y = date.getFullYear();
                        const m = String(date.getMonth() + 1).padStart(2, "0");
                        const d = String(date.getDate()).padStart(2, "0");
                        setNewTask({ ...newTask, date: `${y}-${m}-${d}` });
                      }
                    }}
                    style={{ backgroundColor: theme.neutral900 }}
                    textColor={theme.textWhite}
                    themeVariant="dark"
                  />
                )}
                <TouchableOpacity
                  onPress={() => setIsRecurring((prev) => !prev)}
                  style={styles.recurringToggleButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.recurringToggleText}>
                    {isRecurring ? "Single Day Event" : "Make this a Recurring Event"}
                  </Text>
                </TouchableOpacity>
                {isRecurring && (
                  <>
                    <Text style={styles.inputLabel}>End Date</Text>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => {
                        if (Platform.OS === "android") {
                          DateTimePickerAndroid.open({
                            value: new Date(recurrenceEndDate + "T00:00:00"),
                            onChange: (event, date) => {
                              if (date) {
                                const y = date.getFullYear();
                                const m = String(date.getMonth() + 1).padStart(2, "0");
                                const d = String(date.getDate()).padStart(2, "0");
                                setRecurrenceEndDate(`${y}-${m}-${d}`);
                              }
                            },
                            mode: "date",
                          });
                        } else {
                          setShowInlineRecurrenceDatePicker((prev) => !prev);
                        }
                      }}
                      accessibilityLabel={`Select end date, current end date: ${new Date(
                        recurrenceEndDate + "T00:00:00",
                      ).toLocaleDateString()}`}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dateButtonText}>
                        {new Date(recurrenceEndDate + "T00:00:00").toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>
                    {Platform.OS !== "android" && showInlineRecurrenceDatePicker && (
                      <DateTimePicker
                        value={new Date(recurrenceEndDate + "T00:00:00")}
                        mode="date"
                        display="spinner"
                        onChange={(event, date) => {
                          if (date) {
                            const y = date.getFullYear();
                            const m = String(date.getMonth() + 1).padStart(2, "0");
                            const d = String(date.getDate()).padStart(2, "0");
                            setRecurrenceEndDate(`${y}-${m}-${d}`);
                          }
                        }}
                        style={{ backgroundColor: theme.neutral900 }}
                        textColor={theme.textWhite}
                        themeVariant="dark"
                      />
                    )}
                  </>
                )}
                <Text style={styles.inputLabel}>Visibility</Text>
                <TouchableOpacity
                  style={styles.visibilityButton}
                  onPress={() => setShowVisibilityDropdownNew(!showVisibilityDropdownNew)}
                  activeOpacity={0.7}
                >
                  <View style={styles.visibilityButtonContent}>
                    {visibilityOptions.find((option) => option.label === newTask.visibility)?.icon}
                    <Text style={styles.visibilityButtonText}>{newTask.visibility}</Text>
                  </View>
                  <Feather
                    name={showVisibilityDropdownNew ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={theme.tertiary}
                  />
                </TouchableOpacity>
                {showVisibilityDropdownNew && (
                  <View style={styles.visibilityDropdown}>
                    {visibilityOptions.map((option) => (
                      <TouchableOpacity
                        key={option.label}
                        style={[
                          styles.visibilityOption,
                          option.label === newTask.visibility && styles.visibilityOptionSelected,
                        ]}
                        onPress={() => {
                          setNewTask({
                            ...newTask,
                            visibility: option.label as
                              | "Friends"
                              | "Certain Groups"
                              | "Just Me"
                              | "Friends & Groups",
                            selectedGroups:
                              option.label === "Certain Groups" ? newTask.selectedGroups : [],
                          });
                          setShowVisibilityDropdownNew(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.visibilityOptionContent}>
                          {option.icon}
                          <Text style={styles.visibilityOptionText}>{option.label}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {newTask.visibility === "Certain Groups" && (
                  <View style={styles.groupSelectorContainer}>
                    <Text style={styles.groupSelectorLabel}>Select Groups:</Text>
                    <View style={styles.groupSelectorList}>
                      {userGroups.length === 0 ? (
                        <Text style={styles.noGroupsText}>You are not a member of any groups.</Text>
                      ) : (
                        userGroups.map((group) => (
                          <TouchableOpacity
                            key={group.id}
                            style={[
                              styles.groupOption,
                              newTask.selectedGroups.includes(group.id) &&
                                styles.groupOptionSelected,
                            ]}
                            onPress={() => toggleNewGroupSelection(group.id)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.groupOptionText}>{group.name}</Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  </View>
                )}
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textAreaInput]}
                  value={newTask.description}
                  onChangeText={(text) => setNewTask({ ...newTask, description: text })}
                  placeholder="Enter description..."
                  placeholderTextColor={theme.neutral400}
                  multiline
                  numberOfLines={4}
                  accessibilityLabel="Event description"
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      // First close the modal
                      setShowTaskModal(false);
                      // Then reset other states after animation would have completed
                      setTimeout(() => {
                        setShowInlineDatePicker(false);
                        setShowVisibilityDropdownNew(false);
                      }, 300);
                    }}
                    accessibilityLabel="Cancel"
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleCreateTask}
                    accessibilityLabel="Add task"
                    activeOpacity={0.7}
                  >
                    <Text style={styles.addButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
        <Modal
          visible={!!editingTask}
          transparent={true}
          animationType="none"
          onRequestClose={() => {
            // First close modal
            const wasEditing = !!editingTask;
            if (wasEditing) {
              setEditingTask(null);
              // Then clean up other UI states
              setTimeout(() => {
                setShowVisibilityDropdownEdit(false);
                setShowEditDatePicker(false);
              }, 300);
            }
          }}
        >
          {editingTask && (
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.modalOverlay}
            >
              <ScrollView
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View
                  style={[
                    styles.modalContent,
                    keyboardVisible && styles.modalContentKeyboardVisible,
                    isIpad && { width: "90%" },
                  ]}
                >
                  <Text style={styles.modalTitle}>Edit Task</Text>
                  <Text style={styles.inputLabel}>Event</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editingTask.event}
                    onChangeText={(text) =>
                      setEditingTask({
                        ...editingTask,
                        event: text,
                      } as DailyTask)
                    }
                    placeholder="Enter event..."
                    placeholderTextColor={theme.neutral400}
                    accessibilityLabel="Event name"
                  />
                  <Text style={styles.inputLabel}>Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      if (Platform.OS === "android") {
                        DateTimePickerAndroid.open({
                          value: new Date(editingTask.date + "T00:00:00"),
                          onChange: (event, date) => {
                            if (date) {
                              const y = date.getFullYear();
                              const m = String(date.getMonth() + 1).padStart(2, "0");
                              const d = String(date.getDate()).padStart(2, "0");
                              setEditingTask({
                                ...editingTask,
                                date: `${y}-${m}-${d}`,
                              } as DailyTask);
                            }
                          },
                          mode: "date",
                        });
                      } else {
                        setShowEditDatePicker((prev) => !prev);
                      }
                    }}
                    accessibilityLabel={`Select date, current date: ${new Date(
                      editingTask.date + "T00:00:00",
                    ).toLocaleDateString()}`}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dateButtonText}>
                      {new Date(editingTask.date + "T00:00:00").toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                  {Platform.OS !== "android" && showEditDatePicker && (
                    <DateTimePicker
                      value={new Date(editingTask.date + "T00:00:00")}
                      mode="date"
                      display="spinner"
                      onChange={(event, date) => {
                        if (date) {
                          const y = date.getFullYear();
                          const m = String(date.getMonth() + 1).padStart(2, "0");
                          const d = String(date.getDate()).padStart(2, "0");
                          setEditingTask({
                            ...editingTask,
                            date: `${y}-${m}-${d}`,
                          } as DailyTask);
                        }
                      }}
                      style={{ backgroundColor: theme.neutral900 }}
                      textColor={theme.textWhite}
                      themeVariant="dark"
                    />
                  )}
                  <Text style={styles.inputLabel}>Visibility</Text>
                  <TouchableOpacity
                    style={styles.visibilityButton}
                    onPress={() => setShowVisibilityDropdownEdit(!showVisibilityDropdownEdit)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.visibilityButtonContent}>
                      {
                        visibilityOptions.find((option) => option.label === editingTask.visibility)
                          ?.icon
                      }
                      <Text style={styles.visibilityButtonText}>
                        {editingTask.visibility || "Friends"}
                      </Text>
                    </View>
                    <Feather
                      name={showVisibilityDropdownEdit ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={theme.tertiary}
                    />
                  </TouchableOpacity>
                  {showVisibilityDropdownEdit && (
                    <View style={styles.visibilityDropdown}>
                      {visibilityOptions.map((option) => (
                        <TouchableOpacity
                          key={option.label}
                          style={[
                            styles.visibilityOption,
                            option.label === editingTask.visibility &&
                              styles.visibilityOptionSelected,
                          ]}
                          onPress={() => {
                            setEditingTask({
                              ...editingTask,
                              visibility: option.label as
                                | "Friends"
                                | "Certain Groups"
                                | "Just Me"
                                | "Friends & Groups",
                              selectedGroups:
                                option.label === "Certain Groups"
                                  ? editingTask.selectedGroups || []
                                  : [],
                            });
                            setShowVisibilityDropdownEdit(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.visibilityOptionContent}>
                            {option.icon}
                            <Text style={styles.visibilityOptionText}>{option.label}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {editingTask.visibility === "Certain Groups" && (
                    <View style={styles.groupSelectorContainer}>
                      <Text style={styles.groupSelectorLabel}>Select Groups:</Text>
                      <View style={styles.groupSelectorList}>
                        {userGroups.length === 0 ? (
                          <Text style={styles.noGroupsText}>
                            You are not a member of any groups.
                          </Text>
                        ) : (
                          userGroups.map((group) => (
                            <TouchableOpacity
                              key={group.id}
                              style={[
                                styles.groupOption,
                                editingTask.selectedGroups &&
                                  editingTask.selectedGroups.includes(group.id) &&
                                  styles.groupOptionSelected,
                              ]}
                              onPress={() => toggleEditGroupSelection(group.id)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.groupOptionText}>{group.name}</Text>
                            </TouchableOpacity>
                          ))
                        )}
                      </View>
                    </View>
                  )}
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={[styles.textInput, styles.textAreaInput]}
                    value={editingTask.description}
                    onChangeText={(text) =>
                      setEditingTask({
                        ...editingTask,
                        description: text,
                      } as DailyTask)
                    }
                    placeholder="Enter description..."
                    placeholderTextColor={theme.neutral400}
                    multiline
                    numberOfLines={4}
                    accessibilityLabel="Event description"
                  />
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        // First close the modal by setting editingTask to null
                        setEditingTask(null);
                        // Then reset the other states after animation would complete
                        setTimeout(() => {
                          setShowEditDatePicker(false);
                          setShowVisibilityDropdownEdit(false);
                        }, 300);
                      }}
                      accessibilityLabel="Cancel"
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={handleUpdateTask}
                      accessibilityLabel="Save changes"
                      activeOpacity={0.7}
                    >
                      <Text style={styles.addButtonText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          )}
        </Modal>
        <Modal
          visible={showCommentModal}
          transparent={true}
          animationType="none"
          onRequestClose={() => {
            setShowCommentModal(false);
            // Delay clearing data until modal is fully closed
            setTimeout(() => {
              setSelectedTaskForComments(null);
            }, 300);
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
                        // First hide the modal
                        setShowCommentModal(false);
                        // Then clear the data after animation would be complete
                        setTimeout(() => {
                          setSelectedTaskForComments(null);
                        }, 300);
                      }}
                      activeOpacity={0.7}
                    >
                      <Feather name="x" size={20} color={theme.neutral50} />
                    </TouchableOpacity>
                  </View>
                  {commentLoading ? (
                    <View style={styles.commentLoadingContainer}>
                      <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <ActivityIndicator size="large" color={theme.tertiary} />
                      </Animated.View>
                      <Text style={styles.commentLoadingText}>Loading comments...</Text>
                    </View>
                  ) : taskComments.length > 0 ? (
                    <FlatList
                      data={taskComments}
                      keyExtractor={(item) => item.id}
                      style={styles.commentsList}
                      contentContainerStyle={styles.commentsListContent}
                      ItemSeparatorComponent={() => <View style={styles.commentSeparator} />}
                      showsVerticalScrollIndicator={false}
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
                                  {item.user?.first_name || "User"} {item.user?.last_name || ""}
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
                                activeOpacity={0.7}
                              >
                                <Feather name="trash-2" size={14} color={theme.error} />
                              </TouchableOpacity>
                            )}
                          </View>
                          <Text style={styles.commentContent}>{item.content}</Text>
                        </View>
                      )}
                    />
                  ) : (
                    <View style={styles.emptyCommentsContainer}>
                      <Feather name="message-circle" size={48} color={`${theme.tertiary}33`} />
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
                      placeholderTextColor={theme.neutral400}
                      multiline
                    />
                    <TouchableOpacity
                      style={[
                        styles.sendCommentButton,
                        !newComment.trim() && styles.disabledSendButton,
                      ]}
                      onPress={handleAddComment}
                      disabled={!newComment.trim()}
                      activeOpacity={0.7}
                    >
                      <Feather name="send" size={16} color={theme.neutral50} />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Fixed Guide Event Modal with proper animations */}
        <Modal
          visible={!!selectedGuideEvent}
          transparent={true}
          animationType="none"
          onRequestClose={() => {
            // Animate out before setting to null
            Animated.parallel([
              Animated.timing(guideEventOpacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(guideEventScaleAnim, {
                toValue: 0.9,
                duration: 200,
                useNativeDriver: true,
              }),
            ]).start(() => {
              setSelectedGuideEvent(null);
            });
          }}
          hardwareAccelerated={true}
        >
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.guideEventModal,
                {
                  opacity: guideEventOpacityAnim,
                  transform: [{ scale: guideEventScaleAnim }],
                },
              ]}
            >
              <Text style={styles.guideEventModalTitle}>{selectedGuideEvent?.title}</Text>
              <Text style={styles.guideEventModalDesc}>{selectedGuideEvent?.description}</Text>
              <TouchableOpacity
                style={styles.guideEventCloseButton}
                onPress={() => {
                  // Animate out before closing
                  Animated.parallel([
                    Animated.timing(guideEventOpacityAnim, {
                      toValue: 0,
                      duration: 200,
                      useNativeDriver: true,
                    }),
                    Animated.timing(guideEventScaleAnim, {
                      toValue: 0.9,
                      duration: 200,
                      useNativeDriver: true,
                    }),
                  ]).start(() => {
                    setSelectedGuideEvent(null);
                  });
                }}
                accessibilityLabel="Close"
                activeOpacity={0.7}
              >
                <Text style={styles.guideEventCloseText}>Close</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>

        <ConfirmationModal
          visible={showDeleteConfirmModal}
          onClose={() => setShowDeleteConfirmModal(false)}
          onConfirm={handleConfirmDelete}
          title={deleteInfo.title}
          message={deleteInfo.message}
          confirmText="Delete"
          confirmStyle="warning"
        />
        <ConfirmationModal
          visible={showCompletionConfirmModal}
          onClose={handleCancelCompletion}
          onConfirm={handleConfirmCompletion}
          title={`Mark All Tasks as ${
            !completionInfo.currentAllCompleted ? "Complete" : "Incomplete"
          }`}
          message={`This will mark all "${completionInfo.taskName}" tasks as ${
            !completionInfo.currentAllCompleted ? "complete" : "incomplete"
          }. To individually check them, use the calendar view.`}
          confirmText={
            !completionInfo.currentAllCompleted ? "Mark All Complete" : "Mark All Incomplete"
          }
          confirmStyle="success"
        />
        <Modal
          visible={!!selectedDay}
          transparent={true}
          animationType="none"
          onRequestClose={() => {
            setSelectedDay(null);
          }}
          hardwareAccelerated={true}
        >
          {selectedDay && (
            <View style={styles.modalOverlay}>
              <ExpandedDayView
                day={selectedDay}
                onClose={() => setSelectedDay(null)}
                onAddTask={() => {
                  // First close the day view
                  setSelectedDay(null);

                  // Short delay before showing task modal to prevent UI flash
                  setTimeout(() => {
                    handleAddTaskForDay(selectedDay);
                  }, 100);
                }}
                dayTasks={getTasksForDay(selectedDay)}
                guideEvents={getGuideEventsForDate(selectedDay)}
                currentUserId={currentUserId}
                friendColors={friendColors}
                handleLikeToggle={handleLikeToggle}
                handleOpenComments={handleOpenComments}
                showConfirmDelete={showConfirmDelete}
                onGuideEventPress={(event: DailyEvent) => {
                  // First close day view
                  setSelectedDay(null);

                  // Short delay before showing guide event to prevent UI flash
                  setTimeout(() => {
                    setSelectedGuideEvent(event);
                  }, 100);
                }}
                handleToggleTaskCompletion={handleToggleTaskCompletion}
              />
            </View>
          )}
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.neutral900 },
  notification: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 15,
    zIndex: 100,
    alignItems: "center",
    shadowColor: theme.neutral900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  errorNotification: { backgroundColor: theme.error },
  successNotification: { backgroundColor: theme.success },
  notificationText: { color: theme.textWhite, fontWeight: "500", letterSpacing: 0.5 },
  // Modern Header Styles
  modernHeader: {
    paddingTop: 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  modernHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  modernHeaderSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '400',
    marginTop: 2,
  },
  modernFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    gap: 6,
  },
  modernHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modernHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modernAddButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  filterDropdown: {
    position: "absolute",
    left: 15,
    right: 15,
    zIndex: 100,
    backgroundColor: `${theme.neutral900}F2`,
    borderRadius: 15,
    padding: 5,
    shadowColor: theme.neutral900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: `${theme.tertiary}4D`,
  },
  filterOption: { paddingVertical: 14, paddingHorizontal: 15, borderRadius: 8 },
  activeFilterOption: { backgroundColor: `${theme.tertiary}33` },
  filterOptionText: {
    color: theme.textWhite,
    fontSize: 16,
    fontWeight: "400",
    textAlign: "center",
  },
  activeFilterOptionText: { color: theme.tertiary, fontWeight: "600" },
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
    backgroundColor: `${theme.neutral900}99`,
    borderWidth: 1,
    borderColor: `${theme.neutral100}1A`,
  },
  activeViewButton: {
    backgroundColor: theme.primary,
    borderColor: `${theme.tertiary}99`,
  },
  viewButtonText: { color: theme.textWhite, fontWeight: "400", letterSpacing: 0.5 },
  activeViewText: { color: theme.neutral900, fontWeight: "500", letterSpacing: 0.5 },
  content: { flex: 1, paddingHorizontal: 16 },
  contentContainer: { paddingBottom: 80 },
  listContainer: { paddingBottom: 20 },
  sectionContainer: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "300",
    color: theme.textWhite,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.tertiary,
    paddingBottom: 8,
    letterSpacing: 0.5,
  },
  emptyText: {
    color: `${theme.neutral100}B3`,
    fontStyle: "italic",
    textAlign: "center",
    padding: 12,
    letterSpacing: 0.5,
  },
  // Modern Task Card Styles
  modernTaskCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  taskCardGradient: {
    padding: 20,
    position: 'relative',
  },
  taskStatusIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  modernTaskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  taskHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  modernCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: 'transparent',
  },
  modernCheckboxCompleted: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  checkboxInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  taskTitleContainer: {
    flex: 1,
  },
  modernTaskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 24,
  },
  completedTaskTitle: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorText: {
    fontSize: 13,
    color: '#7C3AED',
    fontWeight: '500',
  },
  dateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '400',
  },
  completedBadge: {
    marginLeft: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  groupTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  groupTagText: {
    fontSize: 11,
    color: '#7C3AED',
    fontWeight: '500',
  },
  visibilityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  visibilityTagText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  // Task card and interaction styles
  taskCard: {
    backgroundColor: theme.neutral800,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  taskHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.neutral400,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textWhite,
    flex: 1,
  },
  recurringTaskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.primary,
    flex: 1,
  },
  taskDate: {
    fontSize: 14,
    color: theme.neutral300,
    marginBottom: 8,
  },
  taskDescription: {
    fontSize: 14,
    color: theme.neutral200,
    lineHeight: 20,
    marginBottom: 12,
  },
  taskInteractionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  likedButton: {
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
  },
  heartIconContainer: {
    position: 'relative',
  },
  heartIconBase: {
    marginRight: 6,
  },
  heartAnimation: {
    position: 'absolute',
  },
  likeButtonText: {
    color: theme.textWhite,
    fontSize: 12,
    fontWeight: '500',
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  commentButtonText: {
    color: theme.textWhite,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskAction: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  deleteActionText: {
    color: theme.error,
    fontSize: 12,
    fontWeight: '500',
  },
  modernGroupTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  modernGroupTagText: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '500',
  },
  modernVisibilityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  modernVisibilityTagText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  modernTaskDescription: {
    fontSize: 15,
    color: '#CBD5E1',
    lineHeight: 22,
    marginBottom: 20,
  },
  modernInteractionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.1)',
    gap: 20,
  },
  modernLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modernLikedButton: {
    // Add any special styling for liked state
  },
  modernInteractionText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  modernCommentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modernTaskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 8,
  },
  modernEditButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernDeleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarContainer: { paddingBottom: 20, marginTop: 8 },
  // Modern Month Header Styles
  modernMonthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 16,
    marginHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  modernMonthNavButton: { 
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  monthTitleContainer: {
    alignItems: 'center',
  },
  modernMonthTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  modernYearTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  weekdayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: `${theme.tertiary}33`,
  },
  weekdayText: {
    color: theme.tertiary,
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
  // Modern Calendar Day Styles
  modernDayCellContainer: {
    position: "relative",
    flexBasis: "14.2857%",
    maxWidth: "14.2857%",
    paddingHorizontal: 2,
    paddingVertical: 3,
  },
  modernDayCell: {
    justifyContent: "center",
    alignItems: "center",
    minHeight: 64,
    borderRadius: 16,
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modernDayCellInactive: { 
    opacity: 0.3,
  },
  modernTodayCell: {
    borderColor: 'rgba(124, 58, 237, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  modernDayWithTask: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  todayGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  modernDayNumber: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: "center",
    zIndex: 2,
  },
  modernDayNumberInactive: { 
    color: 'rgba(255, 255, 255, 0.3)',
  },
  modernTodayNumber: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 17,
  },
  modernDayNumberWithTask: {
    color: '#7C3AED',
    fontWeight: '600',
  },
  modernDayIndicators: {
    flexDirection: "row",
    position: "absolute",
    bottom: 6,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
    gap: 2,
  },
  modernTaskIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernGuideIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCountBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  taskCountBadgeToday: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  taskCountText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  taskCountTextToday: {
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: `${theme.neutral900}B3`,
    justifyContent: "center",
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: `${theme.neutral900}CC`,
    borderRadius: 15,
    padding: 20,
    width: "100%",
    maxWidth: 500,
    borderWidth: 1,
    borderColor: `${theme.neutral100}33`,
    shadowColor: theme.neutral900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalContentKeyboardVisible: { marginBottom: 150 },
  modalTitle: {
    fontSize: 22,
    fontWeight: "300",
    color: theme.textWhite,
    marginBottom: 20,
    textAlign: "center",
    letterSpacing: 1,
  },
  inputLabel: {
    color: theme.textWhite,
    fontSize: 16,
    fontWeight: "400",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: `${theme.neutral100}1A`,
    borderWidth: 1,
    borderColor: `${theme.neutral100}33`,
    borderRadius: 15,
    padding: 14,
    color: theme.textWhite,
    marginBottom: 16,
    letterSpacing: 0.5,
    fontSize: 16,
  },
  textAreaInput: { height: 120, textAlignVertical: "top" },
  dateButton: {
    backgroundColor: `${theme.neutral100}1A`,
    borderWidth: 1,
    borderColor: `${theme.neutral100}33`,
    borderRadius: 15,
    padding: 14,
    marginBottom: 16,
  },
  dateButtonText: { color: theme.textWhite, letterSpacing: 0.5, fontSize: 16 },
  visibilityButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: `${theme.neutral100}1A`,
    borderWidth: 1,
    borderColor: `${theme.neutral100}33`,
    borderRadius: 15,
    padding: 14,
    marginBottom: 16,
  },
  visibilityButtonContent: { flexDirection: "row", alignItems: "center" },
  visibilityButtonText: {
    color: theme.textWhite,
    marginLeft: 10,
    letterSpacing: 0.5,
    fontSize: 16,
  },
  visibilityDropdown: {
    backgroundColor: `${theme.neutral700}F2`,
    borderRadius: 10,
    marginTop: -10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${theme.neutral100}33`,
    overflow: "hidden",
  },
  visibilityOption: { paddingVertical: 12, paddingHorizontal: 16 },
  visibilityOptionSelected: { backgroundColor: `${theme.tertiary}33` },
  visibilityOptionContent: { flexDirection: "row", alignItems: "center" },
  visibilityOptionText: { color: theme.textWhite, marginLeft: 10, fontSize: 16 },
  groupSelectorContainer: {
    backgroundColor: `${theme.neutral100}0D`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${theme.neutral100}1A`,
  },
  groupSelectorLabel: {
    color: theme.textWhite,
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 10,
  },
  groupSelectorList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  groupOption: {
    backgroundColor: `${theme.neutral100}1A`,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: `${theme.neutral100}33`,
    marginBottom: 8,
    marginRight: 8,
  },
  groupOptionSelected: {
    backgroundColor: `${theme.tertiary}33`,
    borderColor: `${theme.tertiary}66`,
  },
  groupOptionText: { color: theme.textWhite, fontSize: 14 },
  noGroupsText: {
    color: `${theme.neutral100}99`,
    fontStyle: "italic",
    padding: 8,
  },
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
    color: `${theme.neutral100}B3`,
    letterSpacing: 0.5,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: `${theme.tertiary}26`,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: `${theme.tertiary}4D`,
  },
  addButtonText: {
    color: theme.textWhite,
    fontWeight: "500",
    letterSpacing: 0.5,
    fontSize: 16,
  },
  commentModalContent: {
    backgroundColor: `${theme.neutral900}CC`,
    borderRadius: 15,
    margin: 16,
    height: "80%",
    width: "90%",
    maxWidth: 540,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: `${theme.neutral100}33`,
    shadowColor: theme.neutral900,
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
    borderBottomColor: `${theme.tertiary}26`,
    backgroundColor: `${theme.neutral900}CC`,
  },
  commentModalTitle: {
    fontSize: 18,
    fontWeight: "300",
    color: theme.textWhite,
    flex: 1,
    letterSpacing: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: `${theme.neutral100}1A`,
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
    color: theme.textWhite,
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
    color: `${theme.neutral100}B3`,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 12,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  commentItem: {
    backgroundColor: `${theme.neutral100}26`,
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: `${theme.neutral100}33`,
    shadowColor: theme.neutral900,
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
    backgroundColor: `${theme.tertiary}33`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: `${theme.neutral100}33`,
  },
  commentAvatarText: {
    color: theme.textWhite,
    fontWeight: "300",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  commentAuthor: { color: theme.textWhite, fontWeight: "500", letterSpacing: 0.5 },
  commentTime: {
    color: `${theme.neutral100}80`,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  commentContent: {
    color: `${theme.neutral100}E6`,
    lineHeight: 22,
    fontSize: 15,
    paddingHorizontal: 2,
    letterSpacing: 0.3,
  },
  addCommentContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: `${theme.tertiary}26`,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${theme.neutral900}CC`,
  },
  commentInput: {
    flex: 1,
    backgroundColor: `${theme.neutral100}1A`,
    borderWidth: 1,
    borderColor: `${theme.neutral100}33`,
    borderRadius: 30,
    padding: 12,
    paddingHorizontal: 16,
    color: theme.textWhite,
    marginRight: 10,
    maxHeight: 120,
    fontSize: 15,
    letterSpacing: 0.3,
  },
  sendCommentButton: {
    backgroundColor: theme.tertiary,
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: theme.neutral900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  disabledSendButton: { backgroundColor: `${theme.tertiary}4D` },
  deleteCommentButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: `${theme.neutral900}66`,
  },
  deleteCommentText: {
    color: theme.error,
    fontSize: 12,
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  expandedDayContainer: {
    backgroundColor: `${theme.neutral900}F2`,
    borderRadius: 20,
    width: "90%",
    maxHeight: "95%",
    minHeight: 500,
    padding: 16,
    alignSelf: "center",
    shadowColor: theme.neutral900,
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
    borderBottomColor: `${theme.tertiary}4D`,
    paddingBottom: 8,
    marginBottom: 12,
  },
  expandedDayTitle: { fontSize: 24, fontWeight: "600", color: theme.tertiary },
  closeIconButton: { padding: 8 },
  expandedDayContent: { flex: 1, width: "100%" },
  expandedDaySection: { marginBottom: 20 },
  expandedDaySectionTitle: {
    fontSize: 20,
    fontWeight: "500",
    color: theme.textWhite,
    marginBottom: 12,
  },
  expandedDayEmptyText: {
    color: `${theme.neutral100}B3`,
    fontStyle: "italic",
    textAlign: "center",
    padding: 12,
  },
  expandedDayGuideEvent: {
    flexDirection: "row",
    backgroundColor: `${theme.tertiary}1A`,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: `${theme.tertiary}33`,
  },
  expandedDayGuideEventIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${theme.neutral100}1A`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  expandedDayGuideEventContent: { flex: 1 },
  expandedDayGuideEventTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.textWhite,
    marginBottom: 6,
  },
  expandedDayGuideEventDesc: {
    color: `${theme.neutral100}CC`,
    fontSize: 14,
    lineHeight: 20,
  },
  expandedDayTask: {
    flexDirection: "row",
    backgroundColor: `${theme.neutral100}1A`,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: `${theme.neutral100}33`,
  },
  expandedDayTaskUserIndicator: { width: 4, borderRadius: 2, marginRight: 10 },
  expandedDayTaskContent: { flex: 1 },
  expandedDayTaskTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.textWhite,
    marginBottom: 2,
  },
  expandedDayTaskUser: { fontSize: 13, color: theme.secondary, marginBottom: 4 },
  expandedDayTaskDesc: {
    color: `${theme.neutral100}CC`,
    marginBottom: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  expandedDayTaskActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: `${theme.neutral100}1A`,
    paddingTop: 10,
  },
  expandedDayTaskAction: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  expandedDayTaskActionText: { color: theme.neutral400, marginLeft: 4, fontSize: 13 },
  expandedDayTaskActionTextActive: { color: theme.tertiary },
  expandedDayTaskDeleteText: { color: theme.error, marginLeft: 4, fontSize: 13 },
  floatingAddTaskButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: theme.tertiary,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: theme.neutral900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  // Modern Loading Overlay Styles
  modernLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modernLoadingContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  modernLoadingGradient: {
    paddingHorizontal: 40,
    paddingVertical: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  modernLoadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  loadingGradient: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    alignItems: 'center',
    borderRadius: 16,
    margin: 20,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  loadingProgressBar: {
    width: 120,
    height: 3,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderRadius: 1.5,
    marginTop: 16,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 1.5,
  },
  guideEventModal: {
    backgroundColor: `${theme.neutral900}CC`,
    borderRadius: 15,
    padding: 20,
    width: "90%",
    maxWidth: 500,
    borderWidth: 1,
    borderColor: `${theme.neutral100}33`,
    alignSelf: "center",
    shadowColor: theme.neutral900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  guideEventModalTitle: {
    fontSize: 20,
    fontWeight: "300",
    color: theme.textWhite,
    marginBottom: 12,
    letterSpacing: 1,
  },
  guideEventModalDesc: {
    color: theme.textWhite,
    marginBottom: 16,
    lineHeight: 22,
    letterSpacing: 0.5,
    fontSize: 16,
  },
  guideEventCloseButton: {
    alignSelf: "flex-end",
    backgroundColor: `${theme.tertiary}26`,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: `${theme.tertiary}4D`,
  },
  guideEventCloseText: {
    color: theme.textWhite,
    fontWeight: "500",
    letterSpacing: 0.5,
    fontSize: 16,
  },
  recurringToggleButton: { alignSelf: "center", marginBottom: 16 },
  recurringToggleText: {
    color: theme.tertiary,
    fontSize: 16,
    textDecorationLine: "underline",
  },
  deleteModalContent: {
    backgroundColor: `${theme.neutral900}F2`,
    borderRadius: 15,
    padding: 20,
    width: "90%",
    maxWidth: 400,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: `${theme.error}4D`,
    shadowColor: theme.neutral900,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  deleteModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: `${theme.error}33`,
    paddingBottom: 12,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.textWhite,
    marginLeft: 12,
    flex: 1,
  },
  deleteModalMessage: {
    color: `${theme.neutral100}E6`,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  deleteModalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: `${theme.neutral100}1A`,
    paddingTop: 16,
  },
  deleteModalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  deleteModalCancelText: {
    color: `${theme.neutral100}B3`,
    fontSize: 16,
    fontWeight: "500",
  },
  deleteModalConfirmButton: {
    backgroundColor: theme.error,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  deleteModalConfirmText: { color: theme.textWhite, fontSize: 16, fontWeight: "600" },
  successConfirmButton: { backgroundColor: theme.success },
});

export default DailyTasks2025;
