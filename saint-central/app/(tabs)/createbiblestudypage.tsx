import React, { useState, useEffect } from 'react';
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
  Image
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  AntDesign,
  Feather,
  MaterialIcons
} from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../supabaseClient';
import { User } from '@supabase/supabase-js';
import { LinearGradient } from 'expo-linear-gradient';

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
}

interface UserChurch {
  id: string;
  name: string;
  role: string;
}

// Modern color theme with spiritual tones - BLUE THEME FOR BIBLE STUDY
const THEME = {
  primary: "#2D3748",
  secondary: "#4A5568",
  light: "#A0AEC0",
  background: "#F7FAFC",
  card: "#FFFFFF",
  accent1: "#EBF8FF",
  border: "#E2E8F0",
  buttonPrimary: "#3182CE",
  buttonSecondary: "#2C5282",
  buttonText: "#FFFFFF",
  error: "#E53E3E",
  success: "#38A169",
  warning: "#DD6B20",
  shadow: "rgba(0, 0, 0, 0.1)",
  placeholder: "#CBD5E0"
};

const CreateBibleStudyPage: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const bibleStudyId = params.bibleStudyId as string | undefined;
  const isEditMode = !!bibleStudyId;
  
  // State variables
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [userChurches, setUserChurches] = useState<UserChurch[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  
  // Form state
  const [formData, setFormData] = useState<BibleStudy>({
    date: new Date().toISOString().split('T')[0],
    time: '10:00 AM',
    image: null,
    church_id: '',
    created_by: '',
    description: '',
    location: '',
    is_recurring: false
  });
  
  // Date and time picker state
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  
  // Fetch current user on mount
  useEffect(() => {
    const fetchCurrentUser = async (): Promise<void> => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (data && data.user) {
          setUser(data.user);
          // Set a default creator name but don't force it
          if (!formData.created_by) {
            setFormData(prevData => ({
              ...prevData,
              created_by: data.user.email || 'Bible Study Leader'
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
        Alert.alert('Error', 'Failed to authenticate user');
      }
    };

    fetchCurrentUser();
  }, []);

  // Fetch user's churches after user is loaded
  useEffect(() => {
    if (user) {
      fetchUserChurches();
    }
  }, [user]);

  // Load Bible study data if in edit mode
  useEffect(() => {
    if (isEditMode && user) {
      fetchBibleStudyData();
    }
  }, [isEditMode, user]);

  // Fetch user's churches with role information
  const fetchUserChurches = async (): Promise<void> => {
    if (!user) return;
    
    try {
      // Get churches where the user is a member
      const { data, error } = await supabase
        .from('church_members')
        .select('church_id, role, churches(id, name)')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Transform the data into UserChurch format
        const churches: UserChurch[] = data.map(item => ({
          id: item.church_id,
          name: (item.churches as unknown as { id: string; name: string }).name,
          role: item.role
        }));
        
        // Filter churches where user has admin or owner role
        const adminChurches = churches.filter(church => 
          church.role.toLowerCase() === 'admin' || church.role.toLowerCase() === 'owner'
        );
        
        setUserChurches(adminChurches);
        
        // Set has permission if user has at least one church with admin role
        setHasPermission(adminChurches.length > 0);
        
        // Select the first church by default if not in edit mode
        if (!isEditMode && adminChurches.length > 0 && !formData.church_id) {
          setFormData(prevData => ({
            ...prevData,
            church_id: adminChurches[0].id
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching user churches:', error);
      Alert.alert('Error', 'Failed to load church information');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Bible study data for editing
  const fetchBibleStudyData = async (): Promise<void> => {
    if (!bibleStudyId) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('bible_study_times')
        .select('*')
        .eq('id', bibleStudyId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        // Populate form with existing data
        setFormData({
          id: data.id,
          date: data.date,
          time: data.time,
          image: data.image,
          church_id: data.church_id,
          created_by: data.created_by,
          description: data.description || '',
          location: data.location || '',
          is_recurring: data.is_recurring || false
        });
      }
    } catch (error) {
      console.error('Error fetching Bible study data:', error);
      Alert.alert('Error', 'Failed to load Bible study information');
    } finally {
      setLoading(false);
    }
  };

  // Update form field - fixed type to accept string, null, or boolean
  const updateField = (field: keyof BibleStudy, value: string | null | boolean | number): void => {
    setFormData(prevData => ({
      ...prevData,
      [field]: value
    }));
  };

  // Handle date selection
  const onDateChange = (event: any, selectedDate?: Date): void => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      updateField('date', formattedDate);
    }
  };

  // Handle time selection
  const onTimeChange = (event: any, selectedTime?: Date): void => {
    setShowTimePicker(false);
    if (selectedTime) {
      // Format time to AM/PM
      const hours = selectedTime.getHours();
      const minutes = selectedTime.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
      const formattedTime = `${formattedHours}:${formattedMinutes} ${ampm}`;
      
      updateField('time', formattedTime);
    }
  };

  // Handle image selection and upload to bible-images bucket
  const pickImage = async (): Promise<void> => {
    if (!user) {
      Alert.alert('Error', 'You must be signed in to upload images');
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
        
        // Get the selected image URI
        const uri = result.assets[0].uri;
        
        // Convert image to blob
        const response = await fetch(uri);
        const blob = await response.blob();
        
        // Generate a unique filename
        const fileExt = uri.substring(uri.lastIndexOf('.') + 1);
        const fileName = `bible-study-${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`; // Safe to use user.id as we checked above
        
        // Upload to bible-images bucket
        const { data, error } = await supabase.storage
          .from('bible-images')
          .upload(filePath, blob, {
            contentType: `image/${fileExt}`,
            upsert: false
          });
        
        if (error) {
          Alert.alert('Upload Error', `Failed to upload image: ${error.message}`);
          throw error;
        }
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('bible-images')
          .getPublicUrl(filePath);
        
        // Update form with image URL
        updateField('image', urlData.publicUrl);
        
      }
    } catch (error) {
      console.error('Error picking/uploading image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Improved form validation - checks all required fields
  const validateForm = (): boolean => {
    if (!formData.date) {
      setErrorMessage('Please select a date');
      return false;
    }
    
    if (!formData.time) {
      setErrorMessage('Please select a time');
      return false;
    }
    
    if (!formData.church_id) {
      setErrorMessage('Please select a church');
      return false;
    }
    
    if (!formData.description || formData.description.trim() === '') {
      setErrorMessage('Please enter a description');
      return false;
    }
    
    if (!formData.created_by || formData.created_by.trim() === '') {
      setErrorMessage('Please enter a creator name');
      return false;
    }

    if (!user) {
      setErrorMessage('You must be signed in to save');
      return false;
    }
    
    return true;
  };

  // Handle save/update with improved error handling and loading state
  const handleSave = async (): Promise<void> => {
    if (!user) {
      Alert.alert('Error', 'You must be signed in to create or edit Bible studies');
      return;
    }
    
    if (!hasPermission) {
      Alert.alert('Error', 'You do not have permission to create or edit Bible studies');
      return;
    }
    
    if (!validateForm()) return;
    
    try {
      setSaving(true);
      setErrorMessage(null);
      
      if (isEditMode) {
        // Update existing Bible study
        const { error } = await supabase
          .from('bible_study_times')
          .update({
            date: formData.date,
            time: formData.time,
            image: formData.image,
            church_id: formData.church_id,
            created_by: formData.created_by || 'Bible Study Leader', // Use user-entered text
            description: formData.description,
            location: formData.location,
            is_recurring: formData.is_recurring
          })
          .eq('id', bibleStudyId);
        
        if (error) {
          Alert.alert('Save Error', `Failed to update Bible study: ${error.message}`);
          throw error;
        }
        
        Alert.alert(
          'Success', 
          'Bible study updated successfully',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        // Create new Bible study
        const { error } = await supabase
          .from('bible_study_times')
          .insert([{
            date: formData.date,
            time: formData.time,
            image: formData.image,
            church_id: formData.church_id,
            created_by: formData.created_by || 'Bible Study Leader', // Use user-entered text
            description: formData.description,
            location: formData.location,
            is_recurring: formData.is_recurring
          }]);
        
        if (error) {
          Alert.alert('Save Error', `Failed to create Bible study: ${error.message}`);
          throw error;
        }
        
        Alert.alert(
          'Success', 
          'Bible study created successfully',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('Error saving Bible study:', error);
      setErrorMessage('Failed to save Bible study. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel - already properly implemented
  const handleCancel = (): void => {
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.buttonPrimary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.noPermissionContainer}>
            <Feather name="alert-circle" size={60} color={THEME.error} />
            <Text style={styles.noPermissionTitle}>Access Denied</Text>
            <Text style={styles.noPermissionText}>
              You do not have permission to create or edit Bible studies.
              Please contact your church administrator for access.
            </Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleCancel}
            >
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleCancel}
          >
            <AntDesign name="arrowleft" size={24} color={THEME.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditMode ? 'Edit Bible Study' : 'New Bible Study'}
          </Text>
          <View style={styles.headerRightPlaceholder} />
        </View>
        
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          {/* Form Header */}
          <View style={styles.formHeader}>
            <LinearGradient
              colors={['#3182CE', '#2C5282']}
              style={styles.formHeaderGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name="book-open" size={36} color="#FFFFFF" />
              <Text style={styles.formHeaderTitle}>
                {isEditMode ? 'Update Bible Study Details' : 'Create New Bible Study'}
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
            {/* Description (main field) */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Description*</Text>
              <TextInput
                style={styles.textInput}
                value={formData.description}
                onChangeText={(text) => updateField('description', text)}
                placeholder="e.g., Gospel of John Study"
                placeholderTextColor={THEME.placeholder}
              />
            </View>
            
            {/* Date */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Date*</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateTimeText}>
                  {formData.date || 'Select Date'}
                </Text>
                <Feather name="calendar" size={20} color={THEME.secondary} />
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
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.dateTimeText}>
                  {formData.time || 'Select Time'}
                </Text>
                <Feather name="clock" size={20} color={THEME.secondary} />
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={new Date()}
                  mode="time"
                  display="default"
                  onChange={onTimeChange}
                />
              )}
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
                  {userChurches.map(church => (
                    <TouchableOpacity
                      key={church.id}
                      style={[
                        styles.churchOption,
                        formData.church_id === church.id && styles.churchOptionActive
                      ]}
                      onPress={() => updateField('church_id', church.id)}
                    >
                      <Text style={[
                        styles.churchOptionText,
                        formData.church_id === church.id && styles.churchOptionTextActive
                      ]}>
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
              <TextInput
                style={styles.textInput}
                value={formData.location}
                onChangeText={(text) => updateField('location', text)}
                placeholder="e.g., Church Fellowship Hall"
                placeholderTextColor={THEME.placeholder}
              />
            </View>
            
            {/* Creator - Allow custom input */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Creator</Text>
              <TextInput
                style={styles.textInput}
                value={formData.created_by}
                onChangeText={(text) => updateField('created_by', text)}
                placeholder="Enter creator name (e.g., Pastor Smith, Youth Group, etc.)"
                placeholderTextColor={THEME.placeholder}
              />
              <Text style={styles.helperText}>
                Enter who is leading or organizing this Bible study
              </Text>
            </View>
            
            {/* More details (optional) */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Additional Details</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                value={formData.location}
                onChangeText={(text) => updateField('location', text)}
                placeholder="Enter location or additional details about the Bible study..."
                placeholderTextColor={THEME.placeholder}
                multiline={true}
                numberOfLines={4}
              />
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
                    <ActivityIndicator size="large" color={THEME.buttonPrimary} />
                    <Text style={styles.uploadingText}>Uploading image...</Text>
                  </View>
                ) : formData.image ? (
                  <>
                    <Image 
                      source={{ uri: formData.image }} 
                      style={styles.previewImage} 
                    />
                    <View style={styles.changeImageOverlay}>
                      <Text style={styles.changeImageText}>Change Image</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Feather name="image" size={28} color={THEME.secondary} />
                    <Text style={styles.imagePickerText}>Select Image</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            
            {/* Recurring Option */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Recurring Study</Text>
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>
                  {formData.is_recurring ? 'This is a recurring Bible study' : 'One-time Bible study'}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    formData.is_recurring ? styles.toggleButtonActive : {}
                  ]}
                  onPress={() => updateField('is_recurring', !formData.is_recurring)}
                >
                  <View style={[
                    styles.toggleThumb,
                    formData.is_recurring ? styles.toggleThumbActive : {}
                  ]} />
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>
                {formData.is_recurring
                  ? 'This study will repeat regularly at the same time and location.'
                  : 'This is a one-time Bible study event.'}
              </Text>
            </View>
            
            {/* Required Fields Note */}
            <Text style={styles.requiredNote}>* Required fields</Text>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={THEME.buttonText} />
              ) : (
                <>
                  <Text style={styles.saveButtonText}>
                    {isEditMode ? 'Update' : 'Create'}
                  </Text>
                  <Feather
                    name={isEditMode ? 'check-circle' : 'plus-circle'}
                    size={18}
                    color={THEME.buttonText}
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
    backgroundColor: THEME.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    backgroundColor: THEME.card,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: THEME.buttonPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.primary,
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
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formHeaderGradient: {
    padding: 24,
    alignItems: 'center',
  },
  formHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
    textAlign: 'center',
  },
  errorContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(229, 62, 62, 0.1)',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: THEME.error,
  },
  errorText: {
    color: THEME.error,
    fontSize: 14,
  },
  formCard: {
    marginHorizontal: 16,
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 24,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.primary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: THEME.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 12,
    fontSize: 16,
    color: THEME.primary,
  },
  textAreaInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 12,
  },
  dateTimeText: {
    fontSize: 16,
    color: THEME.primary,
  },
  singleChurchContainer: {
    backgroundColor: THEME.accent1,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.buttonPrimary,
  },
  singleChurchText: {
    fontSize: 16,
    color: THEME.buttonPrimary,
    fontWeight: '500',
  },
  churchSelector: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  churchOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: THEME.background,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  churchOptionActive: {
    backgroundColor: THEME.buttonPrimary,
    borderColor: THEME.buttonPrimary,
  },
  churchOptionText: {
    color: THEME.secondary,
    fontWeight: '500',
    fontSize: 14,
  },
  churchOptionTextActive: {
    color: THEME.buttonText,
    fontWeight: '600',
  },
  creatorInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.accent1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.buttonPrimary,
    padding: 12,
  },
  creatorInfoText: {
    fontSize: 16,
    color: THEME.primary,
    marginLeft: 10,
    flex: 1,
  },
  imagePickerButton: {
    height: 180,
    backgroundColor: THEME.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imagePickerText: {
    marginTop: 8,
    fontSize: 16,
    color: THEME.secondary,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  changeImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    alignItems: 'center',
  },
  changeImageText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  uploadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    marginTop: 12,
    fontSize: 16,
    color: THEME.buttonPrimary,
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: THEME.primary,
    flex: 1,
  },
  toggleButton: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.border,
    padding: 2,
  },
  toggleButtonActive: {
    backgroundColor: THEME.buttonPrimary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.card,
  },
  toggleThumbActive: {
    transform: [{ translateX: 22 }],
  },
  helperText: {
    fontSize: 14,
    color: THEME.light,
    marginTop: 6,
    fontStyle: 'italic',
  },
  requiredNote: {
    fontSize: 12,
    color: THEME.light,
    marginTop: 10,
    fontStyle: 'italic',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    backgroundColor: THEME.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: THEME.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    padding: 14,
    backgroundColor: THEME.buttonPrimary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  saveButtonDisabled: {
    backgroundColor: THEME.light,
  },
  saveButtonText: {
    color: THEME.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonIcon: {
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: THEME.secondary,
  },
  noPermissionContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  noPermissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.error,
    marginTop: 16,
    marginBottom: 8,
  },
  noPermissionText: {
    fontSize: 16,
    color: THEME.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
});

export default CreateBibleStudyPage;