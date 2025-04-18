import { useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ChurchEvent, EventFormData } from "../types";
import { supabase } from "../../../../supabaseClient";

export const useEventForm = (
  currentUserId: string | null,
  selectedChurchId: number | null,
  hasPermissionToCreate: boolean,
  refreshEvents: () => Promise<void>,
) => {
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
    if (!currentUserId || !selectedChurchId) {
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
    if (!currentUserId || !selectedChurchId) {
      Alert.alert("Error", "You must be logged in and select a church");
      return;
    }

    // Only allow church admins/owners to edit events
    if (!hasPermissionToCreate) {
      Alert.alert("Permission Denied", "Only church admins and owners can edit events.");
      return;
    }

    setSelectedEvent(event); // Set the selected event first
    setFormData({
      title: event.title,
      time: event.time,
      image_url: event.image_url,
      excerpt: event.excerpt || "",
      video_link: event.video_link,
      author_name: event.author_name || "",
      event_location: event.event_location || "",
      is_recurring: event.is_recurring || false,
      recurrence_type: event.recurrence_type || "weekly",
      recurrence_interval: event.recurrence_interval || 1,
      recurrence_end_date: event.recurrence_end_date || null,
      recurrence_days_of_week: event.recurrence_days_of_week || [1],
      church_id: event.church_id,
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
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          throw new Error("Not authenticated");
        }

        // Convert image to blob
        const response = await fetch(localUri);
        const blob = await response.blob();

        const fileName = `${Date.now()}.jpg`;
        const fileExtension = localUri.split(".").pop();

        const { error: uploadError, data } = await supabase.storage
          .from("event-images")
          .upload(`${currentUserId}/${fileName}`, blob, {
            contentType: `image/${fileExtension}`,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("event-images")
          .getPublicUrl(`${currentUserId}/${fileName}`);

        if (urlData?.publicUrl) {
          handleFormChange("image_url", urlData.publicUrl);
          Alert.alert("Success", "Image uploaded successfully!");
        }
      } catch (uploadError) {
        console.error("Error uploading image:", uploadError);
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
    if (!currentUserId || !selectedChurchId) {
      Alert.alert("Error", "You must be logged in and select a church");
      return;
    }

    // Form validation
    if (!formData.title.trim()) {
      Alert.alert("Error", "Event title is required");
      return;
    }

    if (!formData.excerpt.trim()) {
      Alert.alert("Error", "Event description is required");
      return;
    }

    try {
      setIsSubmitting(true);

      // Prepare recurrence_days_of_week for DB storage (convert array to number)
      let daysOfWeekNumber = null;
      if (
        formData.is_recurring &&
        formData.recurrence_type === "weekly" &&
        formData.recurrence_days_of_week &&
        formData.recurrence_days_of_week.length > 0
      ) {
        daysOfWeekNumber = parseInt(formData.recurrence_days_of_week.join(""), 10);
      }

      // Create event in database
      const { error } = await supabase.from("church_events").insert({
        title: formData.title,
        time: formData.time,
        created_by: currentUserId,
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

      if (error) throw error;

      // Success
      setShowAddModal(false);
      resetForm();
      await refreshEvents();
      Alert.alert("Success", "Event created successfully!");
    } catch (error) {
      console.error("Error creating event:", error);
      Alert.alert("Error", "Failed to create event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update existing event
  const handleEditEvent = async () => {
    if (!currentUserId || !selectedEvent) {
      Alert.alert("Error", "You must be logged in and an event must be selected");
      return;
    }

    // Check if user is the creator of the event
    if (selectedEvent.created_by !== currentUserId && !hasPermissionToCreate) {
      Alert.alert(
        "Permission Denied",
        "You can only edit events that you created or if you are a church admin/owner.",
      );
      return;
    }

    // Form validation
    if (!formData.title.trim()) {
      Alert.alert("Error", "Event title is required");
      return;
    }

    if (!formData.excerpt.trim()) {
      Alert.alert("Error", "Event description is required");
      return;
    }

    try {
      setIsSubmitting(true);

      // Prepare recurrence_days_of_week for DB storage (convert array to number)
      let daysOfWeekNumber = null;
      if (
        formData.is_recurring &&
        formData.recurrence_type === "weekly" &&
        formData.recurrence_days_of_week &&
        formData.recurrence_days_of_week.length > 0
      ) {
        daysOfWeekNumber = parseInt(formData.recurrence_days_of_week.join(""), 10);
      }

      // Update event in database
      const { error } = await supabase
        .from("church_events")
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
          recurrence_days_of_week: daysOfWeekNumber,
        })
        .eq("id", selectedEvent.id);

      if (error) throw error;

      // Success
      setShowEditModal(false);
      resetForm();
      await refreshEvents();
      Alert.alert("Success", "Event updated successfully!");
    } catch (error) {
      console.error("Error updating event:", error);
      Alert.alert("Error", "Failed to update event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete event
  const handleDeleteEvent = async (eventId: number) => {
    if (!currentUserId || !selectedChurchId) {
      Alert.alert("Error", "You must be logged in and select a church");
      return;
    }

    try {
      Alert.alert("Confirm Delete", "Are you sure you want to delete this event?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsSubmitting(true);

            const { error } = await supabase.from("church_events").delete().eq("id", eventId);

            if (error) throw error;

            // Success - close any open modals
            if (showEditModal) setShowEditModal(false);

            await refreshEvents();
            Alert.alert("Success", "Event deleted successfully!");
            setIsSubmitting(false);
          },
        },
      ]);
    } catch (error) {
      console.error("Error deleting event:", error);
      Alert.alert("Error", "Failed to delete event.");
      setIsSubmitting(false);
    }
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
