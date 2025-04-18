import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";
import { Feather, AntDesign } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { EventFormData } from "../types";
import { styles } from "../styles";
import THEME from "../../../../theme";
import { getDayName } from "../utils/dateUtils";
import { BlurView } from "expo-blur";
import Animated, { FadeIn, SlideInUp } from "react-native-reanimated";

interface EventFormProps {
  isEditing?: boolean;
  formData: EventFormData;
  showTimePicker: boolean;
  showEndDatePicker: boolean;
  isSubmitting: boolean;
  formImageLoading: boolean;
  setShowTimePicker: (show: boolean) => void;
  setShowEndDatePicker: (show: boolean) => void;
  onClose: () => void;
  onChange: (field: keyof EventFormData, value: any) => void;
  onDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  onToggleRecurrenceDay: (day: number) => void;
  onPickImage: () => void;
  onSubmit: () => void;
}

const EventForm: React.FC<EventFormProps> = ({
  isEditing = false,
  formData,
  showTimePicker,
  showEndDatePicker,
  isSubmitting,
  formImageLoading,
  setShowTimePicker,
  setShowEndDatePicker,
  onClose,
  onChange,
  onDateChange,
  onEndDateChange,
  onToggleRecurrenceDay,
  onPickImage,
  onSubmit,
}) => {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Animated.View
      style={{
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.5)",
      }}
      entering={FadeIn.duration(300)}
    >
      <Animated.View
        style={{
          backgroundColor: THEME.cardBg,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          maxHeight: "85%",
        }}
        entering={SlideInUp.springify().damping(14)}
      >
        <View
          style={{
            width: 40,
            height: 5,
            borderRadius: 3,
            backgroundColor: "rgba(0,0,0,0.2)",
            alignSelf: "center",
            marginTop: 10,
            marginBottom: 10,
          }}
        />

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingBottom: 15,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(0,0,0,0.1)",
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: THEME.textDark,
            }}
          >
            {isEditing ? "Edit Event" : "Create New Event"}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={24} color={THEME.textDark} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ padding: 20 }}>
          <View style={styles.formControl}>
            <Text style={styles.formLabel}>Event Title*</Text>
            <TextInput
              style={styles.formInput}
              value={formData.title}
              onChangeText={(value) => onChange("title", value)}
              placeholder="Enter event title"
              placeholderTextColor={THEME.textLight}
            />
          </View>

          <View style={styles.formControl}>
            <Text style={styles.formLabel}>Description*</Text>
            <TextInput
              style={[styles.formInput, styles.textAreaInput]}
              value={formData.excerpt}
              onChangeText={(value) => onChange("excerpt", value)}
              placeholder="Event description"
              placeholderTextColor={THEME.textLight}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.formControl}>
            <Text style={styles.formLabel}>Date & Time*</Text>
            <TouchableOpacity
              style={styles.dateTimePickerButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Feather name="calendar" size={18} color={THEME.primary} />
              <Text style={styles.dateTimeText}>
                {formData.time
                  ? new Date(formData.time).toLocaleString([], {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Select date and time"}
              </Text>
            </TouchableOpacity>
          </View>

          {showTimePicker && (
            <DateTimePicker
              value={formData.time ? new Date(formData.time) : new Date()}
              mode="datetime"
              display="default"
              onChange={(event, selectedDate) => {
                setShowTimePicker(false);
                if (selectedDate) {
                  onDateChange(selectedDate);
                }
              }}
            />
          )}

          <View style={styles.formControl}>
            <Text style={styles.formLabel}>Location</Text>
            <TextInput
              style={styles.formInput}
              value={formData.author_name || ""}
              onChangeText={(value) => onChange("author_name", value)}
              placeholder="Event location"
              placeholderTextColor={THEME.textLight}
            />
          </View>

          <View style={styles.formControl}>
            <View style={styles.recurrenceUntilContainer}>
              <Text style={styles.formLabel}>Recurring event</Text>
              <Switch
                value={formData.is_recurring}
                onValueChange={(value) => {
                  onChange("is_recurring", value);
                  if (value && !formData.recurrence_type) {
                    onChange("recurrence_type", "weekly");
                  }
                  if (value && !formData.recurrence_interval) {
                    onChange("recurrence_interval", 1);
                  }
                  if (value && !formData.recurrence_days_of_week) {
                    // Default to the day of the week from the selected date
                    const dayOfWeek = new Date(formData.time).getDay();
                    onChange("recurrence_days_of_week", [dayOfWeek]);
                  }
                }}
                trackColor={{ false: "#E4E4E7", true: "#D1D5F9" }}
                thumbColor={formData.is_recurring ? THEME.primary : "#FFFFFF"}
                ios_backgroundColor="#E4E4E7"
              />
            </View>
          </View>

          {formData.is_recurring && (
            <View style={styles.recurrenceContainer}>
              <View style={styles.formControl}>
                <Text style={styles.formLabel}>Repeat</Text>
                <View style={styles.recurrenceTypeContainer}>
                  {["daily", "weekly", "monthly", "yearly"].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.recurrenceTypeButton,
                        formData.recurrence_type === type && styles.recurrenceTypeButtonSelected,
                      ]}
                      onPress={() => onChange("recurrence_type", type)}
                    >
                      <Text
                        style={[
                          styles.recurrenceTypeText,
                          formData.recurrence_type === type && styles.recurrenceTypeTextSelected,
                        ]}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formControl}>
                <Text style={styles.formLabel}>Frequency</Text>
                <View style={styles.intervalContainer}>
                  <Text style={styles.recurrenceOptionLabel}>Every</Text>
                  <TextInput
                    style={styles.intervalInput}
                    value={formData.recurrence_interval?.toString() || "1"}
                    onChangeText={(text) => {
                      const filtered = text.replace(/[^0-9]/g, "");
                      const value = filtered ? parseInt(filtered, 10) : 1;
                      onChange("recurrence_interval", value);
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <Text style={styles.recurrenceOptionLabel}>
                    {formData.recurrence_type === "daily"
                      ? "day(s)"
                      : formData.recurrence_type === "weekly"
                        ? "week(s)"
                        : formData.recurrence_type === "monthly"
                          ? "month(s)"
                          : "year(s)"}
                  </Text>
                </View>
              </View>

              {formData.recurrence_type === "weekly" && (
                <View style={styles.formControl}>
                  <Text style={styles.formLabel}>On these days</Text>
                  <View style={styles.daysContainer}>
                    {[
                      { day: 0, label: "S" },
                      { day: 1, label: "M" },
                      { day: 2, label: "T" },
                      { day: 3, label: "W" },
                      { day: 4, label: "T" },
                      { day: 5, label: "F" },
                      { day: 6, label: "S" },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.day}
                        style={[
                          styles.dayButton,
                          formData.recurrence_days_of_week?.includes(item.day) &&
                            styles.dayButtonSelected,
                        ]}
                        onPress={() => onToggleRecurrenceDay(item.day)}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            formData.recurrence_days_of_week?.includes(item.day) &&
                              styles.dayTextSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.formControl}>
                <Text style={styles.formLabel}>End Date (Optional)</Text>
                <TouchableOpacity
                  style={styles.dateTimePickerButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Feather name="calendar" size={18} color={THEME.primary} />
                  <Text style={styles.dateTimeText}>
                    {formData.recurrence_end_date
                      ? new Date(formData.recurrence_end_date).toLocaleDateString()
                      : "No end date"}
                  </Text>
                </TouchableOpacity>
                {showEndDatePicker && (
                  <DateTimePicker
                    value={
                      formData.recurrence_end_date
                        ? new Date(formData.recurrence_end_date)
                        : new Date()
                    }
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowEndDatePicker(false);
                      if (selectedDate) {
                        onEndDateChange(selectedDate);
                      }
                    }}
                  />
                )}
              </View>
            </View>
          )}

          <View style={styles.formControl}>
            <Text style={styles.formLabel}>Event Image</Text>
            <TouchableOpacity
              style={styles.imagePickerContainer}
              onPress={onPickImage}
              disabled={formImageLoading}
            >
              {formImageLoading ? (
                <ActivityIndicator
                  size="small"
                  color={THEME.primary}
                  style={{ marginVertical: 12 }}
                />
              ) : (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Feather name="image" size={18} color={THEME.primary} />
                    <Text style={{ marginLeft: 10, color: THEME.primary }}>
                      {formData.image_url ? "Change Image" : "Add Image"}
                    </Text>
                  </View>
                  {formData.image_url && (
                    <Image
                      source={{ uri: formData.image_url }}
                      style={styles.imagePreview}
                      resizeMode="cover"
                    />
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.formControl}>
            <Text style={styles.formLabel}>Video Link (Optional)</Text>
            <TextInput
              style={styles.formInput}
              value={formData.video_link || ""}
              onChangeText={(value) => onChange("video_link", value)}
              placeholder="YouTube or other video URL"
              placeholderTextColor={THEME.textLight}
              keyboardType="url"
            />
          </View>

          <View style={styles.formActions}>
            <TouchableOpacity
              style={[styles.formButton, styles.cancelButton]}
              onPress={() => {
                // Close the modal
                isEditing ? (onClose ? onClose() : null) : null;
              }}
            >
              <Text style={[styles.buttonText, styles.cancelButtonText]}>
                {isEditing ? "Delete" : "Cancel"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.formButton, styles.submitButton]}
              onPress={onSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={THEME.textWhite} />
              ) : (
                <Text style={[styles.buttonText, styles.submitButtonText]}>
                  {isEditing ? "Update" : "Create"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
};

export default EventForm;
