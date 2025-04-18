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
import { THEME } from "../theme";

interface EventCardProps {
  item: ChurchEvent;
  currentUserId: string | null;
  hasPermissionToCreate: boolean;
  onSelectDay: (event: ChurchEvent) => void;
  onEdit: (event: ChurchEvent) => void;
  onDelete: (eventId: number) => void;
  onImagePress: (imageUrl: string) => void;
}

const EventCard: React.FC<EventCardProps> = ({
  item,
  currentUserId,
  hasPermissionToCreate,
  onSelectDay,
  onEdit,
  onDelete,
  onImagePress,
}) => {
  const { icon, color } = getEventIconAndColor(item);
  const eventTime = new Date(item.time);
  const isPastEvent = eventTime < new Date();
  const imageUrl = item.image_url || "https://via.placeholder.com/400x200?text=Church+Event";
  const isCreator = currentUserId && item.created_by === currentUserId;
  const canEdit = hasPermissionToCreate || isCreator;

  return (
    <TouchableOpacity
      key={item.id.toString()}
      style={[styles.eventCard, { borderLeftColor: color }, isPastEvent && styles.pastEventCard]}
      onPress={() => onSelectDay(item)}
    >
      <View style={styles.eventHeader}>
        <View style={[styles.eventIconContainer, { backgroundColor: color }]}>
          <Feather name={icon as any} size={20} color="#fff" />
        </View>
        <View style={styles.eventTitleContainer}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.eventTimeLocationContainer}>
            <View style={styles.dateTimeRow}>
              <Feather name="clock" size={14} color={THEME.secondary} style={styles.smallIcon} />
              <Text style={styles.eventDateTime}>
                {formatEventDay(item.time)}, {formatEventMonth(item.time)}{" "}
                {formatEventDate(item.time)} • {formatEventTime(item.time)}
              </Text>
            </View>
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={14} color={THEME.secondary} style={styles.smallIcon} />
              <Text style={styles.eventLocation} numberOfLines={1} ellipsizeMode="tail">
                {item.author_name || "Location TBD"}
              </Text>
              {item.churches && <Text style={styles.churchName}>• {item.churches.name}</Text>}
            </View>
          </View>
        </View>

        {item.is_recurring && (
          <View style={styles.recurringBadge}>
            <MaterialIcons name="repeat" size={16} color={THEME.buttonPrimary} />
          </View>
        )}
      </View>

      {item.is_recurring && (
        <View style={styles.recurringInfoCard}>
          <View style={styles.recurringInfoHeader}>
            <MaterialIcons name="repeat" size={16} color={THEME.buttonPrimary} />
            <Text style={styles.recurringInfoTitle}>Recurring Event</Text>
          </View>
          <Text style={styles.recurringInfoText}>
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
          style={styles.eventImageContainer}
          onPress={() => item.image_url && onImagePress(item.image_url)}
        >
          <Image source={{ uri: item.image_url }} style={styles.eventImage} resizeMode="cover" />
        </TouchableOpacity>
      )}

      <Text style={styles.eventExcerpt} numberOfLines={3}>
        {item.excerpt}
      </Text>

      {item.video_link && (
        <TouchableOpacity
          style={styles.videoLinkButton}
          onPress={() => item.video_link && Linking.openURL(item.video_link)}
        >
          <Feather name="youtube" size={20} color={THEME.primary} />
          <Text style={styles.videoLinkText}>Watch Video</Text>
        </TouchableOpacity>
      )}

      <View style={styles.eventActionRow}>
        {canEdit && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.editActionButton]}
              onPress={() => onEdit(item)}
            >
              <Feather name="edit-2" size={16} color={THEME.buttonPrimary} />
              <Text style={[styles.actionButtonText, styles.editActionText]}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteActionButton]}
              onPress={() => onDelete(item.id)}
            >
              <Feather name="trash-2" size={16} color={THEME.error} />
              <Text style={[styles.actionButtonText, styles.deleteActionText]}>Delete</Text>
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
          <Feather name="share-2" size={16} color={THEME.secondary} />
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default EventCard;
