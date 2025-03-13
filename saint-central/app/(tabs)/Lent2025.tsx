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
  Easing,
} from "react-native";
import { router } from "expo-router";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { supabase } from "../../supabaseClient";
import { Feather, FontAwesome } from "@expo/vector-icons";

// --------------------
// Data Interfaces
// --------------------
interface LentTask {
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
// Lent Guide Events
// --------------------
interface LentEvent {
  date: string;
  title: string;
  description: string;
}

const visibilityOptions = [
  {
    label: "Friends",
    icon: <Feather name="users" size={16} color="#FFFFFF" />,
  },
  {
    label: "Certain Groups",
    icon: <Feather name="grid" size={16} color="#FFFFFF" />,
  },
  {
    label: "Friends & Groups",
    icon: <FontAwesome name="globe" size={16} color="#FFFFFF" />,
  },
  { label: "Just Me", icon: <Feather name="user" size={16} color="#FFFFFF" /> },
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

const lentGuideEvents: LentEvent[] = [
  {
    date: "March 5",
    title: "Ash Wednesday",
    description:
      "Attend an Ash Wednesday service to receive ashes on your forehead, symbolizing repentance and mortality. Reflect on areas in your life needing growth and set a personal intention for Lent.",
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
      "Organize a group discussion with friends or family about the significance of Lent. Share personal goals and support each other in your spiritual journeys.",
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
const groupTasks = (tasks: LentTask[]) => {
  const groups: { [key: string]: LentTask[] } = {};
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
  dayTasks: LentTask[];
  guideEvents: LentEvent[];
  currentUserId: string;
  friendColors: { [email: string]: string };
  handleLikeToggle: (task: LentTask) => void;
  handleOpenComments: (task: LentTask) => void;
  showConfirmDelete: (taskId: string) => void;
  onGuideEventPress: (event: LentEvent) => void;
  handleToggleTaskCompletion: (task: LentTask) => void;
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
          <Feather name="x" size={24} color="#FFFFFF" />
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
                  {isUserTask && (
                    <TouchableOpacity
                      onPress={() => handleToggleTaskCompletion(task)}
                      style={styles.checkboxButton}
                    >
                      <Feather
                        name={task.completed ? "check-square" : "square"}
                        size={20}
                        color={task.completed ? "#16A34A" : "#9CA3AF"}
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
                        <Feather name="users" size={12} color="#FAC898" />
                        <Text style={styles.groupTagText}>
                          Shared group: {task.group_info.name}
                        </Text>
                      </View>
                    )}
                    {task.visibility && (
                      <View style={styles.visibilityTag}>
                        {
                          visibilityOptions.find(
                            (option) => option.label === task.visibility
                          )?.icon
                        }
                        <Text style={styles.visibilityTagText}>
                          {task.visibility}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.expandedDayTaskDesc}>
                      {task.description}
                    </Text>
                    <View style={styles.expandedDayTaskActions}>
                      <TouchableOpacity
                        style={styles.expandedDayTaskAction}
                        onPress={() => handleLikeToggle(task)}
                        activeOpacity={0.7}
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
                        activeOpacity={0.7}
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
                          activeOpacity={0.7}
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
        activeOpacity={0.8}
      >
        <Feather name="plus" size={24} color="#FFFFFF" />
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
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
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
              name={
                confirmStyle === "warning" ? "alert-triangle" : "check-circle"
              }
              size={28}
              color={confirmStyle === "warning" ? "#FCA5A5" : "#10B981"}
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
  group: { key: string; tasks: LentTask[] },
  handleLikeToggle: (task: LentTask) => void,
  handleOpenComments: (task: LentTask) => void,
  showConfirmDelete: (taskId: string) => void,
  handleDeleteRecurringGroup: (recurrenceId: string) => void,
  handleToggleRecurringGroupCompletion: (
    recurrenceId: string,
    currentAllCompleted: boolean
  ) => void,
  currentUserId: string,
  handleToggleTaskCompletion: (task: LentTask) => void,
  showCompletionConfirm: (
    recurrenceId: string,
    allCompleted: boolean,
    task: LentTask
  ) => void,
  likeAnimations: { [taskId: string]: Animated.Value },
  heartAnimations: { [taskId: string]: Animated.Value }
) => {
  const task = group.tasks[0];
  const isRecurring = group.tasks.length > 1;
  const allCompleted = group.tasks.every((t) => t.completed);
  const startDate = isRecurring ? formatDateUTC(group.tasks[0].date) : "";
  const endDate = isRecurring
    ? formatDateUTC(group.tasks[group.tasks.length - 1].date)
    : "";

  // Initialize animations if needed
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
              color={allCompleted ? "#16A34A" : "#9CA3AF"}
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
              color={task.completed ? "#16A34A" : "#9CA3AF"}
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
          <Feather name="users" size={12} color="#FAC898" />
          <Text style={styles.groupTagText}>
            Shared group: {task.group_info.name}
          </Text>
        </View>
      )}
      {task.visibility && (
        <View style={styles.visibilityTag}>
          {
            visibilityOptions.find((option) => option.label === task.visibility)
              ?.icon
          }
          <Text style={styles.visibilityTagText}>{task.visibility}</Text>
        </View>
      )}
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
          activeOpacity={0.7}
        >
          <Feather name="message-square" size={16} color="#9CA3AF" />
          <Text style={styles.commentButtonText}>
            {task.comments_count || 0}
          </Text>
        </TouchableOpacity>
        <View style={styles.taskActions}>
          {isRecurring ? (
            <TouchableOpacity
              style={styles.taskAction}
              onPress={() =>
                showConfirmDelete(task.recurrence_id ? task.recurrence_id : "")
              }
              activeOpacity={0.7}
            >
              <Feather name="trash-2" size={16} color="#FCA5A5" />
              <Text style={styles.deleteActionText}>Delete Group</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.taskAction}
              onPress={() => showConfirmDelete(task.id)}
              activeOpacity={0.7}
            >
              <Feather name="trash-2" size={16} color="#FCA5A5" />
              <Text style={styles.deleteActionText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

// --------------------
// Lent2025 Screen Component
// --------------------
const Lent2025: React.FC = () => {
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

  const [lentTasks, setLentTasks] = useState<LentTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [newTask, setNewTask] = useState({
    event: "",
    description: "",
    date: initialDate,
    visibility: "Friends" as
      | "Friends"
      | "Certain Groups"
      | "Just Me"
      | "Friends & Groups",
    selectedGroups: [] as (number | string)[],
  });
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(initialDate);
  const [showInlineRecurrenceDatePicker, setShowInlineRecurrenceDatePicker] =
    useState(false);

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
  const [tasksFilter, setTasksFilter] = useState<FilterType>("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [groupsLoaded, setGroupsLoaded] = useState<boolean>(false);
  const [headerHeight, setHeaderHeight] = useState<number>(0);
  const [showVisibilityDropdownNew, setShowVisibilityDropdownNew] =
    useState<boolean>(false);
  const [showVisibilityDropdownEdit, setShowVisibilityDropdownEdit] =
    useState<boolean>(false);

  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showCompletionConfirmModal, setShowCompletionConfirmModal] =
    useState(false);
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
  const likeAnimations = useRef<{ [taskId: string]: Animated.Value }>(
    {}
  ).current;
  const heartAnimations = useRef<{ [taskId: string]: Animated.Value }>(
    {}
  ).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const headerRef = useRef<View>(null);
  const filterDropdownAnim = useRef(new Animated.Value(0)).current;
  const notificationAnim = useRef(new Animated.Value(0)).current;
  const loadingSpinAnim = useRef(new Animated.Value(0)).current;

  // Start a continuous loading animation
  useEffect(() => {
    if (isLoading || commentLoading) {
      Animated.loop(
        Animated.timing(loadingSpinAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      loadingSpinAnim.stopAnimation();
      loadingSpinAnim.setValue(0);
    }
  }, [isLoading, commentLoading]);

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
        } as LentTask;
      });
    },
    [editingTask]
  );

  // Memoized task filters
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

  // Keyboard listeners
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

  // Filter dropdown animation
  useEffect(() => {
    Animated.timing(filterDropdownAnim, {
      toValue: showFilterDropdown ? 1 : 0,
      duration: 250,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [showFilterDropdown]);

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

  // Fetch user groups
  const fetchUserGroups = useCallback(async () => {
    try {
      if (!currentUserId) return;
      const { data, error } = await supabase
        .from("group_members")
        .select("group:groups(*)")
        .eq("user_id", currentUserId);
      if (error) throw error;
      const groups = data.map((item: any) => item.group);
      setUserGroups(groups || []);
      setGroupsLoaded(true);
    } catch (error: any) {
      console.error("Error fetching user groups:", error);
      showNotification(`Error fetching groups: ${error.message}`, "error");
    }
  }, [currentUserId]);

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

  // Fetch tasks with metadata
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
      let userIdsToFetch: string[] = [];
      if (tasksFilter === "all") {
        const groupIds = userGroups.map((group) => group.id);
        if (groupIds.length > 0) {
          const { data: groupMembers, error: membersError } = await supabase
            .from("group_members")
            .select("user_id")
            .in("group_id", groupIds);
          if (membersError) throw membersError;
          const groupMemberIds = groupMembers
            ? [...new Set(groupMembers.map((member) => member.user_id))]
            : [];
          userIdsToFetch = [
            ...new Set([currentUserId, ...uniqueFriendIds, ...groupMemberIds]),
          ];
        } else {
          userIdsToFetch = [...new Set([currentUserId, ...uniqueFriendIds])];
        }
      } else if (tasksFilter === "friends") {
        if (uniqueFriendIds.length === 0) {
          setLentTasks([]);
          setIsLoading(false);
          return;
        }
        userIdsToFetch = uniqueFriendIds;
      } else if (tasksFilter === "groups") {
        const groupIds = userGroups.map((group) => group.id);
        if (groupIds.length === 0) {
          setLentTasks([]);
          setIsLoading(false);
          return;
        }
        const { data: groupMembers, error: membersError } = await supabase
          .from("group_members")
          .select("user_id")
          .in("group_id", groupIds);
        if (membersError) throw membersError;
        if (!groupMembers || groupMembers.length === 0) {
          setLentTasks([]);
          setIsLoading(false);
          return;
        }
        userIdsToFetch = [
          ...new Set(groupMembers.map((member) => member.user_id)),
        ];
      }
      const { data, error } = await supabase
        .from("lent_tasks")
        .select(
          "*, user:users (first_name, last_name, email), visibility, selected_groups, recurrence_id, completed"
        )
        .in("user_id", userIdsToFetch)
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
          let groupInfo = null;
          if (userGroups.length > 0 && task.user_id !== currentUserId) {
            const isFriend = uniqueFriendIds.includes(task.user_id);
            const showGroupInfo = tasksFilter === "groups" || !isFriend;
            if (showGroupInfo) {
              const { data: userGroupData, error: userGroupError } =
                await supabase
                  .from("group_members")
                  .select("group_id")
                  .eq("user_id", task.user_id);
              if (
                !userGroupError &&
                userGroupData &&
                userGroupData.length > 0
              ) {
                const {
                  data: currentUserGroups,
                  error: currentUserGroupError,
                } = await supabase
                  .from("group_members")
                  .select("group_id")
                  .eq("user_id", currentUserId);
                if (!currentUserGroupError && currentUserGroups) {
                  const userGroupIds = userGroupData.map((g) => g.group_id);
                  const currentUserGroupIds = currentUserGroups.map(
                    (g) => g.group_id
                  );
                  const sharedGroupIds = userGroupIds.filter((id) =>
                    currentUserGroupIds.includes(id)
                  );
                  if (sharedGroupIds.length > 0) {
                    const { data: groupData, error: groupError } =
                      await supabase
                        .from("groups")
                        .select("*")
                        .eq("id", sharedGroupIds[0])
                        .single();
                    if (!groupError && groupData) {
                      groupInfo = groupData;
                    }
                  }
                }
              }
            }
          }
          const errors: string[] = [];
          if (likesResponse.error)
            errors.push(`Likes error: ${likesResponse.error.message}`);
          if (userLikeResponse.error)
            errors.push(`User like error: ${userLikeResponse.error.message}`);
          if (commentsResponse.error)
            errors.push(`Comments error: ${commentsResponse.error.message}`);
          if (errors.length > 0) {
            console.error("Error fetching task metadata:", errors.join(", "));
          }
          const selectedGroups = parseSelectedGroups(task.selected_groups);
          if (task.user_id !== currentUserId) {
            switch (task.visibility) {
              case "Just Me":
                return null;
              case "Friends":
                if (!uniqueFriendIds.includes(task.user_id)) {
                  return null;
                }
                break;
              case "Certain Groups":
                if (selectedGroups.length === 0) {
                  return null;
                }
                const userGroupIds = userGroups.map((g) => g.id.toString());
                const selectedGroupsStr = selectedGroups.map((id) =>
                  id.toString()
                );
                const isInSelectedGroup = selectedGroupsStr.some((id) =>
                  userGroupIds.includes(id)
                );
                if (!isInSelectedGroup) {
                  return null;
                }
                break;
              case "Friends & Groups":
                break;
              default:
                break;
            }
          }
          return {
            ...task,
            likes_count: likesResponse.count || 0,
            comments_count: commentsResponse.count || 0,
            liked_by_current_user: !!userLikeResponse.data,
            group_info: groupInfo,
            selectedGroups: selectedGroups,
          };
        })
      );
      const filteredTasks = tasksWithMetadata.filter((task) => task !== null);
      setLentTasks(filteredTasks as LentTask[]);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showNotification("Error fetching tasks: " + errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, tasksFilter, userGroups]);

  // Fetch comments for a task
  const fetchComments = useCallback(async (taskId: string) => {
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
  }, []);

  // Show notification with animation
  const showNotification = useCallback(
    (message: string, type: "error" | "success") => {
      setNotification({ message, type });
    },
    []
  );

  // Initial fetch user
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Fetch user groups when user ID changes
  useEffect(() => {
    if (currentUserId) {
      fetchUserGroups();
    }
  }, [currentUserId, fetchUserGroups]);

  // Fetch tasks when filter or groups change
  useEffect(() => {
    if (currentUserId && groupsLoaded) {
      fetchTasks();
    }
  }, [currentUserId, fetchTasks, tasksFilter, groupsLoaded]);

  // Clear notification on unmount
  useEffect(() => {
    return () => {
      if (notification) setNotification(null);
    };
  }, [notification]);

  // Calendar data calculations
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
    () => daysInMonth.map((day) => ({ date: day, isCurrentMonth: true })),
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

  // Scroll to current day in calendar
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!isRecurring) {
        const formattedDate = newTask.date + "T00:00:00";
        const { error } = await supabase.from("lent_tasks").insert([
          {
            user_id: user.id,
            event: newTask.event,
            description: newTask.description,
            date: formattedDate,
            visibility: newTask.visibility,
            selected_groups:
              newTask.visibility === "Certain Groups"
                ? newTask.selectedGroups
                : [],
            completed: false,
          },
        ]);
        if (error) throw error;
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
        for (
          let dt = new Date(start);
          dt <= end;
          dt.setDate(dt.getDate() + 1)
        ) {
          const y = dt.getFullYear();
          const m = String(dt.getMonth() + 1).padStart(2, "0");
          const d = String(dt.getDate()).padStart(2, "0");
          tasksToInsert.push({
            user_id: user.id,
            event: newTask.event,
            description: newTask.description,
            date: `${y}-${m}-${d}T00:00:00`,
            visibility: newTask.visibility,
            selected_groups:
              newTask.visibility === "Certain Groups"
                ? newTask.selectedGroups
                : [],
            recurrence_id: recurrenceId,
            completed: false,
          });
        }
        const { error } = await supabase
          .from("lent_tasks")
          .insert(tasksToInsert);
        if (error) throw error;
      }

      // First dismiss keyboard and close modal
      Keyboard.dismiss();
      showNotification(
        isRecurring
          ? "Recurring tasks created successfully!"
          : "Task created successfully!",
        "success"
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showNotification(`Error creating task: ${errorMessage}`, "error");
    }
  };

  // Edit task handler
  const handleEditTask = useCallback((task: LentTask) => {
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
      const { error } = await supabase
        .from("lent_tasks")
        .update({
          event: editingTask.event,
          description: editingTask.description,
          date: formattedDate,
          visibility: editingTask.visibility || "Friends",
          selected_groups:
            editingTask.visibility === "Certain Groups"
              ? editingTask.selectedGroups
              : [],
        })
        .eq("id", editingTask.id);
      if (error) throw error;

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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showNotification(`Error updating task: ${errorMessage}`, "error");
    }
  };

  // Show delete confirmation
  const showConfirmDelete = useCallback(
    (id: string) => {
      const isRecurring = lentTasks.some((task) => task.recurrence_id === id);
      const title = isRecurring ? "Delete Recurring Tasks" : "Delete Task";
      const message = isRecurring
        ? "Are you sure you want to delete all tasks in this recurring series? This action cannot be undone."
        : "Are you sure you want to delete this task? This action cannot be undone.";
      setDeleteInfo({ id, isRecurring, title, message });
      setShowDeleteConfirmModal(true);
    },
    [lentTasks]
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showNotification(`Error: ${errorMessage}`, "error");
    }
  };

  // Handle completion confirmation
  const handleConfirmCompletion = () => {
    handleToggleRecurringGroupCompletion(
      completionInfo.recurrenceId,
      completionInfo.currentAllCompleted
    );
    setShowCompletionConfirmModal(false);
  };

  // Handle cancel completion
  const handleCancelCompletion = () => {
    setLentTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.recurrence_id === completionInfo.recurrenceId
          ? { ...t, completed: completionInfo.currentAllCompleted }
          : t
      )
    );
    setShowCompletionConfirmModal(false);
  };

  // Delete task handler
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
    async (task: LentTask) => {
      try {
        const willBeLiked = !task.liked_by_current_user;

        // Optimistically update UI
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
        fetchTasks(); // Refresh to correct state
      }
    },
    [currentUserId, animateLikeButton]
  );

  // Open comments modal with sequential state updates to prevent flashing
  const handleOpenComments = useCallback(
    (task: LentTask) => {
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
    [fetchComments, selectedDay]
  );

  // Add comment handler
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
        // Add new comment with animation
        const newCommentObj = data[0];
        setTaskComments((prev) => [...prev, newCommentObj]);

        // Update comment count in tasks list
        setLentTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === selectedTaskForComments.id
              ? { ...t, comments_count: (t.comments_count || 0) + 1 }
              : t
          )
        );
      }
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showNotification(`Error adding comment: ${errorMessage}`, "error");
    }
  };

  // Delete comment handler
  const handleDeleteComment = async (commentId: string) => {
    if (!selectedTaskForComments) return;
    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);
      if (error) throw error;

      // Remove comment with fade animation
      setTaskComments((prev) =>
        prev.filter((comment) => comment.id !== commentId)
      );

      // Update task comment count
      setLentTasks((prev) =>
        prev.map((t) =>
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
    (date: Date): LentTask[] => {
      return lentTasks.filter((task) => {
        const taskDate = parseLocalDate(task.date);
        return (
          taskDate.getFullYear() === date.getFullYear() &&
          taskDate.getMonth() === date.getMonth() &&
          taskDate.getDate() === date.getDate()
        );
      });
    },
    [lentTasks]
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
    },
    [handleDeleteComment]
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
    (recurrenceId: string, currentAllCompleted: boolean, task: LentTask) => {
      // Optimistically update UI
      setLentTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.recurrence_id === recurrenceId
            ? { ...t, completed: !currentAllCompleted }
            : t
        )
      );

      setCompletionInfo({
        recurrenceId,
        currentAllCompleted,
        taskName: task.event,
      });

      setShowCompletionConfirmModal(true);
    },
    []
  );

  // Toggle task completion
  const handleToggleTaskCompletion = useCallback(
    async (task: LentTask) => {
      if (task.user_id !== currentUserId) return;

      const newCompleted = !task.completed;

      // Optimistically update UI
      setLentTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === task.id ? { ...t, completed: newCompleted } : t
        )
      );

      try {
        const { error } = await supabase
          .from("lent_tasks")
          .update({ completed: newCompleted })
          .eq("id", task.id);
        if (error) throw error;
      } catch (error) {
        // Revert on error
        setLentTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === task.id ? { ...t, completed: !newCompleted } : t
          )
        );
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("Error updating task completion:", errorMessage);
        showNotification(`Error updating task: ${errorMessage}`, "error");
      }
    },
    [currentUserId]
  );

  // Toggle recurring group completion
  const handleToggleRecurringGroupCompletion = useCallback(
    async (recurrenceId: string, currentAllCompleted: boolean) => {
      const newCompleted = !currentAllCompleted;

      // Optimistically update UI
      setLentTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.recurrence_id === recurrenceId
            ? { ...t, completed: newCompleted }
            : t
        )
      );

      try {
        const { error } = await supabase
          .from("lent_tasks")
          .update({ completed: newCompleted })
          .eq("recurrence_id", recurrenceId);
        if (error) throw error;
      } catch (error) {
        // Revert on error
        setLentTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.recurrence_id === recurrenceId
              ? { ...t, completed: !newCompleted }
              : t
          )
        );
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          "Error updating recurring tasks completion:",
          errorMessage
        );
        showNotification(`Error updating tasks: ${errorMessage}`, "error");
      }
    },
    []
  );

  // Delete recurring group
  const handleDeleteRecurringGroup = async (recurrenceId: string) => {
    try {
      const { error } = await supabase
        .from("lent_tasks")
        .delete()
        .eq("recurrence_id", recurrenceId);
      if (error) throw error;
      showNotification("Recurring group deleted successfully!", "success");
      fetchTasks();
    } catch (error) {
      console.error("Error deleting recurring group:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showNotification(
        `Error deleting recurring group: ${errorMessage}`,
        "error"
      );
    }
  };

  // Filter my tasks
  const myTasks = useMemo(
    () => lentTasks.filter((task) => task.user_id === currentUserId),
    [lentTasks, currentUserId]
  );

  // Group my tasks
  const groupedMyTasks = useMemo(() => groupTasks(myTasks), [myTasks]);

  // Render task card for non-recurring tasks
  const renderTaskCard = useCallback(
    (task: LentTask, isUserTask: boolean) => {
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
          <View style={styles.taskHeaderRow}>
            {isUserTask && (
              <TouchableOpacity
                onPress={() => handleToggleTaskCompletion(task)}
                style={styles.checkboxButton}
                activeOpacity={0.7}
              >
                <Feather
                  name={task.completed ? "check-square" : "square"}
                  size={20}
                  color={task.completed ? "#16A34A" : "#9CA3AF"}
                />
              </TouchableOpacity>
            )}
            <Text
              style={[
                styles.taskTitle,
                task.completed && styles.completedTaskTitle,
              ]}
            >
              {task.event}
            </Text>
          </View>
          <Text style={styles.taskDate}>
            {!isUserTask && (
              <>
                By {task.user.first_name} {task.user.last_name}{" "}
              </>
            )}
            on {formatDateUTC(task.date)}
          </Text>
          {task.group_info && (
            <View style={styles.groupTag}>
              <Feather name="users" size={12} color="#FAC898" />
              <Text style={styles.groupTagText}>
                Shared group: {task.group_info.name}
              </Text>
            </View>
          )}
          {task.visibility && (
            <View style={styles.visibilityTag}>
              {
                visibilityOptions.find(
                  (option) => option.label === task.visibility
                )?.icon
              }
              <Text style={styles.visibilityTagText}>{task.visibility}</Text>
            </View>
          )}
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
              activeOpacity={0.7}
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
                  activeOpacity={0.7}
                >
                  <Feather name="edit" size={16} color="#FAC898" />
                  <Text style={styles.editActionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.taskAction}
                  onPress={() => showConfirmDelete(task.id)}
                  activeOpacity={0.7}
                >
                  <Feather name="trash-2" size={16} color="#FCA5A5" />
                  <Text style={styles.deleteActionText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      );
    },
    [
      handleToggleTaskCompletion,
      handleLikeToggle,
      handleOpenComments,
      handleEditTask,
      showConfirmDelete,
    ]
  );

  // Loading spinner animation
  const spin = loadingSpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <SafeAreaView style={styles.container} key={refreshKey}>
      <View style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        {notification && (
          <Animated.View
            style={[
              styles.notification,
              notification.type === "error"
                ? styles.errorNotification
                : styles.successNotification,
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
        <View style={styles.header} ref={headerRef} onLayout={onHeaderLayout}>
          <TouchableOpacity
            style={styles.headerTitleContainer}
            onPress={() => setShowFilterDropdown(!showFilterDropdown)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.headerTitle, isIpad && { fontSize: 28 }]}
            >{`Lent 2025 – ${getHeaderTitle()}`}</Text>
            <View style={styles.headerFilterIndicator}>
              <Feather
                name={showFilterDropdown ? "chevron-up" : "chevron-down"}
                size={18}
                color="#E9967A"
              />
            </View>
          </TouchableOpacity>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.navigate("/home")}
              activeOpacity={0.7}
            >
              <Feather name="home" size={20} color="#FFFFFF" />
              <Text style={styles.headerButtonText}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowTaskModal(true)}
              activeOpacity={0.7}
            >
              <Feather name="plus-circle" size={20} color="#FFFFFF" />
              <Text style={styles.headerButtonText}>Add Task</Text>
            </TouchableOpacity>
          </View>
        </View>
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
              style={[
                styles.filterOption,
                tasksFilter === "all" && styles.activeFilterOption,
              ]}
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
              style={[
                styles.filterOption,
                tasksFilter === "friends" && styles.activeFilterOption,
              ]}
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
              style={[
                styles.filterOption,
                tasksFilter === "groups" && styles.activeFilterOption,
              ]}
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
            style={[
              styles.viewButton,
              view === "calendar" ? styles.activeViewButton : null,
            ]}
            onPress={() => setView("calendar")}
            activeOpacity={0.7}
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
            activeOpacity={0.7}
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
              activeOpacity={0.7}
            >
              <Feather name="chevron-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{`${getMonthName(
              currentMonth
            )} ${currentYear}`}</Text>
            <TouchableOpacity
              onPress={nextMonth}
              accessibilityLabel="Next month"
              style={styles.monthNavButton}
              activeOpacity={0.7}
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
          showsVerticalScrollIndicator={false}
        >
          {view === "list" ? (
            <View style={styles.listContainer}>
              <View style={styles.sectionContainer}>
                {tasksFilter === "all" && (
                  <>
                    <Text style={styles.sectionTitle}>My Tasks</Text>
                    {groupedMyTasks.length === 0 ? (
                      <Text style={styles.emptyText}>
                        You haven't added any tasks yet.
                      </Text>
                    ) : (
                      groupedMyTasks.map((group) =>
                        renderTaskGroupCard(
                          group,
                          handleLikeToggle,
                          handleOpenComments,
                          showConfirmDelete,
                          handleDeleteRecurringGroup,
                          handleToggleRecurringGroupCompletion,
                          currentUserId,
                          handleToggleTaskCompletion,
                          showCompletionConfirm,
                          likeAnimations,
                          heartAnimations
                        )
                      )
                    )}
                  </>
                )}
                <Text style={styles.sectionTitle}>
                  {tasksFilter === "all"
                    ? "Friends' & Group Tasks"
                    : getHeaderTitle()}
                </Text>
                {tasksFilter === "all" ? (
                  friendTasks.length === 0 ? (
                    <Text style={styles.emptyText}>
                      No tasks from friends or groups yet.
                    </Text>
                  ) : (
                    friendTasks.map((task) => renderTaskCard(task, false))
                  )
                ) : lentTasks.length === 0 ? (
                  <Text style={styles.emptyText}>
                    No {tasksFilter === "friends" ? "friends'" : "group"} tasks
                    available.
                  </Text>
                ) : (
                  lentTasks.map((task) =>
                    renderTaskCard(task, task.user_id === currentUserId)
                  )
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
                        activeOpacity={0.7}
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
        {(isLoading || commentLoading) && (
          <View style={styles.loadingOverlay}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <ActivityIndicator size="large" color="#E9967A" />
            </Animated.View>
            <Text style={styles.loadingText}>Loading...</Text>
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
                  onChangeText={(text) =>
                    setNewTask({ ...newTask, event: text })
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
                        value: new Date(newTask.date + "T00:00:00"),
                        onChange: (event, date) => {
                          if (date) {
                            const y = date.getFullYear();
                            const m = String(date.getMonth() + 1).padStart(
                              2,
                              "0"
                            );
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
                    newTask.date + "T00:00:00"
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
                    style={{ backgroundColor: "#000000" }}
                    textColor="#FFFFFF"
                    themeVariant="dark"
                  />
                )}
                <TouchableOpacity
                  onPress={() => setIsRecurring((prev) => !prev)}
                  style={styles.recurringToggleButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.recurringToggleText}>
                    {isRecurring
                      ? "Single Day Event"
                      : "Make this a Recurring Event"}
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
                                const m = String(date.getMonth() + 1).padStart(
                                  2,
                                  "0"
                                );
                                const d = String(date.getDate()).padStart(
                                  2,
                                  "0"
                                );
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
                        recurrenceEndDate + "T00:00:00"
                      ).toLocaleDateString()}`}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dateButtonText}>
                        {new Date(
                          recurrenceEndDate + "T00:00:00"
                        ).toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>
                    {Platform.OS !== "android" &&
                      showInlineRecurrenceDatePicker && (
                        <DateTimePicker
                          value={new Date(recurrenceEndDate + "T00:00:00")}
                          mode="date"
                          display="spinner"
                          onChange={(event, date) => {
                            if (date) {
                              const y = date.getFullYear();
                              const m = String(date.getMonth() + 1).padStart(
                                2,
                                "0"
                              );
                              const d = String(date.getDate()).padStart(2, "0");
                              setRecurrenceEndDate(`${y}-${m}-${d}`);
                            }
                          }}
                          style={{ backgroundColor: "#000000" }}
                          textColor="#FFFFFF"
                          themeVariant="dark"
                        />
                      )}
                  </>
                )}
                <Text style={styles.inputLabel}>Visibility</Text>
                <TouchableOpacity
                  style={styles.visibilityButton}
                  onPress={() =>
                    setShowVisibilityDropdownNew(!showVisibilityDropdownNew)
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.visibilityButtonContent}>
                    {
                      visibilityOptions.find(
                        (option) => option.label === newTask.visibility
                      )?.icon
                    }
                    <Text style={styles.visibilityButtonText}>
                      {newTask.visibility}
                    </Text>
                  </View>
                  <Feather
                    name={
                      showVisibilityDropdownNew ? "chevron-up" : "chevron-down"
                    }
                    size={18}
                    color="#E9967A"
                  />
                </TouchableOpacity>
                {showVisibilityDropdownNew && (
                  <View style={styles.visibilityDropdown}>
                    {visibilityOptions.map((option) => (
                      <TouchableOpacity
                        key={option.label}
                        style={[
                          styles.visibilityOption,
                          option.label === newTask.visibility &&
                            styles.visibilityOptionSelected,
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
                              option.label === "Certain Groups"
                                ? newTask.selectedGroups
                                : [],
                          });
                          setShowVisibilityDropdownNew(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.visibilityOptionContent}>
                          {option.icon}
                          <Text style={styles.visibilityOptionText}>
                            {option.label}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {newTask.visibility === "Certain Groups" && (
                  <View style={styles.groupSelectorContainer}>
                    <Text style={styles.groupSelectorLabel}>
                      Select Groups:
                    </Text>
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
                              newTask.selectedGroups.includes(group.id) &&
                                styles.groupOptionSelected,
                            ]}
                            onPress={() => toggleNewGroupSelection(group.id)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.groupOptionText}>
                              {group.name}
                            </Text>
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
                      } as LentTask)
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
                          value: new Date(editingTask.date + "T00:00:00"),
                          onChange: (event, date) => {
                            if (date) {
                              const y = date.getFullYear();
                              const m = String(date.getMonth() + 1).padStart(
                                2,
                                "0"
                              );
                              const d = String(date.getDate()).padStart(2, "0");
                              setEditingTask({
                                ...editingTask,
                                date: `${y}-${m}-${d}`,
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
                      editingTask.date + "T00:00:00"
                    ).toLocaleDateString()}`}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dateButtonText}>
                      {new Date(
                        editingTask.date + "T00:00:00"
                      ).toLocaleDateString()}
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
                          const m = String(date.getMonth() + 1).padStart(
                            2,
                            "0"
                          );
                          const d = String(date.getDate()).padStart(2, "0");
                          setEditingTask({
                            ...editingTask,
                            date: `${y}-${m}-${d}`,
                          } as LentTask);
                        }
                      }}
                      style={{ backgroundColor: "#000000" }}
                      textColor="#FFFFFF"
                      themeVariant="dark"
                    />
                  )}
                  <Text style={styles.inputLabel}>Visibility</Text>
                  <TouchableOpacity
                    style={styles.visibilityButton}
                    onPress={() =>
                      setShowVisibilityDropdownEdit(!showVisibilityDropdownEdit)
                    }
                    activeOpacity={0.7}
                  >
                    <View style={styles.visibilityButtonContent}>
                      {
                        visibilityOptions.find(
                          (option) => option.label === editingTask.visibility
                        )?.icon
                      }
                      <Text style={styles.visibilityButtonText}>
                        {editingTask.visibility || "Friends"}
                      </Text>
                    </View>
                    <Feather
                      name={
                        showVisibilityDropdownEdit
                          ? "chevron-up"
                          : "chevron-down"
                      }
                      size={18}
                      color="#E9967A"
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
                            <Text style={styles.visibilityOptionText}>
                              {option.label}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {editingTask.visibility === "Certain Groups" && (
                    <View style={styles.groupSelectorContainer}>
                      <Text style={styles.groupSelectorLabel}>
                        Select Groups:
                      </Text>
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
                                  editingTask.selectedGroups.includes(
                                    group.id
                                  ) &&
                                  styles.groupOptionSelected,
                              ]}
                              onPress={() => toggleEditGroupSelection(group.id)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.groupOptionText}>
                                {group.name}
                              </Text>
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
                      <Feather name="x" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  {commentLoading ? (
                    <View style={styles.commentLoadingContainer}>
                      <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <ActivityIndicator size="large" color="#E9967A" />
                      </Animated.View>
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
                                onPress={() =>
                                  showConfirmDeleteComment(item.id)
                                }
                                activeOpacity={0.7}
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
                      activeOpacity={0.7}
                    >
                      <Feather name="send" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>
        <Modal
          visible={!!selectedGuideEvent}
          transparent={true}
          animationType="none"
          onRequestClose={() => setSelectedGuideEvent(null)}
          hardwareAccelerated={true}
        >
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.guideEventModal,
                {
                  opacity: useRef(new Animated.Value(0)).current.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                  transform: [
                    {
                      scale: useRef(
                        new Animated.Value(0.9)
                      ).current.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
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
                onPress={() => {
                  // Add a small fade-out effect when closing
                  Animated.timing(useRef(new Animated.Value(1)).current, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                  }).start(() => {
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
            !completionInfo.currentAllCompleted
              ? "Mark All Complete"
              : "Mark All Incomplete"
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
                onGuideEventPress={(event: LentEvent) => {
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
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  headerFilterIndicator: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "300",
    color: "#FFFFFF",
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
  filterDropdown: {
    position: "absolute",
    left: 15,
    right: 15,
    zIndex: 100,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    borderRadius: 15,
    padding: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(233, 150, 122, 0.3)",
  },
  filterOption: { paddingVertical: 14, paddingHorizontal: 15, borderRadius: 8 },
  activeFilterOption: { backgroundColor: "rgba(233, 150, 122, 0.2)" },
  filterOptionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "400",
    textAlign: "center",
  },
  activeFilterOptionText: { color: "#E9967A", fontWeight: "600" },
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
  taskHeaderRow: { flexDirection: "row", alignItems: "center" },
  checkboxButton: { marginRight: 8 },
  taskTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#FFFFFF",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  completedTaskTitle: { textDecorationLine: "line-through", color: "#9CA3AF" },
  recurringTaskTitle: {},
  taskDate: {
    fontSize: 14,
    color: "#FAC898",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  groupTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(250, 200, 152, 0.2)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(250, 200, 152, 0.3)",
  },
  groupTagText: {
    color: "#FAC898",
    fontSize: 12,
    marginLeft: 5,
    fontWeight: "600",
  },
  visibilityTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(233, 150, 122, 0.15)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(233, 150, 122, 0.3)",
  },
  visibilityTagText: {
    color: "#E9967A",
    fontSize: 12,
    marginLeft: 5,
    fontWeight: "600",
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
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 15,
    padding: 14,
    marginBottom: 16,
  },
  dateButtonText: { color: "#FFFFFF", letterSpacing: 0.5, fontSize: 16 },
  visibilityButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 15,
    padding: 14,
    marginBottom: 16,
  },
  visibilityButtonContent: { flexDirection: "row", alignItems: "center" },
  visibilityButtonText: {
    color: "#FFFFFF",
    marginLeft: 10,
    letterSpacing: 0.5,
    fontSize: 16,
  },
  visibilityDropdown: {
    backgroundColor: "rgba(41, 37, 36, 0.95)",
    borderRadius: 10,
    marginTop: -10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    overflow: "hidden",
  },
  visibilityOption: { paddingVertical: 12, paddingHorizontal: 16 },
  visibilityOptionSelected: { backgroundColor: "rgba(233, 150, 122, 0.2)" },
  visibilityOptionContent: { flexDirection: "row", alignItems: "center" },
  visibilityOptionText: { color: "#FFFFFF", marginLeft: 10, fontSize: 16 },
  groupSelectorContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  groupSelectorLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 10,
  },
  groupSelectorList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  groupOption: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    marginBottom: 8,
    marginRight: 8,
  },
  groupOptionSelected: {
    backgroundColor: "rgba(233, 150, 122, 0.2)",
    borderColor: "rgba(233, 150, 122, 0.4)",
  },
  groupOptionText: { color: "#FFFFFF", fontSize: 14 },
  noGroupsText: {
    color: "rgba(255, 255, 255, 0.6)",
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
  expandedDayContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    borderRadius: 20,
    width: "90%",
    maxHeight: "95%",
    minHeight: 500,
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
  expandedDayTitle: { fontSize: 24, fontWeight: "600", color: "#E9967A" },
  closeIconButton: { padding: 8 },
  expandedDayContent: { flex: 1, width: "100%" },
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
  expandedDayTaskUser: { fontSize: 13, color: "#FAC898", marginBottom: 4 },
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
  recurringToggleButton: { alignSelf: "center", marginBottom: 16 },
  recurringToggleText: {
    color: "#E9967A",
    fontSize: 16,
    textDecorationLine: "underline",
  },
  deleteModalContent: {
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    borderRadius: 15,
    padding: 20,
    width: "90%",
    maxWidth: 400,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "rgba(252, 165, 165, 0.3)",
    shadowColor: "#000",
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
    borderBottomColor: "rgba(252, 165, 165, 0.2)",
    paddingBottom: 12,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 12,
    flex: 1,
  },
  deleteModalMessage: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  deleteModalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    paddingTop: 16,
  },
  deleteModalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  deleteModalCancelText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 16,
    fontWeight: "500",
  },
  deleteModalConfirmButton: {
    backgroundColor: "#DC2626",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  deleteModalConfirmText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  successConfirmButton: { backgroundColor: "#10B981" },
});

export default Lent2025;
