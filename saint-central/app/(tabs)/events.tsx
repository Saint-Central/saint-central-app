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
  Linking,
} from "react-native";
import { BlurView } from "expo-blur";
import { AntDesign, Feather } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useCRUD } from "@/utils/crudClient";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import theme from "@/theme";

const { height, width } = Dimensions.get("window");

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
  links?: string; // JSON string of links array
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

  // Use custom auth and CRUD hooks
  const { user: currentUser } = useAuth();
  const { select, selectOne, insert, update, delete: deleteRecord } = useCRUD();

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
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [userRoleLoading, setUserRoleLoading] = useState(true);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formExcerpt, setFormExcerpt] = useState("");
  const [formTime, setFormTime] = useState(new Date());
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formVideoLink, setFormVideoLink] = useState("");
  const [formAuthorName, setFormAuthorName] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [formImageLoading, setFormImageLoading] = useState(false);
  const [formLinks, setFormLinks] = useState<{title: string; url: string}[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  // Recurring event states
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<"daily" | "weekly" | "monthly" | "yearly">("weekly");
  const [recurrenceInterval, setRecurrenceInterval] = useState("1");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | null>(null);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([1]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
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

      const firstDay = new Date(year, month, 1);
      const firstDayOfWeek = firstDay.getDay();

      const lastDay = new Date(year, month + 1, 0);
      const lastDate = lastDay.getDate();

      const days: CalendarDay[] = [];

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

        const dateKey = getDateKey(date);
        if (!dayAnimations[dateKey]) {
          dayAnimations[dateKey] = new Animated.Value(0);
        }
      }

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
    [dayAnimations, getEventsForDay],
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

    Animated.spring(detailSlideAnim, {
      toValue: 0,
      tension: 80,
      friction: 8,
      useNativeDriver: true,
    }).start();

    setShowDateDetail(true);
  };

  // Close date detail view
  const closeDateDetail = () => {
    Animated.spring(detailSlideAnim, {
      toValue: height,
      tension: 80,
      friction: 8,
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
    const animations = Object.values(dayAnimations).map((anim) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    );

    Animated.stagger(15, animations).start();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
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

  // Load events and check user role
  useEffect(() => {
    fetchEvents();
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      setUserRoleLoading(true);
      
      if (!currentUser?.id) {
        setCurrentUserRole(null);
        return;
      }

      // Get user role from database - this is needed to check for "partner" role
      try {
        const userData = await selectOne("users", {
          where: { id: currentUser.id }
        });

        if (userData) {
          setCurrentUserRole(userData.role_partner || null);
        } else {
          setCurrentUserRole(null);
        }
      } catch (dbError) {
        console.error("Error fetching user role from database:", dbError);
        // Fallback to auth context role if database call fails
        setCurrentUserRole(currentUser.role || null);
      }
    } catch (error) {
      console.error("Error checking user role:", error);
      setCurrentUserRole(null);
    } finally {
      setUserRoleLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);

      const eventsData = await select("events");

      // Sort events by time in JavaScript instead of database
      const sortedEvents = (eventsData || []).sort((a, b) => {
        return new Date(a.time).getTime() - new Date(b.time).getTime();
      });

      setEvents(sortedEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      Alert.alert("Error", "Failed to load events. Please try again later.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
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
    setFormLinks([]);
    setNewLinkTitle("");
    setNewLinkUrl("");
  };

  // Check if user is a partner
  const isPartner = () => {
    return currentUserRole === "partner";
  };

  const openAddModal = () => {
    if (!isPartner()) {
      Alert.alert(
        "Access Restricted", 
        "Only Saint Central partners can create events. Please contact an administrator if you need access.",
        [{ text: "OK" }]
      );
      return;
    }
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (event: Event) => {
    if (!isPartner()) {
      Alert.alert(
        "Access Restricted", 
        "Only Saint Central partners can edit events. Please contact an administrator if you need access.",
        [{ text: "OK" }]
      );
      return;
    }
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
    
    // Parse existing links
    try {
      const existingLinks = event.links ? JSON.parse(event.links) : [];
      setFormLinks(existingLinks);
    } catch (error) {
      console.error("Error parsing existing links:", error);
      setFormLinks([]);
    }
    
    setShowEditModal(true);
  };

  const handleAddEvent = async () => {
    try {
      if (!formTitle || !formExcerpt) {
        Alert.alert("Error", "Please fill in all required fields");
        return;
      }

      if (!currentUser?.id) {
        Alert.alert("Error", "You must be logged in to add events");
        return;
      }

      const eventData: Record<string, any> = {
        title: formTitle,
        excerpt: formExcerpt,
        time: formTime.toISOString(),
        user_id: currentUser.id,
        image_url: formImageUrl,
        video_link: formVideoLink,
        author_name: formAuthorName || currentUser.email,
        is_recurring: isRecurring,
        links: formLinks.length > 0 ? JSON.stringify(formLinks) : null,
      };

      if (isRecurring) {
        eventData.recurrence_type = recurrenceType;
        eventData.recurrence_interval = parseInt(recurrenceInterval) || 1;
        eventData.recurrence_days_of_week = selectedDays;
        if (recurrenceEndDate) {
          eventData.recurrence_end_date = recurrenceEndDate.toISOString();
        }
      }

      await insert("events", eventData);

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

      if (!currentUser?.id) {
        Alert.alert("Error", "You must be logged in to edit events");
        return;
      }

      const eventData: Record<string, any> = {
        title: formTitle,
        excerpt: formExcerpt,
        time: formTime.toISOString(),
        image_url: formImageUrl,
        video_link: formVideoLink,
        author_name: formAuthorName || currentUser.email,
        is_recurring: isRecurring,
        links: formLinks.length > 0 ? JSON.stringify(formLinks) : null,
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

      await update("events", eventData, { id: selectedEvent.id });

      Alert.alert("Success", "Event updated successfully!");
      setShowEditModal(false);
      fetchEvents();
    } catch (error) {
      console.error("Error updating event:", error);
      Alert.alert("Error", "Failed to update event. Please try again.");
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!isPartner()) {
      Alert.alert(
        "Access Restricted", 
        "Only Saint Central partners can delete events. Please contact an administrator if you need access.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      Alert.alert("Confirm Deletion", "Are you sure you want to delete this event?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRecord("events", { id: eventId });
              Alert.alert("Success", "Event deleted successfully!");
              fetchEvents();
            } catch (error) {
              console.error("Error deleting event:", error);
              Alert.alert("Error", "Failed to delete event. Please try again.");
            }
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

      // Note: Without Supabase storage, we'll just use the local URI
      // In a production app, you'd want to upload this to your own storage service
      Alert.alert("Success", "Image selected! Note: This will only be stored locally.");
    } catch (error) {
      console.error("Error selecting image:", error);
      Alert.alert("Error", "Failed to select image");
    } finally {
      setFormImageLoading(false);
    }
  };

  // Add link to the event
  const addLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) {
      Alert.alert("Error", "Please enter both title and URL for the link");
      return;
    }

    // Basic URL validation
    const urlPattern = /^(https?:\/\/|www\.)/i;
    const formattedUrl = newLinkUrl.startsWith('http') ? newLinkUrl : `https://${newLinkUrl}`;
    
    const newLink = {
      title: newLinkTitle.trim(),
      url: formattedUrl
    };

    setFormLinks(prev => [...prev, newLink]);
    setNewLinkTitle("");
    setNewLinkUrl("");
  };

  // Remove link from the event
  const removeLink = (index: number) => {
    setFormLinks(prev => prev.filter((_, i) => i !== index));
  };

  // Open link in browser/app
  const openLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Unable to open this link");
      }
    } catch (error) {
      console.error("Error opening link:", error);
      Alert.alert("Error", "Failed to open link");
    }
  };

  const getEventIconAndColor = (
    event: Event,
  ): { icon: "book" | "home" | "message-circle" | "coffee" | "calendar"; color: string } => {
    const title = event.title.toLowerCase();
    if (title.includes("bible") || title.includes("study")) {
      return { icon: "book", color: "#3B82F6" }; // Blue
    } else if (title.includes("sunday") || title.includes("service") || title.includes("worship")) {
      return { icon: "home", color: "#8B5CF6" }; // Purple
    } else if (title.includes("youth") || title.includes("meetup") || title.includes("young")) {
      return { icon: "message-circle", color: "#10B981" }; // Emerald
    } else if (title.includes("prayer") || title.includes("breakfast")) {
      return { icon: "coffee", color: "#F59E0B" }; // Amber
    }
    return { icon: "calendar", color: "#EF4444" }; // Red
  };

  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const renderEventCard = (event: Event, isDetail: boolean = false) => {
    const { icon, color } = getEventIconAndColor(event);
    const hasImage = event.image_url && event.image_url.trim().length > 0;
    
    // Parse event links with better debugging
    let eventLinks: {title: string; url: string}[] = [];
    try {
      if (event.links) {
        console.log("Raw links data for event:", event.title, ":", event.links);
        eventLinks = typeof event.links === 'string' ? JSON.parse(event.links) : event.links;
        console.log("Parsed links:", eventLinks);
      } else {
        console.log("No links data for event:", event.title);
      }
    } catch (error) {
      console.error("Error parsing event links for", event.title, ":", error);
      eventLinks = [];
    }

    return (
      <View key={event.id} style={styles.eventCard}>
        <LinearGradient
          colors={[theme.neutral800, theme.neutral700]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.eventCardGradient}
        >
          {hasImage ? (
            <TouchableOpacity
              style={styles.eventImageContainer}
              onPress={() => openImageViewer(event.image_url)}
              activeOpacity={0.9}
            >
              <Image source={{ uri: event.image_url }} style={styles.eventImage} resizeMode="cover" />
              <LinearGradient
                colors={[`${color}`, `${color}CC`]}
                style={styles.eventIconOverlay}
              >
                <Feather name={icon} size={18} color={theme.textWhite} />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <LinearGradient
              colors={[`${color}`, `${color}DD`]}
              style={styles.eventIconContainer}
            >
              <Feather name={icon} size={28} color={theme.textWhite} />
            </LinearGradient>
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
              <Text style={styles.eventDescription} numberOfLines={1} ellipsizeMode="tail">
                {event.excerpt}
              </Text>
            )}
            
            {/* Event Links Section - Always show for debugging */}
            {eventLinks && eventLinks.length > 0 ? (
              <View style={styles.eventLinksContainer}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.linksScrollContainer}
                >
                  {eventLinks.slice(0, 2).map((link, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.eventLinkButton}
                      onPress={() => openLink(link.url)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#3B82F6', '#1D4ED8']}
                        style={styles.eventLinkGradient}
                      >
                        <Feather name="external-link" size={10} color={theme.textWhite} />
                        <Text style={styles.eventLinkText} numberOfLines={1}>
                          {link.title}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                  {eventLinks.length > 2 && (
                    <View style={styles.moreLinksBadge}>
                      <Text style={styles.moreLinksText}>+{eventLinks.length - 2}</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            ) : (
              // Debug view - remove this once working
              event.links && (
                <View style={styles.debugLinksContainer}>
                  <Text style={styles.debugText}>Debug: Raw links = {event.links}</Text>
                </View>
              )
            )}
            
            <View style={styles.eventActions}>
              {isPartner() && (
                <>
                  <TouchableOpacity 
                    style={styles.eventActionButton} 
                    onPress={() => openEditModal(event)}
                  >
                    <LinearGradient
                      colors={theme.gradientInfo}
                      style={styles.actionButtonGradient}
                    >
                      <Feather name="edit-2" size={14} color={theme.textWhite} />
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.eventActionButton}
                    onPress={() => handleDeleteEvent(event.id)}
                  >
                    <LinearGradient
                      colors={theme.gradientSecondary}
                      style={styles.actionButtonGradient}
                    >
                      <Feather name="trash-2" size={14} color={theme.textWhite} />
                      <Text style={styles.actionButtonText}>Delete</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </LinearGradient>
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
                  outputRange: [15, 0],
                }),
              },
              {
                scale: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
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
          ]}
          onPress={() => selectDay(day)}
          activeOpacity={0.8}
        >
          {isSelected ? (
            <LinearGradient
              colors={theme.gradientPrimary}
              style={styles.selectedDayContainer}
            >
              <Text style={styles.selectedDayNumber}>{day.dayOfMonth}</Text>
            </LinearGradient>
          ) : day.isToday ? (
            <LinearGradient
              colors={theme.gradientWarm}
              style={styles.todayContainer}
            >
              <Text style={styles.todayNumber}>{day.dayOfMonth}</Text>
            </LinearGradient>
          ) : (
            <View style={styles.dayNumberContainer}>
              <Text
                style={[
                  styles.dayNumber,
                  !day.isCurrentMonth && styles.dayNumberOtherMonth,
                ]}
              >
                {day.dayOfMonth}
              </Text>
            </View>
          )}
          {day.events.length > 0 && (
            <View style={styles.eventIndicatorContainer}>
              {day.events.length <= 3 ? (
                day.events.map((_, i) => (
                  <LinearGradient
                    key={i}
                    colors={
                      i === 0 ? theme.gradientPrimary :
                      i === 1 ? theme.gradientSecondary :
                      theme.gradientInfo
                    }
                    style={styles.eventIndicator}
                  />
                ))
              ) : (
                <LinearGradient
                  colors={theme.gradientPrimary}
                  style={styles.multipleEventsIndicator}
                >
                  <Text style={styles.multipleEventsText}>{day.events.length}</Text>
                </LinearGradient>
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
        </View>,
      );
    }
    return weeks;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.pageBg, theme.neutral800]}
        style={styles.backgroundGradient}
      >
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          {/* Enhanced Header */}
          <View style={styles.header}>
            <LinearGradient
              colors={[theme.neutral800, theme.neutral700]}
              style={styles.headerGradient}
            >
              <Text style={styles.headerTitle}>Events</Text>
              <LinearGradient
                colors={theme.gradientPrimary}
                style={styles.headerIcon}
              >
                <AntDesign name="calendar" size={20} color={theme.textWhite} />
              </LinearGradient>
            </LinearGradient>
          </View>

          {/* Enhanced Hero Section */}
          <Animated.View 
            style={[
              styles.heroSection,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <LinearGradient
              colors={[theme.neutral700, theme.neutral600]}
              style={styles.heroGradient}
            >
              <LinearGradient
                colors={theme.gradientPrimary}
                style={styles.iconContainer}
              >
                <AntDesign name="calendar" size={32} color={theme.textWhite} />
              </LinearGradient>
              <Text style={styles.heroTitle}>Community Events</Text>
              <Text style={styles.heroSubtitle}>
                Join Saint Central and our guest speakers for live events, prayer nights, and Bible studies.
              </Text>
              {!userRoleLoading && isPartner() && (
                <TouchableOpacity
                  style={styles.addEventButton}
                  onPress={openAddModal}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={theme.gradientPrimary}
                    style={styles.addEventButtonGradient}
                  >
                    <Text style={styles.addEventButtonText}>CREATE EVENT</Text>
                    <AntDesign name="plus" size={18} color={theme.textWhite} />
                  </LinearGradient>
                </TouchableOpacity>
              )}
              {!userRoleLoading && !isPartner() && (
                <View style={styles.restrictedContainer}>
                  <LinearGradient
                    colors={[theme.neutral600, theme.neutral500]}
                    style={styles.restrictedGradient}
                  >
                    <Text style={styles.restrictedText}>
                      Event creation is restricted to Saint Central partners
                    </Text>
                  </LinearGradient>
                </View>
              )}
            </LinearGradient>
          </Animated.View>

          {/* Main Scrollable Content */}
          <Animated.ScrollView
            contentContainerStyle={styles.scrollContent}
            scrollEventThrottle={8}
            showsVerticalScrollIndicator={false}
            bounces={true}
            bouncesZoom={false}
            decelerationRate="normal"
            removeClippedSubviews={true}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
              useNativeDriver: true,
            })}
          >
            {/* Enhanced View Selector */}
            <View style={styles.viewSelector}>
              <LinearGradient
                colors={[theme.neutral700, theme.neutral600]}
                style={styles.viewSelectorGradient}
              >
                <TouchableOpacity
                  style={[styles.viewOption, calendarView === "list" && styles.viewOptionActive]}
                  onPress={() => setCalendarView("list")}
                >
                  {calendarView === "list" ? (
                    <LinearGradient
                      colors={theme.gradientPrimary}
                      style={styles.viewOptionActiveGradient}
                    >
                      <Text style={styles.viewOptionTextActive}>List</Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.viewOptionText}>List</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.viewOption, calendarView === "month" && styles.viewOptionActive]}
                  onPress={() => setCalendarView("month")}
                >
                  {calendarView === "month" ? (
                    <LinearGradient
                      colors={theme.gradientPrimary}
                      style={styles.viewOptionActiveGradient}
                    >
                      <Text style={styles.viewOptionTextActive}>Calendar</Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.viewOptionText}>Calendar</Text>
                  )}
                </TouchableOpacity>
              </LinearGradient>
            </View>

            {/* Month Navigation */}
            {calendarView === "month" && (
              <View style={styles.monthNavigation}>
                <LinearGradient
                  colors={[theme.neutral700, theme.neutral600]}
                  style={styles.monthNavigationGradient}
                >
                  <TouchableOpacity style={styles.monthNavArrow} onPress={() => changeMonth(-1)}>
                    <LinearGradient
                      colors={theme.gradientPrimary}
                      style={styles.navArrowGradient}
                    >
                      <Feather name="chevron-left" size={20} color={theme.textWhite} />
                    </LinearGradient>
                  </TouchableOpacity>
                  <Text style={styles.monthText}>{formatMonth(currentMonth)}</Text>
                  <TouchableOpacity style={styles.monthNavArrow} onPress={() => changeMonth(1)}>
                    <LinearGradient
                      colors={theme.gradientPrimary}
                      style={styles.navArrowGradient}
                    >
                      <Feather name="chevron-right" size={20} color={theme.textWhite} />
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            )}

            {/* Calendar or List View */}
            {calendarView === "month" ? (
              <View style={styles.calendarContainer}>
                <LinearGradient
                  colors={[theme.neutral800, theme.neutral700]}
                  style={styles.calendarGradient}
                >
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
                </LinearGradient>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <LinearGradient
                      colors={theme.gradientPrimary}
                      style={styles.loadingIconContainer}
                    >
                      <AntDesign name="calendar" size={32} color={theme.textWhite} />
                    </LinearGradient>
                    <ActivityIndicator size="large" color={theme.primary} style={{marginTop: theme.spacingL}} />
                    <Text style={styles.loadingText}>Loading events...</Text>
                  </View>
                ) : events.length === 0 ? (
                  <View style={styles.noEventsContainer}>
                    <LinearGradient
                      colors={[theme.neutral700, theme.neutral600]}
                      style={styles.noEventsGradient}
                    >
                      <LinearGradient
                        colors={theme.gradientNeutral}
                        style={styles.noEventsIconContainer}
                      >
                        <Feather name="calendar" size={40} color={theme.textWhite} />
                      </LinearGradient>
                      <Text style={styles.noEventsText}>No events found</Text>
                      <Text style={styles.noEventsSubtext}>
                        Add your first event by tapping the button above
                      </Text>
                    </LinearGradient>
                  </View>
                ) : (
                  <FlatList
                    data={events}
                    renderItem={({ item }) => renderEventCard(item, false)}
                    keyExtractor={(item) => item.id.toString()}
                    scrollEnabled={false}
                    contentContainerStyle={styles.eventsList}
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={5}
                    windowSize={10}
                    initialNumToRender={3}
                    getItemLayout={(data, index) => ({
                      length: 176, // event card height (160) + margin (16)
                      offset: 176 * index,
                      index,
                    })}
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
              <LinearGradient
                colors={[theme.neutral800, theme.neutral700]}
                style={styles.dateDetailGradient}
              >
                <View style={styles.dateDetailHandle} />
                <View style={styles.dateDetailHeader}>
                  <Text style={styles.dateDetailTitle}>{formatDate(selectedDate)}</Text>
                  <TouchableOpacity style={styles.dateDetailCloseButton} onPress={closeDateDetail}>
                    <LinearGradient
                      colors={theme.gradientNeutral}
                      style={styles.closeButtonGradient}
                    >
                      <AntDesign name="close" size={20} color={theme.textWhite} />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                <View style={styles.dateDetailContent}>
                  {selectedDayEvents.length === 0 ? (
                    <View style={styles.noEventsForDay}>
                      <LinearGradient
                        colors={theme.gradientNeutral}
                        style={styles.noEventsForDayIcon}
                      >
                        <Feather name="calendar" size={40} color={theme.textWhite} />
                      </LinearGradient>
                      <Text style={styles.noEventsForDayText}>No events for this day</Text>
                      {isPartner() && (
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
                          <LinearGradient
                            colors={theme.gradientPrimary}
                            style={styles.addEventForDayGradient}
                          >
                            <Text style={styles.addEventForDayText}>Add Event</Text>
                            <Feather name="plus" size={16} color={theme.textWhite} />
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <FlatList
                      data={selectedDayEvents}
                      renderItem={({ item }) => renderEventCard(item, true)}
                      keyExtractor={(item) => item.id.toString()}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.eventsList}
                      removeClippedSubviews={true}
                      maxToRenderPerBatch={3}
                      windowSize={5}
                      initialNumToRender={2}
                    />
                  )}
                </View>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Enhanced Add Event Modal */}
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
                <LinearGradient
                  colors={[theme.neutral800, theme.neutral700]}
                  style={styles.modalGradient}
                >
                  <View style={styles.modalHandle} />
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Create Event</Text>
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={() => setShowAddModal(false)}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={theme.gradientNeutral}
                        style={styles.modalCloseGradient}
                      >
                        <AntDesign name="close" size={18} color={theme.textWhite} />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                  <ScrollView 
                    style={styles.modalForm} 
                    showsVerticalScrollIndicator={false}
                    bounces={true}
                    keyboardShouldPersistTaps="handled"
                    scrollEventThrottle={8}
                    nestedScrollEnabled={true}
                  >
                    {/* Enhanced form fields */}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Event Title*</Text>
                      <View style={styles.formInputContainer}>
                        <LinearGradient
                          colors={[`${theme.primary}15`, `${theme.accent1}10`]}
                          style={styles.formInputGradient}
                        >
                          <TextInput
                            style={styles.formInput}
                            value={formTitle}
                            onChangeText={setFormTitle}
                            placeholder="Enter event title"
                            placeholderTextColor={theme.textLight}
                          />
                        </LinearGradient>
                      </View>
                    </View>
                    
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Description*</Text>
                      <View style={styles.formInputContainer}>
                        <LinearGradient
                          colors={[`${theme.primary}15`, `${theme.accent1}10`]}
                          style={styles.formInputGradient}
                        >
                          <TextInput
                            style={[styles.formInput, styles.textAreaInput]}
                            value={formExcerpt}
                            onChangeText={setFormExcerpt}
                            placeholder="Event description"
                            placeholderTextColor={theme.textLight}
                            multiline
                            numberOfLines={4}
                          />
                        </LinearGradient>
                      </View>
                    </View>
                    
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Date & Time*</Text>
                      <TouchableOpacity
                        style={styles.dateTimeButton}
                        onPress={() => setShowTimePicker(true)}
                      >
                        <LinearGradient
                          colors={[`${theme.info}15`, `${theme.tertiary}10`]}
                          style={styles.dateTimeGradient}
                        >
                          <Feather name="calendar" size={18} color={theme.info} />
                          <Text style={styles.dateTimeText}>{formTime.toLocaleString()}</Text>
                        </LinearGradient>
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
                      <View style={styles.formInputContainer}>
                        <LinearGradient
                          colors={[`${theme.secondary}15`, `${theme.accent3}10`]}
                          style={styles.formInputGradient}
                        >
                          <TextInput
                            style={styles.formInput}
                            value={formAuthorName}
                            onChangeText={setFormAuthorName}
                            placeholder="Event location"
                            placeholderTextColor={theme.textLight}
                          />
                        </LinearGradient>
                      </View>
                    </View>
                    
                    {/* Links Section */}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Event Links</Text>
                      <Text style={styles.formSubtitle}>
                        Add links like Zoom meeting, registration, or additional info
                      </Text>
                      
                      {/* Add New Link */}
                      <View style={styles.addLinkContainer}>
                        <View style={styles.linkInputRow}>
                          <View style={[styles.formInputContainer, { flex: 1, marginRight: theme.spacingM }]}>
                            <LinearGradient
                              colors={[`${theme.info}15`, `${theme.tertiary}10`]}
                              style={styles.formInputGradient}
                            >
                              <TextInput
                                style={styles.formInput}
                                value={newLinkTitle}
                                onChangeText={setNewLinkTitle}
                                placeholder="Link title (e.g., Zoom Meeting)"
                                placeholderTextColor={theme.textLight}
                              />
                            </LinearGradient>
                          </View>
                        </View>
                        
                        <View style={styles.linkInputRow}>
                          <View style={[styles.formInputContainer, { flex: 1, marginRight: theme.spacingM }]}>
                            <LinearGradient
                              colors={[`${theme.info}15`, `${theme.tertiary}10`]}
                              style={styles.formInputGradient}
                            >
                              <TextInput
                                style={styles.formInput}
                                value={newLinkUrl}
                                onChangeText={setNewLinkUrl}
                                placeholder="URL (e.g., zoom.us/j/123456789)"
                                placeholderTextColor={theme.textLight}
                                autoCapitalize="none"
                                autoCorrect={false}
                              />
                            </LinearGradient>
                          </View>
                          
                          <TouchableOpacity
                            style={styles.addLinkButton}
                            onPress={addLink}
                            activeOpacity={0.8}
                          >
                            <LinearGradient
                              colors={theme.gradientPrimary}
                              style={styles.addLinkButtonGradient}
                            >
                              <Feather name="plus" size={16} color={theme.textWhite} />
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      {/* Display Added Links */}
                      {formLinks.length > 0 && (
                        <View style={styles.existingLinksContainer}>
                          {formLinks.map((link, index) => (
                            <View key={index} style={styles.linkPreviewCard}>
                              <LinearGradient
                                colors={[theme.neutral700, theme.neutral600]}
                                style={styles.linkPreviewGradient}
                              >
                                <View style={styles.linkPreviewContent}>
                                  <Feather name="external-link" size={14} color={theme.accent1} />
                                  <View style={styles.linkPreviewText}>
                                    <Text style={styles.linkPreviewTitle}>{link.title}</Text>
                                    <Text style={styles.linkPreviewUrl} numberOfLines={1}>
                                      {link.url}
                                    </Text>
                                  </View>
                                </View>
                                <TouchableOpacity
                                  style={styles.removeLinkButton}
                                  onPress={() => removeLink(index)}
                                >
                                  <LinearGradient
                                    colors={theme.gradientSecondary}
                                    style={styles.removeLinkGradient}
                                  >
                                    <Feather name="trash-2" size={12} color={theme.textWhite} />
                                  </LinearGradient>
                                </TouchableOpacity>
                              </LinearGradient>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.formGroup}>
                      <View style={styles.toggleRow}>
                        <LinearGradient
                          colors={[theme.neutral700, theme.neutral600]}
                          style={styles.toggleRowGradient}
                        >
                          <Text style={styles.toggleLabel}>Recurring event</Text>
                          <Switch
                            value={isRecurring}
                            onValueChange={setIsRecurring}
                            trackColor={{ false: theme.neutral500, true: theme.primary }}
                            thumbColor={theme.accent2}
                          />
                        </LinearGradient>
                      </View>
                    </View>
                    
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Event Image</Text>
                      <TouchableOpacity
                        style={styles.imagePickerButton}
                        onPress={pickImage}
                        disabled={formImageLoading}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={[`${theme.success}15`, `${theme.success}10`]}
                          style={styles.imagePickerGradient}
                        >
                          {formImageLoading ? (
                            <ActivityIndicator size="small" color={theme.success} />
                          ) : (
                            <>
                              <Feather name="image" size={20} color={theme.success} />
                              <Text style={styles.imagePickerText}>
                                {formImageUrl ? "Change Image" : "Select Image"}
                              </Text>
                            </>
                          )}
                        </LinearGradient>
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
                          <LinearGradient
                            colors={theme.gradientSecondary}
                            style={styles.removeImageGradient}
                          >
                            <AntDesign name="closecircle" size={16} color={theme.textWhite} />
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                    
                    <TouchableOpacity
                      style={styles.submitButton}
                      onPress={handleAddEvent}
                      activeOpacity={0.9}
                    >
                      <LinearGradient
                        colors={theme.gradientPrimary}
                        style={styles.submitButtonGradient}
                      >
                        <Text style={styles.submitButtonText}>CREATE EVENT</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </ScrollView>
                </LinearGradient>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          {/* Edit Modal - similar structure with same gradient styling */}
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
                <LinearGradient
                  colors={[theme.neutral800, theme.neutral700]}
                  style={styles.modalGradient}
                >
                  <View style={styles.modalHandle} />
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Edit Event</Text>
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={() => setShowEditModal(false)}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={theme.gradientNeutral}
                        style={styles.modalCloseGradient}
                      >
                        <AntDesign name="close" size={18} color={theme.textWhite} />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                  <ScrollView 
                    style={styles.modalForm} 
                    showsVerticalScrollIndicator={false}
                    bounces={true}
                    keyboardShouldPersistTaps="handled"
                    scrollEventThrottle={8}
                    nestedScrollEnabled={true}
                  >
                    {/* Same form fields as add modal */}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Event Title*</Text>
                      <View style={styles.formInputContainer}>
                        <LinearGradient
                          colors={[`${theme.primary}15`, `${theme.accent1}10`]}
                          style={styles.formInputGradient}
                        >
                          <TextInput
                            style={styles.formInput}
                            value={formTitle}
                            onChangeText={setFormTitle}
                            placeholder="Enter event title"
                            placeholderTextColor={theme.textLight}
                          />
                        </LinearGradient>
                      </View>
                    </View>
                    
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Description*</Text>
                      <View style={styles.formInputContainer}>
                        <LinearGradient
                          colors={[`${theme.primary}15`, `${theme.accent1}10`]}
                          style={styles.formInputGradient}
                        >
                          <TextInput
                            style={[styles.formInput, styles.textAreaInput]}
                            value={formExcerpt}
                            onChangeText={setFormExcerpt}
                            placeholder="Event description"
                            placeholderTextColor={theme.textLight}
                            multiline
                            numberOfLines={4}
                          />
                        </LinearGradient>
                      </View>
                    </View>
                    
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Date & Time*</Text>
                      <TouchableOpacity
                        style={styles.dateTimeButton}
                        onPress={() => setShowTimePicker(true)}
                      >
                        <LinearGradient
                          colors={[`${theme.info}15`, `${theme.tertiary}10`]}
                          style={styles.dateTimeGradient}
                        >
                          <Feather name="calendar" size={18} color={theme.info} />
                          <Text style={styles.dateTimeText}>{formTime.toLocaleString()}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Location</Text>
                      <View style={styles.formInputContainer}>
                        <LinearGradient
                          colors={[`${theme.secondary}15`, `${theme.accent3}10`]}
                          style={styles.formInputGradient}
                        >
                          <TextInput
                            style={styles.formInput}
                            value={formAuthorName}
                            onChangeText={setFormAuthorName}
                            placeholder="Event location"
                            placeholderTextColor={theme.textLight}
                          />
                        </LinearGradient>
                      </View>
                    </View>
                    
                    {/* Links Section - Same as add modal */}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Event Links</Text>
                      <Text style={styles.formSubtitle}>
                        Add links like Zoom meeting, registration, or additional info
                      </Text>
                      
                      {/* Add New Link */}
                      <View style={styles.addLinkContainer}>
                        <View style={styles.linkInputRow}>
                          <View style={[styles.formInputContainer, { flex: 1, marginRight: theme.spacingM }]}>
                            <LinearGradient
                              colors={[`${theme.info}15`, `${theme.tertiary}10`]}
                              style={styles.formInputGradient}
                            >
                              <TextInput
                                style={styles.formInput}
                                value={newLinkTitle}
                                onChangeText={setNewLinkTitle}
                                placeholder="Link title (e.g., Zoom Meeting)"
                                placeholderTextColor={theme.textLight}
                              />
                            </LinearGradient>
                          </View>
                        </View>
                        
                        <View style={styles.linkInputRow}>
                          <View style={[styles.formInputContainer, { flex: 1, marginRight: theme.spacingM }]}>
                            <LinearGradient
                              colors={[`${theme.info}15`, `${theme.tertiary}10`]}
                              style={styles.formInputGradient}
                            >
                              <TextInput
                                style={styles.formInput}
                                value={newLinkUrl}
                                onChangeText={setNewLinkUrl}
                                placeholder="URL (e.g., zoom.us/j/123456789)"
                                placeholderTextColor={theme.textLight}
                                autoCapitalize="none"
                                autoCorrect={false}
                              />
                            </LinearGradient>
                          </View>
                          
                          <TouchableOpacity
                            style={styles.addLinkButton}
                            onPress={addLink}
                            activeOpacity={0.8}
                          >
                            <LinearGradient
                              colors={theme.gradientPrimary}
                              style={styles.addLinkButtonGradient}
                            >
                              <Feather name="plus" size={16} color={theme.textWhite} />
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      {/* Display Added Links */}
                      {formLinks.length > 0 && (
                        <View style={styles.existingLinksContainer}>
                          {formLinks.map((link, index) => (
                            <View key={index} style={styles.linkPreviewCard}>
                              <LinearGradient
                                colors={[theme.neutral700, theme.neutral600]}
                                style={styles.linkPreviewGradient}
                              >
                                <View style={styles.linkPreviewContent}>
                                  <Feather name="external-link" size={14} color={theme.accent1} />
                                  <View style={styles.linkPreviewText}>
                                    <Text style={styles.linkPreviewTitle}>{link.title}</Text>
                                    <Text style={styles.linkPreviewUrl} numberOfLines={1}>
                                      {link.url}
                                    </Text>
                                  </View>
                                </View>
                                <TouchableOpacity
                                  style={styles.removeLinkButton}
                                  onPress={() => removeLink(index)}
                                >
                                  <LinearGradient
                                    colors={theme.gradientSecondary}
                                    style={styles.removeLinkGradient}
                                  >
                                    <Feather name="trash-2" size={12} color={theme.textWhite} />
                                  </LinearGradient>
                                </TouchableOpacity>
                              </LinearGradient>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                    
                    <TouchableOpacity
                      style={styles.submitButton}
                      onPress={handleEditEvent}
                      activeOpacity={0.9}
                    >
                      <LinearGradient
                        colors={theme.gradientInfo}
                        style={styles.submitButtonGradient}
                      >
                        <Text style={styles.submitButtonText}>UPDATE EVENT</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </ScrollView>
                </LinearGradient>
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
              <LinearGradient
                colors={[`${theme.neutral900}E6`, `${theme.neutral800}CC`]}
                style={StyleSheet.absoluteFill}
              />
              <TouchableOpacity
                style={styles.imageViewerCloseButton}
                onPress={() => setShowImageModal(false)}
              >
                <LinearGradient
                  colors={theme.gradientNeutral}
                  style={styles.imageViewerCloseGradient}
                >
                  <AntDesign name="close" size={20} color={theme.textWhite} />
                </LinearGradient>
              </TouchableOpacity>
              <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
            </View>
          </Modal>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing4XL,
  },
  // Enhanced Header
  header: {
    marginHorizontal: theme.spacingL,
    marginBottom: theme.spacingL,
  },
  headerGradient: {
    borderRadius: theme.radiusLarge,
    padding: theme.spacingL,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...theme.shadowMedium,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radiusMedium,
    justifyContent: "center",
    alignItems: "center",
    ...theme.shadowLight,
  },
  // Enhanced Hero Section
  heroSection: {
    marginHorizontal: theme.spacingL,
    marginBottom: theme.spacingL,
  },
  heroGradient: {
    borderRadius: theme.radiusXL,
    padding: theme.spacingXL,
    alignItems: "center",
    ...theme.shadowMedium,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: theme.radiusFull,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacingL,
    ...theme.shadowMedium,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    textAlign: "center",
    marginBottom: theme.spacingM,
  },
  heroSubtitle: {
    fontSize: 14,
    color: theme.textMedium,
    textAlign: "center",
    marginBottom: theme.spacingXL,
    maxWidth: 300,
    lineHeight: 20,
  },
  addEventButton: {
    borderRadius: theme.radiusFull,
    overflow: 'hidden',
    ...theme.shadowMedium,
  },
  addEventButtonGradient: {
    flexDirection: "row",
    paddingVertical: theme.spacingL,
    paddingHorizontal: theme.spacingXL,
    alignItems: "center",
    justifyContent: "center",
  },
  addEventButtonText: {
    fontSize: 16,
    color: theme.textWhite,
    fontWeight: theme.fontBold,
    marginRight: theme.spacingM,
    letterSpacing: 0.5,
  },
  restrictedContainer: {
    borderRadius: theme.radiusFull,
    overflow: 'hidden',
    ...theme.shadowLight,
  },
  restrictedGradient: {
    paddingVertical: theme.spacingL,
    paddingHorizontal: theme.spacingXL,
    alignItems: "center",
    justifyContent: "center",
  },
  restrictedText: {
    fontSize: 14,
    color: theme.textMedium,
    fontWeight: theme.fontMedium,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Enhanced View Selector
  viewSelector: {
    marginHorizontal: theme.spacingL,
    marginBottom: theme.spacingL,
  },
  viewSelectorGradient: {
    borderRadius: theme.radiusFull,
    padding: theme.spacingS,
    flexDirection: "row",
    ...theme.shadowLight,
  },
  viewOption: {
    flex: 1,
    borderRadius: theme.radiusFull,
    overflow: 'hidden',
  },
  viewOptionActive: {},
  viewOptionActiveGradient: {
    paddingVertical: theme.spacingM,
    alignItems: "center",
    borderRadius: theme.radiusFull,
  },
  viewOptionText: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: theme.textMedium,
    textAlign: "center",
    paddingVertical: theme.spacingM,
  },
  viewOptionTextActive: {
    color: theme.textWhite,
    fontSize: 16,
    fontWeight: theme.fontBold,
  },
  // Enhanced Month Navigation
  monthNavigation: {
    marginHorizontal: theme.spacingL,
    marginBottom: theme.spacingL,
  },
  monthNavigationGradient: {
    borderRadius: theme.radiusLarge,
    padding: theme.spacingL,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...theme.shadowLight,
  },
  monthNavArrow: {
    borderRadius: theme.radiusMedium,
    overflow: 'hidden',
  },
  navArrowGradient: {
    padding: theme.spacingM,
    borderRadius: theme.radiusMedium,
  },
  monthText: {
    fontSize: 18,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
  },
  // Enhanced Calendar
  calendarContainer: {
    marginHorizontal: theme.spacingL,
    marginBottom: theme.spacingL,
  },
  calendarGradient: {
    borderRadius: theme.radiusXL,
    padding: theme.spacingL,
    ...theme.shadowMedium,
  },
  dayLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacingM,
    paddingHorizontal: theme.spacingS,
  },
  dayLabelContainer: {
    width: 38,
    alignItems: "center",
  },
  dayLabel: {
    fontSize: 14,
    color: theme.textMedium,
    fontWeight: theme.fontBold,
  },
  calendarGrid: {},
  calendarWeek: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacingM,
  },
  calendarDay: {
    width: 38,
    height: 60,
    alignItems: "center",
    paddingTop: theme.spacingS,
    borderRadius: theme.radiusSmall,
  },
  calendarDayOtherMonth: {
    opacity: 0.5,
  },
  dayNumberContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedDayContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    ...theme.shadowLight,
  },
  todayContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    ...theme.shadowLight,
  },
  dayNumber: {
    fontSize: 16,
    color: theme.textWhite,
    fontWeight: theme.fontMedium,
  },
  dayNumberOtherMonth: {
    color: theme.textLight,
  },
  todayNumber: {
    color: theme.textWhite,
    fontWeight: theme.fontBold,
  },
  selectedDayNumber: {
    color: theme.textWhite,
    fontWeight: theme.fontBold,
  },
  eventIndicatorContainer: {
    flexDirection: "row",
    marginTop: theme.spacingXS,
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
    borderRadius: theme.radiusSmall,
    paddingHorizontal: theme.spacingXS,
    paddingVertical: 1,
  },
  multipleEventsText: {
    color: theme.textWhite,
    fontSize: 10,
    fontWeight: theme.fontBold,
  },
  calendarLoading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing3XL,
  },
  loadingText: {
    marginTop: theme.spacingM,
    fontSize: 14,
    color: theme.textMedium,
  },
  // Enhanced List View
  listContainer: {
    paddingHorizontal: theme.spacingL,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing3XL,
  },
  loadingIconContainer: {
    width: 60,
    height: 60,
    borderRadius: theme.radiusFull,
    justifyContent: "center",
    alignItems: "center",
    ...theme.shadowMedium,
  },
  noEventsContainer: {
    marginVertical: theme.spacingL,
  },
  noEventsGradient: {
    borderRadius: theme.radiusXL,
    padding: theme.spacing2XL,
    alignItems: "center",
    ...theme.shadowLight,
  },
  noEventsIconContainer: {
    width: 80,
    height: 80,
    borderRadius: theme.radiusFull,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacingL,
    ...theme.shadowLight,
  },
  noEventsText: {
    fontSize: 18,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginBottom: theme.spacingM,
  },
  noEventsSubtext: {
    fontSize: 14,
    color: theme.textMedium,
    textAlign: "center",
  },
  eventsList: {
    paddingVertical: theme.spacingM,
  },
  // Enhanced Event Cards
  eventCard: {
    borderRadius: theme.radiusXL,
    overflow: "hidden",
    marginVertical: theme.spacingM,
    height: 160, // Fixed height back for consistent layout
    ...theme.shadowMedium,
    elevation: 8,
  },
  eventCardGradient: {
    flexDirection: "row",
    borderRadius: theme.radiusXL,
    padding: theme.spacingL,
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  eventIconContainer: {
    width: 90,
    height: "100%",
    borderRadius: theme.radiusLarge,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacingL,
    ...theme.shadowLight,
  },
  eventImageContainer: {
    width: 90,
    height: "100%",
    borderRadius: theme.radiusLarge,
    overflow: "hidden",
    marginRight: theme.spacingL,
    position: "relative",
  },
  eventImage: {
    width: "100%",
    height: "100%",
    borderRadius: theme.radiusLarge,
  },
  eventIconOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacingS,
    alignItems: "center",
    justifyContent: "center",
    borderBottomLeftRadius: theme.radiusLarge,
    borderBottomRightRadius: theme.radiusLarge,
  },
  eventContent: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginBottom: theme.spacingXS,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  eventTimeLocationContainer: {
    marginBottom: theme.spacingXS,
  },
  eventDateTime: {
    fontSize: 13,
    color: '#E5E7EB',
    marginBottom: 2,
    fontWeight: theme.fontMedium,
  },
  eventLocation: {
    fontSize: 13,
    color: '#D1D5DB',
    fontWeight: theme.fontMedium,
  },
  eventDescription: {
    fontSize: 13,
    color: '#F3F4F6',
    marginBottom: theme.spacingS,
    lineHeight: 16,
    fontWeight: theme.fontRegular,
  },
  eventActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    marginTop: 'auto',
  },
  eventActionButton: {
    marginLeft: theme.spacingM,
    borderRadius: theme.radiusMedium,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacingM,
    paddingVertical: theme.spacingS,
  },
  actionButtonText: {
    fontSize: 12,
    color: theme.textWhite,
    marginLeft: theme.spacingXS,
    fontWeight: theme.fontSemiBold,
  },
  // Enhanced Date Detail Modal
  dateDetailContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.7,
    borderTopLeftRadius: theme.radiusXL,
    borderTopRightRadius: theme.radiusXL,
    paddingBottom: theme.spacingL,
    ...theme.shadowHeavy,
    zIndex: 99,
  },
  dateDetailGradient: {
    flex: 1,
    borderTopLeftRadius: theme.radiusXL,
    borderTopRightRadius: theme.radiusXL,
  },
  dateDetailHandle: {
    width: 40,
    height: 5,
    backgroundColor: theme.neutral500,
    borderRadius: 3,
    alignSelf: "center",
    marginTop: theme.spacingM,
    marginBottom: theme.spacingM,
  },
  dateDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacingL,
    paddingVertical: theme.spacingL,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  dateDetailTitle: {
    fontSize: 18,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
  },
  dateDetailCloseButton: {
    borderRadius: theme.radiusMedium,
    overflow: 'hidden',
  },
  closeButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: theme.radiusMedium,
    justifyContent: "center",
    alignItems: "center",
  },
  dateDetailContent: {
    flex: 1,
    padding: theme.spacingL,
  },
  noEventsForDay: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing3XL,
  },
  noEventsForDayIcon: {
    width: 60,
    height: 60,
    borderRadius: theme.radiusFull,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacingL,
    ...theme.shadowLight,
  },
  noEventsForDayText: {
    fontSize: 16,
    color: theme.textMedium,
    marginBottom: theme.spacingXL,
  },
  addEventForDayButton: {
    borderRadius: theme.radiusFull,
    overflow: 'hidden',
  },
  addEventForDayGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacingM,
    paddingHorizontal: theme.spacingXL,
  },
  addEventForDayText: {
    fontSize: 16,
    color: theme.textWhite,
    fontWeight: theme.fontSemiBold,
    marginRight: theme.spacingM,
  },
  // Enhanced Modal
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
    backgroundColor: theme.overlay,
  },
  modalContent: {
    borderTopLeftRadius: theme.radiusXL,
    borderTopRightRadius: theme.radiusXL,
    paddingBottom: theme.spacingXL,
    maxHeight: height * 0.9,
    ...theme.shadowHeavy,
  },
  modalGradient: {
    borderTopLeftRadius: theme.radiusXL,
    borderTopRightRadius: theme.radiusXL,
    paddingBottom: theme.spacingXL,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: theme.neutral500,
    borderRadius: 3,
    alignSelf: "center",
    marginTop: theme.spacingM,
    marginBottom: theme.spacingM,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacingL,
    paddingVertical: theme.spacingL,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
  },
  modalCloseButton: {
    borderRadius: theme.radiusMedium,
    overflow: 'hidden',
  },
  modalCloseGradient: {
    width: 36,
    height: 36,
    borderRadius: theme.radiusMedium,
    justifyContent: "center",
    alignItems: "center",
  },
  modalForm: {
    padding: theme.spacingL,
    maxHeight: height * 0.75,
  },
  // Enhanced Form Elements
  formGroup: {
    marginBottom: theme.spacingL,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: theme.textWhite,
    marginBottom: theme.spacingM,
  },
  formSubtitle: {
    fontSize: 14,
    color: theme.textMedium,
    marginBottom: theme.spacingM,
    fontStyle: 'italic',
  },
  formInputContainer: {
    borderRadius: theme.radiusLarge,
    overflow: 'hidden',
  },
  formInputGradient: {
    borderRadius: theme.radiusLarge,
    paddingHorizontal: theme.spacingL,
    paddingVertical: theme.spacingL,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  formInput: {
    color: theme.textWhite,
    fontSize: 16,
    padding: 0,
  },
  textAreaInput: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  dateTimeButton: {
    borderRadius: theme.radiusLarge,
    overflow: 'hidden',
  },
  dateTimeGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacingL,
    paddingVertical: theme.spacingL,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  dateTimeText: {
    color: theme.textWhite,
    marginLeft: theme.spacingM,
    fontSize: 16,
  },
  toggleRow: {
    borderRadius: theme.radiusLarge,
    overflow: 'hidden',
  },
  toggleRowGradient: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacingL,
    paddingVertical: theme.spacingL,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: theme.textWhite,
  },
  imagePickerButton: {
    borderRadius: theme.radiusLarge,
    overflow: 'hidden',
    ...theme.shadowLight,
  },
  imagePickerGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacingL,
    paddingVertical: theme.spacingL,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.success,
  },
  imagePickerText: {
    color: theme.success,
    marginLeft: theme.spacingM,
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
  },
  previewImageContainer: {
    borderRadius: theme.radiusLarge,
    overflow: "hidden",
    marginBottom: theme.spacingL,
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: theme.radiusLarge,
  },
  removeImageButton: {
    position: "absolute",
    top: theme.spacingM,
    right: theme.spacingM,
    borderRadius: theme.radiusFull,
    overflow: 'hidden',
  },
  removeImageGradient: {
    width: 32,
    height: 32,
    borderRadius: theme.radiusFull,
    justifyContent: "center",
    alignItems: "center",
  },
  submitButton: {
    borderRadius: theme.radiusLarge,
    overflow: 'hidden',
    marginTop: theme.spacingM,
    marginBottom: theme.spacingL,
    ...theme.shadowMedium,
  },
  submitButtonGradient: {
    paddingVertical: theme.spacingL,
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    letterSpacing: 0.5,
  },
  // Event Links Styles
  eventLinksContainer: {
    marginBottom: theme.spacingS,
  },
  linksScrollContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  eventLinkButton: {
    borderRadius: theme.radiusSmall,
    overflow: 'hidden',
    marginRight: theme.spacingS,
  },
  eventLinkGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacingS,
    paddingVertical: 4,
    borderRadius: theme.radiusSmall,
  },
  eventLinkText: {
    fontSize: 10,
    color: theme.textWhite,
    marginLeft: 4,
    fontWeight: theme.fontSemiBold,
    maxWidth: 60,
  },
  moreLinksBadge: {
    backgroundColor: theme.neutral600,
    borderRadius: theme.radiusSmall,
    paddingHorizontal: theme.spacingS,
    paddingVertical: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  moreLinksText: {
    fontSize: 10,
    color: theme.textMedium,
    fontWeight: theme.fontSemiBold,
  },
  // Debug styles - remove once working
  debugLinksContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    padding: 4,
    borderRadius: 4,
    marginBottom: theme.spacingS,
  },
  debugText: {
    fontSize: 10,
    color: '#ff6b6b',
    fontFamily: 'monospace',
  },
  // Links Form Styles
  addLinkContainer: {
    marginBottom: theme.spacingM,
  },
  linkInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacingM,
  },
  addLinkButton: {
    borderRadius: theme.radiusMedium,
    overflow: 'hidden',
    width: 44,
    height: 44,
  },
  addLinkButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: theme.radiusMedium,
    justifyContent: "center",
    alignItems: "center",
  },
  existingLinksContainer: {
    marginTop: theme.spacingM,
  },
  linkPreviewCard: {
    borderRadius: theme.radiusLarge,
    overflow: 'hidden',
    marginBottom: theme.spacingM,
    ...theme.shadowLight,
  },
  linkPreviewGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacingM,
    borderRadius: theme.radiusLarge,
  },
  linkPreviewContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  linkPreviewText: {
    marginLeft: theme.spacingM,
    flex: 1,
  },
  linkPreviewTitle: {
    fontSize: 14,
    fontWeight: theme.fontSemiBold,
    color: theme.textWhite,
    marginBottom: 2,
  },
  linkPreviewUrl: {
    fontSize: 12,
    color: theme.textMedium,
  },
  removeLinkButton: {
    borderRadius: theme.radiusSmall,
    overflow: 'hidden',
    marginLeft: theme.spacingM,
  },
  removeLinkGradient: {
    width: 28,
    height: 28,
    borderRadius: theme.radiusSmall,
    justifyContent: "center",
    alignItems: "center",
  },
  // Image Viewer Modal
  imageViewerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageViewerCloseButton: {
    position: "absolute",
    top: 40,
    right: 20,
    borderRadius: theme.radiusFull,
    overflow: 'hidden',
    zIndex: 999,
  },
  imageViewerCloseGradient: {
    width: 40,
    height: 40,
    borderRadius: theme.radiusFull,
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: width,
    height: height * 0.8,
  },
});