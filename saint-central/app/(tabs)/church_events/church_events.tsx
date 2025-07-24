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

  // Animation values for decorative elements
  const holyGlow = useSharedValue(0);
  const crossGlow = useSharedValue(0);
  const doveFloat = useSharedValue(0);
  const shimmerValue = useSharedValue(-width);

  // Start animations for decorative elements
  useEffect(() => {
    // Holy glow animation
    holyGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    // Cross glow animation
    crossGlow.value = withDelay(
      1000,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.2, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );

    // Dove floating animation
    doveFloat.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-1, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    // Shimmer animation
    shimmerValue.value = withRepeat(
      withTiming(width, { duration: 3000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  // Holy glow style
  const holyGlowStyle = useAnimatedStyle(() => {
    return {
      opacity: holyGlow.value * 0.7,
      transform: [
        { scale: interpolate(holyGlow.value, [0, 1], [0.8, 1.2], Extrapolate.CLAMP) },
        { scale: interpolate(scrollY.value, [0, 150], [1, 0.6], Extrapolate.CLAMP) },
      ],
    };
  });

  // Cross glow style
  const crossGlowStyle = useAnimatedStyle(() => {
    return {
      opacity: crossGlow.value * 0.8,
      transform: [
        { scale: interpolate(crossGlow.value, [0, 1], [0.9, 1.1], Extrapolate.CLAMP) },
        { scale: interpolate(scrollY.value, [0, 150], [1, 0.5], Extrapolate.CLAMP) },
      ],
    };
  });

  // Dove floating style
  const doveFloatStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: doveFloat.value * 8 },
        { translateX: doveFloat.value * 4 },
        { scale: interpolate(scrollY.value, [0, 150], [1, 0.4], Extrapolate.CLAMP) },
      ],
      opacity: interpolate(scrollY.value, [0, 100], [0.6, 0], Extrapolate.CLAMP),
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
      [480, Platform.OS === "ios" ? 120 : 100],
      Extrapolate.CLAMP,
    );
    return { height };
  });

  // Header background opacity with smoother transition
  const headerBgStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, 100], [0, 1], Extrapolate.CLAMP);
    const blur = interpolate(scrollY.value, [0, 100], [0, 20], Extrapolate.CLAMP);
    return { opacity };
  });

  // Parallax image animation
  const parallaxImageStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [0, 150], [0, -50], Extrapolate.CLAMP);
    const scale = interpolate(scrollY.value, [0, 150], [1, 1.2], Extrapolate.CLAMP);
    return {
      transform: [{ translateY }, { scale }],
    };
  });

  // Hero content opacity with enhanced fade effect
  const heroOpacityStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, 70, 120], [1, 0.8, 0], Extrapolate.CLAMP);
    const translateY = interpolate(scrollY.value, [0, 120], [0, -40], Extrapolate.CLAMP);
    const scale = interpolate(scrollY.value, [0, 120], [1, 0.9], Extrapolate.CLAMP);
    return {
      opacity,
      transform: [{ translateY }, { scale }],
    };
  });

  // Header title animation
  const headerTitleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [50, 100], [0, 1], Extrapolate.CLAMP);
    const translateY = interpolate(scrollY.value, [50, 100], [20, 0], Extrapolate.CLAMP);
    return {
      opacity,
      transform: [{ translateY }],
    };
  });


  // Use custom hooks
  const {
    user,
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
    calendarEntranceAnim,
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
  } = useEventForm(user?.id || null, selectedChurchId, hasPermissionToCreate, fetchEvents);

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
      style={enhancedStyles.eventItem}
      onPress={() => {
        closeDateDetail();
        setTimeout(() => {
          handleViewEventDetails(item);
        }, 300);
      }}
    >
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: item.color || THEME.primary,
          marginRight: 12,
          shadowColor: item.color || THEME.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.4,
          shadowRadius: 4,
          elevation: 3,
        }}
      />
      <View style={{ flex: 1 }}>
        <Text style={enhancedStyles.eventTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={enhancedStyles.eventTime}>
          {new Date(item.time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={enhancedStyles.container}>
      <StatusBar style="light" translucent />

      {/* Enhanced Hero Section */}
      <Animated.View
        style={[
          enhancedStyles.heroSection,
          headerHeightStyle,
          { position: "absolute", top: 0, left: 0, right: 0, zIndex: 1 },
        ]}
      >
        {/* Parallax Background with Divine Imagery */}
        <Animated.View style={[StyleSheet.absoluteFill, parallaxImageStyle]}>
          <ImageBackground
            source={{
              uri: "https://images.unsplash.com/photo-1507692049790-de58290a4334?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
            }}
            style={enhancedStyles.heroBackground}
            resizeMode="cover"
          >
            {/* Enhanced Gradient with Warm Christian Colors */}
            <LinearGradient
              colors={[
                "rgba(28, 25, 23, 0.1)",
                "rgba(28, 25, 23, 0.4)",
                "rgba(28, 25, 23, 0.7)",
                "rgba(28, 25, 23, 0.9)",
              ]}
              style={enhancedStyles.heroGradient}
              locations={[0, 0.3, 0.7, 1]}
            />
          </ImageBackground>
        </Animated.View>

        {/* Divine Decorative Elements */}
        <Animated.View style={[enhancedStyles.holyGlow, holyGlowStyle]} pointerEvents="none">
          <LinearGradient
            colors={[`${THEME.primary}40`, `${THEME.accent1}30`, `${THEME.primary}20`]}
            style={enhancedStyles.glowCircle}
          />
        </Animated.View>

        <Animated.View style={[enhancedStyles.crossGlow, crossGlowStyle]} pointerEvents="none">
          <View style={enhancedStyles.crossVertical} />
          <View style={enhancedStyles.crossHorizontal} />
        </Animated.View>

        <Animated.View style={[enhancedStyles.doveFloat, doveFloatStyle]} pointerEvents="none">
          <Feather name="heart" size={24} color={`${THEME.accent2}60`} />
        </Animated.View>

        {/* Shimmer Effect */}
        <Animated.View style={[enhancedStyles.shimmerOverlay, shimmerStyle]} pointerEvents="none">
          <LinearGradient
            colors={[
              "rgba(245, 158, 11, 0)",
              "rgba(245, 158, 11, 0.3)",
              "rgba(251, 191, 36, 0.4)",
              "rgba(245, 158, 11, 0.3)",
              "rgba(245, 158, 11, 0)",
            ]}
            style={{ flex: 1 }}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
          />
        </Animated.View>

        {/* Hero Content with Enhanced Typography */}
        <Animated.View style={[enhancedStyles.heroContent, heroOpacityStyle]}>
          <View style={enhancedStyles.iconContainer}>
            <Feather name="calendar" size={32} color={THEME.textWhite} />
          </View>
          <Text style={enhancedStyles.heroSubtitle}>
            "For where two or three gather in my name, there am I with them."
          </Text>
          <Text style={enhancedStyles.heroBibleVerse}>Matthew 18:20</Text>
          {hasPermissionToCreate && (
            <TouchableOpacity
              style={enhancedStyles.addEventButton}
              onPress={openAddModal}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={THEME.gradientPrimary}
                style={enhancedStyles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Feather name="plus-circle" size={20} color="#FFFFFF" />
                <Text style={enhancedStyles.addEventButtonText}>Create New Event</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </Animated.View>
      </Animated.View>

      {/* Enhanced Header with Better Blur */}
      <Animated.View
        style={[enhancedStyles.headerBackground, headerBgStyle]}
        pointerEvents="box-none"
      >
        <BlurView
          intensity={Platform.OS === "ios" ? 40 : 100}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={[`${THEME.neutral900}F0`, `${THEME.neutral800}E0`]}
          style={StyleSheet.absoluteFill}
        />
        <View style={enhancedStyles.headerBorder} />
      </Animated.View>

      {/* Safe Area for Header */}
      <SafeAreaView style={{ zIndex: 20, backgroundColor: "transparent" }} pointerEvents="box-none">
        <View style={enhancedStyles.header}>
          <Animated.Text style={[enhancedStyles.headerTitle, headerTitleStyle]}>
            Church Events
          </Animated.Text>
          {hasPermissionToCreate && (
            <TouchableOpacity
              style={enhancedStyles.headerButton}
              onPress={openAddModal}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[`${THEME.primary}40`, `${THEME.primary}60`]}
                style={enhancedStyles.headerButtonGradient}
              >
                <Feather name="plus" size={20} color={THEME.textWhite} />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {/* Enhanced Main Content */}
      <ScrollView
        style={enhancedStyles.scrollView}
        contentContainerStyle={[enhancedStyles.scrollContent, { paddingTop: 480 }]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        bounces={true}
        onScroll={(event) => {
          scrollY.value = event.nativeEvent.contentOffset.y;
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.primary}
            progressBackgroundColor={THEME.neutral100}
            progressViewOffset={200}
            colors={[THEME.primary, THEME.accent1, THEME.secondary]}
          />
        }
      >
        {/* Enhanced Search Bar */}
        <View style={enhancedStyles.searchContainer}>
          <LinearGradient
            colors={[THEME.neutral100, THEME.neutral50]}
            style={enhancedStyles.searchBar}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <Feather name="search" size={20} color={THEME.neutral600} style={{ marginRight: 12 }} />
            <TextInput
              style={enhancedStyles.searchInput}
              placeholder="Search church events..."
              placeholderTextColor={THEME.neutral500}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery !== "" && (
              <TouchableOpacity onPress={() => setSearchQuery("")} style={enhancedStyles.clearButton}>
                <Feather name="x" size={18} color={THEME.neutral600} />
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>

        {/* Main Content Container */}
        <View style={enhancedStyles.mainContainer}>
          {/* Enhanced Church Selector */}
          {userChurches.length > 0 && (
            <View style={enhancedStyles.sectionContainer}>
              <Text style={enhancedStyles.sectionTitle}>Church Events</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                {userChurches.map((church) => (
                  <TouchableOpacity
                    key={church.id}
                    style={[
                      enhancedStyles.pill,
                      selectedChurchId === church.id && enhancedStyles.pillActive,
                    ]}
                    onPress={() => setSelectedChurchId(church.id)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={
                        selectedChurchId === church.id
                          ? THEME.gradientPrimary
                          : [THEME.neutral200, THEME.neutral100]
                      }
                      style={enhancedStyles.pillGradient}
                    >
                      <Text
                        style={[
                          enhancedStyles.pillText,
                          selectedChurchId === church.id && enhancedStyles.pillTextActive,
                        ]}
                      >
                        {church.name}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Enhanced View Selector */}
          <View style={enhancedStyles.viewSelector}>
            <LinearGradient
              colors={[THEME.neutral200, THEME.neutral100]}
              style={enhancedStyles.viewSelectorGradient}
            >
              <TouchableOpacity
                style={[
                  enhancedStyles.viewOption,
                  calendarView === "list" && enhancedStyles.viewOptionActive,
                ]}
                onPress={() => setCalendarView("list")}
                activeOpacity={0.8}
              >
                {calendarView === "list" && (
                  <LinearGradient
                    colors={THEME.gradientPrimary}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Feather
                  name="list"
                  size={18}
                  color={calendarView === "list" ? THEME.textWhite : THEME.neutral600}
                />
                <Text
                  style={[
                    enhancedStyles.viewOptionText,
                    calendarView === "list" && { color: THEME.textWhite },
                  ]}
                >
                  List
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  enhancedStyles.viewOption,
                  calendarView === "month" && enhancedStyles.viewOptionActive,
                ]}
                onPress={() => setCalendarView("month")}
                activeOpacity={0.8}
              >
                {calendarView === "month" && (
                  <LinearGradient
                    colors={THEME.gradientPrimary}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Feather
                  name="calendar"
                  size={18}
                  color={calendarView === "month" ? THEME.textWhite : THEME.neutral600}
                />
                <Text
                  style={[
                    enhancedStyles.viewOptionText,
                    calendarView === "month" && { color: THEME.textWhite },
                  ]}
                >
                  Calendar
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* Calendar or List View */}
          {calendarView === "month" ? (
            <View style={enhancedStyles.calendarWrapper}>
              <Calendar
                loading={loading}
                currentMonth={currentMonth}
                calendarData={calendarData}
                selectedDate={selectedDate}
                calendarEntranceAnim={calendarEntranceAnim}
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
            <View style={enhancedStyles.eventsListContainer}>
              {loading && (
                <View style={enhancedStyles.centeredContent}>
                  <Animated.View style={spinStyles}>
                    <Feather name="loader" size={32} color={THEME.primary} />
                  </Animated.View>
                  <Text style={enhancedStyles.loadingText}>Loading church events...</Text>
                </View>
              )}

              {!loading && filteredEvents.length === 0 && (
                <View style={enhancedStyles.noEventsContainer}>
                  <View style={enhancedStyles.emptyIconContainer}>
                    <Feather name="calendar" size={48} color={THEME.neutral400} />
                  </View>
                  <Text style={enhancedStyles.noEventsText}>No events scheduled</Text>
                  <Text style={enhancedStyles.noEventsSubtext}>
                    "Be still and know that I am God" - Psalm 46:10
                  </Text>
                  {hasPermissionToCreate && (
                    <TouchableOpacity
                      style={enhancedStyles.createEventButton}
                      onPress={openAddModal}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={THEME.gradientPrimary}
                        style={enhancedStyles.createButtonGradient}
                      >
                        <Feather name="plus-circle" size={20} color={THEME.textWhite} />
                        <Text style={enhancedStyles.createEventButtonText}>Create Church Event</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {!loading && filteredEvents.length > 0 && (
                <View style={enhancedStyles.eventsGrid}>
                  {filteredEvents.map((item, index) => (
                    <View
                      key={item.id.toString()}
                      style={[
                        enhancedStyles.eventCard,
                        index < filteredEvents.length - 1 && { marginBottom: 20 },
                      ]}
                    >
                      <EventCard
                        item={item}
                        currentUserId={user?.id}
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


      {/* Modals remain the same but with enhanced styling context */}
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
              (!!user?.id &&
                (detailEvent.created_by === user.id ||
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
              (!!user?.id &&
                (detailEvent.created_by === user.id ||
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

      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        {selectedImage && (
          <View style={enhancedStyles.imageViewerContainer}>
            <TouchableOpacity
              style={enhancedStyles.closeImageButton}
              onPress={() => setShowImageModal(false)}
            >
              <View style={enhancedStyles.closeIconContainer}>
                <Feather name="x" size={24} color={THEME.textWhite} />
              </View>
            </TouchableOpacity>
            <Image
              source={{ uri: selectedImage }}
              style={enhancedStyles.fullscreenImage}
              resizeMode="contain"
            />
          </View>
        )}
      </Modal>

      <Modal
        visible={showDateDetail}
        transparent={true}
        animationType="none"
        onRequestClose={closeDateDetail}
      >
        <Pressable style={enhancedStyles.modalOverlay} onPress={closeDateDetail}>
          <Animated.View
            style={[
              enhancedStyles.dateDetailContainer,
              {
                transform: [{ translateY: detailSlideAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={[THEME.neutral50, THEME.neutral100]}
              style={StyleSheet.absoluteFill}
            />
            <View style={enhancedStyles.dateDetailHeader}>
              <View>
                <Text style={enhancedStyles.dateDetailTitle}>
                  {selectedDate
                    ? new Date(selectedDate).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })
                    : ""}
                </Text>
                <Text style={enhancedStyles.dateDetailSubtitle}>
                  {selectedDayEvents.length} Church Event{selectedDayEvents.length !== 1 ? "s" : ""}
                </Text>
              </View>
              <TouchableOpacity onPress={closeDateDetail} style={enhancedStyles.closeButton}>
                <Feather name="x" size={24} color={THEME.textDark} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={selectedDayEvents}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderEventItem}
              ListEmptyComponent={() => (
                <View style={enhancedStyles.centeredContent}>
                  <Feather name="calendar" size={48} color={THEME.neutral400} />
                  <Text style={enhancedStyles.noEventsText}>No events scheduled for this day</Text>
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

// Enhanced Styles with Christian Theme
const enhancedStyles = StyleSheet.create({
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
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerBorder: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: `${THEME.primary}40`,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 0 : 10,
    height: 60,
    zIndex: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: THEME.textWhite,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    ...THEME.shadowMedium,
  },
  headerButtonGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: `${THEME.primary}30`,
  },
  scrollView: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    paddingBottom: 120,
    flexGrow: 1,
  },
  heroSection: {
    height: 480,
    width: "100%",
    overflow: "hidden",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroBackground: {
    flex: 1,
  },
  heroGradient: {
    flex: 1,
    justifyContent: "flex-end",
  },
  heroContent: {
    padding: 32,
    paddingBottom: 50,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 40,
    backgroundColor: `${THEME.primary}30`,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: `${THEME.primary}40`,
    ...THEME.shadowMedium,
  },
  heroSubtitle: {
    fontSize: 18,
    color: THEME.accent2,
    marginBottom: 8,
    textAlign: "center",
    fontStyle: "italic",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    fontWeight: "500",
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  heroBibleVerse: {
    fontSize: 14,
    color: `${THEME.accent2}CC`,
    marginBottom: 32,
    textAlign: "center",
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  addEventButton: {
    borderRadius: 32,
    overflow: "hidden",
    ...THEME.shadowMedium,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  addEventButtonText: {
    color: THEME.textWhite,
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 12,
  },
  // Decorative Elements
  holyGlow: {
    position: "absolute",
    width: 200,
    height: 200,
    top: -50,
    right: -50,
    zIndex: 1,
  },
  glowCircle: {
    flex: 1,
    borderRadius: 100,
  },
  crossGlow: {
    position: "absolute",
    width: 60,
    height: 60,
    top: 100,
    left: 50,
    zIndex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  crossVertical: {
    position: "absolute",
    width: 4,
    height: 40,
    backgroundColor: `${THEME.accent2}60`,
    borderRadius: 2,
  },
  crossHorizontal: {
    position: "absolute",
    width: 24,
    height: 4,
    backgroundColor: `${THEME.accent2}60`,
    borderRadius: 2,
  },
  doveFloat: {
    position: "absolute",
    bottom: 120,
    right: 60,
    zIndex: 1,
  },
  shimmerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: width * 2,
    zIndex: 2,
  },
  searchContainer: {
    marginHorizontal: 24,
    marginTop: -80,
    marginBottom: 20,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    ...THEME.shadowLight,
    overflow: "hidden",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: THEME.textDark,
    fontWeight: "500",
  },
  clearButton: {
    padding: 4,
  },
  mainContainer: {
    paddingHorizontal: 24,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: THEME.textMedium,
    marginBottom: 16,
    textAlign: "center",
  },
  pill: {
    borderRadius: 24,
    marginRight: 12,
    overflow: "hidden",
    ...THEME.shadowLight,
  },
  pillGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  pillText: {
    color: THEME.textDark,
    fontWeight: "600",
    fontSize: 14,
  },
  pillTextActive: {
    color: THEME.textWhite,
  },
  viewSelector: {
    marginBottom: 24,
    borderRadius: 32,
    overflow: "hidden",
    ...THEME.shadowLight,
  },
  viewSelectorGradient: {
    flexDirection: "row",
    padding: 6,
  },
  viewOption: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 26,
    overflow: "hidden",
  },
  viewOptionActive: {
    overflow: "hidden",
  },
  viewOptionText: {
    marginLeft: 8,
    fontWeight: "700",
    color: THEME.neutral600,
    fontSize: 14,
  },
  calendarWrapper: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: THEME.neutral50,
    ...THEME.shadowLight,
  },
  eventsListContainer: {
    marginBottom: 24,
  },
  centeredContent: {
    padding: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: THEME.textMedium,
    marginTop: 20,
    fontSize: 16,
    fontWeight: "600",
  },
  noEventsContainer: {
    padding: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.cardBg,
    borderRadius: 20,
    margin: 4,
    ...THEME.shadowLight,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${THEME.neutral300}30`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  noEventsText: {
    fontSize: 22,
    fontWeight: "700",
    color: THEME.textMedium,
    marginBottom: 12,
    textAlign: "center",
  },
  noEventsSubtext: {
    fontSize: 16,
    color: THEME.textLight,
    textAlign: "center",
    marginBottom: 32,
    fontStyle: "italic",
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  createEventButton: {
    borderRadius: 32,
    overflow: "hidden",
    ...THEME.shadowMedium,
  },
  createButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 28,
  },
  createEventButtonText: {
    color: THEME.textWhite,
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 12,
  },
  eventsGrid: {
    flex: 1,
  },
  eventCard: {
    backgroundColor: THEME.neutral50,
    borderRadius: 20,
    overflow: "hidden",
    ...THEME.shadowLight,
  },
  eventItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: `${THEME.neutral300}40`,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.textDark,
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: THEME.neutral600,
    fontWeight: "500",
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeImageButton: {
    position: "absolute",
    top: 60,
    right: 24,
    zIndex: 10,
  },
  closeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    width: width,
    height: height * 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  dateDetailContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    overflow: "hidden",
    ...THEME.shadowHeavy,
  },
  dateDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: `${THEME.neutral300}40`,
  },
  dateDetailTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: THEME.textDark,
  },
  dateDetailSubtitle: {
    fontSize: 14,
    color: THEME.neutral600,
    marginTop: 4,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
  },
});

export default ChurchEvents;