import React from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { AntDesign, Feather } from "@expo/vector-icons";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { ChurchEvent } from "../types";
import { styles } from "../styles";
import { THEME } from "../theme";
import EventCard from "./EventCard";
import { formatDate } from "../utils/dateUtils";

interface EventDetailProps {
  showDateDetail: boolean;
  selectedDate: Date;
  selectedDayEvents: ChurchEvent[];
  detailSlideAnim: Animated.SharedValue<number>;
  currentUserId: string | null;
  hasPermissionToCreate: boolean;
  onClose: () => void;
  onAddEvent: (date: Date) => void;
  onSelectDay: (event: ChurchEvent) => void;
  onEditEvent: (event: ChurchEvent) => void;
  onDeleteEvent: (eventId: number) => void;
  onImagePress: (imageUrl: string) => void;
}

const EventDetail: React.FC<EventDetailProps> = ({
  showDateDetail,
  selectedDate,
  selectedDayEvents,
  detailSlideAnim,
  currentUserId,
  hasPermissionToCreate,
  onClose,
  onAddEvent,
  onSelectDay,
  onEditEvent,
  onDeleteEvent,
  onImagePress,
}) => {
  if (!showDateDetail) return null;

  const slideAnimStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: detailSlideAnim.value }],
    };
  });

  return (
    <Animated.View style={[styles.dateDetailContainer, slideAnimStyle]}>
      <View style={styles.dateDetailHandle} />
      <View style={styles.dateDetailHeader}>
        <Text style={styles.dateDetailTitle}>{formatDate(selectedDate)}</Text>
        <TouchableOpacity style={styles.dateDetailCloseButton} onPress={onClose}>
          <AntDesign name="close" size={24} color={THEME.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.dateDetailContent}>
        {selectedDayEvents.length === 0 ? (
          <View style={styles.noEventsForDay}>
            <Feather name="calendar" size={50} color={THEME.light} />
            <Text style={styles.noEventsForDayText}>No church events for this day</Text>
            {hasPermissionToCreate && (
              <TouchableOpacity
                style={styles.addEventForDayButton}
                onPress={() => onAddEvent(selectedDate)}
              >
                <Text style={styles.addEventForDayText}>Add Event</Text>
                <Feather name="plus" size={16} color={THEME.buttonPrimary} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={selectedDayEvents}
            renderItem={({ item }) => (
              <EventCard
                item={item}
                currentUserId={currentUserId}
                hasPermissionToCreate={hasPermissionToCreate}
                onSelectDay={onSelectDay}
                onEdit={onEditEvent}
                onDelete={onDeleteEvent}
                onImagePress={onImagePress}
              />
            )}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.eventsList}
          />
        )}
      </View>
    </Animated.View>
  );
};

export default EventDetail;
