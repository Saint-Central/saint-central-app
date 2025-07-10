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
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

// Import the new auth and CRUD utilities
import { useAuth } from "@/contexts/AuthContext";
import { useCRUD } from "@/utils/crudClient";
import theme from "@/theme";

// Recurring type options
export type RecurringType = "none" | "daily" | "weekly" | "monthly" | "yearly";

// Types for navigation
type RootStackParamList = {
  youthgroup: undefined;
  createyouthgrouppage: { youthGroupId?: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Types
interface YouthGroup {
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
  recurring_type?: RecurringType;
}

interface UserChurch {
  id: string;
  name: string;
  role: string;
}

interface User {
  id: string;
  email?: string;
  role: string;
  [key: string]: any;
}

const CreateYouthGroupPage: React.FC = () => {
  const router = useRouter();
  const navigation = useNavigation<NavigationProp>();
  const params = useLocalSearchParams();
  const youthGroupId = params.youthGroupId as string | undefined;
  const isEditMode = !!youthGroupId;

  // Use the new auth and CRUD hooks
  const { user, loading: authLoading } = useAuth();
  const { select, selectOne, insert, update } = useCRUD();

  // State variables
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [userChurches, setUserChurches] = useState<UserChurch[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);

  // Form state
  const [formData, setFormData] = useState<YouthGroup>({
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

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  // Set default creator when user is available
  useEffect(() => {
    console.log("User changed:", user);
    console.log("Auth loading:", authLoading);
    
    if (user && !formData.created_by) {
      console.log("Setting default creator for user:", user.email);
      setFormData((prevData) => ({
        ...prevData,
        created_by: user.email || "Youth Group Leader",
      }));
    }
  }, [user, authLoading]);

  // Fetch user's churches after user is loaded
  useEffect(() => {
    if (user && !authLoading) {
      // Test basic CRUD functionality first
      testCRUDConnection();
      fetchUserChurches();
    }
  }, [user, authLoading]);

  // Test CRUD connection
  const testCRUDConnection = async () => {
    try {
      console.log("Testing CRUD connection...");
      console.log("User ID for testing:", user?.id);
      
      // Try a simple query to test if CRUD is working
      const testResult = await select("church_members", { limit: 1 });
      console.log("CRUD test successful:", testResult);
      
      // Try to get all church members (to see table structure)
      const allMembers = await select("church_members", { limit: 5 });
      console.log("Sample church members:", allMembers);
      
    } catch (error) {
      console.error("CRUD test failed:", error);
      console.error("CRUD error type:", typeof error);
      console.error("CRUD error message:", error instanceof Error ? error.message : error);
    }
  };

  // Load Youth Group data if in edit mode
  useEffect(() => {
    if (isEditMode && user && !authLoading) {
      fetchYouthGroupData();
    }
  }, [isEditMode, user, authLoading]);

  // Fetch user's churches with role information
  const fetchUserChurches = async (): Promise<void> => {
    if (!user) return;

    try {
      setLoading(true);
      console.log("Fetching churches for user:", user.id);

      // First, get church memberships for the user
      const churchMembers = await select("church_members", {
        select: "church_id, role",
        where: { user_id: user.id }
      });

      console.log("Church members data:", churchMembers);

      if (churchMembers && churchMembers.length > 0) {
        // Get church details for each church the user is a member of
        const churchIds = churchMembers.map(member => member.church_id);
        console.log("Church IDs:", churchIds);

        // Fetch church details
        const churchDetails = await select("churches", {
          select: "id, name",
          where: { id: churchIds }
        });

        console.log("Church details:", churchDetails);

        // Combine member data with church details
        const churches: UserChurch[] = churchMembers.map((member) => {
          const church = churchDetails.find(c => c.id === member.church_id);
          return {
            id: member.church_id,
            name: church?.name || `Church ${member.church_id}`,
            role: member.role,
          };
        });

        console.log("Combined churches:", churches);

        // Filter churches where user has admin or owner role
        const adminChurches = churches.filter(
          (church) =>
            church.role.toLowerCase() === "admin" || church.role.toLowerCase() === "owner",
        );

        console.log("Admin churches:", adminChurches);

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
      } else {
        console.log("No church memberships found for user");
        setHasPermission(false);
      }
    } catch (error) {
      console.error("Error fetching user churches:", error);
      console.error("Error details:", error);
      Alert.alert("Error", `Failed to load church information: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Youth Group data for editing
  const fetchYouthGroupData = async (): Promise<void> => {
    if (!youthGroupId) return;

    try {
      setLoading(true);
      console.log("Fetching youth group data for ID:", youthGroupId);

      const youthGroupData = await selectOne("youth_group_times", {
        where: { id: youthGroupId }
      });

      console.log("Youth group data:", youthGroupData);

      if (youthGroupData) {
        // Populate form with existing data
        setFormData({
          id: youthGroupData.id,
          date: youthGroupData.date,
          time: youthGroupData.time,
          image: youthGroupData.image,
          church_id: youthGroupData.church_id,
          created_by: youthGroupData.created_by,
          description: youthGroupData.description || "",
          location: youthGroupData.location || "",
          is_recurring: youthGroupData.is_recurring || false,
          title: youthGroupData.title || "",
          recurring_type: youthGroupData.recurring_type || "none",
        });
      } else {
        console.log("No youth group data found for ID:", youthGroupId);
        Alert.alert("Error", "Youth Group not found");
      }
    } catch (error) {
      console.error("Error fetching Youth Group data:", error);
      console.error("Error details:", error);
      Alert.alert("Error", `Failed to load Youth Group information: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Update form field
  const updateField = (
    field: keyof YouthGroup,
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

  // Handle image selection and upload
  // Note: This still uses a storage service - you may need to adapt this to your new backend
  const pickImage = async (): Promise<void> => {
    if (!user) {
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
        setUploadingImage(true);
        setErrorMessage(null);

        // For now, just use a placeholder URL or implement your own image upload logic
        // You'll need to implement image upload to your new backend
        const imageUrl = `https://placeholder.com/youth-group-image-${Date.now()}`;
        
        // Update form with image URL
        updateField("image", imageUrl);
        
        // TODO: Implement actual image upload to your new backend
        Alert.alert("Note", "Image upload needs to be implemented for the new backend");
      }
    } catch (error) {
      console.error("Error picking/uploading image:", error);
      Alert.alert("Error", "Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Improved form validation
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

    if (!user) {
      setErrorMessage("You must be signed in to save");
      return false;
    }

    return true;
  };

  // Handle save/update with improved error handling and loading state
  const handleSave = async (): Promise<void> => {
    if (!user) {
      Alert.alert("Error", "You must be signed in to create or edit Youth Groups");
      return;
    }

    if (!hasPermission) {
      Alert.alert("Error", "You do not have permission to create or edit Youth Groups");
      return;
    }

    if (!validateForm()) return;

    try {
      setSaving(true);
      setErrorMessage(null);

      const youthGroupData = {
        date: formData.date,
        time: formData.time,
        image: formData.image,
        church_id: formData.church_id,
        created_by: formData.created_by || "Youth Group Leader",
        description: formData.description,
        location: formData.location,
        is_recurring: formData.is_recurring,
        title: formData.title,
        recurring_type: formData.recurring_type,
      };

      console.log("Saving youth group data:", youthGroupData);

      if (isEditMode) {
        console.log("Updating youth group with ID:", youthGroupId);
        // Update existing Youth Group
        const result = await update("youth_group_times", youthGroupData, { id: youthGroupId });
        console.log("Update result:", result);

        Alert.alert("Success", "Youth Group updated successfully", [
          {
            text: "OK",
            onPress: () => router.push({ pathname: "/(tabs)/YouthGroupSchedulePage" }),
          },
        ]);
      } else {
        console.log("Creating new youth group");
        // Create new Youth Group
        const result = await insert("youth_group_times", youthGroupData);
        console.log("Insert result:", result);

        Alert.alert("Success", "Youth Group created successfully", [
          {
            text: "OK",
            onPress: () => router.push({ pathname: "/(tabs)/YouthGroupSchedulePage" }),
          },
        ]);
      }
    } catch (error) {
      console.error("Error saving Youth Group:", error);
      console.error("Error details:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to save Youth Group. Please try again.";
      Alert.alert("Save Error", errorMsg);
      setErrorMessage(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = (): void => {
    router.push({ pathname: "/(tabs)/YouthGroupSchedulePage" });
  };

  if (authLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.accent1} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.noPermissionContainer}>
            <Feather name="alert-circle" size={60} color={theme.error} />
            <Text style={styles.noPermissionTitle}>Authentication Required</Text>
            <Text style={styles.noPermissionText}>
              You must be signed in to create or edit Youth Groups. Please log in and try again.
            </Text>
            <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
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
              You do not have permission to create or edit Youth Groups. Please contact your church
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
            <AntDesign name="arrowleft" size={24} color={theme.tertiary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditMode ? "Edit Youth Group" : "New Youth Group"}
          </Text>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          {/* Form Header */}
          <View style={styles.formHeader}>
            <LinearGradient
              colors={theme.gradientCool}
              style={styles.formHeaderGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name="users" size={36} color={theme.textWhite} />
              <Text style={styles.formHeaderTitle}>
                {isEditMode ? "Update Youth Group Details" : "Create New Youth Group"}
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
            {/* Title */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Title*</Text>
              <View style={styles.enhancedInputContainer}>
                <FontAwesome5
                  name="users"
                  size={18}
                  color={theme.accent1}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.enhancedTextInput}
                  value={formData.title}
                  onChangeText={(text) => updateField("title", text)}
                  placeholder="e.g., Sunday Evening Youth Group"
                  placeholderTextColor={theme.textLight}
                  autoCapitalize="words"
                />
              </View>
              <Text style={styles.helperText}>A clear, descriptive title for your Youth Group</Text>
            </View>

            {/* Description */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Description*</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                value={formData.description}
                onChangeText={(text) => updateField("description", text)}
                placeholder="Enter details about the Youth Group activities, themes, or format"
                placeholderTextColor={theme.textLight}
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

            {/* Time */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Time*</Text>
              <View style={styles.enhancedInputContainer}>
                <Feather name="clock" size={20} color={theme.secondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.enhancedTextInput}
                  value={formData.time}
                  onChangeText={(text) => updateField("time", text)}
                  placeholder="e.g., 7:00 PM"
                  placeholderTextColor={theme.textLight}
                />
              </View>
              <Text style={styles.helperText}>
                Enter time in your preferred format (e.g., 7:00 PM, 19:30, etc.)
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
                  placeholder="e.g., Church Youth Room"
                  placeholderTextColor={theme.textLight}
                />
              </View>
            </View>

            {/* Creator */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Creator</Text>
              <View style={styles.enhancedInputContainer}>
                <Feather name="user" size={18} color={theme.secondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.enhancedTextInput}
                  value={formData.created_by}
                  onChangeText={(text) => updateField("created_by", text)}
                  placeholder="Enter creator name (e.g., Youth Pastor, Youth Team, etc.)"
                  placeholderTextColor={theme.textLight}
                />
              </View>
              <Text style={styles.helperText}>
                Enter who is leading or organizing this Youth Group
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
                    <Text style={styles.uploadingText}>Uploading image...</Text>
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
            </View>

            {/* Recurring Option */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Recurring Schedule</Text>

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
                    color={formData.recurring_type === "none" ? theme.textWhite : theme.textMedium}
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
                    color={formData.recurring_type === "daily" ? theme.textWhite : theme.textMedium}
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
                    color={formData.recurring_type === "weekly" ? theme.textWhite : theme.textMedium}
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
                    color={formData.recurring_type === "monthly" ? theme.textWhite : theme.textMedium}
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
                    color={formData.recurring_type === "yearly" ? theme.textWhite : theme.textMedium}
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

              <Text style={styles.helperText}>
                {formData.recurring_type === "none" && "This is a one-time Youth Group event."}
                {formData.recurring_type === "daily" &&
                  "This Youth Group will repeat every day at the same time and location."}
                {formData.recurring_type === "weekly" &&
                  "This Youth Group will repeat every week on this day at the same time and location."}
                {formData.recurring_type === "monthly" &&
                  "This Youth Group will repeat monthly on this date at the same time and location."}
                {formData.recurring_type === "yearly" &&
                  "This Youth Group will repeat yearly on this date at the same time and location."}
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
    color: theme.accent1,
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: theme.fontBold,
    color: theme.tertiary,
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
    marginBottom: 16,
    padding: 12,
    backgroundColor: "rgba(167, 124, 142, 0.1)",
    borderRadius: theme.radiusSmall,
    borderLeftWidth: 4,
    borderLeftColor: theme.error,
  },
  errorText: {
    color: theme.error,
    fontSize: 14,
  },
  formCard: {
    marginHorizontal: 16,
    backgroundColor: theme.cardBg,
    borderRadius: theme.radiusMedium,
    padding: 16,
    ...theme.shadowLight,
    marginBottom: 24,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: theme.textWhite,
    marginBottom: 8,
  },
  enhancedInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.pageBg,
    borderRadius: theme.radiusSmall,
    borderWidth: 1,
    borderColor: theme.divider,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  enhancedTextInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: theme.textWhite,
  },
  textInput: {
    backgroundColor: theme.pageBg,
    borderRadius: theme.radiusSmall,
    borderWidth: 1,
    borderColor: theme.divider,
    padding: 12,
    fontSize: 16,
    color: theme.textWhite,
  },
  textAreaInput: {
    height: 120,
    textAlignVertical: "top",
  },
  dateTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.pageBg,
    borderRadius: theme.radiusSmall,
    borderWidth: 1,
    borderColor: theme.divider,
    padding: 12,
    paddingLeft: 16,
  },
  dateTimeText: {
    fontSize: 16,
    color: theme.textWhite,
    flex: 1,
  },
  singleChurchContainer: {
    backgroundColor: theme.overlayLight,
    borderRadius: theme.radiusSmall,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.accent1,
  },
  singleChurchText: {
    fontSize: 16,
    color: theme.accent1,
    fontWeight: theme.fontMedium,
  },
  churchSelector: {
    flexDirection: "row",
    paddingVertical: 4,
  },
  churchOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.pageBg,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  churchOptionActive: {
    backgroundColor: theme.accent1,
    borderColor: theme.accent1,
  },
  churchOptionText: {
    color: theme.textMedium,
    fontWeight: theme.fontMedium,
    fontSize: 14,
  },
  churchOptionTextActive: {
    color: theme.textWhite,
    fontWeight: theme.fontSemiBold,
  },
  imagePickerButton: {
    height: 180,
    backgroundColor: theme.pageBg,
    borderRadius: theme.radiusSmall,
    borderWidth: 1,
    borderColor: theme.divider,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  imagePickerText: {
    marginTop: 8,
    fontSize: 16,
    color: theme.textMedium,
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
    color: theme.accent1,
    fontWeight: theme.fontMedium,
  },
  recurringOptionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginVertical: 8,
    justifyContent: "space-between",
  },
  recurringOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.pageBg,
    borderRadius: theme.radiusSmall,
    borderWidth: 1,
    borderColor: theme.divider,
    padding: 12,
    marginBottom: 8,
    width: "48%",
  },
  recurringOptionActive: {
    backgroundColor: theme.accent1,
    borderColor: theme.accent1,
  },
  recurringOptionText: {
    marginLeft: 8,
    fontSize: 14,
    color: theme.textMedium,
    fontWeight: theme.fontMedium,
  },
  recurringOptionTextActive: {
    color: theme.textWhite,
    fontWeight: theme.fontSemiBold,
  },
  helperText: {
    fontSize: 14,
    color: theme.textLight,
    marginTop: 6,
    fontStyle: "italic",
  },
  requiredNote: {
    fontSize: 12,
    color: theme.textLight,
    marginTop: 10,
    fontStyle: "italic",
  },
  actionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    backgroundColor: theme.pageBg,
    borderRadius: theme.radiusSmall,
    borderWidth: 1,
    borderColor: theme.divider,
    marginRight: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: theme.textMedium,
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
  },
  saveButton: {
    flex: 2,
    flexDirection: "row",
    padding: 14,
    backgroundColor: theme.accent1,
    borderRadius: theme.radiusSmall,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  saveButtonDisabled: {
    backgroundColor: theme.textLight,
  },
  saveButtonText: {
    color: theme.textWhite,
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
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

export default CreateYouthGroupPage;