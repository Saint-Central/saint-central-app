import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ImageBackground,
  Modal,
  RefreshControl,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Platform,
  FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  withTiming,
  runOnJS,
  Easing,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
} from "react-native-reanimated";
import { CalendarDay, ChurchEvent, CalendarViewType } from "./types";

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
import THEME from "../../../theme";

const { width, height } = Dimensions.get("window");

// Update component to accept props
interface ChurchEventsProps {
  churchId?: string | string[];
  eventId?: string | string[];
}

const ChurchEvents = ({ churchId, eventId }: ChurchEventsProps) => {
  // Animation values
  const scrollY = useSharedValue(0);
  const fabOpacity = useSharedValue(1);

  // Animation values for decorative elements
  const decorElement1 = useSharedValue(0);
  const decorElement2 = useSharedValue(0);
  const decorElement3 = useSharedValue(0);
  const pulsateValue = useSharedValue(1);
  const shimmerValue = useSharedValue(0);

  // Start animations for decorative elements
  useEffect(() => {
    decorElement1.value = withRepeat(
      withTiming(1, { duration: 20000, easing: Easing.linear }),
      -1, // infinite repeat
      false,
    );

    decorElement2.value = withDelay(
      500,
      withRepeat(withTiming(1, { duration: 18000, easing: Easing.linear }), -1, false),
    );

    decorElement3.value = withDelay(
      1000,
      withRepeat(withTiming(1, { duration: 25000, easing: Easing.linear }), -1, false),
    );

    // Pulsating animation
    pulsateValue.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    // Shimmer animation
    shimmerValue.value = withRepeat(withTiming(-width, { duration: 2000 }), -1, false);
  }, []);

  // Decorative element animations
  const decorStyle1 = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${decorElement1.value * 360}deg` },
        { scale: interpolate(scrollY.value, [0, 150], [1, 0.6], Extrapolate.CLAMP) },
      ],
      opacity: interpolate(scrollY.value, [0, 100], [0.7, 0.1], Extrapolate.CLAMP),
    };
  });

  const decorStyle2 = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${-decorElement2.value * 360}deg` },
        { scale: interpolate(scrollY.value, [0, 150], [0.9, 0.5], Extrapolate.CLAMP) },
      ],
      opacity: interpolate(scrollY.value, [0, 100], [0.6, 0.1], Extrapolate.CLAMP),
    };
  });

  const decorStyle3 = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${decorElement3.value * 180}deg` },
        { scale: interpolate(scrollY.value, [0, 150], [0.8, 0.4], Extrapolate.CLAMP) },
      ],
      opacity: interpolate(scrollY.value, [0, 100], [0.5, 0], Extrapolate.CLAMP),
    };
  });

  // Pulsate animation for icon
  const pulsateStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulsateValue.value }],
    };
  });

  // Shimmer animation style
  const shimmerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shimmerValue.value }],
    };
  });

  // Header height animation
  const headerHeightStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [0, 150],
      [350, Platform.OS === "ios" ? 120 : 100],
      Extrapolate.CLAMP,
    );
    const translateY = interpolate(scrollY.value, [0, 150], [0, -10], Extrapolate.CLAMP);
    return {
      height,
      transform: [{ translateY }],
    };
  });

  // Header background opacity with smoother transition
  const headerBgStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, 100], [0, 1], Extrapolate.CLAMP);
    const scale = interpolate(scrollY.value, [0, 100], [1.1, 1], Extrapolate.CLAMP);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  // Parallax image animation
  const parallaxImageStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [0, 150], [0, -40], Extrapolate.CLAMP);
    const scale = interpolate(scrollY.value, [0, 150], [1, 1.15], Extrapolate.CLAMP);
    return {
      transform: [{ translateY }, { scale }],
    };
  });

  // Hero content opacity with enhanced fade effect
  const heroOpacityStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, 70, 120], [1, 0.8, 0], Extrapolate.CLAMP);
    const translateY = interpolate(scrollY.value, [0, 120], [0, -30], Extrapolate.CLAMP);
    const scale = interpolate(scrollY.value, [0, 120], [1, 0.95], Extrapolate.CLAMP);
    return {
      opacity,
      transform: [{ translateY }, { scale }],
    };
  });

  // Header title animation - more polished fade-in and positioning
  const headerTitleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [50, 100], [0, 1], Extrapolate.CLAMP);
    const translateY = interpolate(scrollY.value, [50, 100], [15, 0], Extrapolate.CLAMP);
    const scale = interpolate(scrollY.value, [50, 100], [0.9, 1], Extrapolate.CLAMP);
    return {
      opacity,
      transform: [{ translateY }, { scale }],
    };
  });

  // Blur intensity animation for more dynamic transitions
  const blurIntensityStyle = useAnimatedStyle(() => {
    const intensity = interpolate(scrollY.value, [0, 150], [0, 1], Extrapolate.CLAMP);
    const translateY = interpolate(scrollY.value, [0, 150], [-10, 0], Extrapolate.CLAMP);
    return {
      opacity: intensity,
      transform: [{ translateY }],
    };
  });

  // FAB animation
  const fabStyle = useAnimatedStyle(() => {
    return {
      opacity: fabOpacity.value,
      transform: [{ scale: fabOpacity.value }],
    };
  });

  // Use custom hooks
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

  // Local state
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [detailEvent, setDetailEvent] = useState<ChurchEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<ChurchEvent | null>(null);

  // Event handlers
  const handleSelectEventForEdit = (event: ChurchEvent) => {
    setEditingEvent(event);
    openEditModal(event);
  };

  const handleViewEventDetails = (event: ChurchEvent) => {
    setDetailEvent(event);
    setShowDetailModal(true);
  };

  // Animation for FAB
  const hideFab = () => {
    fabOpacity.value = withTiming(0, { duration: 200 });
  };

  const showFab = () => {
    fabOpacity.value = withTiming(1, { duration: 200 });
  };

  // Effect to handle eventId if provided
  useEffect(() => {
    if (eventId && events.length > 0 && !loading) {
      const id = Number(Array.isArray(eventId) ? eventId[0] : eventId);
      const event = events.find((e) => e.id === id);
      if (event) {
        handleSelectEventForEdit(event);
      }
    }
  }, [eventId, events, loading]);

  // Loader animation
  const spinValue = useSharedValue(0);

  useEffect(() => {
    const startSpinning = () => {
      spinValue.value = 0;
      spinValue.value = withTiming(360, { duration: 1000, easing: Easing.linear }, (finished) => {
        if (finished) {
          runOnJS(startSpinning)();
        }
      });
    };

    startSpinning();
    return () => {};
  }, []);

  const spinStyles = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${spinValue.value}deg` }],
    };
  });

  // Custom renderItem function for calendar view events
  const renderEventItem = ({ item }: { item: ChurchEvent }) => (
    <TouchableOpacity
      style={simpleStyles.eventItem}
      onPress={() => {
        // First close the date detail modal to prevent the app from freezing
        closeDateDetail();
        // Then show the event details with a small delay to ensure smooth transition
        setTimeout(() => {
          handleViewEventDetails(item);
        }, 300);
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: item.color || THEME.primary,
          marginRight: 8,
        }}
      />
      <View style={{ flex: 1 }}>
        <Text style={simpleStyles.eventTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={simpleStyles.eventTime}>
          {new Date(item.time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={simpleStyles.container}>
      <StatusBar style="light" translucent />

      {/* Hero Section - Full bleed to top of screen */}
      <Animated.View
        style={[
          simpleStyles.heroSection,
          headerHeightStyle,
          { position: "absolute", top: 0, left: 0, right: 0, zIndex: 1 },
        ]}
      >
        {/* Parallax Effect for Background */}
        <Animated.View style={[StyleSheet.absoluteFill, parallaxImageStyle]}>
          <ImageBackground
            source={{
              uri: "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80",
            }}
            style={simpleStyles.heroBackground}
            resizeMode="cover"
          >
            <LinearGradient
              colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.7)"]}
              style={simpleStyles.heroGradient}
            />
          </ImageBackground>
        </Animated.View>

        {/* Decorative Elements - with pointerEvents="none" to allow scrolling through them */}
        <Animated.View style={[simpleStyles.decorElement1, decorStyle1]} pointerEvents="none" />
        <Animated.View style={[simpleStyles.decorElement2, decorStyle2]} pointerEvents="none" />
        <Animated.View style={[simpleStyles.decorElement3, decorStyle3]} pointerEvents="none" />

        {/* Hero Content */}
        <Animated.View style={[simpleStyles.heroContent, heroOpacityStyle]}>
          <Text style={simpleStyles.heroTitle}>Church Events</Text>
          <Text style={simpleStyles.heroSubtitle}>
            Find upcoming events, gatherings, and celebrations
          </Text>
          {hasPermissionToCreate && (
            <TouchableOpacity
              style={simpleStyles.addEventButton}
              onPress={openAddModal}
              activeOpacity={0.8}
            >
              <Text style={simpleStyles.addEventButtonText}>Create New Event</Text>
              <Feather name="plus-circle" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </Animated.View>
      </Animated.View>

      {/* Header - Floating over hero with enhanced blur and gradient */}
      <Animated.View
        style={[simpleStyles.headerBackground, headerBgStyle]}
        pointerEvents="box-none"
      >
        {/* Tiered blur for depth */}
        <Animated.View style={[StyleSheet.absoluteFill, blurIntensityStyle]}>
          <BlurView
            intensity={Platform.OS === "ios" ? 35 : 100}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Premium gradient overlay */}
        <LinearGradient
          colors={[
            `${THEME.primary}CC`,
            `${THEME.primary}EE`,
            Platform.OS === "ios" ? `${THEME.primary}DD` : `${THEME.primary}CC`,
          ]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Subtle shimmer effect */}
        <Animated.View style={[simpleStyles.shimmerOverlay, shimmerStyle]}>
          <LinearGradient
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.1)", "rgba(255,255,255,0)"]}
            style={{ flex: 1 }}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
          />
        </Animated.View>

        {/* Subtle bottom border */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: "rgba(255,255,255,0.2)",
          }}
        />
      </Animated.View>

      {/* Safe Area for Header */}
      <SafeAreaView style={{ zIndex: 20, backgroundColor: "transparent" }} pointerEvents="box-none">
        <View style={simpleStyles.header}>
          <Animated.Text style={[simpleStyles.headerTitle, headerTitleStyle]}>
            Church Events
          </Animated.Text>
          {hasPermissionToCreate && (
            <TouchableOpacity
              style={simpleStyles.headerButton}
              onPress={openAddModal}
              activeOpacity={0.7}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Feather name="plus" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <ScrollView
        style={[simpleStyles.scrollView, { marginTop: 0 }]}
        contentContainerStyle={[simpleStyles.scrollContent, { paddingTop: 350 }]}
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={16}
        decelerationRate="normal"
        bounces={true}
        alwaysBounceVertical={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        overScrollMode="always"
        onScroll={(event) => {
          // First update the animated value for other animations
          scrollY.value = event.nativeEvent.contentOffset.y;

          // Then run the visibility logic
          if (event.nativeEvent.contentOffset.y > 100 && fabOpacity.value === 1) {
            hideFab();
          } else if (event.nativeEvent.contentOffset.y <= 100 && fabOpacity.value === 0) {
            showFab();
          }
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.primary}
            progressBackgroundColor="#ffffff"
            progressViewOffset={150}
            colors={[THEME.primary, THEME.accent1 || "#666", THEME.secondary || "#999"]}
          />
        }
      >
        {/* Search Bar */}
        <View style={simpleStyles.searchContainer}>
          <View style={simpleStyles.searchBar}>
            <Feather name="search" size={20} color={THEME.textMedium} style={{ marginRight: 10 }} />
            <TextInput
              style={simpleStyles.searchInput}
              placeholder="Search events..."
              placeholderTextColor="#999999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery !== "" && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Feather name="x" size={20} color="#777777" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Main Content */}
        <View style={simpleStyles.mainContainer}>
          {/* Church Selector */}
          {userChurches.length > 0 && (
            <View style={simpleStyles.sectionContainer}>
              <Text style={simpleStyles.sectionTitle}>Your Churches</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                {userChurches.map((church) => (
                  <TouchableOpacity
                    key={church.id}
                    style={[
                      simpleStyles.pill,
                      selectedChurchId === church.id && simpleStyles.pillActive,
                    ]}
                    onPress={() => setSelectedChurchId(church.id)}
                  >
                    <Text
                      style={[
                        simpleStyles.pillText,
                        selectedChurchId === church.id && simpleStyles.pillTextActive,
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
          <View style={simpleStyles.viewSelector}>
            <TouchableOpacity
              style={[
                simpleStyles.viewOption,
                calendarView === "list" && simpleStyles.viewOptionActive,
              ]}
              onPress={() => setCalendarView("list")}
            >
              <Feather
                name="list"
                size={18}
                color={calendarView === "list" ? "#FFFFFF" : THEME.textMedium}
              />
              <Text
                style={[
                  simpleStyles.viewOptionText,
                  calendarView === "list" && { color: "#FFFFFF" },
                ]}
              >
                List
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                simpleStyles.viewOption,
                calendarView === "month" && simpleStyles.viewOptionActive,
              ]}
              onPress={() => setCalendarView("month")}
            >
              <Feather
                name="calendar"
                size={18}
                color={calendarView === "month" ? "#FFFFFF" : THEME.textMedium}
              />
              <Text
                style={[
                  simpleStyles.viewOptionText,
                  calendarView === "month" && { color: "#FFFFFF" },
                ]}
              >
                Calendar
              </Text>
            </TouchableOpacity>
          </View>

          {/* Calendar View */}
          {calendarView === "month" ? (
            <View style={simpleStyles.calendarWrapper}>
              <Calendar
                loading={loading}
                currentMonth={currentMonth}
                calendarData={calendarData}
                selectedDate={selectedDate}
                dayAnimations={dayAnimations}
                onDaySelect={(date) => {
                  const flatCalendarData = calendarData.flat();
                  const calendarDay = flatCalendarData.find(
                    (day) => day.date.toDateString() === date.toDateString(),
                  );
                  if (calendarDay) {
                    selectDay(calendarDay);
                  }
                }}
                onChangeMonth={(direction) => changeMonth(direction === "prev" ? -1 : 1)}
              />
            </View>
          ) : (
            <View style={simpleStyles.eventsListContainer}>
              {loading && (
                <View style={simpleStyles.centeredContent}>
                  <Animated.View style={spinStyles}>
                    <Feather name="loader" size={30} color={THEME.primary} />
                  </Animated.View>
                  <Text style={simpleStyles.loadingText}>Loading events...</Text>
                </View>
              )}

              {!loading && filteredEvents.length === 0 && (
                <View style={simpleStyles.centeredContent}>
                  <Text style={simpleStyles.noEventsText}>No events found</Text>
                  <Text style={simpleStyles.noEventsSubtext}>
                    {searchQuery
                      ? "Try adjusting your search criteria"
                      : "There are no events scheduled yet"}
                  </Text>
                  {hasPermissionToCreate && (
                    <TouchableOpacity style={simpleStyles.createButton} onPress={openAddModal}>
                      <Text style={simpleStyles.createButtonText}>Create Event</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {!loading && filteredEvents.length > 0 && (
                <View style={simpleStyles.eventsGrid}>
                  {filteredEvents.map((item, index) => (
                    <View
                      key={item.id.toString()}
                      style={[
                        simpleStyles.eventCard,
                        index < filteredEvents.length - 1 && { marginBottom: 16 },
                      ]}
                    >
                      <EventCard
                        item={item}
                        currentUserId={currentUser?.id}
                        hasPermissionToCreate={hasPermissionToCreate}
                        onEdit={handleSelectEventForEdit}
                        onDelete={handleDeleteEvent}
                        onImagePress={openImageViewer}
                        onView={handleViewEventDetails}
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button with proper touchable area */}
      {hasPermissionToCreate && (
        <Animated.View style={[simpleStyles.fabContainer, fabStyle]}>
          <TouchableOpacity
            style={simpleStyles.fab}
            onPress={openAddModal}
            activeOpacity={0.8}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Feather name="plus" size={24} color="#FFF" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Event Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        {detailEvent && (
          <EventDetail
            event={detailEvent}
            onClose={() => setShowDetailModal(false)}
            onEdit={
              hasPermissionToCreate ||
              (!!currentUser?.id &&
                (detailEvent.created_by === currentUser.id ||
                  userChurches.some(
                    (church) =>
                      church.id === detailEvent.church_id &&
                      ["admin", "owner"].includes(church.role.toLowerCase()),
                  )))
                ? handleSelectEventForEdit
                : undefined
            }
            onDelete={
              hasPermissionToCreate ||
              (!!currentUser?.id &&
                (detailEvent.created_by === currentUser.id ||
                  userChurches.some(
                    (church) =>
                      church.id === detailEvent.church_id &&
                      ["admin", "owner"].includes(church.role.toLowerCase()),
                  )))
                ? handleDeleteEvent
                : undefined
            }
          />
        )}
      </Modal>

      {/* Event Form Modals */}
      <Modal
        visible={showAddModal || showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (showAddModal) setShowAddModal(false);
          if (showEditModal) setShowEditModal(false);
        }}
      >
        <EventForm
          isEditing={showEditModal}
          formData={formData}
          showTimePicker={showTimePicker}
          showEndDatePicker={showEndDatePicker}
          isSubmitting={isSubmitting}
          onClose={() => {
            if (showAddModal) setShowAddModal(false);
            if (showEditModal) setShowEditModal(false);
          }}
          onChange={handleFormChange}
          onDateChange={handleDateTimeChange}
          onEndDateChange={handleEndDateChange}
          onToggleRecurrenceDay={toggleRecurrenceDay}
          onPickImage={pickImage}
          onSubmit={showEditModal ? handleEditEvent : handleAddEvent}
          setShowTimePicker={setShowTimePicker}
          setShowEndDatePicker={setShowEndDatePicker}
          formImageLoading={formImageLoading}
        />
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        {selectedImage && (
          <View style={simpleStyles.imageViewerContainer}>
            <TouchableOpacity
              style={simpleStyles.closeImageButton}
              onPress={() => setShowImageModal(false)}
            >
              <Feather name="x" size={24} color="#FFF" />
            </TouchableOpacity>
            <Image
              source={{ uri: selectedImage }}
              style={simpleStyles.fullscreenImage}
              resizeMode="contain"
            />
          </View>
        )}
      </Modal>

      {/* Selected Date Detail Modal */}
      <Modal
        visible={showDateDetail}
        transparent={true}
        animationType="none"
        onRequestClose={closeDateDetail}
      >
        <Pressable style={simpleStyles.modalOverlay} onPress={closeDateDetail}>
          <Animated.View
            style={[
              simpleStyles.dateDetailContainer,
              {
                transform: [{ translateY: detailSlideAnim }],
              },
            ]}
          >
            <View style={simpleStyles.dateDetailHeader}>
              <View>
                <Text style={simpleStyles.dateDetailTitle}>
                  {selectedDate
                    ? new Date(selectedDate).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })
                    : ""}
                </Text>
                <Text style={simpleStyles.dateDetailSubtitle}>
                  {selectedDayEvents.length} Event{selectedDayEvents.length !== 1 ? "s" : ""}
                </Text>
              </View>
              <TouchableOpacity onPress={closeDateDetail} style={simpleStyles.closeButton}>
                <Feather name="x" size={24} color={THEME.textDark} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={selectedDayEvents}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderEventItem}
              ListEmptyComponent={() => (
                <View style={simpleStyles.centeredContent}>
                  <Feather name="calendar" size={40} color={THEME.textLight} />
                  <Text style={simpleStyles.noEventsText}>No events scheduled for this day</Text>
                </View>
              )}
              contentContainerStyle={{
                flexGrow: 1,
                maxHeight: height * 0.4,
                paddingBottom: 20,
              }}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
            />
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
};

// Simple clean styles
const simpleStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.pageBg,
  },
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 120 : 100,
    zIndex: 10,
    overflow: "hidden",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  shimmerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: width * 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 0 : 10,
    height: 60,
    zIndex: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  scrollView: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    paddingBottom: 100,
    flexGrow: 1,
  },
  heroSection: {
    height: 350,
    width: "100%",
    overflow: "hidden",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroBackground: {
    flex: 1,
  },
  heroGradient: {
    flex: 1,
    justifyContent: "flex-end",
  },
  heroContent: {
    padding: 30,
    paddingBottom: 60,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  // Decorative elements
  decorElement1: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.15)",
    top: -30,
    right: -30,
    zIndex: 1,
  },
  decorElement2: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.1)",
    top: 70,
    left: -20,
    zIndex: 1,
  },
  decorElement3: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.08)",
    bottom: 60,
    right: 40,
    zIndex: 1,
  },
  iconContainer: {
    width: 70,
    height: 70,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 10,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  heroSubtitle: {
    fontSize: 18,
    color: "rgba(255,255,255,0.95)",
    marginBottom: 30,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
    fontWeight: "500",
    lineHeight: 24,
  },
  addEventButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  addEventButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    marginRight: 10,
  },
  searchContainer: {
    marginHorizontal: 20,
    marginTop: -50,
    marginBottom: 15,
    zIndex: 10,
  },
  searchBar: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: THEME.textDark,
  },
  mainContainer: {
    paddingHorizontal: 20,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.textDark,
    marginBottom: 12,
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 20,
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  pillActive: {
    backgroundColor: THEME.primary,
  },
  pillText: {
    color: THEME.textDark,
    fontWeight: "500",
  },
  pillTextActive: {
    color: "#FFFFFF",
  },
  viewSelector: {
    flexDirection: "row",
    marginBottom: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 30,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  viewOption: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 26,
  },
  viewOptionActive: {
    backgroundColor: THEME.primary,
  },
  viewOptionText: {
    marginLeft: 8,
    fontWeight: "600",
    color: THEME.textMedium,
  },
  calendarWrapper: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  eventsListContainer: {
    marginBottom: 20,
  },
  centeredContent: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: THEME.textMedium,
    marginTop: 16,
    fontSize: 16,
  },
  noEventsText: {
    fontSize: 20,
    fontWeight: "600",
    color: THEME.textDark,
    marginTop: 20,
    marginBottom: 8,
  },
  noEventsSubtext: {
    fontSize: 16,
    color: THEME.textMedium,
    textAlign: "center",
    marginBottom: 24,
  },
  createButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: THEME.primary,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  eventsGrid: {
    flex: 1,
  },
  eventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  fabContainer: {
    position: "absolute",
    bottom: 30,
    right: 30,
    zIndex: 10,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  eventItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME.textDark,
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: THEME.textMedium,
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeImageButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullscreenImage: {
    width: width,
    height: height * 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  dateDetailContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  dateDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  dateDetailTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.textDark,
  },
  dateDetailSubtitle: {
    fontSize: 14,
    color: THEME.textMedium,
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
  },
});

export default ChurchEvents;
