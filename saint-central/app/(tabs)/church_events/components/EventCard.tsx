import React, { useCallback } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from "react-native";
import { Feather, MaterialIcons, Ionicons } from "@expo/vector-icons";
import { Linking } from "react-native";
import { ChurchEvent } from "../types";
import { getEventIconAndColor } from "../utils/eventUtils";
import { getDayName } from "../utils/dateUtils";
import {
  formatEventDate,
  formatEventDay,
  formatEventMonth,
  formatEventTime,
} from "../utils/dateUtils";
import THEME from "../../../../theme";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  FadeIn,
  FadeOut,
  SlideInRight,
  interpolate,
  runOnJS,
  useAnimatedGestureHandler,
} from "react-native-reanimated";
import { PanGestureHandler } from "react-native-gesture-handler";

const { width } = Dimensions.get("window");

interface EventCardProps {
  item: ChurchEvent;
  currentUserId?: string | null;
  hasPermissionToCreate?: boolean;
  onSelectDay?: (event: ChurchEvent) => void;
  onEdit: (event: ChurchEvent) => void;
  onDelete: (eventId: number) => void;
  onImagePress?: (imageUrl: string) => void;
  onView?: (event: ChurchEvent) => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const EventCard: React.FC<EventCardProps> = ({
  item,
  currentUserId,
  hasPermissionToCreate,
  onSelectDay,
  onEdit,
  onDelete,
  onImagePress,
  onView,
}) => {
  // Animation values
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  const actionButtonsOpacity = useSharedValue(0);
  const isExpanded = useSharedValue(false);

  const { icon, color } = getEventIconAndColor(item);
  const eventTime = new Date(item.time);
  const isPastEvent = eventTime < new Date();
  const imageUrl = item.image_url || "https://via.placeholder.com/400x200?text=Church+Event";
  const isCreator = currentUserId && item.created_by === currentUserId;
  const canEdit = hasPermissionToCreate || isCreator || !!onView;

  // Card press animation
  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  // Handle card press
  const handleCardPress = () => {
    if (onView) {
      onView(item);
    } else if (onEdit) {
      onEdit(item);
    }
  };

  // Handle swipe reset
  const resetSwipe = () => {
    translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
    actionButtonsOpacity.value = withTiming(0, { duration: 200 });
    isExpanded.value = false;
  };

  // Create a global tap handler
  const handleOutsidePress = () => {
    if (isExpanded.value) {
      resetSwipe();
    }
  };

  // Pan gesture handler for swipe actions
  const panGestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startX = translateX.value;
    },
    onActive: (event, ctx) => {
      // Allow swipe in both directions when expanded
      if (isExpanded.value) {
        const newX = ctx.startX + event.translationX;
        // When expanded, allow swiping back to original position (to right)
        translateX.value = Math.min(Math.max(newX, -80), 0);
      } else {
        // Only allow swipe left (negative values) when not expanded
        const newX = ctx.startX + Math.min(0, event.translationX);
        // Limit how far user can swipe
        translateX.value = Math.max(newX, -80);
      }

      // Show action buttons when swiped more than 30
      if (translateX.value < -30 && actionButtonsOpacity.value === 0) {
        actionButtonsOpacity.value = withTiming(1, { duration: 200 });
      } else if (translateX.value > -30 && actionButtonsOpacity.value === 1) {
        actionButtonsOpacity.value = withTiming(0, { duration: 200 });
      }
    },
    onEnd: (event) => {
      if (event.velocityX > 500 && isExpanded.value) {
        // Snap back to closed state if swiped right when expanded
        translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
        actionButtonsOpacity.value = withTiming(0, { duration: 200 });
        isExpanded.value = false;
      } else if (event.velocityX < -500 || translateX.value < -50) {
        // Snap to open state if swiped fast enough or far enough to left
        translateX.value = withSpring(-80, { damping: 15, stiffness: 150 });
        actionButtonsOpacity.value = withTiming(1, { duration: 200 });
        isExpanded.value = true;
      } else {
        // Snap back to closed state
        translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
        actionButtonsOpacity.value = withTiming(0, { duration: 200 });
        isExpanded.value = false;
      }
    },
  });

  // Delete action with animation
  const handleDelete = useCallback(() => {
    // Animate the card out
    cardOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(onDelete)(item.id);
      }
    });
  }, [item.id, onDelete]);

  // Animated styles
  const cardStyle = useAnimatedStyle(() => {
    const swipedAmount = Math.abs(translateX.value);
    const isSwipeActive = swipedAmount > 10;

    return {
      transform: [{ scale: scale.value }, { translateX: translateX.value }],
      opacity: cardOpacity.value,
      // Add shadow and border effects when swiped
      shadowOpacity: isSwipeActive ? 0.15 : 0.1,
      shadowRadius: isSwipeActive ? 15 : 10,
      elevation: isSwipeActive ? 5 : 3,
      // Add right border highlight when swiped
      borderRightWidth: isSwipeActive ? 3 : 0,
      borderRightColor: THEME.primary + "50", // Semi-transparent version of primary color
    };
  });

  const actionButtonsStyle = useAnimatedStyle(() => {
    return {
      opacity: actionButtonsOpacity.value,
      transform: [
        { translateX: interpolate(actionButtonsOpacity.value, [0, 1], [20, 0]) },
        { scale: interpolate(actionButtonsOpacity.value, [0, 1], [0.8, 1]) },
      ],
    };
  });

  return (
    <View style={cardStyles.cardContainer}>
      {/* Overlay to handle tap outside when card is expanded */}
      {isExpanded.value ? (
        <TouchableOpacity
          style={[
            StyleSheet.absoluteFill,
            {
              zIndex: 5,
              position: "absolute",
              top: -20,
              left: -20,
              right: -20,
              bottom: -20,
            },
          ]}
          activeOpacity={1}
          onPress={resetSwipe}
        />
      ) : null}

      {/* Action buttons container (positioned absolute) */}
      <Animated.View style={[cardStyles.actionButtonsContainer, actionButtonsStyle]}>
        {canEdit && (
          <TouchableOpacity
            style={[cardStyles.actionButton, { backgroundColor: THEME.primary }]}
            onPress={() => {
              resetSwipe();
              onEdit(item);
            }}
          >
            <Feather name="edit-2" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {canEdit && (
          <TouchableOpacity
            style={[cardStyles.actionButton, { backgroundColor: "#E53935" }]}
            onPress={handleDelete}
          >
            <Feather name="trash-2" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Card content with pan gesture */}
      <PanGestureHandler
        onGestureEvent={panGestureHandler}
        activeOffsetX={[-10, 10]}
        failOffsetY={[-5, 5]}
      >
        <Animated.View style={[cardStyles.card, cardStyle]}>
          <AnimatedTouchable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handleCardPress}
            style={[cardStyles.cardContent, { opacity: isPastEvent ? 0.8 : 1 }]}
            activeOpacity={0.95}
          >
            {/* Card Header with colored accent */}
            <View style={cardStyles.cardHeader}>
              <View style={[cardStyles.colorAccent, { backgroundColor: color }]} />
              <View style={cardStyles.headerContent}>
                <View style={[cardStyles.iconCircle, { backgroundColor: color }]}>
                  <Feather name={icon as any} size={20} color="#fff" />
                </View>
                <View style={cardStyles.headerTextContainer}>
                  <Text style={cardStyles.eventTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={cardStyles.dateTimeContainer}>
                    <View style={cardStyles.dateTimeRow}>
                      <Feather
                        name="calendar"
                        size={14}
                        color={THEME.textMedium}
                        style={cardStyles.infoIcon}
                      />
                      <Text style={cardStyles.dateText}>
                        {formatEventDay(item.time)}, {formatEventMonth(item.time)}{" "}
                        {formatEventDate(item.time)}
                      </Text>
                    </View>
                    <View style={cardStyles.dateTimeRow}>
                      <Feather
                        name="clock"
                        size={14}
                        color={THEME.textMedium}
                        style={cardStyles.infoIcon}
                      />
                      <Text style={cardStyles.timeText}>{formatEventTime(item.time)}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {item.is_recurring && (
                <View style={cardStyles.recurringBadge}>
                  <MaterialIcons name="repeat" size={14} color="#fff" />
                </View>
              )}
            </View>

            {/* Event Image (if available) */}
            {item.image_url && (
              <TouchableOpacity
                style={cardStyles.imageContainer}
                onPress={() => item.image_url && onImagePress && onImagePress(item.image_url)}
              >
                <Image
                  source={{ uri: item.image_url }}
                  style={cardStyles.image}
                  resizeMode="cover"
                />
                <View style={cardStyles.imageOverlay} />
              </TouchableOpacity>
            )}

            {/* Event Details */}
            <View style={cardStyles.detailsContainer}>
              {/* Location */}
              <View style={cardStyles.locationContainer}>
                <View style={cardStyles.locationRow}>
                  <Feather
                    name="map-pin"
                    size={14}
                    color={THEME.textMedium}
                    style={cardStyles.infoIcon}
                  />
                  <Text style={cardStyles.locationText} numberOfLines={1} ellipsizeMode="tail">
                    {item.author_name || "Location TBD"}
                    {item.churches && (
                      <Text style={cardStyles.churchName}> • {item.churches.name}</Text>
                    )}
                  </Text>
                </View>
              </View>

              {/* Excerpt */}
              {item.excerpt && (
                <Text style={cardStyles.excerptText} numberOfLines={2}>
                  {item.excerpt}
                </Text>
              )}

              {/* Recurring info badge */}
              {item.is_recurring && (
                <View style={cardStyles.recurringInfoContainer}>
                  <MaterialIcons name="repeat" size={14} color={color} style={{ marginRight: 4 }} />
                  <Text style={cardStyles.recurringInfoText}>
                    {item.recurrence_type === "daily" && `Repeats daily`}
                    {item.recurrence_type === "weekly" &&
                      `Repeats weekly on ${item.recurrence_days_of_week?.map((day) => getDayName(day).substring(0, 3)).join(", ")}`}
                    {item.recurrence_type === "monthly" && `Repeats monthly`}
                    {item.recurrence_type === "yearly" && `Repeats yearly`}
                  </Text>
                </View>
              )}

              {/* Video link button (if available) */}
              {item.video_link && (
                <TouchableOpacity
                  style={cardStyles.videoButton}
                  onPress={() => Linking.openURL(item.video_link!)}
                >
                  <Feather
                    name="play-circle"
                    size={16}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={cardStyles.videoButtonText}>Watch Video</Text>
                </TouchableOpacity>
              )}

              {/* Footer actions */}
              <View style={cardStyles.cardFooter}>
                <TouchableOpacity
                  style={cardStyles.footerButton}
                  onPress={() => {
                    const message = `${item.title}\n${formatEventDay(item.time)}, ${formatEventMonth(item.time)} ${formatEventDate(item.time)} at ${formatEventTime(item.time)}\nLocation: ${item.author_name || "TBD"}\n\n${item.excerpt}`;
                    Linking.openURL(
                      `mailto:?subject=${encodeURIComponent(item.title)}&body=${encodeURIComponent(message)}`,
                    );
                  }}
                >
                  <Feather
                    name="share-2"
                    size={14}
                    color={THEME.textMedium}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={cardStyles.footerButtonText}>Share</Text>
                </TouchableOpacity>

                <TouchableOpacity style={cardStyles.footerButton} onPress={handleCardPress}>
                  <Feather
                    name="info"
                    size={14}
                    color={THEME.textMedium}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={cardStyles.footerButtonText}>Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          </AnimatedTouchable>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const cardStyles = StyleSheet.create({
  cardContainer: {
    position: "relative",
    marginBottom: 16,
    borderRadius: 16,
    overflow: "visible",
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: THEME.cardBg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  cardContent: {
    borderRadius: 16,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    padding: 16,
    position: "relative",
  },
  colorAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 6,
    height: "100%",
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 0,
  },
  headerContent: {
    flexDirection: "row",
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.textDark,
    marginBottom: 8,
  },
  dateTimeContainer: {
    flexDirection: "column",
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  infoIcon: {
    marginRight: 6,
  },
  dateText: {
    fontSize: 14,
    color: THEME.textMedium,
  },
  timeText: {
    fontSize: 14,
    color: THEME.textMedium,
  },
  recurringBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.primary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  imageContainer: {
    height: 160,
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  detailsContainer: {
    padding: 16,
  },
  locationContainer: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    fontSize: 14,
    color: THEME.textMedium,
  },
  churchName: {
    color: THEME.textLight,
  },
  excerptText: {
    fontSize: 14,
    lineHeight: 20,
    color: THEME.textDark,
    marginBottom: 16,
  },
  recurringInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  recurringInfoText: {
    fontSize: 13,
    color: THEME.textMedium,
  },
  videoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  videoButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  footerButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  footerButtonText: {
    fontSize: 13,
    color: THEME.textMedium,
  },
  actionButtonsContainer: {
    position: "absolute",
    right: 8,
    top: "50%",
    marginTop: -60,
    zIndex: 10,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: 120,
    paddingRight: 8,
  },
  actionButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: THEME.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    transform: [{ scale: 0.95 }],
  },
});

export default EventCard;
