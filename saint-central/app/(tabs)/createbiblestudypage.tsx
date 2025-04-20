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
  MaterialIcons,
  FontAwesome5,
  Ionicons
} from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../supabaseClient';
import { User } from '@supabase/supabase-js';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../theme'; // Updated import path

// Recurring type options
export type RecurringType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

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
    is_recurring: false,
    title: '',
    recurring_type: 'none'
  });
  
  // Date picker state - removed time picker state
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  
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
          is_recurring: data.is_recurring || false,
          title: data.title || '',
          recurring_type: data.recurring_type || 'none'
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
  const updateField = (field: keyof BibleStudy, value: string | null | boolean | number | RecurringType): void => {
    setFormData(prevData => ({
      ...prevData,
      [field]: value
    }));
  };

  // Handle recurring type selection
  const handleRecurringTypeSelect = (type: RecurringType) => {
    // If selecting "none", set is_recurring to false
    if (type === 'none') {
      setFormData(prevData => ({
        ...prevData,
        recurring_type: type,
        is_recurring: false
      }));
    } else {
      // For any other type, set is_recurring to true
      setFormData(prevData => ({
        ...prevData,
        recurring_type: type,
        is_recurring: true
      }));
    }
  };

  // Handle date selection
  const onDateChange = (event: any, selectedDate?: Date): void => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      updateField('date', formattedDate);
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
    if (!formData.title || formData.title.trim() === '') {
      setErrorMessage('Please enter a title');
      return false;
    }
    
    if (!formData.date) {
      setErrorMessage('Please select a date');
      return false;
    }
    
    if (!formData.time) {
      setErrorMessage('Please enter a time');
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
            created_by: formData.created_by || 'Bible Study Leader',
            description: formData.description,
            location: formData.location,
            is_recurring: formData.is_recurring,
            title: formData.title,
            recurring_type: formData.recurring_type
          })
          .eq('id', bibleStudyId);
        
        if (error) {
          Alert.alert('Save Error', `Failed to update Bible study: ${error.message}`);
          throw error;
        }
        
        Alert.alert(
          'Success', 
          'Bible study updated successfully',
          [{ text: 'OK', onPress: () => router.push('/biblestudy') }]
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
            created_by: formData.created_by || 'Bible Study Leader',
            description: formData.description,
            location: formData.location,
            is_recurring: formData.is_recurring,
            title: formData.title,
            recurring_type: formData.recurring_type
          }]);
        
        if (error) {
          Alert.alert('Save Error', `Failed to create Bible study: ${error.message}`);
          throw error;
        }
        
        Alert.alert(
          'Success', 
          'Bible study created successfully',
          [{ text: 'OK', onPress: () => router.push('/biblestudy') }]
        );
      }
    } catch (error) {
      console.error('Error saving Bible study:', error);
      setErrorMessage('Failed to save Bible study. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel - updated to route back to biblestudy
  const handleCancel = (): void => {
    router.push('/biblestudy');
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
            <AntDesign name="arrowleft" size={24} color={theme.primary} />
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
              colors={theme.gradientWarm}
              style={styles.formHeaderGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name="book-open" size={36} color={theme.textWhite} />
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
            {/* Title (improved) */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Title*</Text>
              <View style={styles.enhancedInputContainer}>
                <FontAwesome5 name="bible" size={18} color={theme.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.enhancedTextInput}
                  value={formData.title}
                  onChangeText={(text) => updateField('title', text)}
                  placeholder="e.g., Sunday Morning Bible Study"
                  placeholderTextColor={theme.textLight}
                  autoCapitalize="words"
                />
              </View>
              <Text style={styles.helperText}>
                A clear, descriptive title for your Bible study
              </Text>
            </View>
            
            {/* Description */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Description*</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                value={formData.description}
                onChangeText={(text) => updateField('description', text)}
                placeholder="Enter details about the Bible study content, themes, or format"
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
                <Feather name="calendar" size={20} color={theme.secondary} style={styles.inputIcon} />
                <Text style={styles.dateTimeText}>
                  {formData.date || 'Select Date'}
                </Text>
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
                  onChangeText={(text) => updateField('time', text)}
                  placeholder="e.g., 10:00 AM"
                  placeholderTextColor={theme.textLight}
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
              <View style={styles.enhancedInputContainer}>
                <Feather name="map-pin" size={18} color={theme.secondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.enhancedTextInput}
                  value={formData.location}
                  onChangeText={(text) => updateField('location', text)}
                  placeholder="e.g., Church Fellowship Hall"
                  placeholderTextColor={theme.textLight}
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
                  onChangeText={(text) => updateField('created_by', text)}
                  placeholder="Enter creator name (e.g., Pastor Smith, Youth Group, etc.)"
                  placeholderTextColor={theme.textLight}
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
                    <Feather name="image" size={28} color={theme.secondary} />
                    <Text style={styles.imagePickerText}>Select Image</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            
            {/* Recurring Option - Enhanced with multiple choices */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Recurring Schedule</Text>
              
              {/* Recurring options */}
              <View style={styles.recurringOptionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.recurringOption,
                    formData.recurring_type === 'none' && styles.recurringOptionActive
                  ]}
                  onPress={() => handleRecurringTypeSelect('none')}
                >
                  <Ionicons 
                    name="calendar-outline" 
                    size={20} 
                    color={formData.recurring_type === 'none' ? theme.textWhite : theme.textDark} 
                  />
                  <Text style={[
                    styles.recurringOptionText,
                    formData.recurring_type === 'none' && styles.recurringOptionTextActive
                  ]}>
                    One-time
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.recurringOption,
                    formData.recurring_type === 'daily' && styles.recurringOptionActive
                  ]}
                  onPress={() => handleRecurringTypeSelect('daily')}
                >
                  <Ionicons 
                    name="today-outline" 
                    size={20} 
                    color={formData.recurring_type === 'daily' ? theme.textWhite : theme.textDark} 
                  />
                  <Text style={[
                    styles.recurringOptionText,
                    formData.recurring_type === 'daily' && styles.recurringOptionTextActive
                  ]}>
                    Daily
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.recurringOption,
                    formData.recurring_type === 'weekly' && styles.recurringOptionActive
                  ]}
                  onPress={() => handleRecurringTypeSelect('weekly')}
                >
                  <Ionicons 
                    name="calendar" 
                    size={20} 
                    color={formData.recurring_type === 'weekly' ? theme.textWhite : theme.textDark} 
                  />
                  <Text style={[
                    styles.recurringOptionText,
                    formData.recurring_type === 'weekly' && styles.recurringOptionTextActive
                  ]}>
                    Weekly
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.recurringOption,
                    formData.recurring_type === 'monthly' && styles.recurringOptionActive
                  ]}
                  onPress={() => handleRecurringTypeSelect('monthly')}
                >
                  <Ionicons 
                    name="calendar-number-outline" 
                    size={20} 
                    color={formData.recurring_type === 'monthly' ? theme.textWhite : theme.textDark} 
                  />
                  <Text style={[
                    styles.recurringOptionText,
                    formData.recurring_type === 'monthly' && styles.recurringOptionTextActive
                  ]}>
                    Monthly
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.recurringOption,
                    formData.recurring_type === 'yearly' && styles.recurringOptionActive
                  ]}
                  onPress={() => handleRecurringTypeSelect('yearly')}
                >
                  <Ionicons 
                    name="calendar-clear" 
                    size={20} 
                    color={formData.recurring_type === 'yearly' ? theme.textWhite : theme.textDark}
                  />
                  <Text style={[
                    styles.recurringOptionText,
                    formData.recurring_type === 'yearly' && styles.recurringOptionTextActive
                  ]}>
                    Yearly
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* Help text based on selection */}
              <Text style={styles.helperText}>
                {formData.recurring_type === 'none' && 'This is a one-time Bible study event.'}
                {formData.recurring_type === 'daily' && 'This study will repeat every day at the same time and location.'}
                {formData.recurring_type === 'weekly' && 'This study will repeat every week on this day at the same time and location.'}
                {formData.recurring_type === 'monthly' && 'This study will repeat monthly on this date at the same time and location.'}
                {formData.recurring_type === 'yearly' && 'This study will repeat yearly on this date at the same time and location.'}
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
                <ActivityIndicator size="small" color={theme.textWhite} />
              ) : (
                <>
                  <Text style={styles.saveButtonText}>
                    {isEditMode ? 'Update' : 'Create'}
                  </Text>
                  <Feather
                    name={isEditMode ? 'check-circle' : 'plus-circle'}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    color: theme.textDark,
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
    overflow: 'hidden',
    ...theme.shadowMedium,
  },
  formHeaderGradient: {
    padding: 24,
    alignItems: 'center',
  },
  formHeaderTitle: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginTop: 12,
    textAlign: 'center',
  },
  errorContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(188, 108, 100, 0.1)',
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
    color: theme.textDark,
    marginBottom: 8,
  },
  // Enhanced input styling
  enhancedInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: theme.textDark,
  },
  // Original input styling
  textInput: {
    backgroundColor: theme.pageBg,
    borderRadius: theme.radiusSmall,
    borderWidth: 1,
    borderColor: theme.divider,
    padding: 12,
    fontSize: 16,
    color: theme.textDark,
  },
  textAreaInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.pageBg,
    borderRadius: theme.radiusSmall,
    borderWidth: 1,
    borderColor: theme.divider,
    padding: 12,
    paddingLeft: 16,
  },
  dateTimeText: {
    fontSize: 16,
    color: theme.textDark,
    flex: 1,
  },
  singleChurchContainer: {
    backgroundColor: theme.overlayLight,
    borderRadius: theme.radiusSmall,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.primary,
  },
  singleChurchText: {
    fontSize: 16,
    color: theme.primary,
    fontWeight: theme.fontMedium,
  },
  churchSelector: {
    flexDirection: 'row',
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
    backgroundColor: theme.primary,
    borderColor: theme.primary,
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
  creatorInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: theme.pageBg,
    borderRadius: theme.radiusSmall,
    borderWidth: 1,
    borderColor: theme.divider,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imagePickerText: {
    marginTop: 8,
    fontSize: 16,
    color: theme.textMedium,
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
    color: theme.textWhite,
    fontSize: 14,
    fontWeight: theme.fontMedium,
  },
  uploadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.primary,
    fontWeight: theme.fontMedium,
  },
  
  // New recurring options styling
  recurringOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 8,
    justifyContent: 'space-between',
  },
  recurringOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.pageBg,
    borderRadius: theme.radiusSmall,
    borderWidth: 1,
    borderColor: theme.divider,
    padding: 12,
    marginBottom: 8,
    width: '48%',
  },
  recurringOptionActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  recurringOptionText: {
    marginLeft: 8,
    fontSize: 14,
    color: theme.textDark,
    fontWeight: theme.fontMedium,
  },
  recurringOptionTextActive: {
    color: theme.textWhite,
    fontWeight: theme.fontSemiBold,
  },
  
  // Old switch styling (kept for reference)
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    color: theme.textLight,
    marginTop: 6,
    fontStyle: 'italic',
  },
  requiredNote: {
    fontSize: 12,
    color: theme.textLight,
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
    backgroundColor: theme.pageBg,
    borderRadius: theme.radiusSmall,
    borderWidth: 1,
    borderColor: theme.divider,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.textMedium,
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    padding: 14,
    backgroundColor: theme.primary,
    borderRadius: theme.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.pageBg,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.textMedium,
  },
  noPermissionContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
});

export default CreateBibleStudyPage;