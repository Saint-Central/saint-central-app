// app/church_events.tsx
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
  Switch,
  Pressable,
  FlatList,
  Linking,
  RefreshControl,
} from "react-native";
import { BlurView } from "expo-blur";
import {
  AntDesign,
  MaterialCommunityIcons,
  FontAwesome5,
  Feather,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../supabaseClient";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { User } from '@supabase/supabase-js';

const { width, height } = Dimensions.get("window");

// Event Interface
interface ChurchBasic {
  id: number;
  name: string;
}

interface ChurchEvent {
  id: number;
  time: string;
  created_by: string;
  title: string;
  image_url: string | null;
  excerpt: string;
  video_link: string | null;
  author_name: string;
  event_location: string;
  is_recurring: boolean;
  recurrence_type: "daily" | "weekly" | "monthly" | "yearly" | null;
  recurrence_interval: number | null;
  recurrence_end_date: string | null;
  recurrence_days_of_week: number[] | null;
  church_id: number;
  churches?: {
    id: number;
    name: string;
  };
}

interface EventFormData {
  title: string;
  time: string;
  image_url: string | null;
  excerpt: string;
  video_link: string | null;
  author_name: string;
  event_location: string;
  is_recurring: boolean;
  recurrence_type: "daily" | "weekly" | "monthly" | "yearly" | null;
  recurrence_interval: number | null;
  recurrence_end_date: string | null;
  recurrence_days_of_week: number[] | null;
  church_id: number;
}

// Calendar day interface
interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  dayOfWeek: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: ChurchEvent[];
}

// User church role interface
interface UserChurch {
  id: number;
  name: string;
  role: string;
}

// Calendar view types
type CalendarViewType = "month" | "list";

// Modern color theme with spiritual tones
const THEME = {
  primary: "#2D3748",        // Dark slate for text
  secondary: "#4A5568",      // Medium slate for secondary text
  light: "#A0AEC0",          // Light slate for tertiary text
  background: "#F7FAFC",     // Light background
  card: "#FFFFFF",           // White cards
  accent1: "#EBF4FF",        // Light blue accent
  accent2: "#E6FFFA",        // Light teal accent
  accent3: "#FEFCBF",        // Light yellow accent
  accent4: "#FEE2E2",        // Light red accent
  border: "#E2E8F0",         // Light borders
  buttonPrimary: "#6B46C1",  // Purple for primary buttons
  buttonSecondary: "#4C51BF", // Indigo for secondary actions
  buttonText: "#FFFFFF",     // White text on buttons
  error: "#E53E3E",          // Error red
  success: "#38A169",        // Success green
  warning: "#DD6B20",        // Warning orange
  shadow: "rgba(0, 0, 0, 0.1)" // Shadow color
};

// Create animated FlatList component
const AnimatedFlatList = Animated.createAnimatedComponent<any>(
  FlatList as new () => FlatList<ChurchEvent>
);

export default function ChurchEvents() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = 60;
  const heroMaxHeight = 280; // Increased from 220 to make faith community events box larger
  const churchSelectorHeight = 70; // Decreased from 80 to make my churches box smaller
  const viewSelectorHeight = 60;

  // Animated values for collapsible sections
  const heroHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [heroMaxHeight, 0],
    extrapolate: 'clamp',
  });

  const heroOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const churchSelectorOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const churchSelectorHeight2 = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [churchSelectorHeight, 0],
    extrapolate: 'clamp',
  });

  // User state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userChurches, setUserChurches] = useState<UserChurch[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<number | null>(null);
  const [hasPermissionToCreate, setHasPermissionToCreate] = useState(false);

  // Calendar states
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [calendarView, setCalendarView] = useState<CalendarViewType>("list");
  const [showDateDetail, setShowDateDetail] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<ChurchEvent[]>([]);

  // Event states
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filteredEvents, setFilteredEvents] = useState<ChurchEvent[]>([]);

  // Form states
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    time: new Date().toISOString(),
    image_url: null,
    excerpt: '',
    video_link: null,
    author_name: '',
    event_location: '',
    is_recurring: false,
    recurrence_type: null,
    recurrence_interval: null,
    recurrence_end_date: null,
    recurrence_days_of_week: null,
    church_id: 0
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [formImageLoading, setFormImageLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modal states
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const detailSlideAnim = useRef(new Animated.Value(height)).current;
  const dayAnimations = useRef<{[key: string]: Animated.Value}>({}).current;
  
  // Fetch current user on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (data && data.user) {
          setCurrentUser(data.user);
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
    };

    fetchCurrentUser();
  }, []);

  // Fetch user's churches after user is loaded
  useEffect(() => {
    if (currentUser) {
      fetchUserChurches();
    }
  }, [currentUser]);

  // Update filtered events when events or search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredEvents(events);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = events.filter(
        event => 
          event.title.toLowerCase().includes(query) ||
          event.excerpt.toLowerCase().includes(query) ||
          event.author_name?.toLowerCase().includes(query)
      );
      setFilteredEvents(filtered);
    }
  }, [searchQuery, events]);

  // Update calendar when month or events change
  useEffect(() => {
    if (events.length > 0 || !loading) {
      const newCalendarData = generateCalendarData(currentMonth, events);
      setCalendarData(newCalendarData);
    }
  }, [currentMonth, events, loading]);

  // Load events when church selection changes
  useEffect(() => {
    if (selectedChurchId) {
      fetchEvents();
      checkPermissions();
    }
  }, [selectedChurchId]);

  // Animation for calendar and UI elements
  useEffect(() => {
    // Animate calendar days
    const animations = Object.values(dayAnimations).map(anim => 
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
    ]).start();
  }, [calendarData]);

  // Fetch user's churches with role information
  const fetchUserChurches = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // Get churches where the user is a member
      const { data, error } = await supabase
        .from('church_members')
        .select('church_id, role, churches(id, name)')
        .eq('user_id', currentUser.id);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Transform the data into UserChurch format
        const churches: UserChurch[] = data.map(item => ({
          id: item.church_id,
          name: (item.churches as unknown as { id: number; name: string }).name,
          role: item.role
        }));
        
        setUserChurches(churches);
        
        // Select the first church by default if none is selected
        if (!selectedChurchId && churches.length > 0) {
          setSelectedChurchId(churches[0].id);
        }

        // Check permissions after setting churches
        checkPermissions();
      }
    } catch (error) {
      console.error('Error fetching user churches:', error);
      Alert.alert('Error', 'Failed to load church information');
    } finally {
      setLoading(false);
    }
  };

  // Check if user has permission to create/edit events
  const checkPermissions = () => {
    if (!currentUser || !selectedChurchId) {
      setHasPermissionToCreate(false);
      return;
    }
    
    const church = userChurches.find(c => c.id === selectedChurchId);
    const role = church?.role?.toLowerCase() || '';
    
    setHasPermissionToCreate(role === 'admin' || role === 'owner');
  };

  // Effect to check permissions when selected church changes
  useEffect(() => {
    checkPermissions();
  }, [selectedChurchId, userChurches]);

  // Fetch events for selected church
  const fetchEvents = async () => {
    if (!currentUser || !selectedChurchId) {
      setEvents([]);
      setFilteredEvents([]);
      return;
    }
    
    try {
      setLoading(true);
      
      // Fetch events for the selected church
      const { data, error } = await supabase
        .from("church_events")
        .select("*, churches(id, name)")
        .eq("church_id", selectedChurchId)
        .order("time", { ascending: true });
      
      if (error) throw error;
      
      // Process recurrence_days_of_week from int to array
      const processedEvents = (data || []).map(event => {
        let daysOfWeek = null;
        if (event.recurrence_days_of_week !== null) {
          // Convert integer representation to array
          const daysString = event.recurrence_days_of_week.toString();
          daysOfWeek = Array.from(daysString, Number);
        }
        
        return {
          ...event,
          recurrence_days_of_week: daysOfWeek
        };
      });
      
      setEvents(processedEvents);
      setFilteredEvents(processedEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      Alert.alert("Error", "Failed to load church events");
    } finally {
      setLoading(false);
    }
  };

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  }, [selectedChurchId]);

  // Generate calendar data
  const generateCalendarData = (date: Date, eventsData: ChurchEvent[]) => {
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
  };
  
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
  
  // Get events for a specific day
  const getEventsForDay = (date: Date, eventsData: ChurchEvent[]) => {
    return eventsData.filter(event => {
      const eventDate = new Date(event.time);
      return isSameDay(eventDate, date);
    });
  };
  
  // Change calendar month
  const changeMonth = (direction: 1 | -1) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };
  
  // Format month name
  const formatMonth = (date: Date) => {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };
  
  // Get day name
  const getDayName = (day: number, short = false) => {
    const days = short 
      ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] 
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString(undefined, options);
  };
  
  // Format date parts for event display
  const formatEventDay = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('default', { weekday: 'long' });
  };
  
  const formatEventMonth = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('default', { month: 'long' });
  };
  
  const formatEventDate = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.getDate();
  };
  
  const formatEventTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper function to handle null image URLs
  const getImageUrl = (url: string | null): string => {
    return url || 'https://via.placeholder.com/400x200?text=Church+Event';
  };

  // Form Functions
  const resetForm = () => {
    setFormData({
      title: "",
      time: new Date().toISOString(),
      image_url: null,
      excerpt: "",
      video_link: null,
      author_name: "",
      event_location: "",
      is_recurring: false,
      recurrence_type: null,
      recurrence_interval: null,
      recurrence_end_date: null,
      recurrence_days_of_week: null,
      church_id: selectedChurchId || 0,
    });
  };

  const openAddModal = () => {
    if (!currentUser || !selectedChurchId) {
      Alert.alert(
        "Sign In Required", 
        "Please sign in and select a church to create events."
      );
      return;
    }

    if (!hasPermissionToCreate) {
      Alert.alert(
        "Permission Denied", 
        "Only church admins and owners can create events. Contact your church administrator for access."
      );
      return;
    }
    
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (event: ChurchEvent) => {
    if (!currentUser || !selectedChurchId) {
      Alert.alert("Error", "You must be logged in and select a church");
      return;
    }

    // Only allow church admins/owners to edit events
    if (!hasPermissionToCreate) {
      Alert.alert(
        "Permission Denied", 
        "Only church admins and owners can edit events."
      );
      return;
    }

    setSelectedEvent(event);  // Set the selected event first
    setFormData({
      title: event.title,
      time: event.time,
      image_url: event.image_url,
      excerpt: event.excerpt || '',
      video_link: event.video_link,
      author_name: event.author_name || '',
      event_location: event.event_location || '',
      is_recurring: event.is_recurring || false,
      recurrence_type: event.recurrence_type || 'weekly',
      recurrence_interval: event.recurrence_interval || 1,
      recurrence_end_date: event.recurrence_end_date || null,
      recurrence_days_of_week: event.recurrence_days_of_week || [1],
      church_id: event.church_id,
    });
    setShowEditModal(true);
  };

  // Handle form changes
  const handleFormChange = (field: keyof EventFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle date/time picker changes
  const handleDateTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        time: selectedDate.toISOString()
      }));
    }
  };

  // Handle end date picker changes
  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        recurrence_end_date: selectedDate.toISOString()
      }));
    }
  };

  // Toggle recurrence day selection for weekly recurrence
  const toggleRecurrenceDay = (day: number) => {
    const currentDays = formData.recurrence_days_of_week || [];
    
    if (currentDays.includes(day)) {
      // Don't allow removing the last day
      if (currentDays.length > 1) {
        handleFormChange(
          'recurrence_days_of_week',
          currentDays.filter(d => d !== day)
        );
      }
    } else {
      handleFormChange(
        'recurrence_days_of_week', 
        [...currentDays, day]
      );
    }
  };

  // Image picker
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
      
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          throw new Error("Not authenticated");
        }
        
        // Convert image to blob
        const response = await fetch(localUri);
        const blob = await response.blob();
        
        const fileName = `${Date.now()}.jpg`;
        const fileExtension = localUri.split('.').pop();
        
        const { error: uploadError, data } = await supabase.storage
          .from("event-images")
          .upload(`${currentUser?.id}/${fileName}`, blob, {
            contentType: `image/${fileExtension}`
          });
          
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from("event-images")
          .getPublicUrl(`${currentUser?.id}/${fileName}`);
          
        if (urlData?.publicUrl) {
          handleFormChange('image_url', urlData.publicUrl);
          Alert.alert("Success", "Image uploaded successfully!");
        }
      } catch (uploadError) {
        console.error("Error uploading image:", uploadError);
        Alert.alert("Upload Notice", "Using local image only. The image may not be visible to others.");
        handleFormChange('image_url', localUri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image");
    } finally {
      setFormImageLoading(false);
    }
  };

  // Submit event to Supabase
  const handleAddEvent = async () => {
    if (!currentUser || !selectedChurchId) {
      Alert.alert('Error', 'You must be logged in and select a church');
      return;
    }
    
    // Form validation
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Event title is required');
      return;
    }
    
    if (!formData.excerpt.trim()) {
      Alert.alert('Error', 'Event description is required');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Prepare recurrence_days_of_week for DB storage (convert array to number)
      let daysOfWeekNumber = null;
      if (formData.is_recurring && 
          formData.recurrence_type === 'weekly' && 
          formData.recurrence_days_of_week && 
          formData.recurrence_days_of_week.length > 0) {
        daysOfWeekNumber = parseInt(formData.recurrence_days_of_week.join(''), 10);
      }
      
      // Create event in database
      const { error } = await supabase
        .from('church_events')
        .insert({
          title: formData.title,
          time: formData.time,
          created_by: currentUser.id,
          image_url: formData.image_url,
          excerpt: formData.excerpt,
          video_link: formData.video_link,
          author_name: formData.author_name,
          event_location: formData.event_location,
          is_recurring: formData.is_recurring,
          recurrence_type: formData.is_recurring ? formData.recurrence_type : null,
          recurrence_interval: formData.is_recurring ? formData.recurrence_interval : null,
          recurrence_end_date: formData.is_recurring ? formData.recurrence_end_date : null,
          recurrence_days_of_week: daysOfWeekNumber,
          church_id: selectedChurchId
        });
      
      if (error) throw error;
      
      // Success
      setShowAddModal(false);
      resetForm();
      await fetchEvents();
      Alert.alert('Success', 'Event created successfully!');
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update existing event
  const handleEditEvent = async () => {
    if (!currentUser || !selectedEvent) {
      Alert.alert('Error', 'You must be logged in and an event must be selected');
      return;
    }
    
    // Check if user is the creator of the event
    if (selectedEvent.created_by !== currentUser.id && !hasPermissionToCreate) {
      Alert.alert(
        "Permission Denied",
        "You can only edit events that you created or if you are a church admin/owner."
      );
      return;
    }
    
    // Form validation
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Event title is required');
      return;
    }
    
    if (!formData.excerpt.trim()) {
      Alert.alert('Error', 'Event description is required');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Prepare recurrence_days_of_week for DB storage (convert array to number)
      let daysOfWeekNumber = null;
      if (formData.is_recurring && 
          formData.recurrence_type === 'weekly' && 
          formData.recurrence_days_of_week && 
          formData.recurrence_days_of_week.length > 0) {
        daysOfWeekNumber = parseInt(formData.recurrence_days_of_week.join(''), 10);
      }
      
      // Update event in database
      const { error } = await supabase
        .from('church_events')
        .update({
          title: formData.title,
          time: formData.time,
          image_url: formData.image_url,
          excerpt: formData.excerpt,
          video_link: formData.video_link,
          author_name: formData.author_name,
          event_location: formData.event_location,
          is_recurring: formData.is_recurring,
          recurrence_type: formData.is_recurring ? formData.recurrence_type : null,
          recurrence_interval: formData.is_recurring ? formData.recurrence_interval : null,
          recurrence_end_date: formData.is_recurring ? formData.recurrence_end_date : null,
          recurrence_days_of_week: daysOfWeekNumber
        })
        .eq('id', selectedEvent.id);
      
      if (error) throw error;
      
      // Success
      setShowEditModal(false);
      resetForm();
      await fetchEvents();
      Alert.alert('Success', 'Event updated successfully!');
    } catch (error) {
      console.error('Error updating event:', error);
      Alert.alert('Error', 'Failed to update event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete event
  const handleDeleteEvent = async (eventId: number) => {
    if (!currentUser || !selectedChurchId) {
      Alert.alert("Error", "You must be logged in and select a church");
      return;
    }

    const event = events.find(e => e.id === eventId);
    if (!event) {
      Alert.alert("Error", "Event not found");
      return;
    }

    // Only allow church admins/owners to delete events
    if (!hasPermissionToCreate) {
      Alert.alert(
        "Permission Denied", 
        "Only church admins and owners can delete events."
      );
      return;
    }

    try {
      Alert.alert(
        "Confirm Delete",
        "Are you sure you want to delete this event?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              setIsSubmitting(true);
              
              const { error } = await supabase
                .from('church_events')
                .delete()
                .eq('id', eventId);
              
              if (error) throw error;
              
              // Success
              if (showEditModal) setShowEditModal(false);
              if (showDateDetail) closeDateDetail();
              
              await fetchEvents();
              Alert.alert('Success', 'Event deleted successfully!');
              setIsSubmitting(false);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting event:', error);
      Alert.alert('Error', 'Failed to delete event.');
      setIsSubmitting(false);
    }
  };

  // Get event icon and color based on title
  const getEventIconAndColor = (event: ChurchEvent): { icon: string, color: string } => {
    const title = event.title.toLowerCase();
    if (title.includes("bible") || title.includes("study")) {
      return { icon: "book", color: "#4299E1" }; // Blue
    } else if (title.includes("sunday") || title.includes("service") || title.includes("worship")) {
      return { icon: "home", color: "#38B2AC" }; // Teal
    } else if (title.includes("youth") || title.includes("meetup") || title.includes("young")) {
      return { icon: "message-circle", color: "#ECC94B" }; // Yellow
    } else if (title.includes("prayer") || title.includes("breakfast")) {
      return { icon: "coffee", color: "#F56565" }; // Red
    } else if (title.includes("meeting") || title.includes("committee")) {
      return { icon: "users", color: "#9F7AEA" }; // Purple
    } else if (title.includes("music") || title.includes("choir") || title.includes("practice")) {
      return { icon: "music", color: "#ED8936" }; // Orange
    } else if (title.includes("volunteer") || title.includes("serve") || title.includes("outreach")) {
      return { icon: "heart", color: "#ED64A6" }; // Pink
    }
    return { icon: "calendar", color: "#718096" }; // Gray
  };

  // Full image viewer
  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  // Helper function to get YouTube video thumbnail
  const getVideoThumbnail = (url: string | null): string | null => {
    if (!url) return null;
    
    // Extract video ID from various YouTube URL formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    if (match && match[2].length === 11) {
      return `https://img.youtube.com/vi/${match[2]}/mqdefault.jpg`;
    }
    
    return null;
  };

  // Render event card
  const renderEventCard = ({ item }: { item: ChurchEvent }) => {
    const { icon, color } = getEventIconAndColor(item);
    const eventTime = new Date(item.time);
    const isPastEvent = eventTime < new Date();
    const imageUrl = getImageUrl(item.image_url);
    const isCreator = currentUser && item.created_by === currentUser.id;
    const canEdit = hasPermissionToCreate || isCreator;
    
    return (
      <TouchableOpacity
        key={item.id.toString()}
        style={[
          styles.eventCard, 
          { borderLeftColor: color },
          isPastEvent && styles.pastEventCard
        ]}
        onPress={() => selectDay({ 
          date: new Date(item.time), 
          dayOfMonth: 0, 
          dayOfWeek: 0, 
          isCurrentMonth: false, 
          isToday: false, 
          events: [item] 
        })}
      >
        <View style={styles.eventHeader}>
          <View style={[styles.eventIconContainer, { backgroundColor: color }]}>
            <Feather name={icon as any} size={20} color="#fff" />
          </View>
          <View style={styles.eventTitleContainer}>
            <Text style={styles.eventTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.eventTimeLocationContainer}>
              <View style={styles.dateTimeRow}>
                <Feather name="clock" size={14} color={THEME.secondary} style={styles.smallIcon} />
                <Text style={styles.eventDateTime}>
                  {formatEventDay(item.time)}, {formatEventMonth(item.time)} {formatEventDate(item.time)} • {formatEventTime(item.time)}
                </Text>
              </View>
              <View style={styles.locationRow}>
                <Feather name="map-pin" size={14} color={THEME.secondary} style={styles.smallIcon} />
                <Text style={styles.eventLocation} numberOfLines={1} ellipsizeMode="tail">
                  {item.author_name || "Location TBD"}
                </Text>
                {item.churches && (
                  <Text style={styles.churchName}>
                    • {item.churches.name}
                  </Text>
                )}
              </View>
            </View>
          </View>
          
          {item.is_recurring && (
            <View style={styles.recurringBadge}>
              <MaterialIcons name="repeat" size={16} color={THEME.buttonPrimary} />
            </View>
          )}
        </View>
        
        {item.is_recurring && (
          <View style={styles.recurringInfoCard}>
            <View style={styles.recurringInfoHeader}>
              <MaterialIcons name="repeat" size={16} color={THEME.buttonPrimary} />
              <Text style={styles.recurringInfoTitle}>Recurring Event</Text>
            </View>
            <Text style={styles.recurringInfoText}>
              {item.recurrence_type === "daily" && `Repeats daily`}
              {item.recurrence_type === "weekly" && `Repeats weekly on ${item.recurrence_days_of_week?.map(day => getDayName(day)).join(", ")}`}
              {item.recurrence_type === "monthly" && `Repeats monthly`}
              {item.recurrence_type === "yearly" && `Repeats yearly`}
              {item.recurrence_interval && item.recurrence_interval > 1 && ` every ${item.recurrence_interval} ${item.recurrence_type}s`}
              {item.recurrence_end_date && ` until ${new Date(item.recurrence_end_date).toLocaleDateString()}`}
            </Text>
          </View>
        )}
        
        {item.image_url && (
          <TouchableOpacity
            style={styles.eventImageContainer}
            onPress={() => item.image_url && openImageViewer(item.image_url)}
          >
            <Image
              source={{ uri: item.image_url }}
              style={styles.eventImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
        
        <Text style={styles.eventExcerpt} numberOfLines={3}>
          {item.excerpt}
        </Text>
        
        {item.video_link && (
          <TouchableOpacity
            style={styles.videoLinkButton}
            onPress={() => item.video_link && Linking.openURL(item.video_link)}
          >
            <Feather name="youtube" size={20} color={THEME.primary} />
            <Text style={styles.videoLinkText}>Watch Video</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.eventActionRow}>
          {canEdit && (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, styles.editActionButton]}
                onPress={() => openEditModal(item)}
              >
                <Feather name="edit-2" size={16} color={THEME.buttonPrimary} />
                <Text style={[styles.actionButtonText, styles.editActionText]}>Edit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteActionButton]}
                onPress={() => handleDeleteEvent(item.id)}
              >
                <Feather name="trash-2" size={16} color={THEME.error} />
                <Text style={[styles.actionButtonText, styles.deleteActionText]}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.shareActionButton]}
            onPress={() => {
              const message = `${item.title}\n${formatEventDay(item.time)}, ${formatEventMonth(item.time)} ${formatEventDate(item.time)} at ${formatEventTime(item.time)}\nLocation: ${item.author_name || "TBD"}\n\n${item.excerpt}`;
              Linking.openURL(`mailto:?subject=${encodeURIComponent(item.title)}&body=${encodeURIComponent(message)}`);
            }}
          >
            <Feather name="share-2" size={16} color={THEME.secondary} />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Render calendar day
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
          <View style={[
            styles.dayNumberContainer, 
            day.isToday && styles.todayContainer,
            isSelected && styles.selectedDayNumberContainer
          ]}>
            <Text style={[
              styles.dayNumber, 
              !day.isCurrentMonth && styles.dayNumberOtherMonth,
              day.isToday && styles.todayNumber,
              isSelected && styles.selectedDayNumber
            ]}>
              {day.dayOfMonth}
            </Text>
          </View>
          {day.events.length > 0 && (
            <View style={styles.eventIndicatorContainer}>
              {day.events.length <= 3 ? (
                day.events.map((event, i) => {
                  const { color } = getEventIconAndColor(event);
                  return (
                    <View 
                      key={i} 
                      style={[
                        styles.eventIndicator,
                        { backgroundColor: color }
                      ]} 
                    />
                  );
                })
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

  // Render calendar weeks
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

  // Render search bar
  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <Feather name="search" size={18} color={THEME.secondary} style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search events..."
        placeholderTextColor={THEME.light}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity
          style={styles.clearSearchButton}
          onPress={() => setSearchQuery("")}
        >
          <Feather name="x" size={18} color={THEME.secondary} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="dark" />
      
      {/* Fixed Header */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Church Events</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Feather name={showSearch ? "x" : "search"} size={22} color={THEME.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={onRefresh}
            >
              <Feather name="refresh-cw" size={22} color={THEME.primary} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Search Bar (conditionally shown) */}
        {showSearch && renderSearchBar()}
      </SafeAreaView>
      
      {/* Main Scrollable Content */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        decelerationRate="normal"
        showsVerticalScrollIndicator={false}
      >
        {/* Collapsible Hero Section */}
        <Animated.View
          style={[
            styles.heroSection,
            { 
              transform: [{ scaleY: scrollY.interpolate({
                inputRange: [0, 100],
                outputRange: [1, 0],
                extrapolate: 'clamp'
              })}],
              opacity: scrollY.interpolate({
                inputRange: [0, 80],
                outputRange: [1, 0],
                extrapolate: 'clamp'
              }),
              height: heroMaxHeight,
              overflow: 'hidden'
            },
          ]}
        >
          <LinearGradient
            colors={['#6B46C1', '#4C51BF']}
            style={styles.heroBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="church" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>Faith Community Events</Text>
            <Text style={styles.heroSubtitle}>
              Join us for worship services, prayer gatherings, Bible studies, and more
            </Text>
            <TouchableOpacity
              style={styles.addEventButton}
              onPress={openAddModal}
              activeOpacity={0.8}
            >
              <Text style={styles.addEventButtonText}>CREATE EVENT</Text>
              <AntDesign name="plus" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* Collapsible Church Selector */}
        {userChurches.length > 0 && (
          <Animated.View style={[
            styles.churchSelectorContainer,
            { 
              opacity: scrollY.interpolate({
                inputRange: [0, 60],
                outputRange: [1, 0],
                extrapolate: 'clamp'
              }),
              transform: [{ scaleY: scrollY.interpolate({
                inputRange: [0, 80],
                outputRange: [1, 0],
                extrapolate: 'clamp'
              })}],
              height: churchSelectorHeight,
              overflow: 'hidden'
            }
          ]}>
            <Text style={styles.selectorLabel}>My Churches:</Text>
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.churchSelector}
            >
              {userChurches.map(church => (
                <TouchableOpacity
                  key={church.id}
                  style={[
                    styles.churchOption,
                    selectedChurchId === church.id && styles.churchOptionActive
                  ]}
                  onPress={() => setSelectedChurchId(church.id)}
                >
                  <Text style={[
                    styles.churchOptionText,
                    selectedChurchId === church.id && styles.churchOptionTextActive
                  ]}>
                    {church.name}
                    {church.role === 'admin' || church.role === 'owner' ? 
                      ` (${church.role})` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* View Selector (always visible) */}
        <View style={styles.viewSelector}>
          <TouchableOpacity 
            style={[
              styles.viewOption,
              calendarView === "list" && styles.viewOptionActive,
            ]}
            onPress={() => setCalendarView("list")}
          >
            <Feather name="list" size={18} color={calendarView === "list" ? THEME.buttonText : THEME.secondary} />
            <Text style={[
              styles.viewOptionText,
              calendarView === "list" && styles.viewOptionTextActive,
            ]}>List</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.viewOption,
              calendarView === "month" && styles.viewOptionActive,
            ]}
            onPress={() => setCalendarView("month")}
          >
            <Feather name="calendar" size={18} color={calendarView === "month" ? THEME.buttonText : THEME.secondary} />
            <Text style={[
              styles.viewOptionText,
              calendarView === "month" && styles.viewOptionTextActive,
            ]}>Calendar</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content Area */}
        <View style={styles.mainContainer}>
          {/* Month Navigation (for calendar view) */}
          {calendarView === "month" && (
            <View style={styles.monthNavigation}>
              <TouchableOpacity 
                style={styles.monthNavArrow}
                onPress={() => changeMonth(-1)}
              >
                <Feather name="chevron-left" size={24} color={THEME.secondary} />
              </TouchableOpacity>
              <Text style={styles.monthText}>{formatMonth(currentMonth)}</Text>
              <TouchableOpacity 
                style={styles.monthNavArrow}
                onPress={() => changeMonth(1)}
              >
                <Feather name="chevron-right" size={24} color={THEME.secondary} />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Calendar View */}
          {calendarView === "month" ? (
            <View style={styles.calendarContainer}>
              <View style={styles.dayLabelsRow}>
                {[0, 1, 2, 3, 4, 5, 6].map(day => (
                  <View key={day} style={styles.dayLabelContainer}>
                    <Text style={styles.dayLabel}>{getDayName(day, true)}</Text>
                  </View>
                ))}
              </View>
              {loading ? (
                <View style={styles.calendarLoading}>
                  <ActivityIndicator size="large" color={THEME.buttonPrimary} />
                  <Text style={styles.loadingText}>Loading calendar...</Text>
                </View>
              ) : (
                <View style={styles.calendarGrid}>
                  {renderCalendarWeeks()}
                </View>
              )}
            </View>
          ) : (
            // List View
            <View style={styles.listContainer}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={THEME.buttonPrimary} />
                  <Text style={styles.loadingText}>Loading church events...</Text>
                </View>
              ) : filteredEvents.length === 0 ? (
                <View style={styles.noEventsContainer}>
                  <Feather name="calendar" size={50} color={THEME.light} />
                  <Text style={styles.noEventsText}>No church events found</Text>
                  <Text style={styles.noEventsSubtext}>
                    {searchQuery ? "Try a different search term" : 
                     hasPermissionToCreate ? "Add your first church event by tapping the button above" :
                     "There are no upcoming events for this church"}
                  </Text>
                </View>
              ) : (
                // Render events list directly here instead of using AnimatedFlatlist
                <View>
                  {filteredEvents.map(item => renderEventCard({ item }))}
                </View>
              )}
            </View>
          )}
          
          {/* Add some bottom padding for better scrolling experience */}
          <View style={{ height: 100 }} />
        </View>
      </Animated.ScrollView>
      
      {/* Date Detail Modal */}
      {showDateDetail && (
        <Animated.View 
          style={[
            styles.dateDetailContainer,
            { transform: [{ translateY: detailSlideAnim }] }
          ]}
        >
          <View style={styles.dateDetailHandle} />
          <View style={styles.dateDetailHeader}>
            <Text style={styles.dateDetailTitle}>{formatDate(selectedDate)}</Text>
            <TouchableOpacity 
              style={styles.dateDetailCloseButton}
              onPress={closeDateDetail}
            >
              <AntDesign name="close" size={24} color={THEME.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.dateDetailContent}>
            {selectedDayEvents.length === 0 ? (
              <View style={styles.noEventsForDay}>
                <Feather name="calendar" size={50} color={THEME.light} />
                <Text style={styles.noEventsForDayText}>No church events for this day</Text>
                {hasPermissionToCreate && (
                  <TouchableOpacity
                    style={styles.addEventForDayButton}
                    onPress={() => {
                      // Set form date to the selected date
                      const newDate = new Date(selectedDate);
                      handleFormChange('time', newDate.toISOString());
                      closeDateDetail();
                      setTimeout(() => openAddModal(), 300);
                    }}
                  >
                    <Text style={styles.addEventForDayText}>Add Event</Text>
                    <Feather name="plus" size={16} color={THEME.buttonPrimary} />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <FlatList
                data={selectedDayEvents}
                renderItem={renderEventCard}
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
          <Pressable 
            style={styles.modalBackdrop}
            onPress={() => setShowAddModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Church Event</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowAddModal(false)}
              >
                <AntDesign name="close" size={22} color={THEME.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalForm}>
              {/* Form fields */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Event Title*</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.title}
                  onChangeText={(value) => handleFormChange('title', value)}
                  placeholder="Enter event title"
                  placeholderTextColor={THEME.light}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description*</Text>
                <TextInput
                  style={[styles.formInput, styles.textAreaInput]}
                  value={formData.excerpt}
                  onChangeText={(value) => handleFormChange('excerpt', value)}
                  placeholder="Event description"
                  placeholderTextColor={THEME.light}
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
                  <Feather name="calendar" size={18} color={THEME.buttonPrimary} />
                  <Text style={styles.dateTimeText}>
                    {new Date(formData.time).toLocaleString()}
                  </Text>
                </TouchableOpacity>
              </View>
              {showTimePicker && (
                <DateTimePicker
                  value={new Date(formData.time)}
                  mode="datetime"
                  display="default"
                  onChange={handleDateTimeChange}
                />
              )}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Location</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.author_name || ''}
                  onChangeText={(value) => handleFormChange('author_name', value)}
                  placeholder="Event location"
                  placeholderTextColor={THEME.light}
                />
              </View>
              <View style={styles.formGroup}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Recurring event</Text>
                  <Switch
                    value={formData.is_recurring}
                    onValueChange={(value) => {
                      handleFormChange('is_recurring', value);
                      if (value && !formData.recurrence_type) {
                        handleFormChange('recurrence_type', 'weekly');
                      }
                      if (value && !formData.recurrence_interval) {
                        handleFormChange('recurrence_interval', 1);
                      }
                      if (value && !formData.recurrence_days_of_week) {
                        // Default to the day of the week from the selected date
                        const dayOfWeek = new Date(formData.time).getDay();
                        handleFormChange('recurrence_days_of_week', [dayOfWeek]);
                      }
                    }}
                    trackColor={{ false: "#E4E4E7", true: "#D1D5F9" }}
                    thumbColor={formData.is_recurring ? THEME.buttonPrimary : "#FFFFFF"}
                    ios_backgroundColor="#E4E4E7"
                  />
                </View>
              </View>
              {formData.is_recurring && (
                <View style={styles.recurringContainer}>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Repeat</Text>
                    <View style={styles.recurrenceTypeContainer}>
                      {["daily", "weekly", "monthly", "yearly"].map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.recurrenceTypeButton,
                            formData.recurrence_type === type && styles.recurrenceTypeButtonSelected
                          ]}
                          onPress={() => handleFormChange('recurrence_type', type)}
                        >
                          <Text 
                            style={[
                              styles.recurrenceTypeText,
                              formData.recurrence_type === type && styles.recurrenceTypeTextSelected
                            ]}>
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
                        value={formData.recurrence_interval?.toString() || '1'}
                        onChangeText={(text) => {
                          const filtered = text.replace(/[^0-9]/g, '');
                          const value = filtered ? parseInt(filtered, 10) : 1;
                          handleFormChange('recurrence_interval', value);
                        }}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                      <Text style={styles.intervalText}>
                        {formData.recurrence_type === "daily" ? "day(s)" :
                         formData.recurrence_type === "weekly" ? "week(s)" :
                         formData.recurrence_type === "monthly" ? "month(s)" : "year(s)"}
                      </Text>
                    </View>
                  </View>
                  {formData.recurrence_type === "weekly" && (
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
                          { day: 6, label: "S" }
                        ].map(item => (
                          <TouchableOpacity
                            key={item.day}
                            style={[
                              styles.dayButton,
                              formData.recurrence_days_of_week?.includes(item.day) && styles.dayButtonSelected
                            ]}
                            onPress={() => toggleRecurrenceDay(item.day)}
                          >
                            <Text 
                              style={[
                                styles.dayText,
                                formData.recurrence_days_of_week?.includes(item.day) && styles.dayTextSelected
                              ]}>
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
                      <Feather name="calendar" size={16} color={THEME.buttonPrimary} />
                      <Text style={styles.dateTimeText}>
                        {formData.recurrence_end_date ? 
                          new Date(formData.recurrence_end_date).toLocaleDateString() : 
                          "No end date"}
                      </Text>
                    </TouchableOpacity>
                    {formData.recurrence_end_date && (
                      <TouchableOpacity
                        style={styles.clearButton}
                        onPress={() => handleFormChange('recurrence_end_date', null)}
                      >
                        <Text style={styles.clearButtonText}>Clear</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {showEndDatePicker && (
                    <DateTimePicker
                      value={formData.recurrence_end_date ? 
                        new Date(formData.recurrence_end_date) : new Date()}
                      mode="date"
                      display="default"
                      onChange={handleEndDateChange}
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
                >
                  {formImageLoading ? (
                    <ActivityIndicator size="small" color={THEME.buttonPrimary} />
                  ) : (
                    <>
                      <Feather name="image" size={22} color={THEME.buttonPrimary} />
                      <Text style={styles.imagePickerText}>
                        {formData.image_url ? "Change Image" : "Select Image"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              {formData.image_url && (
                <View style={styles.previewImageContainer}>
                  <Image
                    source={{ uri: formData.image_url }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => handleFormChange('image_url', null)}
                  >
                    <AntDesign name="closecircle" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Video Link (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.video_link || ''}
                  onChangeText={(value) => handleFormChange('video_link', value)}
                  placeholder="Add YouTube or video URL"
                  placeholderTextColor={THEME.light}
                  keyboardType="url"
                />
              </View>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleAddEvent}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={THEME.buttonText} />
                ) : (
                  <Text style={styles.submitButtonText}>CREATE EVENT</Text>
                )}
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
          <Pressable 
            style={styles.modalBackdrop}
            onPress={() => setShowEditModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Church Event</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowEditModal(false)}
              >
                <AntDesign name="close" size={22} color={THEME.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalForm}>
              {/* Form fields - same as Add Event form but with submit button for edit */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Event Title*</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.title}
                  onChangeText={(value) => handleFormChange('title', value)}
                  placeholder="Enter event title"
                  placeholderTextColor={THEME.light}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description*</Text>
                <TextInput
                  style={[styles.formInput, styles.textAreaInput]}
                  value={formData.excerpt}
                  onChangeText={(value) => handleFormChange('excerpt', value)}
                  placeholder="Event description"
                  placeholderTextColor={THEME.light}
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
                  <Feather name="calendar" size={18} color={THEME.buttonPrimary} />
                  <Text style={styles.dateTimeText}>
                    {new Date(formData.time).toLocaleString()}
                  </Text>
                </TouchableOpacity>
              </View>
              {showTimePicker && (
                <DateTimePicker
                  value={new Date(formData.time)}
                  mode="datetime"
                  display="default"
                  onChange={handleDateTimeChange}
                />
              )}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Location</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.author_name || ''}
                  onChangeText={(value) => handleFormChange('author_name', value)}
                  placeholder="Event location"
                  placeholderTextColor={THEME.light}
                />
              </View>
              <View style={styles.formGroup}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Recurring event</Text>
                  <Switch
                    value={formData.is_recurring}
                    onValueChange={(value) => {
                      handleFormChange('is_recurring', value);
                      if (value && !formData.recurrence_type) {
                        handleFormChange('recurrence_type', 'weekly');
                      }
                      if (value && !formData.recurrence_interval) {
                        handleFormChange('recurrence_interval', 1);
                      }
                      if (value && !formData.recurrence_days_of_week) {
                        // Default to the day of the week from the selected date
                        const dayOfWeek = new Date(formData.time).getDay();
                        handleFormChange('recurrence_days_of_week', [dayOfWeek]);
                      }
                    }}
                    trackColor={{ false: "#E4E4E7", true: "#D1D5F9" }}
                    thumbColor={formData.is_recurring ? THEME.buttonPrimary : "#FFFFFF"}
                    ios_backgroundColor="#E4E4E7"
                  />
                </View>
              </View>
              {formData.is_recurring && (
                <View style={styles.recurringContainer}>
                  {/* Same recurring options as in Add Event */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Repeat</Text>
                    <View style={styles.recurrenceTypeContainer}>
                      {["daily", "weekly", "monthly", "yearly"].map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.recurrenceTypeButton,
                            formData.recurrence_type === type && styles.recurrenceTypeButtonSelected
                          ]}
                          onPress={() => handleFormChange('recurrence_type', type)}
                        >
                          <Text 
                            style={[
                              styles.recurrenceTypeText,
                              formData.recurrence_type === type && styles.recurrenceTypeTextSelected
                            ]}>
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
                        value={formData.recurrence_interval?.toString() || '1'}
                        onChangeText={(text) => {
                          const filtered = text.replace(/[^0-9]/g, '');
                          const value = filtered ? parseInt(filtered, 10) : 1;
                          handleFormChange('recurrence_interval', value);
                        }}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                      <Text style={styles.intervalText}>
                        {formData.recurrence_type === "daily" ? "day(s)" :
                         formData.recurrence_type === "weekly" ? "week(s)" :
                         formData.recurrence_type === "monthly" ? "month(s)" : "year(s)"}
                      </Text>
                    </View>
                  </View>
                  {formData.recurrence_type === "weekly" && (
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
                          { day: 6, label: "S" }
                        ].map(item => (
                          <TouchableOpacity
                            key={item.day}
                            style={[
                              styles.dayButton,
                              formData.recurrence_days_of_week?.includes(item.day) && styles.dayButtonSelected
                            ]}
                            onPress={() => toggleRecurrenceDay(item.day)}
                          >
                            <Text 
                              style={[
                                styles.dayText,
                                formData.recurrence_days_of_week?.includes(item.day) && styles.dayTextSelected
                              ]}>
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
                      <Feather name="calendar" size={16} color={THEME.buttonPrimary} />
                      <Text style={styles.dateTimeText}>
                        {formData.recurrence_end_date ? 
                          new Date(formData.recurrence_end_date).toLocaleDateString() : 
                          "No end date"}
                      </Text>
                    </TouchableOpacity>
                    {formData.recurrence_end_date && (
                      <TouchableOpacity
                        style={styles.clearButton}
                        onPress={() => handleFormChange('recurrence_end_date', null)}
                      >
                        <Text style={styles.clearButtonText}>Clear</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {showEndDatePicker && (
                    <DateTimePicker
                      value={formData.recurrence_end_date ? 
                        new Date(formData.recurrence_end_date) : new Date()}
                      mode="date"
                      display="default"
                      onChange={handleEndDateChange}
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
                >
                  {formImageLoading ? (
                    <ActivityIndicator size="small" color={THEME.buttonPrimary} />
                  ) : (
                    <>
                      <Feather name="image" size={22} color={THEME.buttonPrimary} />
                      <Text style={styles.imagePickerText}>
                        {formData.image_url ? "Change Image" : "Select Image"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              {formData.image_url && (
                <View style={styles.previewImageContainer}>
                  <Image
                    source={{ uri: formData.image_url }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => handleFormChange('image_url', null)}
                  >
                    <AntDesign name="closecircle" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Video Link (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.video_link || ''}
                  onChangeText={(value) => handleFormChange('video_link', value)}
                  placeholder="Add YouTube or video URL"
                  placeholderTextColor={THEME.light}
                  keyboardType="url"
                />
              </View>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleEditEvent}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={THEME.buttonText} />
                ) : (
                  <Text style={styles.submitButtonText}>Confirm Edit</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  if (selectedEvent) {
                    setShowEditModal(false);
                    setTimeout(() => handleDeleteEvent(selectedEvent.id), 300);
                  }
                }}
                disabled={isSubmitting}
              >
                <Text style={styles.deleteButtonText}>DELETE EVENT</Text>
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
          <Image 
            source={{ uri: selectedImage }} 
            style={styles.fullImage} 
            resizeMode="contain" 
          />
        </View>
      </Modal>
    </View>
  );
}

// Styles definition
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  safeArea: {
    backgroundColor: THEME.background,
    zIndex: 1,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: THEME.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 80,
  },
  heroSection: {
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  mainContainer: {
    backgroundColor: THEME.background,
  },
  // Header
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: THEME.primary,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: THEME.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: THEME.primary,
  },
  clearSearchButton: {
    padding: 8,
  },
  // View Selector
  viewSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: THEME.card,
    borderRadius: 30,
    padding: 4,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  viewOption: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
  },
  viewOptionActive: {
    backgroundColor: THEME.buttonPrimary,
  },
  viewOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.secondary,
    marginLeft: 6,
  },
  viewOptionTextActive: {
    color: THEME.buttonText,
  },
  // Month Navigation
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  monthNavArrow: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: THEME.card,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.primary,
  },
  // Calendar
  calendarContainer: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 16,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dayLabelContainer: {
    width: 38,
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 14,
    color: THEME.secondary,
    fontWeight: '600',
  },
  calendarGrid: {},
  calendarWeek: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calendarDay: {
    width: 38,
    height: 60,
    alignItems: 'center',
    paddingTop: 6,
    borderRadius: 10,
  },
  calendarDayOtherMonth: {
    opacity: 0.5,
  },
  calendarDaySelected: {
    backgroundColor: '#F0F0F5',
  },
  dayNumberContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayContainer: {
    backgroundColor: '#EEEEF5',
  },
  selectedDayNumberContainer: {
    backgroundColor: THEME.buttonPrimary,
  },
  dayNumber: {
    fontSize: 16,
    color: THEME.primary,
    fontWeight: '500',
  },
  dayNumberOtherMonth: {
    color: THEME.light,
  },
  todayNumber: {
    color: THEME.buttonPrimary,
    fontWeight: '700',
  },
  selectedDayNumber: {
    color: THEME.buttonText,
    fontWeight: '700',
  },
  eventIndicatorContainer: {
    flexDirection: 'row',
    marginTop: 4,
    justifyContent: 'center',
    maxWidth: 32,
    flexWrap: 'wrap',
  },
  eventIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    margin: 1,
  },
  multipleEventsIndicator: {
    backgroundColor: THEME.buttonPrimary,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  multipleEventsText: {
    color: THEME.buttonText,
    fontSize: 10,
    fontWeight: '700',
  },
  calendarLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: THEME.secondary,
  },
  // List View
  listContainer: {
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  noEventsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 30,
    marginVertical: 20,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noEventsText: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  noEventsSubtext: {
    fontSize: 14,
    color: THEME.secondary,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  eventsList: {
    paddingVertical: 12,
  },
  // Event Cards
  eventCard: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#4299E1',
  },
  pastEventCard: {
    opacity: 0.8,
  },
  eventCardDetail: {
    marginBottom: 20,
    padding: 20,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventTitleContainer: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.primary,
    marginBottom: 4,
  },
  eventTimeLocationContainer: {
    flexDirection: 'column',
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  smallIcon: {
    marginRight: 4,
  },
  eventDateTime: {
    fontSize: 14,
    color: THEME.secondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventLocation: {
    fontSize: 14,
    color: THEME.secondary,
  },
  churchName: {
    fontSize: 12,
    color: THEME.light,
    marginLeft: 4,
  },
  eventExcerpt: {
    fontSize: 15,
    color: THEME.primary,
    lineHeight: 22,
    marginVertical: 16,
  },
  eventImageContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  videoLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: THEME.background,
    borderRadius: 12,
    marginBottom: 16,
  },
  videoLinkText: {
    marginLeft: 8,
    fontSize: 16,
    color: THEME.primary,
    fontWeight: "600",
  },
  videoThumbnail: {
    width: 120,
    height: 90,
    borderRadius: 8,
  },
  // Recurring event badge
  recurringBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: THEME.accent1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  recurringInfoCard: {
    backgroundColor: THEME.accent1,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  recurringInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  recurringInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.primary,
    marginLeft: 6,
  },
  recurringInfoText: {
    fontSize: 14,
    color: THEME.secondary,
  },
  // Edit button on card
  editButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  // Event Action Row
  eventActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  editActionButton: {
    backgroundColor: THEME.accent1,
  },
  editActionText: {
    color: THEME.buttonPrimary,
  },
  deleteActionButton: {
    backgroundColor: THEME.accent4,
  },
  deleteActionText: {
    color: THEME.error,
  },
  shareActionButton: {
    backgroundColor: THEME.background,
  },
  // Hero Section
  heroBackground: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 20,
    maxWidth: 300,
    lineHeight: 22,
  },
  // Add Event Button
  addEventButton: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  addEventButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "700",
    marginRight: 10,
  },
  // Date Detail Modal
  dateDetailContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.75,
    backgroundColor: THEME.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 99,
  },
  dateDetailHandle: {
    width: 40,
    height: 5,
    backgroundColor: THEME.border,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  dateDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  dateDetailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.primary,
  },
  dateDetailCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDetailContent: {
    flex: 1,
    padding: 20,
  },
  noEventsForDay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  noEventsForDayText: {
    fontSize: 16,
    color: THEME.secondary,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  addEventForDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.background,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.buttonPrimary,
  },
  addEventForDayText: {
    fontSize: 16,
    color: THEME.buttonPrimary,
    fontWeight: '600',
    marginRight: 8,
  },
  // Modal
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: THEME.card,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 30,
    maxHeight: height * 0.9,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: THEME.border,
    borderRadius: 3,
    alignSelf: 'center',
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
    borderBottomColor: THEME.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: THEME.primary,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.background,
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
    color: THEME.primary,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: THEME.background,
    borderRadius: 12,
    padding: 16,
    color: THEME.primary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  textAreaInput: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  dateTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  dateTimeText: {
    color: THEME.primary,
    marginLeft: 10,
    fontSize: 16,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: THEME.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME.primary,
  },
  recurringContainer: {
    marginBottom: 20,
    backgroundColor: THEME.accent1,
    borderRadius: 12,
    padding: 16,
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
    backgroundColor: THEME.card,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  recurrenceTypeButtonSelected: {
    backgroundColor: THEME.buttonPrimary,
    borderColor: THEME.buttonPrimary,
  },
  recurrenceTypeText: {
    fontSize: 14,
    color: THEME.secondary,
    fontWeight: "500",
  },
  recurrenceTypeTextSelected: {
    color: THEME.buttonText,
    fontWeight: "600",
  },
  intervalRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  intervalLabel: {
    fontSize: 16,
    color: THEME.secondary,
    marginRight: 8,
  },
  intervalInput: {
    backgroundColor: THEME.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 60,
    borderWidth: 1,
    borderColor: THEME.border,
    marginRight: 8,
    fontSize: 16,
    color: THEME.primary,
    textAlign: 'center',
  },
  intervalText: {
    fontSize: 16,
    color: THEME.secondary,
  },
  daysRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.card,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  dayButtonSelected: {
    backgroundColor: THEME.buttonPrimary,
    borderColor: THEME.buttonPrimary,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.secondary,
  },
  dayTextSelected: {
    color: THEME.buttonText,
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: THEME.accent4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    fontSize: 14,
    color: THEME.error,
    fontWeight: "500",
  },
  imagePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: THEME.background,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: THEME.buttonPrimary,
  },
  imagePickerText: {
    color: THEME.buttonPrimary,
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "600",
  },
  previewImageContainer: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
    position: 'relative',
  },
  previewImage: {
    width: "100%",
    height: 180,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: THEME.buttonPrimary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.buttonText,
  },
  deleteButton: {
    backgroundColor: THEME.accent4,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.error,
  },
  // Image Viewer Modal Styles
  imageViewerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  fullImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.8,
  },
  // Church selector styles
  churchSelectorContainer: {
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  selectorLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: THEME.primary,
    marginBottom: 8,
  },
  churchSelector: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  churchOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: THEME.background,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  churchOptionActive: {
    backgroundColor: THEME.buttonPrimary,
    borderColor: THEME.buttonPrimary,
  },
  churchOptionText: {
    color: THEME.secondary,
    fontWeight: "500",
  },
  churchOptionTextActive: {
    color: THEME.buttonText,
    fontWeight: "600",
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventHost: {
    fontSize: 14,
    color: THEME.secondary,
  },
  mainContent: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  // ... existing styles ...
});