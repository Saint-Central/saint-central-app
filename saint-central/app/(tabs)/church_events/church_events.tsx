import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  FlatList,
  Animated,
  ImageBackground,
  Modal,
  RefreshControl,
  Dimensions,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";

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
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [200, 80],
    extrapolate: "clamp",
  });
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60, 90],
    outputRange: [1, 0.3, 0],
    extrapolate: "clamp",
  });
  const titleOpacity = scrollY.interpolate({
    inputRange: [0, 60, 90],
    outputRange: [0, 0.3, 1],
    extrapolate: "clamp",
  });
  const churchSelectorAnim = useRef(new Animated.Value(1)).current;

  // Use custom hooks with parameters
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

  // Store the selected event for editing
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);

  // Update the event selection when opening the form for editing
  const handleSelectEventForEdit = (event: ChurchEvent) => {
    setSelectedEvent(event);
    openEditModal(event);
  };

  // Function to submit edit without requiring event parameter
  const handleSubmitEdit = () => {
    if (selectedEvent) {
      handleEditEvent();
    }
  };

  // Effect to handle eventId if provided
  useEffect(() => {
    // If eventId is provided and events are loaded, find the event and show details
    if (eventId && events.length > 0 && !loading) {
      const id = Number(Array.isArray(eventId) ? eventId[0] : eventId);
      const event = events.find((e) => e.id === id);

      if (event) {
        console.log("Found event for eventId:", event);
        handleSelectEventForEdit(event);
      }
    }
  }, [eventId, events, loading]);

  // Render hero section
  const renderHero = () => (
    <Animated.View
      style={[
        styles.heroSection,
        {
          height: headerHeight,
          opacity: headerOpacity,
        },
      ]}
    >
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
          <Text style={styles.heroSubtitle}>Stay updated with church events and activities</Text>
          {hasPermissionToCreate && (
            <TouchableOpacity style={styles.addEventButton} onPress={() => openAddModal()}>
              <Text style={styles.addEventButtonText}>Create New Event</Text>
              <Feather name="plus-circle" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </LinearGradient>
      </ImageBackground>
    </Animated.View>
  );

  // Render header with title
  const renderHeader = () => (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Animated.Text
          style={[
            styles.headerTitle,
            {
              opacity: titleOpacity,
            },
          ]}
        >
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
  );

  // Render search input
  const renderSearch = () => (
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
  );

  // Render church selector horizontal list
  const renderChurchSelector = () => (
    <View style={styles.churchSelectorContainer}>
      <Text style={styles.selectorLabel}>Your Churches</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.churchSelector}>
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
  );

  // Render view selector (list or calendar)
  const renderViewSelector = () => (
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
          style={[styles.viewOptionText, calendarView === "list" && styles.viewOptionTextActive]}
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
          style={[styles.viewOptionText, calendarView === "month" && styles.viewOptionTextActive]}
        >
          Calendar
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render list of events
  const renderEventsList = () => (
    <View style={styles.listContainer}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <Feather name="loader" size={30} color={THEME.buttonPrimary} />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      ) : filteredEvents.length === 0 ? (
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
      ) : (
        <FlatList
          data={filteredEvents}
          renderItem={({ item }) => (
            <EventCard
              item={item}
              currentUserId={currentUser?.id || null}
              hasPermissionToCreate={hasPermissionToCreate}
              onSelectDay={() => {}}
              onEdit={handleSelectEventForEdit}
              onDelete={handleDeleteEvent}
              onImagePress={openImageViewer}
            />
          )}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.eventsList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );

  // Render main content
  const renderMainContent = () => (
    <View style={styles.mainContent}>
      {/* Church Selector */}
      {userChurches.length > 0 && renderChurchSelector()}

      {/* View Selector */}
      {renderViewSelector()}

      {/* Calendar or List View */}
      {calendarView === "month" ? (
        <Calendar
          loading={loading}
          currentMonth={currentMonth}
          calendarData={calendarData}
          selectedDate={selectedDate}
          dayAnimations={dayAnimations}
          onDaySelect={selectDay}
          onChangeMonth={changeMonth}
        />
      ) : (
        renderEventsList()
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      {renderHeader()}

      {/* Main Scrollable Content */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        showsVerticalScrollIndicator={false}
      >
        {renderHero()}
        {renderSearch()}
        {renderMainContent()}
      </Animated.ScrollView>

      {/* Event Detail Modal */}
      <EventDetail
        showDateDetail={showDateDetail}
        selectedDate={selectedDate}
        selectedDayEvents={selectedDayEvents}
        detailSlideAnim={detailSlideAnim}
        currentUserId={currentUser?.id || null}
        hasPermissionToCreate={hasPermissionToCreate}
        onClose={closeDateDetail}
        onAddEvent={() => openAddModal()}
        onSelectDay={() => {}}
        onEditEvent={handleSelectEventForEdit}
        onDeleteEvent={handleDeleteEvent}
        onImagePress={openImageViewer}
      />

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
