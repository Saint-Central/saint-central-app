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
  // Week 2: March 12 - March 18
  {
    date: "March 12",
    title: "Daily Examen",
    description:
      "Begin a daily examen, a reflective prayer practice where you review your day, noting moments of gratitude and areas for improvement.",
  },
  {
    date: "March 13",
    title: "Weekday Mass",
    description:
      "Attend a weekday Mass or prayer service to deepen your connection with the faith community.",
  },
  {
    date: "March 14",
    title: "Fellowship Dinner",
    description:
      "Host a simple dinner with friends, focusing on fellowship and reflection.",
  },
  {
    date: "March 15",
    title: "Nature Walk",
    description:
      "Spend time outdoors, perhaps taking a nature walk, and meditate on the beauty of creation. Consider reading a psalm that celebrates nature.",
  },
  {
    date: "March 16",
    title: "Letters of Encouragement",
    description:
      "Write letters or emails of encouragement to family or friends, offering support and sharing your reflections during Lent.",
  },
  {
    date: "March 17",
    title: "Fasting from Spending",
    description:
      "Fast from unnecessary spending. Reflect on material attachments and consider donating the money saved to a charitable cause.",
  },
  {
    date: "March 18",
    title: "Group Rosary",
    description:
      "Organize a group rosary or prayer session, either in person or virtually, to foster communal prayer.",
  },
  // Week 3: March 19 - March 25
  {
    date: "March 19",
    title: "Study a Saint",
    description:
      "Study the life of a saint, such as St. Joseph, whose feast day is today. Discuss their virtues and how you can emulate them in your life.",
  },
  {
    date: "March 20",
    title: "Eucharistic Adoration",
    description:
      "Spend an hour in Eucharistic adoration, reflecting on the presence of Christ and offering your intentions.",
  },
  {
    date: "March 21",
    title: "Stations of the Cross",
    description:
      "Participate in the Stations of the Cross, focusing on the personal relevance of each station in your spiritual journey.",
  },
  {
    date: "March 22",
    title: "Digital Detox",
    description:
      "Engage in a digital detox day, refraining from unnecessary screen time. Use the time for personal reflection, reading, or spending quality time with loved ones.",
  },
  {
    date: "March 23",
    title: "Meal for a Neighbor",
    description:
      "Prepare a meal for someone in need or a neighbor, embodying the act of giving and community support.",
  },
  {
    date: "March 24",
    title: "Lenten Reflection",
    description:
      "Reflect on your Lenten journey thus far. Journal about your experiences, challenges, and any spiritual growth you've noticed.",
  },
  {
    date: "March 25",
    title: "Feast of the Annunciation",
    description:
      "Celebrate by praying the Angelus, reflecting on Mary's 'yes' to God, and consider how you can say 'yes' in your own life.",
  },
  // Week 4: March 26 - April 1
  {
    date: "March 26",
    title: "Seek Reconciliation",
    description:
      "Reach out to someone with whom you've had a disagreement or strained relationship. Offer forgiveness or seek reconciliation, fostering healing and peace.",
  },
  {
    date: "March 27",
    title: "Penance Service",
    description:
      "Attend a Lenten penance service or go to confession, embracing the sacrament of reconciliation to cleanse your spirit.",
  },
  {
    date: "March 28",
    title: "Alternative Stations",
    description:
      "Participate in the Stations of the Cross, perhaps focusing on a different perspective, such as viewing it through Mary's eyes.",
  },
  {
    date: "March 29",
    title: "Book Club Discussion",
    description:
      "Host a discussion or book club focusing on themes of sacrifice and redemption, selecting a spiritual book or scripture passage as the basis.",
  },
  {
    date: "March 30",
    title: "Contemplative Prayer",
    description:
      "Dedicate time to contemplative prayer, such as centering prayer or meditating on the sorrowful mysteries of the rosary.",
  },
  {
    date: "March 31",
    title: "Fast from Comforts",
    description:
      "Fast from a personal comfort, such as sweets or a favorite beverage, offering the day for a special intention or in solidarity with those who lack basic necessities.",
  },
  {
    date: "April 1",
    title: "Share Spiritual Readings",
    description:
      "Share your favorite spiritual readings or passages with friends, perhaps through a small gathering or online group, and discuss their impact on your faith.",
  },
  // Week 5: April 2 - April 8
  {
    date: "April 2",
    title: "Service Project",
    description:
      "Participate in a service project, such as cleaning a community space, assisting at a food pantry, or helping a neighbor with tasks. Reflect on the joy of serving others.",
  },
  {
    date: "April 3",
    title: "Scripture Study",
    description:
      "Dedicate time to studying Scripture, focusing on the Passion narratives in the Gospels. Reflect on the events leading up to Jesus' crucifixion.",
  },
  {
    date: "April 4",
    title: "Lead Stations",
    description:
      "Join the Stations of the Cross, perhaps leading a station or reading a reflection, deepening your engagement with the practice.",
  },
  {
    date: "April 5",
    title: "Group Hike",
    description:
      "Organize a group hike or walk, using the time for prayer, reflection, and discussing how nature reveals God's presence.",
  },
  {
    date: "April 6",
    title: "Fasting and Prayer",
    description:
      "Engage in a day of fasting and prayer, focusing on repentance and seeking spiritual renewal.",
  },
  {
    date: "April 7",
    title: "Lenten Retreat",
    description:
      "Participate in a Lenten retreat or day of reflection. Many parishes offer retreats during Lent to help deepen your faith and prepare for Holy Week.",
  },
  {
    date: "April 8",
    title: "Sacrament of Reconciliation",
    description:
      "Engage in the Sacrament of Reconciliation. If you haven't already during Lent, seek out confession to cleanse your heart and soul before entering Holy Week.",
  },
  // Week 6: Additional events
  {
    date: "April 6",
    title: "Fifth Sunday Mass",
    description:
      "Attend Mass and reflect on the Gospel reading, which often focuses on themes of resurrection and new life, such as the raising of Lazarus. Consider how you can bring new life to your spiritual practices.",
  },
  {
    date: "April 7",
    title: "Lenten Retreat Continued",
    description:
      "Participate in a Lenten retreat or day of reflection. Many parishes offer retreats during Lent to help deepen your faith.",
  },
  {
    date: "April 8",
    title: "Reconciliation Day",
    description:
      "Engage in the Sacrament of Reconciliation. If you haven't already during Lent, seek out confession to cleanse your heart and soul before entering Holy Week.",
  },
  {
    date: "April 9",
    title: "Stations Reflection",
    description:
      "Attend the Stations of the Cross, meditating on each station and its significance in your life. Reflect on the sacrifices Jesus made and how you can emulate his love and compassion.",
  },
  {
    date: "April 10",
    title: "Passion Meditations",
    description:
      "Dedicate time to reading and meditating on the Passion narratives in the Gospels (Matthew 26-27, Mark 14-15, Luke 22-23, or John 18-19). Contemplate the events leading up to Jesus' crucifixion.",
  },
  {
    date: "April 11",
    title: "Fasting and Abstinence",
    description:
      "Observe a day of fasting and abstinence in solidarity with Christ's suffering. Attend a Friday Lenten service or participate in a community fish fry, reflecting on the communal aspects of Lenten observance.",
  },
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
    const yPosition = rowIndex * (cellSize * 1.25 + 8); // Adjusted cell height + margins

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
            onPress={() => router.navigate("/home")}
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

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
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
                          height: cellSize * 1.25, // Reduced height
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
                        height: cellSize * 1.25, // Reduced height
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
                      {dayTasks.slice(0, isSmallDevice ? 3 : 2).map((task) =>
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
                      {dayTasks.length > (isSmallDevice ? 3 : 2) && (
                        <Text style={styles.moreTasks}>
                          +{dayTasks.length - (isSmallDevice ? 3 : 2)} more
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  errorNotification: { backgroundColor: "#DC2626" },
  successNotification: { backgroundColor: "#16A34A" },
  notificationText: { color: "white", fontWeight: "600" },
  header: {
    padding: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(234, 179, 8, 0.2)",
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
  headerButtonText: { color: "#FEFCE8", marginLeft: 8, fontWeight: "500" },
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
    borderRadius: 8,
    backgroundColor: "#292524",
  },
  activeViewButton: { backgroundColor: "#EAB308" },
  viewButtonText: { color: "#FEFCE8", fontWeight: "500" },
  activeViewText: { color: "#1C1917", fontWeight: "600" },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentContainer: {
    paddingBottom: 80, // Add padding for bottom navigation bar
  },
  listContainer: {
    paddingBottom: 20,
  },
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
  emptyText: {
    color: "rgba(254, 252, 232, 0.7)",
    fontStyle: "italic",
    textAlign: "center",
    padding: 12,
  },
  taskCard: {
    backgroundColor: "rgba(41, 37, 36, 0.5)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#FEFCE8",
    marginBottom: 4,
  },
  taskDate: { fontSize: 14, color: "#EAB308", marginBottom: 8 },
  taskDescription: { color: "rgba(254, 252, 232, 0.8)", marginBottom: 12 },
  taskActions: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: 4,
  },
  taskAction: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    padding: 4,
  },
  editActionText: { color: "#FEF08A", marginLeft: 4 },
  deleteActionText: { color: "#FCA5A5", marginLeft: 4 },
  calendarContainer: {
    paddingBottom: 20,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  // Sticky month header
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
  monthTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FEFCE8",
  },
  weekdayHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
    paddingVertical: 8,
    backgroundColor: "rgba(41, 37, 36, 0.5)",
    borderRadius: 8,
    marginTop: 8,
  },
  weekdayText: {
    color: "#EAB308",
    fontWeight: "600",
    textAlign: "center",
  },
  legendContainer: {
    backgroundColor: "#292524",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  // Sticky legend
  stickyLegendContainer: {
    backgroundColor: "#292524",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
    marginHorizontal: 16,
    zIndex: 9,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
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
    margin: 4,
  },
  dayCell: {
    borderWidth: 1,
    borderColor: "#44403C",
    borderRadius: 8,
    padding: 6, // Increased padding
    margin: 4,
    backgroundColor: "rgba(41, 37, 36, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  dayCellHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4, // Added margin
  },
  dayName: {
    color: "#EAB308",
    fontSize: 12,
    fontWeight: "500",
  },
  todayCell: {
    backgroundColor: "rgba(234, 179, 8, 0.2)",
    borderColor: "rgba(234, 179, 8, 0.5)",
    borderWidth: 2,
  },
  dayNumber: {
    color: "#FEFCE8",
    fontWeight: "600", // Increased weight
    fontSize: 13, // Slightly increased size
  },
  dayContent: {
    flex: 1,
    marginTop: 2,
  },
  dayTaskText: {
    color: "#FEFCE8",
    fontSize: 10,
    marginBottom: 2, // Added spacing between tasks
  },
  friendTaskContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2, // Added spacing between tasks
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
    fontStyle: "italic",
  },
  // Guide event button
  guideEventButton: {
    backgroundColor: "#EAB308",
    borderRadius: 4,
    padding: 4,
    marginTop: 4,
    minHeight: 24,
  },
  guideEventText: {
    color: "#1C1917",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
    padding: 2,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalContentKeyboardVisible: {
    marginBottom: 150, // Extra bottom margin when keyboard is visible
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FEFCE8",
    marginBottom: 16,
    textAlign: "center",
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
    borderRadius: 8,
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
  guideEventModal: {
    backgroundColor: "#292524",
    borderRadius: 12,
    padding: 16,
    width: "90%",
    maxWidth: 500,
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.3)",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
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
    lineHeight: 20,
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
