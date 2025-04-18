import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  FlatList,
  ImageBackground,
  Modal,
  RefreshControl,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
} from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolate,
  withTiming,
  withSpring,
  runOnJS,
} from "react-native-reanimated";

// Import custom hooks
import useChurchEvents from "./hooks/useChurchEvents";
import useCalendar from "./hooks/useCalendar";
import useEventForm from "./hooks/useEventForm";

// Import components
import EventCard from "./components/EventCard";
import Calendar from "./components/Calendar";
import EventForm from "./components/EventForm";
import EventDetail from "./components/EventDetail";

// Import styles and themes
import { styles } from "./styles";
import { THEME } from "./theme";
import { ChurchEvent } from "./types";

const { width, height } = Dimensions.get("window");

// Update component to accept props
interface ChurchEventsProps {
  churchId?: string | string[];
  eventId?: string | string[];
}

const ChurchEvents = ({ churchId, eventId }: ChurchEventsProps) => {
  // Log received props for debugging
  console.log("ChurchEvents component received props:", { churchId, eventId });

  // Animation values
  const scrollY = useSharedValue(0);

  // Set up animated styles using Reanimated
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const height = interpolate(scrollY.value, [0, 100], [200, 80], Extrapolate.CLAMP);
    return { height };
  });

  const headerOpacityStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, 60, 90], [1, 0.3, 0], Extrapolate.CLAMP);
    return { opacity };
  });

  const titleOpacityStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, 60, 90], [0, 0.3, 1], Extrapolate.CLAMP);
    return { opacity };
  });

  const churchSelectorAnim = useSharedValue(1);

  // Use custom hooks with parameters - all hooks called unconditionally at the top level
  const {
    currentUser,
    userChurches,
    selectedChurchId,
    setSelectedChurchId,
    hasPermissionToCreate,
    events,
    loading,
    refreshing,
    filteredEvents,
    searchQuery,
    setSearchQuery,
    fetchEvents,
    onRefresh,
  } = useChurchEvents(churchId);

  const {
    selectedDate,
    currentMonth,
    calendarData,
    calendarView,
    setCalendarView,
    showDateDetail,
    selectedDayEvents,
    dayAnimations,
    detailSlideAnim,
    changeMonth,
    selectDay,
    closeDateDetail,
  } = useCalendar(events, loading);

  const {
    formData,
    showAddModal,
    showEditModal,
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
  } = useEventForm(currentUser?.id || null, selectedChurchId, hasPermissionToCreate, fetchEvents);

  // Local state - keep all useState calls together at the top level
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [detailEvent, setDetailEvent] = useState<ChurchEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<ChurchEvent | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Event handlers - simple functions without conditional hook calls
  const handleSelectEventForEdit = (event: ChurchEvent) => {
    setEditingEvent(event);
    openEditModal(event);
  };

  const handleViewEventDetails = (event: ChurchEvent) => {
    setDetailEvent(event);
    setShowDetailModal(true);
  };

  const handleSubmitEdit = () => {
    if (selectedEvent) {
      handleEditEvent();
    }
  };

  // Effect to handle eventId if provided
  useEffect(() => {
    if (eventId && events.length > 0 && !loading) {
      const id = Number(Array.isArray(eventId) ? eventId[0] : eventId);
      const event = events.find((e) => e.id === id);
      if (event) {
        console.log("Found event for eventId:", event);
        handleSelectEventForEdit(event);
      }
    }
  }, [eventId, events, loading]);

  // Simplify the component to always render the same structure
  // with conditional visibility instead of conditional rendering
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      {/* Header - always rendered */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Animated.Text style={[styles.headerTitle, titleOpacityStyle]}>
            Church Events
          </Animated.Text>
          <View style={styles.headerButtons}>
            {hasPermissionToCreate && (
              <TouchableOpacity style={styles.headerButton} onPress={openAddModal}>
                <Feather name="plus" size={24} color={THEME.buttonPrimary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* Main content area - always a ScrollView for consistency */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        scrollEventThrottle={16}
        onScroll={useAnimatedScrollHandler({
          onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
          },
        })}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero section */}
        <Animated.View style={[styles.heroSection, headerAnimatedStyle, headerOpacityStyle]}>
          <ImageBackground
            source={{
              uri: "https://images.unsplash.com/photo-1511747779829-1d858eac30cc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80",
            }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          >
            <LinearGradient
              colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.7)"]}
              style={styles.heroBackground}
            >
              <View style={styles.iconContainer}>
                <Feather name="calendar" size={30} color="#FFFFFF" />
              </View>
              <Text style={styles.heroTitle}>Church Events</Text>
              <Text style={styles.heroSubtitle}>
                Stay updated with church events and activities
              </Text>
              {hasPermissionToCreate && (
                <TouchableOpacity style={styles.addEventButton} onPress={() => openAddModal()}>
                  <Text style={styles.addEventButtonText}>Create New Event</Text>
                  <Feather name="plus-circle" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </LinearGradient>
          </ImageBackground>
        </Animated.View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color={THEME.secondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            placeholderTextColor={THEME.light}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== "" && (
            <TouchableOpacity style={styles.clearSearchButton} onPress={() => setSearchQuery("")}>
              <Feather name="x" size={20} color={THEME.secondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Main content */}
        <View style={styles.mainContent}>
          {/* Church Selector */}
          {userChurches.length > 0 && (
            <View style={styles.churchSelectorContainer}>
              <Text style={styles.selectorLabel}>Your Churches</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.churchSelector}
              >
                {userChurches.map((church) => (
                  <TouchableOpacity
                    key={church.id}
                    style={[
                      styles.churchOption,
                      selectedChurchId === church.id && styles.churchOptionActive,
                    ]}
                    onPress={() => setSelectedChurchId(church.id)}
                  >
                    <Text
                      style={[
                        styles.churchOptionText,
                        selectedChurchId === church.id && styles.churchOptionTextActive,
                      ]}
                    >
                      {church.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* View Selector */}
          <View style={styles.viewSelector}>
            <TouchableOpacity
              style={[styles.viewOption, calendarView === "list" && styles.viewOptionActive]}
              onPress={() => setCalendarView("list")}
            >
              <Feather
                name="list"
                size={16}
                color={calendarView === "list" ? THEME.buttonText : THEME.secondary}
              />
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
              <Feather
                name="calendar"
                size={16}
                color={calendarView === "month" ? THEME.buttonText : THEME.secondary}
              />
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

          {/* Calendar View */}
          {calendarView === "month" && (
            <Calendar
              loading={loading}
              currentMonth={currentMonth}
              calendarData={calendarData}
              selectedDate={selectedDate}
              dayAnimations={dayAnimations}
              onDaySelect={selectDay}
              onChangeMonth={changeMonth}
            />
          )}

          {/* List View */}
          {calendarView === "list" && (
            <View style={styles.listContainer}>
              {loading && (
                <View style={styles.loadingContainer}>
                  <Feather name="loader" size={30} color={THEME.buttonPrimary} />
                  <Text style={styles.loadingText}>Loading events...</Text>
                </View>
              )}

              {!loading && filteredEvents.length === 0 && (
                <View style={styles.noEventsContainer}>
                  <Feather name="calendar" size={50} color={THEME.light} />
                  <Text style={styles.noEventsText}>No Events Found</Text>
                  <Text style={styles.noEventsSubtext}>
                    {searchQuery
                      ? "Try adjusting your search query."
                      : hasPermissionToCreate
                        ? "Click the + button to create your first event."
                        : "There are no upcoming events to display."}
                  </Text>
                </View>
              )}

              {!loading && filteredEvents.length > 0 && (
                <View style={styles.eventsList}>
                  {filteredEvents.map((item) => (
                    <EventCard
                      key={item.id}
                      item={item}
                      currentUserId={currentUser?.id}
                      hasPermissionToCreate={hasPermissionToCreate}
                      onEdit={handleSelectEventForEdit}
                      onDelete={() => handleDeleteEvent(item.id)}
                      onView={handleViewEventDetails}
                      onImagePress={openImageViewer}
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Date Detail Panel for Calendar View */}
      <EventDetail
        showDateDetail={showDateDetail}
        selectedDate={selectedDate}
        selectedDayEvents={selectedDayEvents}
        detailSlideAnim={detailSlideAnim}
        currentUserId={currentUser?.id || null}
        hasPermissionToCreate={hasPermissionToCreate}
        onClose={closeDateDetail}
        onAddEvent={openAddModal}
        onSelectDay={handleViewEventDetails}
        onEditEvent={handleSelectEventForEdit}
        onDeleteEvent={handleDeleteEvent}
        onImagePress={openImageViewer}
      />

      {/* Event Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              width: "90%",
              maxHeight: "80%",
              borderRadius: 16,
              position: "relative",
              overflow: "hidden",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
          >
            <TouchableOpacity
              style={{
                position: "absolute",
                top: 15,
                right: 15,
                zIndex: 10,
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                borderRadius: 20,
                padding: 5,
              }}
              onPress={() => setShowDetailModal(false)}
            >
              <Feather name="x" size={24} color="#000" />
            </TouchableOpacity>

            {detailEvent?.image_url && (
              <Pressable
                onPress={() => {
                  setShowDetailModal(false); // First close the current modal
                  setTimeout(() => {
                    openImageViewer(detailEvent.image_url!); // Then open the image viewer after a short delay
                  }, 300);
                }}
              >
                <Image
                  source={{ uri: detailEvent.image_url }}
                  style={{ width: "100%", height: 200 }}
                  resizeMode="cover"
                />
              </Pressable>
            )}

            <ScrollView style={{ padding: 20, paddingTop: 10 }}>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "bold",
                  color: THEME.primary,
                  marginBottom: 15,
                  marginTop: 15,
                }}
              >
                {detailEvent?.title}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <MaterialIcons name="event" size={20} color="#666" />
                <Text
                  style={{
                    fontSize: 16,
                    marginLeft: 10,
                    color: THEME.primary,
                  }}
                >
                  {detailEvent?.time
                    ? new Date(detailEvent.time).toLocaleDateString()
                    : "No date specified"}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <MaterialIcons name="access-time" size={20} color="#666" />
                <Text
                  style={{
                    fontSize: 16,
                    marginLeft: 10,
                    color: THEME.primary,
                  }}
                >
                  {detailEvent?.time
                    ? new Date(detailEvent.time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "No time specified"}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <MaterialIcons name="location-on" size={20} color="#666" />
                <Text
                  style={{
                    fontSize: 16,
                    marginLeft: 10,
                    color: THEME.primary,
                  }}
                >
                  {detailEvent?.author_name || "No location specified"}
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: THEME.primary,
                  marginTop: 20,
                  marginBottom: 10,
                }}
              >
                Description
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  lineHeight: 24,
                  color: THEME.secondary,
                }}
              >
                {detailEvent?.excerpt || "No description available"}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Full screen image viewer */}
      <Modal
        visible={!!fullscreenImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullscreenImage(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            style={{
              position: "absolute",
              top: 40,
              right: 20,
              zIndex: 10,
              padding: 10,
            }}
            onPress={() => setFullscreenImage(null)}
          >
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
          {fullscreenImage && (
            <Image
              source={{ uri: fullscreenImage }}
              style={{ width: "100%", height: "80%" }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Add Event Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setShowAddModal(false)}
            activeOpacity={1}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Event</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowAddModal(false)}
              >
                <Feather name="x" size={24} color={THEME.primary} />
              </TouchableOpacity>
            </View>
            <EventForm
              formData={formData}
              isSubmitting={isSubmitting}
              formImageLoading={formImageLoading}
              showTimePicker={showTimePicker}
              showEndDatePicker={showEndDatePicker}
              isEditMode={false}
              onSubmit={handleAddEvent}
              onChangeField={handleFormChange}
              onDateTimeChange={handleDateTimeChange}
              onEndDateChange={handleEndDateChange}
              onToggleTimePicker={() => setShowTimePicker(!showTimePicker)}
              onToggleEndDatePicker={() => setShowEndDatePicker(!showEndDatePicker)}
              onPickImage={pickImage}
              onToggleRecurrenceDay={toggleRecurrenceDay}
            />
          </View>
        </View>
      </Modal>

      {/* Edit Event Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setShowEditModal(false)}
            activeOpacity={1}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Event</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowEditModal(false)}
              >
                <Feather name="x" size={24} color={THEME.primary} />
              </TouchableOpacity>
            </View>
            <EventForm
              formData={formData}
              isSubmitting={isSubmitting}
              formImageLoading={formImageLoading}
              showTimePicker={showTimePicker}
              showEndDatePicker={showEndDatePicker}
              isEditMode={true}
              onSubmit={handleSubmitEdit}
              onDelete={() => {
                setShowEditModal(false);
                selectedEvent?.id && handleDeleteEvent(selectedEvent.id);
              }}
              onChangeField={handleFormChange}
              onDateTimeChange={handleDateTimeChange}
              onEndDateChange={handleEndDateChange}
              onToggleTimePicker={() => setShowTimePicker(!showTimePicker)}
              onToggleEndDatePicker={() => setShowEndDatePicker(!showEndDatePicker)}
              onPickImage={pickImage}
              onToggleRecurrenceDay={toggleRecurrenceDay}
            />
          </View>
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity
            style={styles.imageViewerCloseButton}
            onPress={() => setShowImageModal(false)}
          >
            <Feather name="x" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
        </View>
      </Modal>
    </View>
  );
};

export default ChurchEvents;
