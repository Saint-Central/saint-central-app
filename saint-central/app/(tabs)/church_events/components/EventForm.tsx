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

interface EventFormProps {
  formData: EventFormData;
  isSubmitting: boolean;
  formImageLoading: boolean;
  showTimePicker: boolean;
  showEndDatePicker: boolean;
  isEditMode: boolean;
  onSubmit: () => void;
  onDelete?: () => void;
  onChangeField: (field: keyof EventFormData, value: any) => void;
  onDateTimeChange: (event: any, selectedDate?: Date) => void;
  onEndDateChange: (event: any, selectedDate?: Date) => void;
  onToggleTimePicker: () => void;
  onToggleEndDatePicker: () => void;
  onPickImage: () => void;
  onToggleRecurrenceDay: (day: number) => void;
}

const EventForm: React.FC<EventFormProps> = ({
  formData,
  isSubmitting,
  formImageLoading,
  showTimePicker,
  showEndDatePicker,
  isEditMode,
  onSubmit,
  onDelete,
  onChangeField,
  onDateTimeChange,
  onEndDateChange,
  onToggleTimePicker,
  onToggleEndDatePicker,
  onPickImage,
  onToggleRecurrenceDay,
}) => {
  return (
    <ScrollView style={styles.formContainer}>
      <View style={styles.formControl}>
        <Text style={styles.formLabel}>Event Title*</Text>
        <TextInput
          style={styles.formInput}
          value={formData.title}
          onChangeText={(value) => onChangeField("title", value)}
          placeholder="Enter event title"
          placeholderTextColor={THEME.textLight}
        />
      </View>

      <View style={styles.formControl}>
        <Text style={styles.formLabel}>Description*</Text>
        <TextInput
          style={[styles.formInput, styles.textAreaInput]}
          value={formData.excerpt}
          onChangeText={(value) => onChangeField("excerpt", value)}
          placeholder="Event description"
          placeholderTextColor={THEME.textLight}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.formControl}>
        <Text style={styles.formLabel}>Date & Time*</Text>
        <TouchableOpacity style={styles.dateTimePickerButton} onPress={onToggleTimePicker}>
          <Feather name="calendar" size={18} color={THEME.primary} />
          <Text style={styles.dateTimeText}>{new Date(formData.time).toLocaleString()}</Text>
        </TouchableOpacity>
      </View>

      {showTimePicker && (
        <DateTimePicker
          value={new Date(formData.time)}
          mode="datetime"
          display="default"
          onChange={onDateTimeChange}
        />
      )}

      <View style={styles.formControl}>
        <Text style={styles.formLabel}>Location</Text>
        <TextInput
          style={styles.formInput}
          value={formData.author_name || ""}
          onChangeText={(value) => onChangeField("author_name", value)}
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
              onChangeField("is_recurring", value);
              if (value && !formData.recurrence_type) {
                onChangeField("recurrence_type", "weekly");
              }
              if (value && !formData.recurrence_interval) {
                onChangeField("recurrence_interval", 1);
              }
              if (value && !formData.recurrence_days_of_week) {
                // Default to the day of the week from the selected date
                const dayOfWeek = new Date(formData.time).getDay();
                onChangeField("recurrence_days_of_week", [dayOfWeek]);
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
                  onPress={() => onChangeField("recurrence_type", type)}
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
                  onChangeField("recurrence_interval", value);
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
            <TouchableOpacity style={styles.dateTimePickerButton} onPress={onToggleEndDatePicker}>
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
                  formData.recurrence_end_date ? new Date(formData.recurrence_end_date) : new Date()
                }
                mode="date"
                display="default"
                onChange={onEndDateChange}
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
            <ActivityIndicator size="small" color={THEME.primary} style={{ marginVertical: 12 }} />
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
          onChangeText={(value) => onChangeField("video_link", value)}
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
            isEditMode ? (onDelete ? onDelete() : null) : null;
          }}
        >
          <Text style={[styles.buttonText, styles.cancelButtonText]}>
            {isEditMode && onDelete ? "Delete" : "Cancel"}
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
              {isEditMode ? "Update" : "Create"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default EventForm;
