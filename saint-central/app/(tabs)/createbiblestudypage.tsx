import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { AntDesign, Feather, MaterialIcons, FontAwesome5, Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/contexts/AuthContext";
import { useCRUD } from "@/utils/crudClient";
import { LinearGradient } from "expo-linear-gradient";
import theme from "../../theme"; // Updated import path

// Recurring type options
export type RecurringType = "none" | "daily" | "weekly" | "monthly" | "yearly";

// Types
interface BibleStudy {
  id?: string;
  date: string;
  time: string;
  image: string | null;
  church_id: string;
  created_by: string;
  description: string;
  location?: string;
  is_recurring: boolean;
  title: string;
  recurring_type?: RecurringType; // Added recurring type field
}

interface UserChurch {
  id: string;
  name: string;
  role: string;
}

const CreateBibleStudyPage: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const bibleStudyId = params.bibleStudyId as string | undefined;
  const isEditMode = !!bibleStudyId;

  // Use custom auth and CRUD hooks
  const { user: currentUser } = useAuth();
  const { select, selectOne, insert, update } = useCRUD();

  // State variables
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [userChurches, setUserChurches] = useState<UserChurch[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);

  // Form state
  const [formData, setFormData] = useState<BibleStudy>({
    date: new Date().toISOString().split("T")[0],
    time: "10:00 AM",
    image: null,
    church_id: "",
    created_by: "",
    description: "",
    location: "",
    is_recurring: false,
    title: "",
    recurring_type: "none",
  });

  // Date picker state - removed time picker state
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  // Set default creator when user is available
  useEffect(() => {
    if (currentUser && !formData.created_by) {
      setFormData((prevData) => ({
        ...prevData,
        created_by: currentUser.email || "Bible Study Leader",
      }));
    }
  }, [currentUser]);

  // Fetch user's churches after user is loaded
  useEffect(() => {
    if (currentUser) {
      fetchUserChurches();
    }
  }, [currentUser]);

  // Load Bible study data if in edit mode
  useEffect(() => {
    if (isEditMode && currentUser) {
      fetchBibleStudyData();
    }
  }, [isEditMode, currentUser]);

  // Fetch user's churches with role information
  const fetchUserChurches = async (): Promise<void> => {
    if (!currentUser) return;

    try {
      // Get churches where the user is a member
      const churchMembers = await select("church_members", {
        select: "church_id, role",
        where: { user_id: currentUser.id }
      });

      if (churchMembers && churchMembers.length > 0) {
        // Get church details for each membership individually
        const churchData: any[] = [];
        
        for (const member of churchMembers) {
          try {
            const church = await selectOne("churches", {
              select: "id, name",
              where: { id: member.church_id }
            });
            
            if (church) {
              churchData.push({
                ...church,
                role: member.role
              });
            }
          } catch (error) {
            console.error(`Error fetching church ${member.church_id}:`, error);
          }
        }

        // Transform the data into UserChurch format
        const churches: UserChurch[] = churchData.map((church) => ({
          id: church.id.toString(),
          name: church.name,
          role: church.role,
        }));

        // Filter churches where user has admin or owner role
        const adminChurches = churches.filter(
          (church) =>
            church.role.toLowerCase() === "admin" || church.role.toLowerCase() === "owner",
        );

        setUserChurches(adminChurches);

        // Set has permission if user has at least one church with admin role
        setHasPermission(adminChurches.length > 0);

        // Select the first church by default if not in edit mode
        if (!isEditMode && adminChurches.length > 0 && !formData.church_id) {
          setFormData((prevData) => ({
            ...prevData,
            church_id: adminChurches[0].id,
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching user churches:", error);
      Alert.alert("Error", "Failed to load church information");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Bible study data for editing
  const fetchBibleStudyData = async (): Promise<void> => {
    if (!bibleStudyId) return;

    try {
      setLoading(true);

      const data = await selectOne("bible_study_times", {
        where: { id: parseInt(bibleStudyId) }
      });

      if (data) {
        // Populate form with existing data
        setFormData({
          id: data.id.toString(),
          date: data.date,
          time: data.time,
          image: data.image,
          church_id: data.church_id.toString(),
          created_by: data.created_by,
          description: data.description || "",
          location: data.location || "",
          is_recurring: data.is_recurring || false,
          title: data.title || "",
          recurring_type: data.recurring_type || "none",
        });
      }
    } catch (error) {
      console.error("Error fetching Bible study data:", error);
      Alert.alert("Error", "Failed to load Bible study information");
    } finally {
      setLoading(false);
    }
  };

  // Update form field - fixed type to accept string, null, or boolean
  const updateField = (
    field: keyof BibleStudy,
    value: string | null | boolean | number | RecurringType,
  ): void => {
    setFormData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
  };

  // Handle recurring type selection
  const handleRecurringTypeSelect = (type: RecurringType) => {
    // If selecting "none", set is_recurring to false
    if (type === "none") {
      setFormData((prevData) => ({
        ...prevData,
        recurring_type: type,
        is_recurring: false,
      }));
    } else {
      // For any other type, set is_recurring to true
      setFormData((prevData) => ({
        ...prevData,
        recurring_type: type,
        is_recurring: true,
      }));
    }
  };

  // Handle date selection
  const onDateChange = (event: any, selectedDate?: Date): void => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split("T")[0];
      updateField("date", formattedDate);
    }
  };

  // Handle image selection - updated to use placeholder since no storage service
  const pickImage = async (): Promise<void> => {
    if (!currentUser) {
      Alert.alert("Error", "You must be signed in to upload images");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Show loading indicator
        setUploadingImage(true);
        setErrorMessage(null);

        // For now, we'll use a placeholder since we don't have image storage
        // In a real implementation, you'd want to upload to your own image service
        const placeholderUrl = "https://via.placeholder.com/400x200?text=Bible+Study+Image";
        
        // Simulate upload delay
        setTimeout(() => {
          updateField("image", placeholderUrl);
          setUploadingImage(false);
          Alert.alert("Note", "Image selected successfully. Note: In production, this would upload to your image storage service.");
        }, 1000);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
      setUploadingImage(false);
    }
  };

  // Improved form validation - checks all required fields
  const validateForm = (): boolean => {
    if (!formData.title || formData.title.trim() === "") {
      setErrorMessage("Please enter a title");
      return false;
    }

    if (!formData.date) {
      setErrorMessage("Please select a date");
      return false;
    }

    if (!formData.time) {
      setErrorMessage("Please enter a time");
      return false;
    }

    if (!formData.church_id) {
      setErrorMessage("Please select a church");
      return false;
    }

    if (!formData.description || formData.description.trim() === "") {
      setErrorMessage("Please enter a description");
      return false;
    }

    if (!formData.created_by || formData.created_by.trim() === "") {
      setErrorMessage("Please enter a creator name");
      return false;
    }

    if (!currentUser) {
      setErrorMessage("You must be signed in to save");
      return false;
    }

    return true;
  };

  // Handle save/update with improved error handling and loading state
  const handleSave = async (): Promise<void> => {
    if (!currentUser) {
      Alert.alert("Error", "You must be signed in to create or edit Bible studies");
      return;
    }

    if (!hasPermission) {
      Alert.alert("Error", "You do not have permission to create or edit Bible studies");
      return;
    }

    if (!validateForm()) return;

    try {
      setSaving(true);
      setErrorMessage(null);

      const bibleStudyData = {
        date: formData.date,
        time: formData.time,
        image: formData.image,
        church_id: parseInt(formData.church_id),
        created_by: formData.created_by || "Bible Study Leader",
        description: formData.description,
        location: formData.location,
        is_recurring: formData.is_recurring,
        title: formData.title,
        recurring_type: formData.recurring_type,
      };

      if (isEditMode) {
        // Update existing Bible study
        await update("bible_study_times", bibleStudyData, {
          id: parseInt(bibleStudyId!)
        });

        Alert.alert("Success", "Bible study updated successfully", [
          { text: "OK", onPress: () => router.push("/biblestudy") },
        ]);
      } else {
        // Create new Bible study
        await insert("bible_study_times", bibleStudyData);

        Alert.alert("Success", "Bible study created successfully", [
          { text: "OK", onPress: () => router.push("/biblestudy") },
        ]);
      }
    } catch (error) {
      console.error("Error saving Bible study:", error);
      setErrorMessage("Failed to save Bible study. Please try again.");
      Alert.alert("Save Error", `Failed to ${isEditMode ? 'update' : 'create'} Bible study. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel - updated to route back to biblestudy
  const handleCancel = (): void => {
    router.push("/biblestudy");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.noPermissionContainer}>
            <Feather name="alert-circle" size={60} color={theme.error} />
            <Text style={styles.noPermissionTitle}>Access Denied</Text>
            <Text style={styles.noPermissionText}>
              You do not have permission to create or edit Bible studies. Please contact your church
              administrator for access.
            </Text>
            <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
            <AntDesign name="arrowleft" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditMode ? "Edit Bible Study" : "New Bible Study"}
          </Text>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          {/* Form Header */}
          <View style={styles.formHeader}>
            <LinearGradient
              colors={theme.gradientWarm}
              style={styles.formHeaderGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name="book-open" size={36} color={theme.textWhite} />
              <Text style={styles.formHeaderTitle}>
                {isEditMode ? "Update Bible Study Details" : "Create New Bible Study"}
              </Text>
            </LinearGradient>
          </View>

          {/* Error Message */}
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Form Fields */}
          <View style={styles.formCard}>
            {/* Title (improved) */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Title*</Text>
              <View style={styles.enhancedInputContainer}>
                <FontAwesome5
                  name="bible"
                  size={18}
                  color={theme.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.enhancedTextInput}
                  value={formData.title}
                  onChangeText={(text) => updateField("title", text)}
                  placeholder="e.g., Sunday Morning Bible Study"
                  placeholderTextColor={theme.neutral400}
                  autoCapitalize="words"
                />
              </View>
              <Text style={styles.helperText}>A clear, descriptive title for your Bible study</Text>
            </View>

            {/* Description */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Description*</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                value={formData.description}
                onChangeText={(text) => updateField("description", text)}
                placeholder="Enter details about the Bible study content, themes, or format"
                placeholderTextColor={theme.neutral400}
                multiline={true}
                numberOfLines={4}
              />
            </View>

            {/* Date */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Date*</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Feather
                  name="calendar"
                  size={20}
                  color={theme.secondary}
                  style={styles.inputIcon}
                />
                <Text style={styles.dateTimeText}>{formData.date || "Select Date"}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={new Date(formData.date)}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                />
              )}
            </View>

            {/* Time - UPDATED to use direct text input */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Time*</Text>
              <View style={styles.enhancedInputContainer}>
                <Feather name="clock" size={20} color={theme.secondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.enhancedTextInput}
                  value={formData.time}
                  onChangeText={(text) => updateField("time", text)}
                  placeholder="e.g., 10:00 AM"
                  placeholderTextColor={theme.neutral400}
                />
              </View>
              <Text style={styles.helperText}>
                Enter time in your preferred format (e.g., 10:00 AM, 14:30, etc.)
              </Text>
            </View>

            {/* Church Selection */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Church*</Text>
              {userChurches.length === 1 ? (
                <View style={styles.singleChurchContainer}>
                  <Text style={styles.singleChurchText}>{userChurches[0].name}</Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.churchSelector}
                >
                  {userChurches.map((church) => (
                    <TouchableOpacity
                      key={church.id}
                      style={[
                        styles.churchOption,
                        formData.church_id === church.id && styles.churchOptionActive,
                      ]}
                      onPress={() => updateField("church_id", church.id)}
                    >
                      <Text
                        style={[
                          styles.churchOptionText,
                          formData.church_id === church.id && styles.churchOptionTextActive,
                        ]}
                      >
                        {church.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Location */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Location</Text>
              <View style={styles.enhancedInputContainer}>
                <Feather
                  name="map-pin"
                  size={18}
                  color={theme.secondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.enhancedTextInput}
                  value={formData.location}
                  onChangeText={(text) => updateField("location", text)}
                  placeholder="e.g., Church Fellowship Hall"
                  placeholderTextColor={theme.neutral400}
                />
              </View>
            </View>

            {/* Creator - Allow custom input */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Creator</Text>
              <View style={styles.enhancedInputContainer}>
                <Feather name="user" size={18} color={theme.secondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.enhancedTextInput}
                  value={formData.created_by}
                  onChangeText={(text) => updateField("created_by", text)}
                  placeholder="Enter creator name (e.g., Pastor Smith, Youth Group, etc.)"
                  placeholderTextColor={theme.neutral400}
                />
              </View>
              <Text style={styles.helperText}>
                Enter who is leading or organizing this Bible study
              </Text>
            </View>

            {/* Image */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Image</Text>
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={pickImage}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <View style={styles.uploadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={styles.uploadingText}>Processing image...</Text>
                  </View>
                ) : formData.image ? (
                  <>
                    <Image source={{ uri: formData.image }} style={styles.previewImage} />
                    <View style={styles.changeImageOverlay}>
                      <Text style={styles.changeImageText}>Change Image</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Feather name="image" size={28} color={theme.secondary} />
                    <Text style={styles.imagePickerText}>Select Image</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.helperText}>
                Note: Image functionality requires setting up your own image storage service
              </Text>
            </View>

            {/* Recurring Option - Enhanced with multiple choices */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Recurring Schedule</Text>

              {/* Recurring options */}
              <View style={styles.recurringOptionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.recurringOption,
                    formData.recurring_type === "none" && styles.recurringOptionActive,
                  ]}
                  onPress={() => handleRecurringTypeSelect("none")}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={formData.recurring_type === "none" ? theme.textWhite : theme.textDark}
                  />
                  <Text
                    style={[
                      styles.recurringOptionText,
                      formData.recurring_type === "none" && styles.recurringOptionTextActive,
                    ]}
                  >
                    One-time
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.recurringOption,
                    formData.recurring_type === "daily" && styles.recurringOptionActive,
                  ]}
                  onPress={() => handleRecurringTypeSelect("daily")}
                >
                  <Ionicons
                    name="today-outline"
                    size={20}
                    color={formData.recurring_type === "daily" ? theme.textWhite : theme.textDark}
                  />
                  <Text
                    style={[
                      styles.recurringOptionText,
                      formData.recurring_type === "daily" && styles.recurringOptionTextActive,
                    ]}
                  >
                    Daily
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.recurringOption,
                    formData.recurring_type === "weekly" && styles.recurringOptionActive,
                  ]}
                  onPress={() => handleRecurringTypeSelect("weekly")}
                >
                  <Ionicons
                    name="calendar"
                    size={20}
                    color={formData.recurring_type === "weekly" ? theme.textWhite : theme.textDark}
                  />
                  <Text
                    style={[
                      styles.recurringOptionText,
                      formData.recurring_type === "weekly" && styles.recurringOptionTextActive,
                    ]}
                  >
                    Weekly
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.recurringOption,
                    formData.recurring_type === "monthly" && styles.recurringOptionActive,
                  ]}
                  onPress={() => handleRecurringTypeSelect("monthly")}
                >
                  <Ionicons
                    name="calendar-number-outline"
                    size={20}
                    color={formData.recurring_type === "monthly" ? theme.textWhite : theme.textDark}
                  />
                  <Text
                    style={[
                      styles.recurringOptionText,
                      formData.recurring_type === "monthly" && styles.recurringOptionTextActive,
                    ]}
                  >
                    Monthly
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.recurringOption,
                    formData.recurring_type === "yearly" && styles.recurringOptionActive,
                  ]}
                  onPress={() => handleRecurringTypeSelect("yearly")}
                >
                  <Ionicons
                    name="calendar-clear"
                    size={20}
                    color={formData.recurring_type === "yearly" ? theme.textWhite : theme.textDark}
                  />
                  <Text
                    style={[
                      styles.recurringOptionText,
                      formData.recurring_type === "yearly" && styles.recurringOptionTextActive,
                    ]}
                  >
                    Yearly
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Help text based on selection */}
              <Text style={styles.helperText}>
                {formData.recurring_type === "none" && "This is a one-time Bible study event."}
                {formData.recurring_type === "daily" &&
                  "This study will repeat every day at the same time and location."}
                {formData.recurring_type === "weekly" &&
                  "This study will repeat every week on this day at the same time and location."}
                {formData.recurring_type === "monthly" &&
                  "This study will repeat monthly on this date at the same time and location."}
                {formData.recurring_type === "yearly" &&
                  "This study will repeat yearly on this date at the same time and location."}
              </Text>
            </View>

            {/* Required Fields Note */}
            <Text style={styles.requiredNote}>* Required fields</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} disabled={saving}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={theme.textWhite} />
              ) : (
                <>
                  <Text style={styles.saveButtonText}>{isEditMode ? "Update" : "Create"}</Text>
                  <Feather
                    name={isEditMode ? "check-circle" : "plus-circle"}
                    size={18}
                    color={theme.textWhite}
                    style={styles.saveButtonIcon}
                  />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.pageBg,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
    backgroundColor: theme.cardBg,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: theme.primary,
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: theme.fontBold,
    color: theme.primary,
  },
  headerRightPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  formHeader: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    borderRadius: theme.radiusMedium,
    overflow: "hidden",
    ...theme.shadowMedium,
  },
  formHeaderGradient: {
    padding: 24,
    alignItems: "center",
  },
  formHeaderTitle: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginTop: 12,
    textAlign: "center",
  },
  errorContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    backgroundColor: "rgba(188, 108, 100, 0.1)",
    borderRadius: theme.radiusMedium,
    borderLeftWidth: 4,
    borderLeftColor: theme.error,
    borderWidth: 1,
    borderColor: "rgba(188, 108, 100, 0.2)",
  },
  errorText: {
    color: theme.error,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  formCard: {
    marginHorizontal: 16,
    backgroundColor: theme.cardBg,
    borderRadius: theme.radiusLarge,
    padding: 24,
    ...theme.shadowLight,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.neutral100,
  },
  fieldContainer: {
    marginBottom: 28,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.neutral100,
  },
  fieldLabel: {
    fontSize: 18,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginBottom: 12,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  },
  // Enhanced input styling
  enhancedInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.neutral800,
    borderRadius: theme.radiusMedium,
    borderWidth: 2,
    borderColor: theme.neutral600,
    paddingHorizontal: 16,
    shadowColor: theme.neutral900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  enhancedTextInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: theme.textWhite,
    fontWeight: "600",
  },
  // Original input styling
  textInput: {
    backgroundColor: theme.neutral800,
    borderRadius: theme.radiusMedium,
    borderWidth: 2,
    borderColor: theme.neutral600,
    padding: 16,
    fontSize: 16,
    color: theme.textWhite,
    fontWeight: "600",
    shadowColor: theme.neutral900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  textAreaInput: {
    height: 120,
    textAlignVertical: "top",
  },
  dateTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.neutral800,
    borderRadius: theme.radiusMedium,
    borderWidth: 2,
    borderColor: theme.neutral600,
    padding: 16,
    paddingLeft: 16,
    shadowColor: theme.neutral900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  dateTimeText: {
    fontSize: 16,
    color: theme.textWhite,
    flex: 1,
    fontWeight: "600",
  },
  singleChurchContainer: {
    backgroundColor: theme.overlayLight,
    borderRadius: theme.radiusMedium,
    padding: 16,
    borderWidth: 2,
    borderColor: theme.primary,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  singleChurchText: {
    fontSize: 16,
    color: theme.primary,
    fontWeight: theme.fontBold,
  },
  churchSelector: {
    flexDirection: "row",
    paddingVertical: 8,
  },
  churchOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: theme.neutral800,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 2,
    borderColor: theme.neutral600,
    shadowColor: theme.neutral900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  churchOptionActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  churchOptionText: {
    color: theme.textWhite,
    fontWeight: theme.fontBold,
    fontSize: 14,
  },
  churchOptionTextActive: {
    color: theme.textWhite,
    fontWeight: theme.fontBold,
  },
  creatorInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.overlayLight,
    borderRadius: theme.radiusSmall,
    borderWidth: 1,
    borderColor: theme.primary,
    padding: 12,
  },
  creatorInfoText: {
    fontSize: 16,
    color: theme.textDark,
    marginLeft: 10,
    flex: 1,
  },
  imagePickerButton: {
    height: 180,
    backgroundColor: theme.neutral800,
    borderRadius: theme.radiusMedium,
    borderWidth: 2,
    borderColor: theme.neutral600,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    shadowColor: theme.neutral900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  imagePickerText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.textWhite,
    fontWeight: "600",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  changeImageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 8,
    alignItems: "center",
  },
  changeImageText: {
    color: theme.textWhite,
    fontSize: 14,
    fontWeight: theme.fontMedium,
  },
  uploadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.primary,
    fontWeight: theme.fontMedium,
  },

  // New recurring options styling
  recurringOptionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginVertical: 12,
    justifyContent: "space-between",
  },
  recurringOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.neutral800,
    borderRadius: theme.radiusMedium,
    borderWidth: 2,
    borderColor: theme.neutral600,
    padding: 14,
    marginBottom: 10,
    width: "48%",
    shadowColor: theme.neutral900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  recurringOptionActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  recurringOptionText: {
    marginLeft: 10,
    fontSize: 15,
    color: theme.textWhite,
    fontWeight: theme.fontBold,
  },
  recurringOptionTextActive: {
    color: theme.textWhite,
    fontWeight: theme.fontBold,
  },

  // Old switch styling (kept for reference)
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.pageBg,
    borderRadius: theme.radiusSmall,
    borderWidth: 1,
    borderColor: theme.divider,
    padding: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: theme.textDark,
    flex: 1,
  },
  toggleButton: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.divider,
    padding: 2,
  },
  toggleButtonActive: {
    backgroundColor: theme.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.cardBg,
  },
  toggleThumbActive: {
    transform: [{ translateX: 22 }],
  },

  helperText: {
    fontSize: 14,
    color: theme.neutral300,
    marginTop: 8,
    fontStyle: "italic",
    lineHeight: 18,
    paddingLeft: 4,
    fontWeight: "500",
  },
  requiredNote: {
    fontSize: 14,
    color: theme.neutral300,
    marginTop: 20,
    fontStyle: "italic",
    textAlign: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.neutral700,
    fontWeight: "500",
  },
  actionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    backgroundColor: theme.neutral800,
    borderRadius: theme.radiusMedium,
    borderWidth: 2,
    borderColor: theme.neutral600,
    marginRight: 10,
    alignItems: "center",
    shadowColor: theme.neutral900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButtonText: {
    color: theme.textWhite,
    fontSize: 16,
    fontWeight: theme.fontBold,
  },
  saveButton: {
    flex: 2,
    flexDirection: "row",
    padding: 16,
    backgroundColor: theme.primary,
    borderRadius: theme.radiusMedium,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: theme.neutral400,
    shadowOpacity: 0.1,
  },
  saveButtonText: {
    color: theme.textWhite,
    fontSize: 16,
    fontWeight: theme.fontBold,
  },
  saveButtonIcon: {
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.pageBg,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.textMedium,
  },
  noPermissionContainer: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },
  noPermissionTitle: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.error,
    marginTop: 16,
    marginBottom: 8,
  },
  noPermissionText: {
    fontSize: 16,
    color: theme.textMedium,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
});

export default CreateBibleStudyPage;