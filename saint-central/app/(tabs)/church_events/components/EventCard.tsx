import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { Linking } from "react-native";
import { ChurchEvent } from "../types";
import { styles } from "../styles";
import { getEventIconAndColor } from "../utils/eventUtils";
import { getDayName } from "../utils/dateUtils";
import {
  formatEventDate,
  formatEventDay,
  formatEventMonth,
  formatEventTime,
} from "../utils/dateUtils";
import THEME from "../../../../theme";

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
  const { icon, color } = getEventIconAndColor(item);
  const eventTime = new Date(item.time);
  const isPastEvent = eventTime < new Date();
  const imageUrl = item.image_url || "https://via.placeholder.com/400x200?text=Church+Event";
  const isCreator = currentUserId && item.created_by === currentUserId;
  const canEdit = hasPermissionToCreate || isCreator || !!onView;

  const handleCardPress = () => {
    if (onView) {
      onView(item);
    } else if (onEdit) {
      onEdit(item);
    }
  };

  return (
    <TouchableOpacity
      key={item.id.toString()}
      style={[styles.eventCard, { borderLeftColor: color, opacity: isPastEvent ? 0.8 : 1 }]}
      onPress={handleCardPress}
    >
      <View style={styles.eventCardHeader}>
        <View
          style={[
            {
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: color,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 12,
            },
          ]}
        >
          <Feather name={icon as any} size={20} color="#fff" />
        </View>
        <View style={styles.eventCardContent}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={{ flexDirection: "column" }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
              <Feather name="clock" size={14} color={THEME.textMedium} style={{ marginRight: 4 }} />
              <Text style={styles.eventTime}>
                {formatEventDay(item.time)}, {formatEventMonth(item.time)}{" "}
                {formatEventDate(item.time)} • {formatEventTime(item.time)}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Feather
                name="map-pin"
                size={14}
                color={THEME.textMedium}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.eventLocation} numberOfLines={1} ellipsizeMode="tail">
                {item.author_name || "Location TBD"}
                {item.churches && (
                  <Text style={{ color: THEME.textLight }}>• {item.churches.name}</Text>
                )}
              </Text>
            </View>
          </View>
        </View>

        {item.is_recurring && (
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: THEME.accent1,
              justifyContent: "center",
              alignItems: "center",
              marginLeft: 8,
            }}
          >
            <MaterialIcons name="repeat" size={16} color={THEME.primary} />
          </View>
        )}
      </View>

      {item.is_recurring && (
        <View
          style={{
            backgroundColor: THEME.neutral100,
            borderRadius: 12,
            padding: 12,
            marginTop: 12,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
            <MaterialIcons name="repeat" size={16} color={THEME.primary} />
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: THEME.primary,
                marginLeft: 6,
              }}
            >
              Recurring Event
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: THEME.textMedium }}>
            {item.recurrence_type === "daily" && `Repeats daily`}
            {item.recurrence_type === "weekly" &&
              `Repeats weekly on ${item.recurrence_days_of_week?.map((day) => getDayName(day)).join(", ")}`}
            {item.recurrence_type === "monthly" && `Repeats monthly`}
            {item.recurrence_type === "yearly" && `Repeats yearly`}
            {item.recurrence_interval &&
              item.recurrence_interval > 1 &&
              ` every ${item.recurrence_interval} ${item.recurrence_type}s`}
            {item.recurrence_end_date &&
              ` until ${new Date(item.recurrence_end_date).toLocaleDateString()}`}
          </Text>
        </View>
      )}

      {item.image_url && (
        <TouchableOpacity
          style={{
            height: 200,
            borderRadius: 12,
            overflow: "hidden",
            marginBottom: 16,
          }}
          onPress={() => item.image_url && onImagePress && onImagePress(item.image_url)}
        >
          <Image
            source={{ uri: item.image_url }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}

      <Text
        style={{
          fontSize: 15,
          color: THEME.textMedium,
          lineHeight: 22,
          marginVertical: 16,
        }}
        numberOfLines={3}
      >
        {item.excerpt}
      </Text>

      {item.video_link && (
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            padding: 14,
            backgroundColor: THEME.pageBg,
            borderRadius: 12,
            marginBottom: 16,
          }}
          onPress={() => item.video_link && Linking.openURL(item.video_link)}
        >
          <Feather name="youtube" size={20} color={THEME.primary} />
          <Text
            style={{
              marginLeft: 8,
              fontSize: 16,
              color: THEME.primary,
              fontWeight: "600",
            }}
          >
            Watch Video
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.eventCardFooter}>
        <View style={styles.eventMetaInfo}>{/* Empty for now */}</View>
        <View style={styles.eventActionButtons}>
          {canEdit && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.editActionButton]}
                onPress={() => onEdit(item)}
              >
                <Feather name="edit-2" size={16} color={THEME.textWhite} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.deleteActionButton]}
                onPress={() => onDelete(item.id)}
              >
                <Feather name="trash-2" size={16} color={THEME.textWhite} />
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.shareActionButton]}
            onPress={() => {
              const message = `${item.title}\n${formatEventDay(item.time)}, ${formatEventMonth(item.time)} ${formatEventDate(item.time)} at ${formatEventTime(item.time)}\nLocation: ${item.author_name || "TBD"}\n\n${item.excerpt}`;
              Linking.openURL(
                `mailto:?subject=${encodeURIComponent(item.title)}&body=${encodeURIComponent(message)}`,
              );
            }}
          >
            <Feather name="share-2" size={16} color={THEME.textMedium} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default EventCard;
