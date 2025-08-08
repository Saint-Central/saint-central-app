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
    scale.value = withSpring(0.97, { damping: 15, stiffness: 150 });
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
      // Enhanced shadow and border effects when swiped
      shadowOpacity: isSwipeActive ? 0.25 : 0.15,
      shadowRadius: isSwipeActive ? 20 : 15,
      elevation: isSwipeActive ? 8 : 5,
      // Add subtle glow effect when swiped
      borderRightWidth: isSwipeActive ? 2 : 0,
      borderRightColor: color + "80", // Semi-transparent version of event color
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
            style={[cardStyles.actionButton, { backgroundColor: color }]}
            onPress={() => {
              resetSwipe();
              onEdit(item);
            }}
          >
            <Feather name="edit-2" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {canEdit && (
          <TouchableOpacity
            style={[cardStyles.actionButton, { backgroundColor: "#FF4757" }]}
            onPress={handleDelete}
          >
            <Feather name="trash-2" size={18} color="#FFFFFF" />
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
            style={[cardStyles.cardContent, { opacity: isPastEvent ? 0.75 : 1 }]}
            activeOpacity={0.95}
          >
            {/* Event Image with gradient overlay */}
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
                <View style={[cardStyles.imageGradient, { backgroundColor: color + "40" }]} />
                
                {/* Floating date badge */}
                <View style={cardStyles.dateBadge}>
                  <Text style={cardStyles.dateBadgeDay}>{formatEventDate(item.time)}</Text>
                  <Text style={cardStyles.dateBadgeMonth}>{formatEventMonth(item.time).substring(0, 3)}</Text>
                </View>

                {/* Recurring badge on image */}
                {item.is_recurring && (
                  <View style={[cardStyles.recurringImageBadge, { backgroundColor: color }]}>
                    <MaterialIcons name="repeat" size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* Card Header */}
            <View style={cardStyles.cardHeader}>
              <View style={cardStyles.headerMain}>
                <View style={[cardStyles.iconCircle, { backgroundColor: color + "15" }]}>
                  <Feather name={icon as any} size={20} color={color} />
                </View>
                
                <View style={cardStyles.headerTextContainer}>
                  <Text style={cardStyles.eventTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  
                  <View style={cardStyles.timeContainer}>
                    <View style={cardStyles.timeRow}>
                      <Feather name="clock" size={12} color={color} />
                      <Text style={[cardStyles.timeText, { color: color }]}>
                        {formatEventTime(item.time)}
                      </Text>
                    </View>
                    <Text style={cardStyles.dayText}>
                      {formatEventDay(item.time)}
                    </Text>
                  </View>
                </View>
              </View>

              {!item.image_url && item.is_recurring && (
                <View style={[cardStyles.recurringBadge, { backgroundColor: color }]}>
                  <MaterialIcons name="repeat" size={12} color="#fff" />
                </View>
              )}
            </View>

            {/* Event Details */}
            <View style={cardStyles.detailsContainer}>
              {/* Location with enhanced styling */}
              <View style={cardStyles.locationContainer}>
                <View style={[cardStyles.locationBadge, { backgroundColor: color + "10" }]}>
                  <Feather name="map-pin" size={12} color={color} />
                  <Text style={[cardStyles.locationText, { color: color }]} numberOfLines={1}>
                    {item.author_name || "Location TBD"}
                  </Text>
                </View>
                {item.churches && (
                  <Text style={cardStyles.churchName}>• {item.churches.name}</Text>
                )}
              </View>

              {/* Excerpt with better typography */}
              {item.excerpt && (
                <Text style={cardStyles.excerptText} numberOfLines={3}>
                  {item.excerpt}
                </Text>
              )}

              {/* Recurring info with enhanced design */}
              {item.is_recurring && (
                <View style={[cardStyles.recurringInfoContainer, { backgroundColor: color + "08" }]}>
                  <View style={[cardStyles.recurringDot, { backgroundColor: color }]} />
                  <Text style={[cardStyles.recurringInfoText, { color: color }]}>
                    {item.recurrence_type === "daily" && `Repeats daily`}
                    {item.recurrence_type === "weekly" &&
                      `Every ${item.recurrence_days_of_week?.map((day) => getDayName(day).substring(0, 3)).join(", ")}`}
                    {item.recurrence_type === "monthly" && `Monthly event`}
                    {item.recurrence_type === "yearly" && `Annual event`}
                  </Text>
                </View>
              )}

              {/* Enhanced video button */}
              {item.video_link && (
                <TouchableOpacity
                  style={[cardStyles.videoButton, { backgroundColor: color }]}
                  onPress={() => Linking.openURL(item.video_link!)}
                >
                  <View style={cardStyles.videoButtonContent}>
                    <Feather name="play" size={14} color="#FFFFFF" />
                    <Text style={cardStyles.videoButtonText}>Watch Live</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* Enhanced Footer */}
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
                <Feather name="share-2" size={14} color={THEME.neutral600} />
                <Text style={cardStyles.footerButtonText}>Share</Text>
              </TouchableOpacity>

              <View style={cardStyles.footerDivider} />

              <TouchableOpacity style={cardStyles.footerButton} onPress={handleCardPress}>
                <Feather name="arrow-right" size={14} color={color} />
                <Text style={[cardStyles.footerButtonText, { color: color, fontWeight: '600' }]}>Details</Text>
              </TouchableOpacity>
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
    marginBottom: 20,
    marginHorizontal: 4,
  },
  card: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
    borderWidth: 2,
    borderColor: "#E5E5E5",
  },
  cardContent: {
    borderRadius: 20,
    overflow: "hidden",
  },
  imageContainer: {
    height: 180,
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    opacity: 0.3,
  },
  dateBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  dateBadgeDay: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000000",
    lineHeight: 18,
  },
  dateBadgeMonth: {
    fontSize: 11,
    fontWeight: "600",
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  recurringImageBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    padding: 20,
    paddingBottom: 16,
    backgroundColor: "#F8F8F8",
  },
  headerMain: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  headerTextContainer: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
    lineHeight: 26,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  dayText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  recurringBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: 20,
    right: 20,
  },
  detailsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 4,
    backgroundColor: "#FFFFFF",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    flexWrap: "wrap",
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  locationText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  churchName: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  excerptText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#2a2a2a",
    marginBottom: 16,
    fontWeight: "400",
  },
  recurringInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  recurringDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  recurringInfoText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  videoButton: {
    borderRadius: 14,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  videoButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  videoButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 2,
    borderTopColor: "#E5E5E5",
    backgroundColor: "#F0F0F0",
  },
  footerButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    flex: 1,
    justifyContent: "center",
  },
  footerButtonText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 6,
    fontWeight: "500",
  },
  footerDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#C0C0C0",
    marginHorizontal: 16,
  },
  actionButtonsContainer: {
    position: "absolute",
    right: 12,
    top: "50%",
    marginTop: -50,
    zIndex: 10,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: 100,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});

export default EventCard;