import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch,
  Pressable,
  FlatList,
} from "react-native";
import { BlurView } from "expo-blur";
import { AntDesign, Feather } from "@expo/vector-icons";
import { supabase } from "../../supabaseClient";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import theme from "@/theme";

const { height } = Dimensions.get("window");

// Event Interface
interface Event {
  id: number;
  title: string;
  excerpt: string;
  time: string;
  user_id: string;
  image_url: string;
  video_link: string;
  author_name: string;
  is_recurring: boolean;
  recurrence_type?: "daily" | "weekly" | "monthly" | "yearly";
  recurrence_interval?: number;
  recurrence_end_date?: string;
  recurrence_days_of_week?: number[];
}

// Calendar day interface
interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  dayOfWeek: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: Event[];
}

// Calendar view types
type CalendarViewType = "month" | "list";

export default function Events() {
  return <EventsComponent />;
}

function EventsComponent() {
  const scrollY = useRef(new Animated.Value(0)).current;

  // Calendar states
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [calendarView, setCalendarView] = useState<CalendarViewType>("list");
  const [showDateDetail, setShowDateDetail] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<Event[]>([]);

  // States
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formExcerpt, setFormExcerpt] = useState("");
  const [formTime, setFormTime] = useState(new Date());
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formVideoLink, setFormVideoLink] = useState("");
  const [formAuthorName, setFormAuthorName] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [formImageLoading, setFormImageLoading] = useState(false);

  // Recurring event states
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<"daily" | "weekly" | "monthly" | "yearly">(
    "weekly"
  );
  const [recurrenceInterval, setRecurrenceInterval] = useState("1");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | null>(null);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([1]); // Default to Monday (1)

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const detailSlideAnim = useRef(new Animated.Value(height)).current;

  // Animation for calendar days
  const dayAnimations = useRef<{ [key: string]: Animated.Value }>({}).current;

  // New state variables
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");

  // Get events for a specific day
  const getEventsForDay = useCallback((date: Date, eventsData: Event[]) => {
    return eventsData.filter((event) => {
      const eventDate = new Date(event.time);
      return isSameDay(eventDate, date);
    });
  }, []);

  // Generate calendar data
  const generateCalendarData = useCallback(
    (date: Date, eventsData: Event[]) => {
      const year = date.getFullYear();
      const month = date.getMonth();

      // First day of the month
      const firstDay = new Date(year, month, 1);
      const firstDayOfWeek = firstDay.getDay();

      // Last day of the month
      const lastDay = new Date(year, month + 1, 0);
      const lastDate = lastDay.getDate();

      // Create array for calendar days
      const days: CalendarDay[] = [];

      // Add days from previous month to fill first week
      const prevMonthLastDay = new Date(year, month, 0).getDate();
      for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const date = new Date(year, month - 1, prevMonthLastDay - i);
        days.push({
          date,
          dayOfMonth: prevMonthLastDay - i,
          dayOfWeek: date.getDay(),
          isCurrentMonth: false,
          isToday: isSameDay(date, new Date()),
          events: getEventsForDay(date, eventsData),
        });
      }

      // Add days of current month
      const today = new Date();
      for (let i = 1; i <= lastDate; i++) {
        const date = new Date(year, month, i);
        days.push({
          date,
          dayOfMonth: i,
          dayOfWeek: date.getDay(),
          isCurrentMonth: true,
          isToday: isSameDay(date, today),
          events: getEventsForDay(date, eventsData),
        });

        // Initialize animation for this day
        const dateKey = getDateKey(date);
        if (!dayAnimations[dateKey]) {
          dayAnimations[dateKey] = new Animated.Value(0);
        }
      }

      // Add days from next month to complete last week
      const remainingDays = 7 - (days.length % 7);
      if (remainingDays < 7) {
        for (let i = 1; i <= remainingDays; i++) {
          const date = new Date(year, month + 1, i);
          days.push({
            date,
            dayOfMonth: i,
            dayOfWeek: date.getDay(),
            isCurrentMonth: false,
            isToday: isSameDay(date, today),
            events: getEventsForDay(date, eventsData),
          });
        }
      }

      return days;
    },
    [dayAnimations, getEventsForDay]
  );

  // Check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // Get unique key for a date
  const getDateKey = (date: Date) => {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  };

  // Change calendar month
  const changeMonth = (direction: 1 | -1) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  // Format month name
  const formatMonth = (date: Date) => {
    return date.toLocaleString("default", { month: "long", year: "numeric" });
  };

  // Get day name
  const getDayName = (day: number, short = false) => {
    const days = short
      ? ["S", "M", "T", "W", "T", "F", "S"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[day];
  };

  // Handle day selection
  const selectDay = (day: CalendarDay) => {
    setSelectedDate(day.date);
    setSelectedDayEvents(day.events);

    // Animate the detail view
    Animated.timing(detailSlideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setShowDateDetail(true);
  };

  // Close date detail view
  const closeDateDetail = () => {
    Animated.timing(detailSlideAnim, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowDateDetail(false);
    });
  };

  // Format date for display
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString(undefined, options);
  };

  // Format date parts for event display
  const formatEventDay = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString("default", { weekday: "long" });
  };

  const formatEventMonth = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString("default", { month: "long" });
  };

  const formatEventDate = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.getDate();
  };

  const formatEventTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Generate animation for calendar
  useEffect(() => {
    // Animate calendar days
    const animations = Object.values(dayAnimations).map((anim) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      })
    );

    Animated.stagger(20, animations).start();

    // Animate page elements
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [calendarData, dayAnimations, fadeAnim, opacityAnim, slideAnim]);

  // Update calendar when month or events change
  useEffect(() => {
    if (events.length > 0 || !loading) {
      const newCalendarData = generateCalendarData(currentMonth, events);
      setCalendarData(newCalendarData);
    }
  }, [currentMonth, events, generateCalendarData, loading]);

  // Load events
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);

      // Check if user is authenticated
      await supabase.auth.getSession();

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("time", { ascending: true });

      if (error) {
        // Handle RLS read restrictions if any
        if (error.code === "42501") {
          Alert.alert("Access Restricted", "You do not have permission to view events.", [
            { text: "OK" },
          ]);
          setEvents([]);
          return;
        }
        throw error;
      }

      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      Alert.alert("Error", "Failed to load events. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------
  // Isolated "Add New Event" Feature (from the shorter file)
  // ---------------
  // This hero section replaces the previous absolute-positioned add button.
  // It shows a header icon, title, subtitle and the CREATE EVENT button.
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const resetForm = () => {
    setFormTitle("");
    setFormExcerpt("");
    setFormTime(new Date());
    setFormImageUrl("");
    setFormVideoLink("");
    setFormAuthorName("");
    setIsRecurring(false);
    setRecurrenceType("weekly");
    setRecurrenceInterval("1");
    setRecurrenceEndDate(null);
    setSelectedDays([1]);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (event: Event) => {
    setSelectedEvent(event);
    setFormTitle(event.title);
    setFormExcerpt(event.excerpt);
    const eventTime = new Date(event.time);
    setFormTime(eventTime);
    setFormImageUrl(event.image_url || "");
    setFormVideoLink(event.video_link || "");
    setFormAuthorName(event.author_name || "");
    setIsRecurring(event.is_recurring || false);
    setRecurrenceType(event.recurrence_type || "weekly");
    setRecurrenceInterval(event.recurrence_interval ? event.recurrence_interval.toString() : "1");
    if (event.recurrence_end_date) {
      setRecurrenceEndDate(new Date(event.recurrence_end_date));
    } else {
      setRecurrenceEndDate(null);
    }
    setSelectedDays(event.recurrence_days_of_week || [1]);
    setShowEditModal(true);
  };

  const handleAddEvent = async () => {
    try {
      if (!formTitle || !formExcerpt) {
        Alert.alert("Error", "Please fill in all required fields");
        return;
      }

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Error", "You must be logged in to add events");
        return;
      }

      const eventData: any = {
        title: formTitle,
        excerpt: formExcerpt,
        time: formTime.toISOString(),
        user_id: user.id,
        image_url: formImageUrl,
        video_link: formVideoLink,
        author_name: formAuthorName || user.email,
        is_recurring: isRecurring,
      };

      if (isRecurring) {
        eventData.recurrence_type = recurrenceType;
        eventData.recurrence_interval = parseInt(recurrenceInterval) || 1;
        eventData.recurrence_days_of_week = selectedDays;
        if (recurrenceEndDate) {
          eventData.recurrence_end_date = recurrenceEndDate.toISOString();
        }
      }

      const { error } = await supabase.from("events").insert([eventData]);

      if (error) {
        if (error.code === "42501") {
          Alert.alert(
            "Permission Error",
            "You do not have permission to add events. Please contact an administrator.",
            [{ text: "OK" }]
          );
          return;
        }
        throw error;
      }

      Alert.alert("Success", "Event added successfully!");
      setShowAddModal(false);
      fetchEvents();
    } catch (error) {
      console.error("Error adding event:", error);
      Alert.alert("Error", "Failed to add event. Please try again.");
    }
  };

  const handleEditEvent = async () => {
    try {
      if (!selectedEvent) return;
      if (!formTitle || !formExcerpt) {
        Alert.alert("Error", "Please fill in all required fields");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Error", "You must be logged in to edit events");
        return;
      }

      const eventData: any = {
        title: formTitle,
        excerpt: formExcerpt,
        time: formTime.toISOString(),
        image_url: formImageUrl,
        video_link: formVideoLink,
        author_name: formAuthorName || user.email,
        is_recurring: isRecurring,
      };

      if (isRecurring) {
        eventData.recurrence_type = recurrenceType;
        eventData.recurrence_interval = parseInt(recurrenceInterval) || 1;
        eventData.recurrence_days_of_week = selectedDays;
        if (recurrenceEndDate) {
          eventData.recurrence_end_date = recurrenceEndDate.toISOString();
        } else {
          eventData.recurrence_end_date = null;
        }
      } else {
        eventData.recurrence_type = null;
        eventData.recurrence_interval = null;
        eventData.recurrence_days_of_week = null;
        eventData.recurrence_end_date = null;
      }

      const { error } = await supabase.from("events").update(eventData).eq("id", selectedEvent.id);

      if (error) {
        if (error.code === "42501") {
          Alert.alert(
            "Permission Error",
            "You do not have permission to edit this event. You may only edit events you created.",
            [{ text: "OK" }]
          );
          return;
        }
        throw error;
      }

      Alert.alert("Success", "Event updated successfully!");
      setShowEditModal(false);
      fetchEvents();
    } catch (error) {
      console.error("Error updating event:", error);
      Alert.alert("Error", "Failed to update event. Please try again.");
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    try {
      Alert.alert("Confirm Deletion", "Are you sure you want to delete this event?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.from("events").delete().eq("id", eventId);
            if (error) {
              if (error.code === "42501") {
                Alert.alert(
                  "Permission Error",
                  "You do not have permission to delete this event. You may only delete events you created.",
                  [{ text: "OK" }]
                );
                return;
              }
              throw error;
            }
            Alert.alert("Success", "Event deleted successfully!");
            fetchEvents();
          },
        },
      ]);
    } catch (error) {
      console.error("Error deleting event:", error);
      Alert.alert("Error", "Failed to delete event. Please try again.");
    }
  };

  const pickImage = async () => {
    try {
      setFormImageLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
      });
      if (result.canceled) {
        setFormImageLoading(false);
        return;
      }
      const localUri = result.assets[0].uri;
      setFormImageUrl(localUri);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          throw new Error("Not authenticated");
        }
        const fileName = `${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("event-images")
          .upload(fileName, {
            uri: localUri,
            type: "image/jpeg",
            name: fileName,
          } as any);
        if (uploadError) {
          throw uploadError;
        }
        const { data: urlData } = supabase.storage.from("event-images").getPublicUrl(fileName);
        if (urlData?.publicUrl) {
          setFormImageUrl(urlData.publicUrl);
          Alert.alert("Success", "Image uploaded successfully!");
        }
      } catch {
        Alert.alert("Upload Notice", "Using local image only.");
      }
    } catch {
      Alert.alert("Error", "Failed to select image");
    } finally {
      setFormImageLoading(false);
    }
  };

  // ----------------------------
  // Render functions (calendar, event cards, etc.)
  // ----------------------------
  const getEventIconAndColor = (
    event: Event
  ): {
    icon: "book" | "home" | "message-circle" | "coffee" | "calendar";
    color: string;
  } => {
    const title = event.title.toLowerCase();
    if (title.includes("bible") || title.includes("study")) {
      return { icon: "book", color: theme.accent1 };
    } else if (title.includes("sunday") || title.includes("service") || title.includes("worship")) {
      return { icon: "home", color: theme.accent2 };
    } else if (title.includes("youth") || title.includes("meetup") || title.includes("young")) {
      return { icon: "message-circle", color: theme.accent3 };
    } else if (title.includes("prayer") || title.includes("breakfast")) {
      return { icon: "coffee", color: theme.accent4 };
    }
    return { icon: "calendar", color: theme.accent1 };
  };

  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const renderEventCard = (event: Event, isDetail: boolean = false) => {
    const { icon, color } = getEventIconAndColor(event);
    const hasImage = event.image_url && event.image_url.trim().length > 0;

    return (
      <View key={event.id} style={[styles.eventCard, { height: 140 }]}>
        {hasImage ? (
          <TouchableOpacity
            style={styles.eventImageContainer}
            onPress={() => openImageViewer(event.image_url)}
            activeOpacity={0.9}
          >
            <Image source={{ uri: event.image_url }} style={styles.eventImage} resizeMode="cover" />
            <View style={[styles.eventIconOverlay, { backgroundColor: color }]}>
              <Feather name={icon} size={18} color={theme.textForeground} />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.eventIconContainer, { backgroundColor: color }]}>
            <Feather name={icon} size={28} color={theme.textForeground} />
          </View>
        )}
        <View style={styles.eventContent}>
          <Text style={styles.eventTitle} numberOfLines={1} ellipsizeMode="tail">
            {event.title}
          </Text>
          <View style={styles.eventTimeLocationContainer}>
            <Text style={styles.eventDateTime} numberOfLines={1}>
              {formatEventDay(event.time)}, {formatEventMonth(event.time)}{" "}
              {formatEventDate(event.time)} {formatEventTime(event.time)}
            </Text>
            <Text style={styles.eventLocation} numberOfLines={1} ellipsizeMode="tail">
              {event.author_name || "Community Church"}
            </Text>
          </View>
          {event.excerpt && (
            <Text style={styles.eventDescription} numberOfLines={2} ellipsizeMode="tail">
              {event.excerpt}
            </Text>
          )}
          <View style={styles.eventActions}>
            <TouchableOpacity style={styles.eventActionButton} onPress={() => openEditModal(event)}>
              <Feather name="edit-2" size={16} color={theme.textForegroundMuted} />
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.eventActionButton}
              onPress={() => handleDeleteEvent(event.id)}
            >
              <Feather name="trash-2" size={16} color={theme.backgroundDestructive} />
              <Text style={styles.actionButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderCalendarDay = (day: CalendarDay, index: number) => {
    const dateKey = getDateKey(day.date);
    const animation = dayAnimations[dateKey] || new Animated.Value(1);
    const isSelected = isSameDay(day.date, selectedDate);
    return (
      <Animated.View
        key={dateKey}
        style={[
          {
            opacity: animation,
            transform: [
              {
                translateY: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.calendarDay,
            !day.isCurrentMonth && styles.calendarDayOtherMonth,
            isSelected && styles.calendarDaySelected,
          ]}
          onPress={() => selectDay(day)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.dayNumberContainer,
              day.isToday && styles.todayContainer,
              isSelected && styles.selectedDayNumberContainer,
            ]}
          >
            <Text
              style={[
                styles.dayNumber,
                !day.isCurrentMonth && styles.dayNumberOtherMonth,
                day.isToday && styles.todayNumber,
                isSelected && styles.selectedDayNumber,
              ]}
            >
              {day.dayOfMonth}
            </Text>
          </View>
          {day.events.length > 0 && (
            <View style={styles.eventIndicatorContainer}>
              {day.events.length <= 3 ? (
                day.events.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.eventIndicator,
                      i === 0 && { backgroundColor: theme.accent1 },
                      i === 1 && { backgroundColor: theme.accent2 },
                      i === 2 && { backgroundColor: theme.accent3 },
                    ]}
                  />
                ))
              ) : (
                <View style={styles.multipleEventsIndicator}>
                  <Text style={styles.multipleEventsText}>{day.events.length}</Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderCalendarWeeks = () => {
    const weeks = [];
    for (let i = 0; i < calendarData.length; i += 7) {
      const weekDays = calendarData.slice(i, i + 7);
      weeks.push(
        <View key={i} style={styles.calendarWeek}>
          {weekDays.map((day, index) => renderCalendarDay(day, i + index))}
        </View>
      );
    }
    return weeks;
  };

  // ----------------------------
  // Render
  // ----------------------------
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Events</Text>
        </View>

        {/* Animated Hero Section with "CREATE EVENT" button (isolated from the shorter file) */}
        <Animated.View
          style={[
            styles.heroSection,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.iconContainer}>
            <AntDesign name="calendar" size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>Community Events</Text>
          <Text style={styles.heroSubtitle}>
            Join Saint Central and our guest speakers for live events, prayer nights, and Bible
            studies.
          </Text>
          <TouchableOpacity
            style={styles.addEventButton}
            onPress={openAddModal}
            activeOpacity={0.8}
          >
            <Text style={styles.addEventButtonText}>CREATE EVENT</Text>
            <AntDesign name="plus" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>

        {/* Main Scrollable Content */}
        <Animated.ScrollView
          contentContainerStyle={styles.scrollContent}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
          })}
        >
          {/* View Selector */}
          <View style={styles.viewSelector}>
            <TouchableOpacity
              style={[styles.viewOption, calendarView === "list" && styles.viewOptionActive]}
              onPress={() => setCalendarView("list")}
            >
              <Text
                style={[
                  styles.viewOptionText,
                  calendarView === "list" && styles.viewOptionTextActive,
                ]}
              >
                List
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.viewOption, calendarView === "month" && styles.viewOptionActive]}
              onPress={() => setCalendarView("month")}
            >
              <Text
                style={[
                  styles.viewOptionText,
                  calendarView === "month" && styles.viewOptionTextActive,
                ]}
              >
                Calendar
              </Text>
            </TouchableOpacity>
          </View>

          {/* Month Navigation (for calendar view) */}
          {calendarView === "month" && (
            <View style={styles.monthNavigation}>
              <TouchableOpacity style={styles.monthNavArrow} onPress={() => changeMonth(-1)}>
                <Feather name="chevron-left" size={24} color={theme.textForegroundMuted} />
              </TouchableOpacity>
              <Text style={styles.monthText}>{formatMonth(currentMonth)}</Text>
              <TouchableOpacity style={styles.monthNavArrow} onPress={() => changeMonth(1)}>
                <Feather name="chevron-right" size={24} color={theme.textForegroundMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Calendar or List View */}
          {calendarView === "month" ? (
            <View style={styles.calendarContainer}>
              <View style={styles.dayLabelsRow}>
                {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                  <View key={day} style={styles.dayLabelContainer}>
                    <Text style={styles.dayLabel}>{getDayName(day, true)}</Text>
                  </View>
                ))}
              </View>
              {loading ? (
                <View style={styles.calendarLoading}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={styles.loadingText}>Loading calendar...</Text>
                </View>
              ) : (
                <View style={styles.calendarGrid}>{renderCalendarWeeks()}</View>
              )}
            </View>
          ) : (
            <View style={styles.listContainer}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={styles.loadingText}>Loading events...</Text>
                </View>
              ) : events.length === 0 ? (
                <View style={styles.noEventsContainer}>
                  <Feather name="calendar" size={50} color={theme.textForegroundSubtle} />
                  <Text style={styles.noEventsText}>No events found</Text>
                  <Text style={styles.noEventsSubtext}>
                    Add your first event by tapping the button below
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={events}
                  renderItem={({ item }) => renderEventCard(item, false)}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                  contentContainerStyle={styles.eventsList}
                />
              )}
            </View>
          )}
        </Animated.ScrollView>

        {/* Date Detail Modal */}
        {showDateDetail && (
          <Animated.View
            style={[styles.dateDetailContainer, { transform: [{ translateY: detailSlideAnim }] }]}
          >
            <View style={styles.dateDetailHandle} />
            <View style={styles.dateDetailHeader}>
              <Text style={styles.dateDetailTitle}>{formatDate(selectedDate)}</Text>
              <TouchableOpacity style={styles.dateDetailCloseButton} onPress={closeDateDetail}>
                <AntDesign name="close" size={24} color={theme.textForeground} />
              </TouchableOpacity>
            </View>
            <View style={styles.dateDetailContent}>
              {selectedDayEvents.length === 0 ? (
                <View style={styles.noEventsForDay}>
                  <Feather name="calendar" size={50} color={theme.textForegroundSubtle} />
                  <Text style={styles.noEventsForDayText}>No events for this day</Text>
                  <TouchableOpacity
                    style={styles.addEventForDayButton}
                    onPress={() => {
                      const newFormTime = new Date(selectedDate);
                      newFormTime.setHours(new Date().getHours());
                      newFormTime.setMinutes(new Date().getMinutes());
                      setFormTime(newFormTime);
                      closeDateDetail();
                      openAddModal();
                    }}
                  >
                    <Text style={styles.addEventForDayText}>Add Event</Text>
                    <Feather name="plus" size={16} color={theme.primary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={selectedDayEvents}
                  renderItem={({ item }) => renderEventCard(item, true)}
                  keyExtractor={(item) => item.id.toString()}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.eventsList}
                />
              )}
            </View>
          </Animated.View>
        )}

        {/* Add Event Modal */}
        <Modal
          visible={showAddModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAddModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <Pressable style={styles.modalBackdrop} onPress={() => setShowAddModal(false)} />
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Event</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowAddModal(false)}
                  activeOpacity={0.7}
                >
                  <AntDesign name="close" size={22} color={theme.textForeground} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalForm}>
                {/* Form fields... (same as before) */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Event Title*</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formTitle}
                    onChangeText={setFormTitle}
                    placeholder="Enter event title"
                    placeholderTextColor={theme.textForegroundSubtle}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Description*</Text>
                  <TextInput
                    style={[styles.formInput, styles.textAreaInput]}
                    value={formExcerpt}
                    onChangeText={setFormExcerpt}
                    placeholder="Event description"
                    placeholderTextColor={theme.textForegroundSubtle}
                    multiline
                    numberOfLines={4}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Date & Time*</Text>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Feather name="calendar" size={18} color={theme.primary} />
                    <Text style={styles.dateTimeText}>{formTime.toLocaleString()}</Text>
                  </TouchableOpacity>
                </View>
                {showTimePicker && (
                  <DateTimePicker
                    value={formTime}
                    mode="datetime"
                    display="default"
                    onChange={(event, selectedTime) => {
                      setShowTimePicker(false);
                      if (selectedTime) {
                        setFormTime(selectedTime);
                      }
                    }}
                  />
                )}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Location</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formAuthorName}
                    onChangeText={setFormAuthorName}
                    placeholder="Event location"
                    placeholderTextColor={theme.textForegroundSubtle}
                  />
                </View>
                <View style={styles.formGroup}>
                  <View style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>Recurring event</Text>
                    <Switch
                      value={isRecurring}
                      onValueChange={setIsRecurring}
                      trackColor={{ false: "#E4E4E7", true: "#D1D5F9" }}
                      thumbColor={isRecurring ? theme.primary : "#FFFFFF"}
                      ios_backgroundColor="#E4E4E7"
                    />
                  </View>
                </View>
                {isRecurring && (
                  <View style={styles.recurringContainer}>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Repeat</Text>
                      <View style={styles.recurrenceTypeContainer}>
                        {["daily", "weekly", "monthly", "yearly"].map((type) => (
                          <TouchableOpacity
                            key={type}
                            style={[
                              styles.recurrenceTypeButton,
                              recurrenceType === type && styles.recurrenceTypeButtonSelected,
                            ]}
                            onPress={() => setRecurrenceType(type as any)}
                          >
                            <Text
                              style={[
                                styles.recurrenceTypeText,
                                recurrenceType === type && styles.recurrenceTypeTextSelected,
                              ]}
                            >
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Frequency</Text>
                      <View style={styles.intervalRow}>
                        <Text style={styles.intervalLabel}>Every</Text>
                        <TextInput
                          style={styles.intervalInput}
                          value={recurrenceInterval}
                          onChangeText={(text) => {
                            const filtered = text.replace(/[^0-9]/g, "");
                            setRecurrenceInterval(filtered || "1");
                          }}
                          keyboardType="number-pad"
                          maxLength={2}
                        />
                        <Text style={styles.intervalText}>
                          {recurrenceType === "daily"
                            ? "day(s)"
                            : recurrenceType === "weekly"
                            ? "week(s)"
                            : recurrenceType === "monthly"
                            ? "month(s)"
                            : "year(s)"}
                        </Text>
                      </View>
                    </View>
                    {recurrenceType === "weekly" && (
                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>On these days</Text>
                        <View style={styles.daysRow}>
                          {[
                            { day: 0, label: "S" },
                            { day: 1, label: "M" },
                            { day: 2, label: "T" },
                            { day: 3, label: "W" },
                            { day: 4, label: "T" },
                            { day: 5, label: "F" },
                            { day: 6, label: "S" },
                          ].map((item) => (
                            <TouchableOpacity
                              key={item.day}
                              style={[
                                styles.dayButton,
                                selectedDays.includes(item.day) && styles.dayButtonSelected,
                              ]}
                              onPress={() => {
                                if (selectedDays.includes(item.day)) {
                                  if (selectedDays.length > 1) {
                                    setSelectedDays(selectedDays.filter((d) => d !== item.day));
                                  }
                                } else {
                                  setSelectedDays([...selectedDays, item.day]);
                                }
                              }}
                            >
                              <Text
                                style={[
                                  styles.dayText,
                                  selectedDays.includes(item.day) && styles.dayTextSelected,
                                ]}
                              >
                                {item.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>End Date (Optional)</Text>
                      <TouchableOpacity
                        style={styles.dateTimeButton}
                        onPress={() => setShowEndDatePicker(true)}
                      >
                        <Feather name="calendar" size={16} color={theme.primary} />
                        <Text style={styles.dateTimeText}>
                          {recurrenceEndDate
                            ? recurrenceEndDate.toLocaleDateString()
                            : "No end date"}
                        </Text>
                      </TouchableOpacity>
                      {recurrenceEndDate && (
                        <TouchableOpacity
                          style={styles.clearButton}
                          onPress={() => setRecurrenceEndDate(null)}
                        >
                          <Text style={styles.clearButtonText}>Clear</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {showEndDatePicker && (
                      <DateTimePicker
                        value={recurrenceEndDate || new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                          setShowEndDatePicker(false);
                          if (selectedDate) {
                            setRecurrenceEndDate(selectedDate);
                          }
                        }}
                      />
                    )}
                  </View>
                )}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Event Image</Text>
                  <TouchableOpacity
                    style={styles.imagePickerButton}
                    onPress={pickImage}
                    disabled={formImageLoading}
                    activeOpacity={0.8}
                  >
                    {formImageLoading ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <>
                        <Feather name="image" size={22} color={theme.primary} />
                        <Text style={styles.imagePickerText}>
                          {formImageUrl ? "Change Image" : "Select Image"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                {formImageUrl ? (
                  <View style={styles.previewImageContainer}>
                    <Image
                      source={{ uri: formImageUrl }}
                      style={styles.previewImage}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setFormImageUrl("")}
                    >
                      <AntDesign name="closecircle" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleAddEvent}
                  activeOpacity={0.9}
                >
                  <Text style={styles.submitButtonText}>CREATE EVENT</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Edit Event Modal */}
        <Modal
          visible={showEditModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowEditModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <Pressable style={styles.modalBackdrop} onPress={() => setShowEditModal(false)} />
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Event</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowEditModal(false)}
                  activeOpacity={0.7}
                >
                  <AntDesign name="close" size={22} color={theme.textForeground} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalForm}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Event Title*</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formTitle}
                    onChangeText={setFormTitle}
                    placeholder="Enter event title"
                    placeholderTextColor={theme.textForegroundSubtle}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Description*</Text>
                  <TextInput
                    style={[styles.formInput, styles.textAreaInput]}
                    value={formExcerpt}
                    onChangeText={setFormExcerpt}
                    placeholder="Event description"
                    placeholderTextColor={theme.textForegroundSubtle}
                    multiline
                    numberOfLines={4}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Date & Time*</Text>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Feather name="calendar" size={18} color={theme.primary} />
                    <Text style={styles.dateTimeText}>{formTime.toLocaleString()}</Text>
                  </TouchableOpacity>
                </View>
                {showTimePicker && (
                  <DateTimePicker
                    value={formTime}
                    mode="datetime"
                    display="default"
                    onChange={(event, selectedTime) => {
                      setShowTimePicker(false);
                      if (selectedTime) {
                        setFormTime(selectedTime);
                      }
                    }}
                  />
                )}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Location</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formAuthorName}
                    onChangeText={setFormAuthorName}
                    placeholder="Event location"
                    placeholderTextColor={theme.textForegroundSubtle}
                  />
                </View>
                <View style={styles.formGroup}>
                  <View style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>Recurring event</Text>
                    <Switch
                      value={isRecurring}
                      onValueChange={setIsRecurring}
                      trackColor={{ false: "#E4E4E7", true: "#D1D5F9" }}
                      thumbColor={isRecurring ? theme.primary : "#FFFFFF"}
                      ios_backgroundColor="#E4E4E7"
                    />
                  </View>
                </View>
                {isRecurring && (
                  <View style={styles.recurringContainer}>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Repeat</Text>
                      <View style={styles.recurrenceTypeContainer}>
                        {["daily", "weekly", "monthly", "yearly"].map((type) => (
                          <TouchableOpacity
                            key={type}
                            style={[
                              styles.recurrenceTypeButton,
                              recurrenceType === type && styles.recurrenceTypeButtonSelected,
                            ]}
                            onPress={() => setRecurrenceType(type as any)}
                          >
                            <Text
                              style={[
                                styles.recurrenceTypeText,
                                recurrenceType === type && styles.recurrenceTypeTextSelected,
                              ]}
                            >
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Frequency</Text>
                      <View style={styles.intervalRow}>
                        <Text style={styles.intervalLabel}>Every</Text>
                        <TextInput
                          style={styles.intervalInput}
                          value={recurrenceInterval}
                          onChangeText={(text) => {
                            const filtered = text.replace(/[^0-9]/g, "");
                            setRecurrenceInterval(filtered || "1");
                          }}
                          keyboardType="number-pad"
                          maxLength={2}
                        />
                        <Text style={styles.intervalText}>
                          {recurrenceType === "daily"
                            ? "day(s)"
                            : recurrenceType === "weekly"
                            ? "week(s)"
                            : recurrenceType === "monthly"
                            ? "month(s)"
                            : "year(s)"}
                        </Text>
                      </View>
                    </View>
                    {recurrenceType === "weekly" && (
                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>On these days</Text>
                        <View style={styles.daysRow}>
                          {[
                            { day: 0, label: "S" },
                            { day: 1, label: "M" },
                            { day: 2, label: "T" },
                            { day: 3, label: "W" },
                            { day: 4, label: "T" },
                            { day: 5, label: "F" },
                            { day: 6, label: "S" },
                          ].map((item) => (
                            <TouchableOpacity
                              key={item.day}
                              style={[
                                styles.dayButton,
                                selectedDays.includes(item.day) && styles.dayButtonSelected,
                              ]}
                              onPress={() => {
                                if (selectedDays.includes(item.day)) {
                                  if (selectedDays.length > 1) {
                                    setSelectedDays(selectedDays.filter((d) => d !== item.day));
                                  }
                                } else {
                                  setSelectedDays([...selectedDays, item.day]);
                                }
                              }}
                            >
                              <Text
                                style={[
                                  styles.dayText,
                                  selectedDays.includes(item.day) && styles.dayTextSelected,
                                ]}
                              >
                                {item.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>End Date (Optional)</Text>
                      <TouchableOpacity
                        style={styles.dateTimeButton}
                        onPress={() => setShowEndDatePicker(true)}
                      >
                        <Feather name="calendar" size={16} color={theme.primary} />
                        <Text style={styles.dateTimeText}>
                          {recurrenceEndDate
                            ? recurrenceEndDate.toLocaleDateString()
                            : "No end date"}
                        </Text>
                      </TouchableOpacity>
                      {recurrenceEndDate && (
                        <TouchableOpacity
                          style={styles.clearButton}
                          onPress={() => setRecurrenceEndDate(null)}
                        >
                          <Text style={styles.clearButtonText}>Clear</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {showEndDatePicker && (
                      <DateTimePicker
                        value={recurrenceEndDate || new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                          setShowEndDatePicker(false);
                          if (selectedDate) {
                            setRecurrenceEndDate(selectedDate);
                          }
                        }}
                      />
                    )}
                  </View>
                )}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Event Image</Text>
                  <TouchableOpacity
                    style={styles.imagePickerButton}
                    onPress={pickImage}
                    disabled={formImageLoading}
                    activeOpacity={0.8}
                  >
                    {formImageLoading ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <>
                        <Feather name="image" size={22} color={theme.primary} />
                        <Text style={styles.imagePickerText}>
                          {formImageUrl ? "Change Image" : "Select Image"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                {formImageUrl ? (
                  <View style={styles.previewImageContainer}>
                    <Image
                      source={{ uri: formImageUrl }}
                      style={styles.previewImage}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setFormImageUrl("")}
                    >
                      <AntDesign name="closecircle" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleEditEvent}
                  activeOpacity={0.9}
                >
                  <Text style={styles.submitButtonText}>UPDATE EVENT</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Full Image Viewer Modal */}
        <Modal
          visible={showImageModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowImageModal(false)}
        >
          <View style={styles.imageViewerContainer}>
            <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
            <TouchableOpacity
              style={styles.imageViewerCloseButton}
              onPress={() => setShowImageModal(false)}
            >
              <AntDesign name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

// Styles definition
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.backgroundBeige,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  // Header
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: theme.backgroundBeige,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.textForeground,
  },
  // View Selector
  viewSelector: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    padding: 4,
    shadowColor: theme.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  viewOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 25,
  },
  viewOptionActive: {
    backgroundColor: theme.primary,
  },
  viewOptionText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textForegroundMuted,
  },
  viewOptionTextActive: {
    color: theme.buttonText,
  },
  // Month Navigation
  monthNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  monthNavArrow: {
    padding: 8,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.textForeground,
  },
  // Calendar
  calendarContainer: {
    backgroundColor: theme.cardBackground,
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 16,
    shadowColor: theme.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dayLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  dayLabelContainer: {
    width: 38,
    alignItems: "center",
  },
  dayLabel: {
    fontSize: 14,
    color: theme.textForegroundMuted,
    fontWeight: "600",
  },
  calendarGrid: {},
  calendarWeek: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  calendarDay: {
    width: 38,
    height: 60,
    alignItems: "center",
    paddingTop: 6,
    borderRadius: 10,
  },
  calendarDayOtherMonth: {
    opacity: 0.5,
  },
  calendarDaySelected: {
    backgroundColor: "#F0F0F5",
  },
  dayNumberContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  todayContainer: {
    backgroundColor: "#EEEEF5",
  },
  selectedDayNumberContainer: {
    backgroundColor: theme.primary,
  },
  dayNumber: {
    fontSize: 16,
    color: theme.textForeground,
    fontWeight: "500",
  },
  dayNumberOtherMonth: {
    color: theme.textForegroundSubtle,
  },
  todayNumber: {
    color: theme.primary,
    fontWeight: "700",
  },
  selectedDayNumber: {
    color: theme.buttonText,
    fontWeight: "700",
  },
  eventIndicatorContainer: {
    flexDirection: "row",
    marginTop: 4,
    justifyContent: "center",
    maxWidth: 32,
    flexWrap: "wrap",
  },
  eventIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    margin: 1,
  },
  multipleEventsIndicator: {
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  multipleEventsText: {
    color: theme.buttonText,
    fontSize: 10,
    fontWeight: "700",
  },
  calendarLoading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.textForegroundMuted,
  },
  // List View
  listContainer: {
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  noEventsContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.cardBackground,
    borderRadius: 16,
    padding: 30,
    marginVertical: 20,
    shadowColor: theme.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noEventsText: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.textForeground,
    marginTop: 16,
    marginBottom: 8,
  },
  noEventsSubtext: {
    fontSize: 14,
    color: theme.textForegroundMuted,
    textAlign: "center",
  },
  eventsList: {
    paddingVertical: 8,
  },
  // Event Cards
  eventCard: {
    flexDirection: "row",
    backgroundColor: theme.cardBackground,
    borderRadius: 16,
    marginVertical: 8,
    overflow: "hidden",
    shadowColor: theme.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  eventIconContainer: {
    width: 90,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  eventImageContainer: {
    width: 90,
    height: "100%",
    overflow: "hidden",
    position: "relative",
  },
  eventImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  eventIconOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  iconOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  centerIcon: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    top: "50%",
    left: "50%",
    marginTop: -18,
    marginLeft: -18,
  },
  eventContent: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.textForeground,
    marginBottom: 4,
  },
  eventTimeLocationContainer: {
    marginBottom: 4,
  },
  eventDateTime: {
    fontSize: 13,
    color: theme.textForegroundMuted,
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 13,
    color: theme.textForegroundMuted,
  },
  eventDescription: {
    fontSize: 13,
    color: theme.textForegroundSubtle,
    marginBottom: 8,
    lineHeight: 18,
  },
  eventActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  eventActionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
  },
  actionButtonText: {
    fontSize: 14,
    color: theme.textForegroundMuted,
    marginLeft: 4,
  },
  eventCardDetail: {
    flexDirection: "column",
  },
  eventDetailImageContainer: {
    width: "100%",
    height: 180,
  },
  eventDetailImage: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  eventContentDetail: {
    paddingTop: 16,
  },
  // Updated Hero Section
  heroSection: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.2)",
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.textForeground,
    textAlign: "center",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: theme.textForegroundMuted,
    textAlign: "center",
    marginBottom: 16,
    maxWidth: 300,
    lineHeight: 20,
  },
  // Updated Button
  addEventButton: {
    flexDirection: "row",
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  addEventButtonText: {
    fontSize: 16,
    color: theme.buttonText,
    fontWeight: "700",
    marginRight: 10,
  },
  // Date Detail Modal
  dateDetailContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.7,
    backgroundColor: theme.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
    shadowColor: theme.shadowLight,
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 99,
  },
  dateDetailHandle: {
    width: 40,
    height: 5,
    backgroundColor: theme.borderLight,
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  dateDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  dateDetailTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.textForeground,
  },
  dateDetailCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.backgroundBeige,
    justifyContent: "center",
    alignItems: "center",
  },
  dateDetailContent: {
    flex: 1,
    padding: 20,
  },
  noEventsForDay: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  noEventsForDayText: {
    fontSize: 16,
    color: theme.textForegroundMuted,
    marginTop: 16,
    marginBottom: 24,
  },
  addEventForDayButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.backgroundBeige,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  addEventForDayText: {
    fontSize: 16,
    color: theme.primary,
    fontWeight: "600",
    marginRight: 8,
  },
  // Modal
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: theme.cardBackground,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 30,
    maxHeight: height * 0.9,
    shadowColor: theme.shadowLight,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: theme.borderLight,
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.textForeground,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.backgroundBeige,
    justifyContent: "center",
    alignItems: "center",
  },
  modalForm: {
    padding: 20,
  },
  // Form Elements
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textForeground,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: theme.backgroundBeige,
    borderRadius: 12,
    padding: 16,
    color: theme.textForeground,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  textAreaInput: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  dateTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.backgroundBeige,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  dateTimeText: {
    color: theme.textForeground,
    marginLeft: 10,
    fontSize: 16,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.backgroundBeige,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textForeground,
  },
  recurringContainer: {
    marginBottom: 20,
  },
  recurrenceTypeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  recurrenceTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: theme.backgroundBeige,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  recurrenceTypeButtonSelected: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  recurrenceTypeText: {
    fontSize: 14,
    color: theme.textForegroundMuted,
    fontWeight: "500",
  },
  recurrenceTypeTextSelected: {
    color: theme.buttonText,
    fontWeight: "600",
  },
  intervalRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  intervalLabel: {
    fontSize: 16,
    color: theme.textForegroundMuted,
    marginRight: 8,
  },
  intervalInput: {
    backgroundColor: theme.cardBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 60,
    borderWidth: 1,
    borderColor: theme.borderLight,
    marginRight: 8,
    fontSize: 16,
    color: theme.textForeground,
    textAlign: "center",
  },
  intervalText: {
    fontSize: 16,
    color: theme.textForegroundMuted,
  },
  daysRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.backgroundBeige,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  dayButtonSelected: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.textForegroundMuted,
  },
  dayTextSelected: {
    color: theme.buttonText,
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    marginTop: 8,
    alignSelf: "flex-start",
  },
  clearButtonText: {
    fontSize: 14,
    color: theme.backgroundDestructive,
    fontWeight: "500",
  },
  imagePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: theme.backgroundBeige,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.primary,
  },
  imagePickerText: {
    color: theme.primary,
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "600",
  },
  previewImageContainer: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: 180,
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  submitButton: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.buttonText,
  },
  // Image Viewer Modal Styles
  imageViewerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.9)",
  },
  imageViewerCloseButton: {
    position: "absolute",
    top: 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  fullImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height * 0.8,
  },
});
