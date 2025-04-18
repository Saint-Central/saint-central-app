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
  withDelay,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
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

// Import styles and themes - updated to use root theme
import { styles } from "./styles";
import THEME from "../../../theme";
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
  const fabOpacity = useSharedValue(1);
  const fabScale = useSharedValue(1);

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

  const fabAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: fabOpacity.value,
      transform: [
        { scale: fabScale.value },
        { translateY: interpolate(scrollY.value, [0, 300], [0, 80], Extrapolate.CLAMP) },
      ],
    };
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

  // Animation for FAB
  const hideFab = () => {
    fabOpacity.value = withTiming(0, { duration: 200 });
    fabScale.value = withTiming(0, { duration: 200 });
  };

  const showFab = () => {
    fabOpacity.value = withTiming(1, { duration: 200 });
    fabScale.value = withSpring(1, { damping: 12 });
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
    <View style={[styles.container, { backgroundColor: THEME.pageBg }]}>
      <StatusBar style="auto" />

      {/* Header - always rendered */}
      <SafeAreaView style={[styles.safeArea, { backgroundColor: THEME.pageBg }]}>
        <View
          style={[
            styles.header,
            {
              borderBottomColor: THEME.divider,
              backgroundColor: THEME.pageBg,
              ...THEME.shadowLight,
            },
          ]}
        >
          <Animated.Text
            style={[
              styles.headerTitle,
              titleOpacityStyle,
              {
                color: THEME.textDark,
                fontSize: 26,
                fontWeight: THEME.fontBold,
              },
            ]}
          >
            Church Events
          </Animated.Text>
          <View style={styles.headerButtons}>
            {hasPermissionToCreate && (
              <TouchableOpacity
                style={[
                  styles.headerButton,
                  {
                    backgroundColor: THEME.neutral100,
                    ...THEME.shadowLight,
                  },
                ]}
                onPress={openAddModal}
              >
                <Feather name="plus" size={24} color={THEME.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* Main content area - always a ScrollView for consistency */}
      <Animated.ScrollView
        style={[styles.scrollView, { backgroundColor: THEME.pageBg }]}
        contentContainerStyle={styles.scrollViewContent}
        scrollEventThrottle={16}
        onScroll={useAnimatedScrollHandler({
          onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
            if (event.contentOffset.y > 100 && fabOpacity.value === 1) {
              runOnJS(hideFab)();
            } else if (event.contentOffset.y <= 100 && fabOpacity.value === 0) {
              runOnJS(showFab)();
            }
          },
        })}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero section */}
        <Animated.View
          style={[
            styles.heroSection,
            headerAnimatedStyle,
            headerOpacityStyle,
            {
              borderRadius: THEME.radiusLarge,
              ...THEME.shadowMedium,
            },
          ]}
          entering={FadeIn.duration(800)}
        >
          <ImageBackground
            source={{
              uri: "https://images.unsplash.com/photo-1511747779829-1d858eac30cc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80",
            }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          >
            <LinearGradient colors={THEME.gradientPrimary} style={styles.heroBackground}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: "rgba(255,255,255,0.2)",
                    borderRadius: THEME.radiusFull,
                    padding: THEME.spacingL,
                  },
                ]}
              >
                <Feather name="calendar" size={30} color="#FFFFFF" />
              </View>
              <Text
                style={[
                  styles.heroTitle,
                  {
                    color: THEME.textWhite,
                    fontSize: 28,
                    fontWeight: THEME.fontBold,
                    marginTop: THEME.spacingL,
                  },
                ]}
              >
                Church Events
              </Text>
              <Text
                style={[
                  styles.heroSubtitle,
                  {
                    color: THEME.textWhite,
                    fontSize: 16,
                    opacity: 0.9,
                    marginBottom: THEME.spacingL,
                  },
                ]}
              >
                Stay updated with church events and activities
              </Text>
              {hasPermissionToCreate && (
                <TouchableOpacity
                  style={[
                    styles.addEventButton,
                    {
                      backgroundColor: "rgba(255,255,255,0.2)",
                      borderRadius: THEME.radiusFull,
                      paddingVertical: THEME.spacingM,
                      paddingHorizontal: THEME.spacingXL,
                      flexDirection: "row",
                      alignItems: "center",
                    },
                  ]}
                  onPress={() => openAddModal()}
                >
                  <Text
                    style={[
                      styles.addEventButtonText,
                      {
                        color: THEME.textWhite,
                        marginRight: THEME.spacingS,
                      },
                    ]}
                  >
                    Create New Event
                  </Text>
                  <Feather name="plus-circle" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </LinearGradient>
          </ImageBackground>
        </Animated.View>

        {/* Search bar */}
        <Animated.View
          style={[
            styles.searchContainer,
            {
              backgroundColor: THEME.cardBg,
              borderColor: THEME.divider,
              borderRadius: THEME.radiusMedium,
              ...THEME.shadowLight,
              marginVertical: THEME.spacingL,
            },
          ]}
          entering={FadeIn.delay(200).duration(600)}
        >
          <Feather name="search" size={20} color={THEME.textMedium} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: THEME.textDark }]}
            placeholder="Search events..."
            placeholderTextColor={THEME.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== "" && (
            <TouchableOpacity style={styles.clearSearchButton} onPress={() => setSearchQuery("")}>
              <Feather name="x" size={20} color={THEME.textMedium} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Main content */}
        <View style={styles.mainContent}>
          {/* Church Selector */}
          {userChurches.length > 0 && (
            <Animated.View
              style={[
                styles.churchSelectorContainer,
                {
                  marginHorizontal: THEME.spacingL,
                  marginBottom: THEME.spacingL,
                },
              ]}
              entering={FadeIn.delay(300).duration(600)}
            >
              <Text
                style={[
                  styles.selectorLabel,
                  {
                    color: THEME.textDark,
                    fontWeight: THEME.fontMedium,
                    marginBottom: THEME.spacingS,
                  },
                ]}
              >
                Your Churches
              </Text>
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
                      {
                        backgroundColor:
                          selectedChurchId === church.id ? THEME.primary : THEME.cardBg,
                        borderRadius: THEME.radiusFull,
                        paddingVertical: THEME.spacingM,
                        paddingHorizontal: THEME.spacingXL,
                        marginRight: THEME.spacingM,
                        ...THEME.shadowLight,
                      },
                    ]}
                    onPress={() => setSelectedChurchId(church.id)}
                  >
                    <Text
                      style={[
                        styles.churchOptionText,
                        {
                          color: selectedChurchId === church.id ? THEME.textWhite : THEME.textDark,
                          fontWeight: THEME.fontMedium,
                        },
                      ]}
                    >
                      {church.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* View Selector */}
          <Animated.View
            style={[
              styles.viewSelector,
              {
                backgroundColor: THEME.neutral100,
                borderRadius: THEME.radiusFull,
                ...THEME.shadowLight,
                marginBottom: THEME.spacingXL,
              },
            ]}
            entering={FadeIn.delay(400).duration(600)}
          >
            <TouchableOpacity
              style={[
                styles.viewOption,
                calendarView === "list" && [
                  styles.viewOptionActive,
                  {
                    backgroundColor: THEME.primary,
                    borderRadius: THEME.radiusFull,
                  },
                ],
              ]}
              onPress={() => setCalendarView("list")}
            >
              <Feather
                name="list"
                size={16}
                color={calendarView === "list" ? THEME.textWhite : THEME.textMedium}
              />
              <Text
                style={[
                  styles.viewOptionText,
                  {
                    color: calendarView === "list" ? THEME.textWhite : THEME.textMedium,
                    marginLeft: THEME.spacingS,
                    fontWeight: THEME.fontMedium,
                  },
                ]}
              >
                List
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.viewOption,
                calendarView === "month" && [
                  styles.viewOptionActive,
                  {
                    backgroundColor: THEME.primary,
                    borderRadius: THEME.radiusFull,
                  },
                ],
              ]}
              onPress={() => setCalendarView("month")}
            >
              <Feather
                name="calendar"
                size={16}
                color={calendarView === "month" ? THEME.textWhite : THEME.textMedium}
              />
              <Text
                style={[
                  styles.viewOptionText,
                  {
                    color: calendarView === "month" ? THEME.textWhite : THEME.textMedium,
                    marginLeft: THEME.spacingS,
                    fontWeight: THEME.fontMedium,
                  },
                ]}
              >
                Calendar
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Calendar View */}
          {calendarView === "month" && (
            <Animated.View entering={FadeIn.duration(600)}>
              <Calendar
                loading={loading}
                currentMonth={currentMonth}
                calendarData={calendarData}
                selectedDate={selectedDate}
                dayAnimations={dayAnimations}
                onDaySelect={selectDay}
                onChangeMonth={changeMonth}
              />
            </Animated.View>
          )}

          {/* List View */}
          {calendarView === "list" && (
            <Animated.View style={styles.listContainer} entering={FadeIn.duration(600)}>
              {loading && (
                <View
                  style={[
                    styles.loadingContainer,
                    {
                      paddingVertical: THEME.spacing2XL,
                      alignItems: "center",
                    },
                  ]}
                >
                  <Feather name="loader" size={30} color={THEME.primary} />
                  <Text
                    style={[
                      styles.loadingText,
                      {
                        color: THEME.textMedium,
                        marginTop: THEME.spacingM,
                        fontSize: 16,
                      },
                    ]}
                  >
                    Loading events...
                  </Text>
                </View>
              )}

              {!loading && filteredEvents.length === 0 && (
                <View
                  style={[
                    styles.noEventsContainer,
                    {
                      paddingVertical: THEME.spacing3XL,
                      alignItems: "center",
                    },
                  ]}
                >
                  <Feather name="calendar" size={50} color={THEME.textLight} />
                  <Text
                    style={[
                      styles.noEventsText,
                      {
                        color: THEME.textDark,
                        fontSize: 18,
                        fontWeight: THEME.fontMedium,
                        marginTop: THEME.spacingL,
                      },
                    ]}
                  >
                    No Events Found
                  </Text>
                  <Text
                    style={[
                      styles.noEventsSubtext,
                      {
                        color: THEME.textMedium,
                        textAlign: "center",
                        marginTop: THEME.spacingS,
                        marginHorizontal: THEME.spacingXL,
                      },
                    ]}
                  >
                    {searchQuery
                      ? "Try adjusting your search query."
                      : hasPermissionToCreate
                        ? "Click the + button to create your first event."
                        : "There are no upcoming events to display."}
                  </Text>
                </View>
              )}

              {!loading && filteredEvents.length > 0 && (
                <View
                  style={[
                    styles.eventsList,
                    {
                      paddingHorizontal: THEME.spacingL,
                    },
                  ]}
                >
                  {filteredEvents.map((item) => (
                    <Animated.View
                      key={item.id}
                      entering={FadeIn.duration(600).delay((item.id % 5) * 100)}
                    >
                      <EventCard
                        item={item}
                        currentUserId={currentUser?.id}
                        hasPermissionToCreate={hasPermissionToCreate}
                        onEdit={handleSelectEventForEdit}
                        onDelete={() => handleDeleteEvent(item.id)}
                        onView={handleViewEventDetails}
                        onImagePress={openImageViewer}
                      />
                    </Animated.View>
                  ))}
                </View>
              )}
            </Animated.View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Floating Action Button */}
      {hasPermissionToCreate && (
        <Animated.View
          style={[
            {
              position: "absolute",
              bottom: THEME.spacing2XL,
              right: THEME.spacingXL,
              borderRadius: THEME.radiusFull,
              backgroundColor: THEME.primary,
              padding: THEME.spacingL,
              ...THEME.shadowMedium,
            },
            fabAnimatedStyle,
          ]}
        >
          <TouchableOpacity onPress={openAddModal}>
            <Feather name="plus" size={28} color={THEME.textWhite} />
          </TouchableOpacity>
        </Animated.View>
      )}

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
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={{
            flex: 1,
            backgroundColor: THEME.overlay,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <Animated.View
            entering={SlideInDown.springify().damping(14)}
            exiting={SlideOutDown.duration(300)}
            style={{
              backgroundColor: THEME.cardBg,
              width: "90%",
              maxHeight: "80%",
              borderRadius: THEME.radiusLarge,
              position: "relative",
              overflow: "hidden",
              ...THEME.shadowHeavy,
            }}
          >
            <TouchableOpacity
              style={{
                position: "absolute",
                top: 15,
                right: 15,
                zIndex: 10,
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                borderRadius: THEME.radiusFull,
                padding: THEME.spacingS,
              }}
              onPress={() => setShowDetailModal(false)}
            >
              <Feather name="x" size={24} color={THEME.textDark} />
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

            <ScrollView style={{ padding: THEME.spacingXL, paddingTop: THEME.spacingM }}>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: THEME.fontBold,
                  color: THEME.primary,
                  marginBottom: THEME.spacingL,
                  marginTop: THEME.spacingL,
                }}
              >
                {detailEvent?.title}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: THEME.spacingM,
                }}
              >
                <MaterialIcons name="event" size={20} color={THEME.textMedium} />
                <Text
                  style={{
                    fontSize: 16,
                    marginLeft: THEME.spacingM,
                    color: THEME.textDark,
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
                  marginBottom: THEME.spacingM,
                }}
              >
                <MaterialIcons name="access-time" size={20} color={THEME.textMedium} />
                <Text
                  style={{
                    fontSize: 16,
                    marginLeft: THEME.spacingM,
                    color: THEME.textDark,
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
                  marginBottom: THEME.spacingM,
                }}
              >
                <MaterialIcons name="location-on" size={20} color={THEME.textMedium} />
                <Text
                  style={{
                    fontSize: 16,
                    marginLeft: THEME.spacingM,
                    color: THEME.textDark,
                  }}
                >
                  {detailEvent?.author_name || "No location specified"}
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 18,
                  fontWeight: THEME.fontSemiBold,
                  color: THEME.textDark,
                  marginTop: THEME.spacingXL,
                  marginBottom: THEME.spacingM,
                }}
              >
                Description
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  lineHeight: 24,
                  color: THEME.textMedium,
                }}
              >
                {detailEvent?.excerpt || "No description available"}
              </Text>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Full screen image viewer */}
      <Modal
        visible={!!fullscreenImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullscreenImage(null)}
      >
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={{
            flex: 1,
            backgroundColor: THEME.neutral900,
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
              padding: THEME.spacingM,
            }}
            onPress={() => setFullscreenImage(null)}
          >
            <Feather name="x" size={24} color={THEME.textWhite} />
          </TouchableOpacity>
          {fullscreenImage && (
            <Image
              source={{ uri: fullscreenImage }}
              style={{ width: "100%", height: "80%" }}
              resizeMode="contain"
            />
          )}
        </Animated.View>
      </Modal>

      {/* Add Event Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={[
            styles.modalContainer,
            {
              backgroundColor: THEME.overlay,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setShowAddModal(false)}
            activeOpacity={1}
          />
          <Animated.View
            entering={SlideInDown.springify().damping(14)}
            exiting={SlideOutDown.duration(300)}
            style={[
              styles.modalContent,
              {
                backgroundColor: THEME.cardBg,
                borderTopLeftRadius: THEME.radiusXL,
                borderTopRightRadius: THEME.radiusXL,
                ...THEME.shadowHeavy,
              },
            ]}
          >
            <View
              style={[
                styles.modalHandle,
                {
                  backgroundColor: THEME.neutral300,
                  width: 40,
                  height: 5,
                  borderRadius: 3,
                  marginTop: THEME.spacingM,
                  alignSelf: "center",
                },
              ]}
            />
            <View
              style={[
                styles.modalHeader,
                {
                  paddingHorizontal: THEME.spacingXL,
                  paddingVertical: THEME.spacingL,
                },
              ]}
            >
              <Text
                style={[
                  styles.modalTitle,
                  {
                    fontSize: 20,
                    fontWeight: THEME.fontBold,
                    color: THEME.textDark,
                  },
                ]}
              >
                Create Event
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowAddModal(false)}
              >
                <Feather name="x" size={24} color={THEME.textDark} />
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
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Edit Event Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={[
            styles.modalContainer,
            {
              backgroundColor: THEME.overlay,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setShowEditModal(false)}
            activeOpacity={1}
          />
          <Animated.View
            entering={SlideInDown.springify().damping(14)}
            exiting={SlideOutDown.duration(300)}
            style={[
              styles.modalContent,
              {
                backgroundColor: THEME.cardBg,
                borderTopLeftRadius: THEME.radiusXL,
                borderTopRightRadius: THEME.radiusXL,
                ...THEME.shadowHeavy,
              },
            ]}
          >
            <View
              style={[
                styles.modalHandle,
                {
                  backgroundColor: THEME.neutral300,
                  width: 40,
                  height: 5,
                  borderRadius: 3,
                  marginTop: THEME.spacingM,
                  alignSelf: "center",
                },
              ]}
            />
            <View
              style={[
                styles.modalHeader,
                {
                  paddingHorizontal: THEME.spacingXL,
                  paddingVertical: THEME.spacingL,
                },
              ]}
            >
              <Text
                style={[
                  styles.modalTitle,
                  {
                    fontSize: 20,
                    fontWeight: THEME.fontBold,
                    color: THEME.textDark,
                  },
                ]}
              >
                Edit Event
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowEditModal(false)}
              >
                <Feather name="x" size={24} color={THEME.textDark} />
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
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        onRequestClose={() => setShowImageModal(false)}
      >
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={[
            styles.imageViewerContainer,
            {
              backgroundColor: THEME.neutral900,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.imageViewerCloseButton,
              {
                top: 40,
                right: 20,
                padding: THEME.spacingM,
                zIndex: 10,
              },
            ]}
            onPress={() => setShowImageModal(false)}
          >
            <Feather name="x" size={24} color={THEME.textWhite} />
          </TouchableOpacity>
          <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
        </Animated.View>
      </Modal>
    </View>
  );
};

export default ChurchEvents;
