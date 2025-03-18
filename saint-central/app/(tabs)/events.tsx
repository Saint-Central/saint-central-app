// app/Events.tsx
import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../supabaseClient";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

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

// Theme colors
const THEME = {
  primary: "#5B7FFF",
  secondary: "#4361EE",
  accent: "#EEF2FF",
  gradientStart: "#5B7FFF",
  gradientEnd: "#3B5EE8",
  textDark: "#1E293B",
  textMedium: "#475569",
  textLight: "#94A3B8",
  background: "#FFFFFF",
  card: "#FFFFFF",
  border: "#F1F5F9",
  error: "#EF4444",
  success: "#10B981",
};

export default function Events() {
  return <EventsComponent />;
}

function EventsComponent() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;

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
  const [recurrenceType, setRecurrenceType] = useState<"daily" | "weekly" | "monthly" | "yearly">("weekly");
  const [recurrenceInterval, setRecurrenceInterval] = useState("1");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | null>(null);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([1]); // Default to Monday (1)

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
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
      })
    ]).start();
  }, []);

  // Load events
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);

      // Check if user is authenticated
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("time", { ascending: true });

      if (error) {
        // Handle RLS read restrictions if any
        if (error.code === "42501") {
          Alert.alert(
            "Access Restricted",
            "You do not have permission to view events.",
            [{ text: "OK" }]
          );
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

    // Parse time - assuming it's stored as ISO string in the DB
    const eventTime = new Date(event.time);
    setFormTime(eventTime);

    setFormImageUrl(event.image_url || "");
    setFormVideoLink(event.video_link || "");
    setFormAuthorName(event.author_name || "");
    
    // Set recurring event fields if applicable
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

      // Create event object with recurring options if enabled
      const eventData: any = {
        title: formTitle,
        excerpt: formExcerpt,
        time: formTime.toISOString(),
        user_id: user.id,
        image_url: formImageUrl,
        video_link: formVideoLink,
        author_name: formAuthorName || user.email, // Default to user email if no author name
        is_recurring: isRecurring,
      };
      
      // Add recurring event data if applicable
      if (isRecurring) {
        eventData.recurrence_type = recurrenceType;
        eventData.recurrence_interval = parseInt(recurrenceInterval) || 1;
        eventData.recurrence_days_of_week = selectedDays;
        
        if (recurrenceEndDate) {
          eventData.recurrence_end_date = recurrenceEndDate.toISOString();
        }
      }

      // Using RLS bypass with service role if available, otherwise try normal insert
      const { data, error } = await supabase.from("events").insert([eventData]);

      if (error) {
        // If this is an RLS error, show more helpful message
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

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Error", "You must be logged in to edit events");
        return;
      }

      // Create event update object with recurring options if enabled
      const eventData: any = {
        title: formTitle,
        excerpt: formExcerpt,
        time: formTime.toISOString(),
        image_url: formImageUrl,
        video_link: formVideoLink,
        author_name: formAuthorName || user.email, // Default to user email if no author name
        is_recurring: isRecurring,
      };
      
      // Add recurring event data if applicable
      if (isRecurring) {
        eventData.recurrence_type = recurrenceType;
        eventData.recurrence_interval = parseInt(recurrenceInterval) || 1;
        eventData.recurrence_days_of_week = selectedDays;
        
        if (recurrenceEndDate) {
          eventData.recurrence_end_date = recurrenceEndDate.toISOString();
        } else {
          eventData.recurrence_end_date = null; // Clear end date if not set
        }
      } else {
        // Clear recurrence fields if recurring is disabled
        eventData.recurrence_type = null;
        eventData.recurrence_interval = null;
        eventData.recurrence_days_of_week = null;
        eventData.recurrence_end_date = null;
      }

      const { error } = await supabase
        .from("events")
        .update(eventData)
        .eq("id", selectedEvent.id);

      if (error) {
        // If this is an RLS error, show more helpful message
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
      Alert.alert(
        "Confirm Deletion",
        "Are you sure you want to delete this event?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              const { error } = await supabase
                .from("events")
                .delete()
                .eq("id", eventId);

              if (error) {
                // If this is an RLS error, show more helpful message
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
        ]
      );
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
      console.log("Selected image URI:", localUri);

      // Set local URI for immediate preview
      setFormImageUrl(localUri);

      try {
        // Get auth session
        const { data: sessionData } = await supabase.auth.getSession();

        if (!sessionData.session) {
          throw new Error("Not authenticated");
        }

        // Try direct upload using the SDK
        const fileName = `${Date.now()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("event-images")
          .upload(fileName, {
            uri: localUri,
            type: "image/jpeg",
            name: fileName,
          } as any);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw uploadError;
        }

        console.log("Upload successful");

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("event-images")
          .getPublicUrl(fileName);

        console.log("Public URL:", urlData?.publicUrl);

        if (urlData?.publicUrl) {
          setFormImageUrl(urlData.publicUrl);
          Alert.alert("Success", "Image uploaded successfully!");
        }
      } catch (uploadError) {
        console.error("Upload error:", uploadError);
        Alert.alert("Upload Notice", "Using local image only.");
      }
    } catch (error) {
      console.error("Error in image picker:", error);
      Alert.alert("Error", "Failed to select image");
    } finally {
      setFormImageLoading(false);
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateTimeString).toLocaleDateString(undefined, options);
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.backgroundGradient}>
        <LinearGradient
          colors={[THEME.gradientStart, THEME.gradientEnd]}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.gradientOverlay} />
      </View>
      
      <SafeAreaView style={styles.safeArea}>
        {/* Animated Header */}
        <Animated.View
          style={[styles.animatedHeader, { opacity: headerOpacity }]}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <AntDesign name="arrowleft" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Events</Text>
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={openAddModal}
              activeOpacity={0.7}
            >
              <AntDesign name="plus" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Main Content */}
        <Animated.ScrollView
          contentContainerStyle={styles.scrollContent}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
        >
          {/* Hero Section */}
          <Animated.View
            style={[
              styles.heroSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.iconContainer}>
              <AntDesign name="calendar" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>Community Events</Text>
            <Text style={styles.heroSubtitle}>
              Stay connected with upcoming events and activities
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

          {/* Events List */}
          <View style={styles.eventsSection}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionTitleDecoration} />
                <Text style={styles.sectionTitle}>Upcoming Events</Text>
              </View>
            </View>

            {loading ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator
                  size="large"
                  color={THEME.primary}
                  style={styles.loader}
                />
                <Text style={styles.loaderText}>Loading events...</Text>
              </View>
            ) : events.length === 0 ? (
              <View style={styles.emptyState}>
                <AntDesign name="calendar" size={50} color={THEME.textLight} />
                <Text style={styles.emptyStateText}>No events found</Text>
                <Text style={styles.emptyStateSubtext}>
                  Be the first to add an event!
                </Text>
                <TouchableOpacity 
                  style={styles.emptyStateButton}
                  onPress={openAddModal}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyStateButtonText}>Add New Event</Text>
                </TouchableOpacity>
              </View>
            ) : (
              events.map((event) => (
                <Animated.View 
                  key={event.id}
                  style={{
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  }}
                >
                  <View style={styles.eventCard}>
                    {event.image_url ? (
                      <Image
                        source={{ uri: event.image_url }}
                        style={styles.eventImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.placeholderImage}>
                        <AntDesign name="picture" size={40} color="#CCC" />
                      </View>
                    )}

                    <View style={styles.eventContent}>
                      <View style={styles.dateChip}>
                        <AntDesign name="calendar" size={14} color={THEME.primary} />
                        <Text style={styles.dateChipText}>
                          {formatDateTime(event.time)}
                        </Text>
                      </View>
                      
                      <View style={styles.eventHeader}>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                      </View>

                      {event.author_name && (
                        <View style={styles.authorRow}>
                          <AntDesign name="user" size={14} color={THEME.textMedium} />
                          <Text style={styles.eventAuthor}>
                            {event.author_name}
                          </Text>
                        </View>
                      )}

                      <Text style={styles.eventDescription}>{event.excerpt}</Text>

                      <View style={styles.eventActionsRow}>
                        {event.video_link && (
                          <TouchableOpacity
                            style={styles.videoLinkButton}
                            // You could implement a video player here
                          >
                            <AntDesign name="videocamera" size={16} color={THEME.primary} />
                            <Text style={styles.videoLinkText}>Watch Video</Text>
                          </TouchableOpacity>
                        )}
                        
                        <View style={styles.eventActions}>
                          <TouchableOpacity
                            style={styles.eventAction}
                            onPress={() => openEditModal(event)}
                            activeOpacity={0.7}
                          >
                            <AntDesign name="edit" size={18} color={THEME.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.eventAction}
                            onPress={() => handleDeleteEvent(event.id)}
                            activeOpacity={0.7}
                          >
                            <AntDesign name="delete" size={18} color={THEME.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                </Animated.View>
              ))
            )}
          </View>
        </Animated.ScrollView>

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
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Event</Text>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => setShowAddModal(false)}
                  activeOpacity={0.7}
                >
                  <AntDesign name="close" size={22} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm}>
                <Text style={styles.inputLabel}>Title*</Text>
                <TextInput
                  style={styles.textInput}
                  value={formTitle}
                  onChangeText={setFormTitle}
                  placeholder="Event title"
                  placeholderTextColor="#999"
                />

                <Text style={styles.inputLabel}>Description*</Text>
                <TextInput
                  style={[styles.textInput, styles.textAreaInput]}
                  value={formExcerpt}
                  onChangeText={setFormExcerpt}
                  placeholder="Event description"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                />

                <Text style={styles.inputLabel}>Date & Time*</Text>
                <TouchableOpacity
                  style={styles.dateTimeInput}
                  onPress={() => setShowTimePicker(true)}
                >
                  <AntDesign name="calendar" size={18} color={THEME.primary} />
                  <Text style={styles.dateTimeText}>
                    {formTime.toLocaleString()}
                  </Text>
                </TouchableOpacity>

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
                
                {/* Recurring Event Options */}
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Make this a recurring event</Text>
                  <Switch
                    value={isRecurring}
                    onValueChange={setIsRecurring}
                    trackColor={{ false: "#DDDDDD", true: THEME.accent }}
                    thumbColor={isRecurring ? THEME.primary : "#FFFFFF"}
                  />
                </View>
                
                {isRecurring && (
                  <View style={styles.recurringContainer}>
                    <Text style={[styles.inputLabel, { marginBottom: 12 }]}>Recurrence Pattern</Text>
                    
                    {/* Recurrence Type */}
                    <View style={styles.recurrenceTypeContainer}>
                      {["daily", "weekly", "monthly", "yearly"].map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.recurrenceTypeButton,
                            recurrenceType === type && styles.recurrenceTypeButtonSelected
                          ]}
                          onPress={() => setRecurrenceType(type as any)}
                        >
                          <Text 
                            style={[
                              styles.recurrenceTypeText,
                              recurrenceType === type && styles.recurrenceTypeTextSelected
                            ]}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    
                    {/* Interval */}
                    <View style={styles.intervalRow}>
                      <Text style={{ color: THEME.textMedium, fontSize: 16, marginRight: 8 }}>Every</Text>
                      <TextInput
                        style={styles.intervalInput}
                        value={recurrenceInterval}
                        onChangeText={(text) => {
                          // Only allow numbers
                          const filtered = text.replace(/[^0-9]/g, '');
                          setRecurrenceInterval(filtered || "1");
                        }}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                      <Text style={styles.intervalText}>
                        {recurrenceType === "daily" ? "day(s)" :
                         recurrenceType === "weekly" ? "week(s)" :
                         recurrenceType === "monthly" ? "month(s)" : "year(s)"}
                      </Text>
                    </View>
                    
                    {/* Days of Week (for weekly recurrence) */}
                    {recurrenceType === "weekly" && (
                      <>
                        <Text style={[styles.inputLabel, { marginBottom: 12 }]}>On these days</Text>
                        <View style={styles.daysRow}>
                          {[
                            { day: 0, label: "S" },
                            { day: 1, label: "M" },
                            { day: 2, label: "T" },
                            { day: 3, label: "W" },
                            { day: 4, label: "T" },
                            { day: 5, label: "F" },
                            { day: 6, label: "S" }
                          ].map(item => (
                            <TouchableOpacity
                              key={item.day}
                              style={[
                                styles.dayButton,
                                selectedDays.includes(item.day) && styles.dayButtonSelected
                              ]}
                              onPress={() => {
                                if (selectedDays.includes(item.day)) {
                                  // Don't allow removing the last day
                                  if (selectedDays.length > 1) {
                                    setSelectedDays(selectedDays.filter(d => d !== item.day));
                                  }
                                } else {
                                  setSelectedDays([...selectedDays, item.day]);
                                }
                              }}
                            >
                              <Text 
                                style={[
                                  styles.dayText,
                                  selectedDays.includes(item.day) && styles.dayTextSelected
                                ]}>
                                {item.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    )}
                    
                    {/* End Date */}
                    <Text style={[styles.inputLabel, { marginBottom: 12 }]}>End Date (Optional)</Text>
                    <View style={styles.endDateRow}>
                      <TouchableOpacity
                        style={styles.endDateButton}
                        onPress={() => setShowEndDatePicker(true)}
                      >
                        <AntDesign name="calendar" size={16} color={THEME.primary} />
                        <Text style={styles.endDateText}>
                          {recurrenceEndDate ? recurrenceEndDate.toLocaleDateString() : "No end date"}
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

                <Text style={styles.inputLabel}>Author Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={formAuthorName}
                  onChangeText={setFormAuthorName}
                  placeholder="Author name (optional)"
                  placeholderTextColor="#999"
                />

                <Text style={styles.inputLabel}>Video Link</Text>
                <TextInput
                  style={styles.textInput}
                  value={formVideoLink}
                  onChangeText={setFormVideoLink}
                  placeholder="Video link (optional)"
                  placeholderTextColor="#999"
                />

                <Text style={styles.inputLabel}>Event Image</Text>
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={pickImage}
                  disabled={formImageLoading}
                  activeOpacity={0.8}
                >
                  {formImageLoading ? (
                    <ActivityIndicator size="small" color={THEME.primary} />
                  ) : (
                    <>
                      <AntDesign name="picture" size={24} color={THEME.primary} />
                      <Text style={styles.imagePickerText}>
                        {formImageUrl ? "Change Image" : "Select Image"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {formImageUrl ? (
                  <View style={styles.previewImageContainer}>
                    <Image
                      source={{ uri: formImageUrl }}
                      style={styles.previewImage}
                      resizeMode="cover"
                    />
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
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Event</Text>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => setShowEditModal(false)}
                  activeOpacity={0.7}
                >
                  <AntDesign name="close" size={22} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm}>
                <Text style={styles.inputLabel}>Title*</Text>
                <TextInput
                  style={styles.textInput}
                  value={formTitle}
                  onChangeText={setFormTitle}
                  placeholder="Event title"
                  placeholderTextColor="#999"
                />

                <Text style={styles.inputLabel}>Description*</Text>
                <TextInput
                  style={[styles.textInput, styles.textAreaInput]}
                  value={formExcerpt}
                  onChangeText={setFormExcerpt}
                  placeholder="Event description"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                />

                <Text style={styles.inputLabel}>Date & Time*</Text>
                <TouchableOpacity
                  style={styles.dateTimeInput}
                  onPress={() => setShowTimePicker(true)}
                >
                  <AntDesign name="calendar" size={18} color={THEME.primary} />
                  <Text style={styles.dateTimeText}>
                    {formTime.toLocaleString()}
                  </Text>
                </TouchableOpacity>

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
                
                {/* Recurring Event Options */}
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Make this a recurring event</Text>
                  <Switch
                    value={isRecurring}
                    onValueChange={setIsRecurring}
                    trackColor={{ false: "#DDDDDD", true: THEME.accent }}
                    thumbColor={isRecurring ? THEME.primary : "#FFFFFF"}
                  />
                </View>
                
                {isRecurring && (
                  <View style={styles.recurringContainer}>
                    <Text style={[styles.inputLabel, { marginBottom: 12 }]}>Recurrence Pattern</Text>
                    
                    {/* Recurrence Type */}
                    <View style={styles.recurrenceTypeContainer}>
                      {["daily", "weekly", "monthly", "yearly"].map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.recurrenceTypeButton,
                            recurrenceType === type && styles.recurrenceTypeButtonSelected
                          ]}
                          onPress={() => setRecurrenceType(type as any)}
                        >
                          <Text 
                            style={[
                              styles.recurrenceTypeText,
                              recurrenceType === type && styles.recurrenceTypeTextSelected
                            ]}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    
                    {/* Interval */}
                    <View style={styles.intervalRow}>
                      <Text style={{ color: THEME.textMedium, fontSize: 16, marginRight: 8 }}>Every</Text>
                      <TextInput
                        style={styles.intervalInput}
                        value={recurrenceInterval}
                        onChangeText={(text) => {
                          // Only allow numbers
                          const filtered = text.replace(/[^0-9]/g, '');
                          setRecurrenceInterval(filtered || "1");
                        }}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                      <Text style={styles.intervalText}>
                        {recurrenceType === "daily" ? "day(s)" :
                         recurrenceType === "weekly" ? "week(s)" :
                         recurrenceType === "monthly" ? "month(s)" : "year(s)"}
                      </Text>
                    </View>
                    
                    {/* Days of Week (for weekly recurrence) */}
                    {recurrenceType === "weekly" && (
                      <>
                        <Text style={[styles.inputLabel, { marginBottom: 12 }]}>On these days</Text>
                        <View style={styles.daysRow}>
                          {[
                            { day: 0, label: "S" },
                            { day: 1, label: "M" },
                            { day: 2, label: "T" },
                            { day: 3, label: "W" },
                            { day: 4, label: "T" },
                            { day: 5, label: "F" },
                            { day: 6, label: "S" }
                          ].map(item => (
                            <TouchableOpacity
                              key={item.day}
                              style={[
                                styles.dayButton,
                                selectedDays.includes(item.day) && styles.dayButtonSelected
                              ]}
                              onPress={() => {
                                if (selectedDays.includes(item.day)) {
                                  // Don't allow removing the last day
                                  if (selectedDays.length > 1) {
                                    setSelectedDays(selectedDays.filter(d => d !== item.day));
                                  }
                                } else {
                                  setSelectedDays([...selectedDays, item.day]);
                                }
                              }}
                            >
                              <Text 
                                style={[
                                  styles.dayText,
                                  selectedDays.includes(item.day) && styles.dayTextSelected
                                ]}>
                                {item.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    )}
                    
                    {/* End Date */}
                    <Text style={[styles.inputLabel, { marginBottom: 12 }]}>End Date (Optional)</Text>
                    <View style={styles.endDateRow}>
                      <TouchableOpacity
                        style={styles.endDateButton}
                        onPress={() => setShowEndDatePicker(true)}
                      >
                        <AntDesign name="calendar" size={16} color={THEME.primary} />
                        <Text style={styles.endDateText}>
                          {recurrenceEndDate ? recurrenceEndDate.toLocaleDateString() : "No end date"}
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

                <Text style={styles.inputLabel}>Author Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={formAuthorName}
                  onChangeText={setFormAuthorName}
                  placeholder="Author name (optional)"
                  placeholderTextColor="#999"
                />

                <Text style={styles.inputLabel}>Video Link</Text>
                <TextInput
                  style={styles.textInput}
                  value={formVideoLink}
                  onChangeText={setFormVideoLink}
                  placeholder="Video link (optional)"
                  placeholderTextColor="#999"
                />

                <Text style={styles.inputLabel}>Event Image</Text>
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={pickImage}
                  disabled={formImageLoading}
                  activeOpacity={0.8}
                >
                  {formImageLoading ? (
                    <ActivityIndicator size="small" color={THEME.primary} />
                  ) : (
                    <>
                      <AntDesign name="picture" size={24} color={THEME.primary} />
                      <Text style={styles.imagePickerText}>
                        {formImageUrl ? "Change Image" : "Select Image"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {formImageUrl ? (
                  <View style={styles.previewImageContainer}>
                    <Image
                      source={{ uri: formImageUrl }}
                      style={styles.previewImage}
                      resizeMode="cover"
                    />
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
      </SafeAreaView>
    </View>
  );
}

// Add recurring styles to main styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 240,
  },
  gradient: {
    flex: 1,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.07)',
  },
  
  // Recurring event styles
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME.textDark,
  },
  recurringContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  recurrenceTypeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  recurrenceTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#EEEEEE",
    marginRight: 8,
    marginBottom: 8,
  },
  recurrenceTypeButtonSelected: {
    backgroundColor: THEME.primary,
  },
  recurrenceTypeText: {
    fontSize: 14,
    color: THEME.textMedium,
    fontWeight: "500",
  },
  recurrenceTypeTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  intervalRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  intervalInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 60,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    marginRight: 8,
    fontSize: 16,
    color: THEME.textDark,
  },
  intervalText: {
    fontSize: 16,
    color: THEME.textMedium,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EEEEEE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  dayButtonSelected: {
    backgroundColor: THEME.primary,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.textMedium,
  },
  dayTextSelected: {
    color: "#FFFFFF",
  },
  endDateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  endDateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  endDateText: {
    fontSize: 14,
    color: THEME.textMedium,
    marginLeft: 6,
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#FFEEEE",
  },
  clearButtonText: {
    fontSize: 14,
    color: THEME.error,
    fontWeight: "500",
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  animatedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: THEME.primary,
    zIndex: 100,
    paddingTop: Platform.OS === "android" ? 25 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroSection: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 60,
    position: 'relative',
  },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 7,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 17,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 30,
    opacity: 0.95,
    maxWidth: 300,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  decorationDot1: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: 30,
    left: 40,
  },
  decorationDot2: {
    position: 'absolute',
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    bottom: 80,
    right: 60,
  },
  decorationDot3: {
    position: 'absolute',
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: 100,
    right: 40,
  },
  addEventButton: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  addEventButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "700",
    marginRight: 10,
  },
  eventsSection: {
    paddingHorizontal: 20,
    marginTop: -20,
  },
  sectionTitleContainer: {
    marginBottom: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitleDecoration: {
    width: 4,
    height: 24,
    backgroundColor: THEME.primary,
    borderRadius: 2,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: THEME.textDark,
    letterSpacing: 0.2,
    marginLeft: 4,
  },
  loaderContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loader: {
    marginBottom: 16,
  },
  loaderText: {
    fontSize: 16,
    color: THEME.textMedium,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(241, 245, 249, 0.6)",
  },
  emptyStateText: {
    fontSize: 18,
    color: THEME.textDark,
    fontWeight: "600",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: THEME.textLight,
    marginTop: 8,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: THEME.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  eventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(241, 245, 249, 0.6)",
  },
  eventImage: {
    width: "100%",
    height: 180,
  },
  placeholderImage: {
    width: "100%",
    height: 180,
    backgroundColor: "#F8F8F8",
    justifyContent: "center",
    alignItems: "center",
  },
  eventContent: {
    padding: 20,
  },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.accent,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 14,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  dateChipText: {
    color: THEME.primary,
    fontSize: 12,
    marginLeft: 6,
    fontWeight: "600",
  },
  eventHeader: {
    marginBottom: 10,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: THEME.textDark,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  eventAuthor: {
    fontSize: 14,
    color: THEME.textMedium,
    marginLeft: 6,
  },
  eventDescription: {
    fontSize: 16,
    color: THEME.textMedium,
    lineHeight: 24,
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  eventActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 16,
  },
  videoLinkButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  videoLinkText: {
    color: THEME.primary,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  eventActions: {
    flexDirection: "row",
  },
  eventAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 30,
    maxHeight: height * 0.9,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: THEME.textDark,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  modalForm: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME.textDark,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    color: THEME.textDark,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    fontSize: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  textAreaInput: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  dateTimeInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  dateTimeText: {
    color: THEME.textDark,
    marginLeft: 10,
  },
  imagePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: THEME.primary,
    marginBottom: 24,
  },
  imagePickerText: {
    color: THEME.primary,
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "600",
  },
  previewImageContainer: {
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 20,
  },
  previewImage: {
    width: "100%",
    height: 180,
  },
  submitButton: {
    backgroundColor: THEME.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});