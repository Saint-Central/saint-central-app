import React from "react";
import { View, Text, TouchableOpacity, Image, Pressable, ScrollView, Linking } from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { ChurchEvent } from "../types";
import { formatEventDate, formatEventTime, formatEventDay, formatEventMonth } from "../utils/dateUtils";
import THEME from "../../../../theme";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";

export interface EventDetailProps {
  event: ChurchEvent;
  onClose: () => void;
  onEdit?: (event: ChurchEvent) => void;
  onDelete?: (eventId: number) => void;
  onImagePress?: (imageUrl: string) => void;
}

const renderDescription = (text: string) => {
  // Simple URL regex
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      return (
        <Text
          key={i}
          style={{ 
            color: '#3B82F6',
            textDecorationLine: 'underline',
            fontWeight: '500'
          }}
          onPress={() => Linking.openURL(part)}
        >
          {part}
        </Text>
      );
    }
    return <Text key={i} style={{ color: '#6B7280' }}>{part}</Text>;
  });
};

const EventDetail: React.FC<EventDetailProps> = ({ event, onClose, onEdit, onDelete, onImagePress }) => {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.8)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <Animated.View
        entering={SlideInDown.springify().damping(14)}
        exiting={SlideOutDown.duration(300)}
        style={{
          backgroundColor: '#F8FAFC',
          width: "94%",
          maxHeight: "90%",
          borderRadius: 28,
          position: "relative",
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 15 },
          shadowOpacity: 0.35,
          shadowRadius: 25,
          elevation: 15,
        }}
      >
        {/* Header gradient overlay for image */}
        {event?.image_url && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 280,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 100%)',
              zIndex: 5,
            }}
          />
        )}

        <TouchableOpacity
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            zIndex: 15,
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderRadius: 24,
            padding: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
          onPress={onClose}
        >
          <Feather name="x" size={22} color="#64748B" />
        </TouchableOpacity>

        {event?.image_url && (
          <TouchableOpacity
            style={{ height: 280, overflow: "hidden" }}
            onPress={() => event.image_url && onImagePress && onImagePress(event.image_url)}
          >
            <Image
              source={{ uri: event.image_url }}
              style={{ width: "100%", height: 280 }}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}

        <ScrollView style={{ padding: 28, paddingTop: event?.image_url ? 28 : 50 }}>
          <Text
            style={{
              fontSize: 30,
              fontWeight: "800",
              color: '#374151',
              marginBottom: 24,
              lineHeight: 36,
            }}
          >
            {event?.title}
          </Text>

          {/* Info Cards Container */}
          <View style={{ marginBottom: 32 }}>
            {/* Date Card */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: '#F3F4F6',
                paddingVertical: 16,
                paddingHorizontal: 20,
                borderRadius: 16,
                marginBottom: 12,
                borderLeftWidth: 4,
                borderLeftColor: '#3B82F6',
              }}
            >
              <View
                style={{
                  backgroundColor: '#3B82F6',
                  borderRadius: 12,
                  padding: 8,
                  marginRight: 16,
                }}
              >
                <MaterialIcons name="event" size={20} color="#FFFFFF" />
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#374151',
                }}
              >
                {event?.time ? `${formatEventDay(event.time)}, ${formatEventMonth(event.time)} ${formatEventDate(event.time)}` : "No date specified"}
              </Text>
            </View>

            {/* Time Card */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: '#F3F4F6',
                paddingVertical: 16,
                paddingHorizontal: 20,
                borderRadius: 16,
                marginBottom: 12,
                borderLeftWidth: 4,
                borderLeftColor: '#10B981',
              }}
            >
              <View
                style={{
                  backgroundColor: '#10B981',
                  borderRadius: 12,
                  padding: 8,
                  marginRight: 16,
                }}
              >
                <MaterialIcons name="access-time" size={20} color="#FFFFFF" />
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#374151',
                }}
              >
                {event?.time ? formatEventTime(event.time) : "No time specified"}
              </Text>
            </View>

            {/* Location Card */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: '#F3F4F6',
                paddingVertical: 16,
                paddingHorizontal: 20,
                borderRadius: 16,
                borderLeftWidth: 4,
                borderLeftColor: '#F59E0B',
              }}
            >
              <View
                style={{
                  backgroundColor: '#F59E0B',
                  borderRadius: 12,
                  padding: 8,
                  marginRight: 16,
                }}
              >
                <MaterialIcons name="location-on" size={20} color="#FFFFFF" />
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#374151',
                }}
              >
                {event?.author_name || "No location specified"}
              </Text>
            </View>
          </View>

          {/* Description Section */}
          <View
            style={{
              backgroundColor: '#F3F4F6',
              borderRadius: 20,
              padding: 24,
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: '#374151',
                marginBottom: 16,
              }}
            >
              Description
            </Text>
            <Text
              style={{
                fontSize: 16,
                lineHeight: 26,
                color: '#6B7280',
              }}
            >
              {event?.excerpt ? renderDescription(event.excerpt) : "No description available"}
            </Text>
          </View>

          {/* Video link button */}
          {event?.video_link && (
            <TouchableOpacity
              style={{
                backgroundColor: '#8B5CF6',
                paddingVertical: 16,
                paddingHorizontal: 24,
                borderRadius: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                shadowColor: "#8B5CF6",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
              onPress={() => Linking.openURL(event.video_link!)}
            >
              <Feather name="play-circle" size={20} color="#FFFFFF" style={{ marginRight: 10 }} />
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>Watch Video</Text>
            </TouchableOpacity>
          )}

          {/* Action Buttons */}
          {(onEdit || onDelete) && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 16,
                paddingTop: 24,
                borderTopWidth: 1,
                borderTopColor: "#D1D5DB",
                gap: 12,
              }}
            >
              {onEdit && (
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: '#3B82F6',
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderRadius: 20,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#3B82F6",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                  onPress={() => {
                    onClose();
                    onEdit(event);
                  }}
                >
                  <Feather name="edit-2" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>Edit</Text>
                </TouchableOpacity>
              )}

              {onDelete && (
                <TouchableOpacity
                  style={{
                    flex: onEdit ? 1 : 1,
                    backgroundColor: "#EF4444",
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderRadius: 20,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#EF4444",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                  onPress={() => {
                    onClose();
                    onDelete(event.id);
                  }}
                >
                  <Feather name="trash-2" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
};

export default EventDetail;