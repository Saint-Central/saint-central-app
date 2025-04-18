import React from "react";
import { View, Text, TouchableOpacity, Image, Pressable, ScrollView } from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { ChurchEvent } from "../types";
import { formatEventDate, formatEventTime } from "../utils/dateUtils";
import THEME from "../../../../theme";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";

export interface EventDetailProps {
  event: ChurchEvent;
  onClose: () => void;
  onEdit?: (event: ChurchEvent) => void;
  onDelete?: (eventId: number) => void;
}

const EventDetail: React.FC<EventDetailProps> = ({ event, onClose, onEdit, onDelete }) => {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.7)",
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
          width: "92%",
          maxHeight: "85%",
          borderRadius: 24,
          position: "relative",
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
          elevation: 10,
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
            padding: 8,
          }}
          onPress={onClose}
        >
          <Feather name="x" size={24} color={THEME.textDark} />
        </TouchableOpacity>

        {event?.image_url && (
          <Image
            source={{ uri: event.image_url }}
            style={{ width: "100%", height: 220 }}
            resizeMode="cover"
          />
        )}

        <ScrollView style={{ padding: 24, paddingTop: event?.image_url ? 24 : 40 }}>
          <Text
            style={{
              fontSize: 26,
              fontWeight: "800",
              color: THEME.primary,
              marginBottom: 20,
            }}
          >
            {event?.title}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <MaterialIcons name="event" size={22} color={THEME.textMedium} />
            <Text
              style={{
                fontSize: 16,
                marginLeft: 12,
                color: THEME.textDark,
              }}
            >
              {event?.time ? formatEventDate(event.time) : "No date specified"}
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <MaterialIcons name="access-time" size={22} color={THEME.textMedium} />
            <Text
              style={{
                fontSize: 16,
                marginLeft: 12,
                color: THEME.textDark,
              }}
            >
              {event?.time ? formatEventTime(event.time) : "No time specified"}
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <MaterialIcons name="location-on" size={22} color={THEME.textMedium} />
            <Text
              style={{
                fontSize: 16,
                marginLeft: 12,
                color: THEME.textDark,
              }}
            >
              {event?.author_name || "No location specified"}
            </Text>
          </View>

          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: THEME.textDark,
              marginTop: 8,
              marginBottom: 12,
            }}
          >
            Description
          </Text>
          <Text
            style={{
              fontSize: 16,
              lineHeight: 24,
              color: THEME.textMedium,
              marginBottom: 24,
            }}
          >
            {event?.excerpt || "No description available"}
          </Text>

          {(onEdit || onDelete) && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 20,
                paddingTop: 20,
                borderTopWidth: 1,
                borderTopColor: "rgba(0,0,0,0.1)",
              }}
            >
              {onEdit && (
                <TouchableOpacity
                  style={{
                    backgroundColor: THEME.primary,
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 30,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                  onPress={() => {
                    onClose();
                    onEdit(event);
                  }}
                >
                  <Feather name="edit-2" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>Edit</Text>
                </TouchableOpacity>
              )}

              {onDelete && (
                <TouchableOpacity
                  style={{
                    backgroundColor: "#E53935",
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 30,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                  onPress={() => {
                    onClose();
                    onDelete(event.id);
                  }}
                >
                  <Feather name="trash-2" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>Delete</Text>
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
