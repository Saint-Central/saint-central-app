import { useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/contexts/AuthContext";
import { useCRUD } from "@/utils/crudClient";
import { useRouter } from "expo-router";
import { supabase } from "../../../../supabaseClient";
import { ChurchEvent, EventFormData } from "../types";

export const useEventForm = (
  currentUserId: string | null,
  selectedChurchId: number | null,
  hasPermissionToCreate: boolean,
  refreshEvents: () => Promise<void>,
) => {
  const { user } = useAuth();
  const crud = useCRUD();
  const router = useRouter();

  // Form states
  const [formData, setFormData] = useState<EventFormData>({
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

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [formImageLoading, setFormImageLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");

  // Reset form to default values
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

  // Open the add event modal
  const openAddModal = () => {
    if (!user || !selectedChurchId) {
      Alert.alert("Sign In Required", "Please sign in and select a church to create events.");
      return;
    }

    if (!hasPermissionToCreate) {
      Alert.alert(
        "Permission Denied",
        "Only church admins and owners can create events. Contact your church administrator for access.",
      );
      return;
    }

    resetForm();
    setShowAddModal(true);
  };

  // Open the edit event modal
  const openEditModal = (event: ChurchEvent) => {
    if (!user || !selectedChurchId) {
      Alert.alert("Error", "You must be logged in and select a church");
      return;
    }

    // Only allow church admins/owners to edit events
    if (!hasPermissionToCreate) {
      Alert.alert("Permission Denied", "Only church admins and owners can edit events.");
      return;
    }

    setSelectedEvent(event); // Set the selected event first

    // Add a type check to ensure event_location exists or provide a default
    const eventLocation = "event_location" in event ? event.event_location || "" : "";

    // Check if recurrence_type is a valid value
    const validRecurrenceTypes = ["daily", "weekly", "monthly", "yearly", null];
    const recurrenceType =
      event.recurrence_type && validRecurrenceTypes.includes(event.recurrence_type)
        ? (event.recurrence_type as "daily" | "weekly" | "monthly" | "yearly" | null)
        : "weekly";

    setFormData({
      title: event.title,
      time: event.time,
      image_url: event.image_url || null,
      excerpt: event.excerpt || "",
      video_link: event.video_link || null,
      author_name: event.author_name || "",
      event_location: eventLocation,
      is_recurring: event.is_recurring || false,
      recurrence_type: recurrenceType,
      recurrence_interval: event.recurrence_interval || 1,
      recurrence_end_date: event.recurrence_end_date || null,
      recurrence_days_of_week: event.recurrence_days_of_week || [1],
      church_id: "church_id" in event ? event.church_id || selectedChurchId : selectedChurchId,
    });
    setShowEditModal(true);
  };

  // Handle form changes
  const handleFormChange = (field: keyof EventFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle date/time picker changes
  const handleDateTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);

    if (selectedDate) {
      setFormData((prev) => ({
        ...prev,
        time: selectedDate.toISOString(),
      }));
    }
  };

  // Handle end date picker changes
  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);

    if (selectedDate) {
      setFormData((prev) => ({
        ...prev,
        recurrence_end_date: selectedDate.toISOString(),
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
          "recurrence_days_of_week",
          currentDays.filter((d) => d !== day),
        );
      }
    } else {
      handleFormChange("recurrence_days_of_week", [...currentDays, day]);
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
        if (!user) {
          throw new Error("Not authenticated");
        }

        // Convert image to blob
        const response = await fetch(localUri);
        const blob = await response.blob();

        const fileName = `${Date.now()}.jpg`;
        const fileExtension = localUri.split(".").pop();

        const { error: uploadError, data } = await supabase.storage
          .from("event-images")
          .upload(`${user.id}/${fileName}`, blob, {
            contentType: `image/${fileExtension}`,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("event-images")
          .getPublicUrl(`${user.id}/${fileName}`);

        if (urlData?.publicUrl) {
          handleFormChange("image_url", urlData.publicUrl);
          Alert.alert("Success", "Image uploaded successfully!");
        }
      } catch (error) {
        console.error("Error uploading image:", error);
        Alert.alert(
          "Upload Notice",
          "Using local image only. The image may not be visible to others.",
        );
        handleFormChange("image_url", localUri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image");
    } finally {
      setFormImageLoading(false);
    }
  };

  // Submit new event to Supabase
  const handleAddEvent = async () => {
    if (!user || !selectedChurchId) {
      Alert.alert("Error", "You must be logged in and select a church");
      return;
    }

    if (!formData.title.trim()) {
      Alert.alert("Error", "Please enter an event title");
      return;
    }

    try {
      setIsSubmitting(true);

      // Convert recurrence_days_of_week array to number for database storage
      const daysOfWeekNumber = formData.recurrence_days_of_week
        ? parseInt(formData.recurrence_days_of_week.join(""), 10)
        : null;

      // Create event in database
      await crud.insert("church_events", {
          title: formData.title,
          time: formData.time,
          created_by: user.id,
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
          church_id: selectedChurchId,
      });

      Alert.alert("Success", "Event created successfully!");
      setShowAddModal(false);
      resetForm();
      await refreshEvents();
    } catch (error) {
      console.error("Error creating event:", error);
      if (error instanceof Error && (error.message.includes('Auth session missing') || error.message.includes('Please log in'))) {
        Alert.alert('Session Expired', 'Your session has expired. Please log in again.', [
          { text: 'OK', onPress: () => router.push('/auth') }
        ]);
      } else {
        Alert.alert("Error", "Failed to create event. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update existing event
  const handleEditEvent = async () => {
    if (!user || !selectedEvent) {
      Alert.alert("Error", "You must be logged in and an event must be selected");
      return;
    }

    // Check if user is the creator of the event
    if (selectedEvent.created_by !== user.id && !hasPermissionToCreate) {
      Alert.alert(
        "Permission Denied",
        "You can only edit events you created or if you are a church admin.",
      );
      return;
    }

    if (!formData.title.trim()) {
      Alert.alert("Error", "Please enter an event title");
      return;
    }

    try {
      setIsSubmitting(true);

      // Convert recurrence_days_of_week array to number for database storage
      const daysOfWeekNumber = formData.recurrence_days_of_week
        ? parseInt(formData.recurrence_days_of_week.join(""), 10)
        : null;

      // Update event in database
      await crud.update("church_events", {
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
          recurrence_days_of_week: daysOfWeekNumber,
      }, { id: selectedEvent.id });

      Alert.alert("Success", "Event updated successfully!");
      setShowEditModal(false);
      resetForm();
      await refreshEvents();
    } catch (error) {
      console.error("Error updating event:", error);
      if (error instanceof Error && (error.message.includes('Auth session missing') || error.message.includes('Please log in'))) {
        Alert.alert('Session Expired', 'Your session has expired. Please log in again.', [
          { text: 'OK', onPress: () => router.push('/auth') }
        ]);
      } else {
        Alert.alert("Error", "Failed to update event. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete event
  const handleDeleteEvent = async (eventId: number) => {
    if (!user || !selectedChurchId) {
      Alert.alert("Error", "You must be logged in and select a church");
      return;
    }

    Alert.alert(
      "Delete Event",
      "Are you sure you want to delete this event? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsSubmitting(true);

              await crud.delete("church_events", { id: eventId });

              Alert.alert("Success", "Event deleted successfully!");
              await refreshEvents();
            } catch (error) {
              console.error("Error deleting event:", error);
              if (error instanceof Error && (error.message.includes('Auth session missing') || error.message.includes('Please log in'))) {
                Alert.alert('Session Expired', 'Your session has expired. Please log in again.', [
                  { text: 'OK', onPress: () => router.push('/auth') }
                ]);
              } else {
                Alert.alert("Error", "Failed to delete event. Please try again.");
              }
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ],
    );
  };

  // Full image viewer
  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  return {
    formData,
    showAddModal,
    showEditModal,
    selectedEvent,
    showTimePicker,
    showEndDatePicker,
    formImageLoading,
    isSubmitting,
    showImageModal,
    selectedImage,
    setShowAddModal,
    setShowEditModal,
    setShowTimePicker,
    setShowEndDatePicker,
    setShowImageModal,
    resetForm,
    openAddModal,
    openEditModal,
    handleFormChange,
    handleDateTimeChange,
    handleEndDateChange,
    toggleRecurrenceDay,
    pickImage,
    handleAddEvent,
    handleEditEvent,
    handleDeleteEvent,
    openImageViewer,
  };
};

export default useEventForm;
