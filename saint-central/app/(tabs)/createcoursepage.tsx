import React, { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  TextInput, 
  ScrollView, 
  ActivityIndicator, 
  Platform,
  Image,
  Alert,
  KeyboardAvoidingView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useCRUD } from '../../utils/crudClient';
import theme from '../../theme';

type CourseFormData = {
  description: string;
  time: Date;
  location: string;
  host: string;
  image_url?: string;
  church_id: string;
  user_id: string;
};

type Church = {
  id: string;
  name: string;
};

// Storage API configuration
const STORAGE_WORKER_URL = 'https://storage-worker.colinmcherney.workers.dev';

const CreateCoursePage: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const courseId = params.courseId as string | undefined;
  const isEditMode = !!courseId;
  
  const { user, getAccessToken } = useAuth();
  const crud = useCRUD();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userChurches, setUserChurches] = useState<Church[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CourseFormData>({
    description: '',
    time: new Date(),
    location: '',
    host: '',
    church_id: '',
    user_id: '',
  });

  // Check authentication and fetch user churches on mount
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      try {
        if (!user) {
          Alert.alert('Authentication Required', 'You must be logged in to create courses');
          router.replace('/coursehomepage');
          return;
        }
        
        // Set user_id in form data
        setFormData(prev => ({ ...prev, user_id: user.id }));
        await fetchUserChurches(user.id);
      } catch (error) {
        console.error('Error initializing:', error);
        Alert.alert('Error', 'Failed to load data');
        router.replace('/coursehomepage');
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [user]);

  // Fetch existing course data if in edit mode
  useEffect(() => {
    if (isEditMode && user) {
      fetchCourseData();
    }
  }, [courseId, user]);

  // Fetch existing course data using CRUD API
  const fetchCourseData = async () => {
    if (!courseId || !user) return;
    
    try {
      setLoading(true);
      
      const data = await crud.selectOne('courses', {
        where: { id: courseId }
      });
      
      if (data) {
        console.log('Fetched course data:', data);
        
        // Update form data with existing values
        setFormData({
          description: data.description || '',
          time: new Date(data.time),
          location: data.location || '',
          host: data.host || '',
          image_url: data.image_url,
          church_id: data.church_id,
          user_id: data.user_id || user.id || '',
        });
        
        // Set image URI if there's an existing image
        if (data.image_url) {
          setImageUri(data.image_url);
        }
      }
    } catch (error) {
      console.error('Error fetching course data:', error);
      Alert.alert('Error', 'Failed to load course data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch churches where the user is a member using CRUD API
  const fetchUserChurches = async (userId: string) => {
    try {
      // First get church member records
      const memberData = await crud.select('church_members', {
        where: { user_id: userId }
      });

      if (memberData && memberData.length > 0) {
        // Get unique church IDs
        const churchIds = [...new Set(memberData.map(item => item.church_id))];
        
        // Fetch church details for each ID
        const churchPromises = churchIds.map(id => 
          crud.selectOne('churches', { where: { id } })
        );
        
        const churchesData = await Promise.all(churchPromises);
        const churches = churchesData
          .filter(church => church !== null)
          .map(church => ({
            id: church.id,
            name: church.name,
          }));
        
        setUserChurches(churches);

        // Set default church if available
        if (churches.length > 0 && !formData.church_id) {
          setFormData((prev) => ({ ...prev, church_id: churches[0].id }));
        }
      } else {
        // Create a default church if none exists
        setUserChurches([{
          id: '1',
          name: 'My Church'
        }]);
        setFormData((prev) => ({ ...prev, church_id: '1' }));
      }
    } catch (error) {
      console.error('Error fetching user churches:', error);
      setErrorMessage('Failed to load churches');
    }
  };

  // Handle text field changes
  const handleChange = (name: keyof CourseFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error message when user starts typing
    if (errorMessage) setErrorMessage(null);
  };

  // Handle date change
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    setShowTimePicker(Platform.OS === 'ios');
    
    if (selectedDate) {
      const currentDate = new Date(formData.time);
      
      if (showDatePicker) {
        // If date picker was shown, update the date portion
        currentDate.setFullYear(selectedDate.getFullYear());
        currentDate.setMonth(selectedDate.getMonth());
        currentDate.setDate(selectedDate.getDate());
      } else {
        // If time picker was shown, update the time portion
        currentDate.setHours(selectedDate.getHours());
        currentDate.setMinutes(selectedDate.getMinutes());
      }
      
      setFormData((prev) => ({ ...prev, time: currentDate }));
    }
  };

  // Pick image from gallery
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload an image');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  // Upload image using the Storage API
  const uploadImage = async (): Promise<string | undefined> => {
    if (!imageUri) return undefined;
    
    // If the image URI is already a remote URL and matches the current image_url, no need to upload again
    if (imageUri.startsWith('http') && imageUri === formData.image_url) {
      return imageUri;
    }
    
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('Authentication required');
      }

      // Convert image to base64
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64String = reader.result as string;
          // Remove the data:image/...;base64, prefix
          const base64Data = base64String.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const base64Data = await base64Promise;
      
      // Generate a unique file name
      const fileExt = imageUri.split('.').pop() || 'jpg';
      const fileName = `course_${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      
      // Determine content type
      const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
      
      // Upload using Storage API
      const uploadResponse = await fetch(`${STORAGE_WORKER_URL}/storage/upload-direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          operation: 'UPLOAD',
          bucket: 'course-bucket',
          fileName: fileName,
          data: base64Data,
          encoding: 'base64',
          contentType: contentType,
          options: {
            upsert: true
          }
        }),
      });
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      
      const uploadData = await uploadResponse.json();
      return uploadData.publicUrl || uploadData.data?.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  // Handle form submission (create or update)
  const handleSubmit = async () => {
    // Validate form
    if (!formData.description) {
      setErrorMessage('Please enter a course title or description');
      return;
    }
    if (!formData.location) {
      setErrorMessage('Please enter a location');
      return;
    }
    if (!formData.host) {
      setErrorMessage('Please enter a host or instructor name');
      return;
    }
    if (!formData.church_id) {
      setErrorMessage('Please select a church');
      return;
    }
    
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      // Handle image upload or reuse existing image
      let imageUrl = formData.image_url;
      
      if (imageUri && (!imageUrl || !imageUri.startsWith('http') || imageUri !== imageUrl)) {
        // Upload new image if selected
        imageUrl = await uploadImage();
      }
      
      // Prepare data for submission
      const courseData = {
        ...formData,
        image_url: imageUrl,
        time: formData.time.toISOString(),
      };
      
      if (isEditMode && courseId) {
        // Update existing course
        console.log('Updating course:', courseId);
        await crud.update('courses', courseData, { id: courseId });
        setSuccessMessage('Course updated successfully!');
      } else {
        // Create new course
        console.log('Creating new course');
        const newCourse = await crud.insert('courses', courseData);
        
        // Create a ministry group for this course
        try {
          console.log('Creating ministry group for course');
          const ministryData = {
            name: `${formData.description} - Course Group`,
            description: `Group chat for ${formData.description} course. Location: ${formData.location}, Host: ${formData.host}`,
            image_url: imageUrl || null,
            church_id: parseInt(formData.church_id),
            created_at: new Date().toISOString(),
            is_system_generated: true
          };
          
          const newMinistry = await crud.insert('ministries', ministryData);
          
          if (newMinistry && newMinistry.id) {
            // Add the course creator as a ministry member/leader
            await crud.insert('ministry_members', {
              ministry_id: newMinistry.id,
              user_id: formData.user_id,
              church_id: parseInt(formData.church_id),
              joined_at: new Date().toISOString(),
              member_status: 'leader'
            });
            
            console.log('Ministry group created successfully for course');
          }
        } catch (ministryError) {
          console.error('Error creating ministry group:', ministryError);
          // Don't fail the course creation if ministry creation fails
        }
        
        setSuccessMessage('Course created successfully!');
      }
      
      // Navigate back to course home page after a short delay
      setTimeout(() => {
        router.replace('/coursehomepage');
      }, 2000);
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} course:`, error);
      setErrorMessage(`Failed to ${isEditMode ? 'update' : 'create'} course. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.replace('/coursehomepage')}
          >
            <FontAwesome5 name="arrow-left" size={18} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.headerText}>
            {isEditMode ? 'Edit Course' : 'Create New Course'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <ScrollView 
          style={styles.scrollContainer} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formContainer}>
            {errorMessage && (
              <View style={styles.errorContainer}>
                <FontAwesome5 name="exclamation-circle" size={18} color={theme.error} style={{marginRight: 8}} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}
            
            {successMessage && (
              <View style={styles.successContainer}>
                <FontAwesome5 name="check-circle" size={18} color={theme.success} style={{marginRight: 8}} />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            )}
            
            {/* Course Image Upload - Moved to top for better UX */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Course Image</Text>
              <TouchableOpacity 
                style={styles.imageUploadButton}
                onPress={pickImage}
              >
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <FontAwesome5 name="image" size={32} color={theme.neutral400} />
                    <Text style={styles.imageUploadText}>
                      Upload Course Image
                    </Text>
                    <Text style={styles.imageHelpText}>
                      Tap to select a 16:9 image
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              
              {imageUri && (
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setImageUri(null)}
                >
                  <FontAwesome5 name="times-circle" size={20} color={theme.textWhite} />
                </TouchableOpacity>
              )}
            </View>
          
            {/* Church Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Church</Text>
              <View style={styles.pickerContainer}>
                {userChurches.map((church) => (
                  <TouchableOpacity
                    key={church.id}
                    style={[
                      styles.churchOption,
                      formData.church_id === church.id && styles.churchOptionSelected
                    ]}
                    onPress={() => handleChange('church_id', church.id)}
                  >
                    <Text 
                      style={[
                        styles.churchOptionText,
                        formData.church_id === church.id && styles.churchOptionTextSelected
                      ]}
                    >
                      {church.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Course Description */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Course Title/Description</Text>
              <TextInput
                style={styles.input}
                value={formData.description}
                onChangeText={(value) => handleChange('description', value)}
                placeholder="Enter course title or description"
                placeholderTextColor={theme.textLight}
              />
            </View>

            {/* Date Picker */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Date and Time</Text>
              <View style={styles.dateTimeContainer}>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <FontAwesome5 name="calendar" size={16} color={theme.primary} style={styles.dateTimeIcon} />
                  <Text style={styles.dateTimeText}>
                    {formData.time.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <FontAwesome5 name="clock" size={16} color={theme.primary} style={styles.dateTimeIcon} />
                  <Text style={styles.dateTimeText}>
                    {formData.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={formData.time}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                />
              )}
              
              {showTimePicker && (
                <DateTimePicker
                  value={formData.time}
                  mode="time"
                  display="default"
                  onChange={onDateChange}
                />
              )}
            </View>

            {/* Location */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={formData.location}
                onChangeText={(value) => handleChange('location', value)}
                placeholder="Enter course location"
                placeholderTextColor={theme.textLight}
              />
            </View>

            {/* Host */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Host/Instructor</Text>
              <TextInput
                style={styles.input}
                value={formData.host}
                onChangeText={(value) => handleChange('host', value)}
                placeholder="Enter host or instructor name"
                placeholderTextColor={theme.textLight}
              />
            </View>

            {/* Submit Button */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.submitButton, saving && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={theme.textWhite} />
                ) : (
                  <View style={styles.buttonInner}>
                    <FontAwesome5 name="save" size={16} color={theme.textWhite} style={{marginRight: 8}} />
                    <Text style={styles.submitButtonText}>
                      {isEditMode ? 'Update Course' : 'Create Course'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.pageBg,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacingL,
    paddingVertical: theme.spacingM,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
    backgroundColor: theme.cardBg,
  },
  backButton: {
    padding: theme.spacingS,
  },
  headerText: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
  },
  headerSpacer: {
    width: 36,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding for nav bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacingM,
    fontSize: 16,
    color: theme.textMedium,
  },
  formContainer: {
    padding: theme.spacingL,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.error}20`,
    padding: theme.spacingM,
    borderRadius: theme.radiusSmall,
    marginBottom: theme.spacingL,
  },
  errorText: {
    flex: 1,
    color: theme.error,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.success}20`,
    padding: theme.spacingM,
    borderRadius: theme.radiusSmall,
    marginBottom: theme.spacingL,
  },
  successText: {
    flex: 1,
    color: theme.success,
  },
  formGroup: {
    marginBottom: theme.spacingXL,
  },
  label: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    marginBottom: theme.spacingS,
    color: theme.textWhite,
  },
  input: {
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.divider,
    padding: 14,
    borderRadius: theme.radiusSmall,
    fontSize: 16,
    color: theme.textWhite,
    ...theme.shadowLight,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  churchOption: {
    backgroundColor: theme.cardBg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: theme.spacingS,
    marginBottom: theme.spacingS,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  churchOptionSelected: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  churchOptionText: {
    color: theme.textMedium,
    fontWeight: theme.fontMedium,
  },
  churchOptionTextSelected: {
    color: theme.neutral900,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: theme.spacingS,
  },
  dateTimeButton: {
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.divider,
    padding: 14,
    borderRadius: theme.radiusSmall,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadowLight,
  },
  dateTimeIcon: {
    marginRight: theme.spacingS,
  },
  dateTimeText: {
    color: theme.textWhite,
    fontSize: 15,
  },
  imageUploadButton: {
    width: '100%',
    height: 200,
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.divider,
    borderRadius: theme.radiusMedium,
    overflow: 'hidden',
    ...theme.shadowLight,
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.cardBg,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: theme.radiusMedium,
  },
  imageUploadText: {
    color: theme.textMedium,
    fontWeight: theme.fontSemiBold,
    marginTop: theme.spacingM,
    fontSize: 16,
  },
  imageHelpText: {
    color: theme.textLight,
    fontSize: 14,
    marginTop: 6,
  },
  removeImageButton: {
    position: 'absolute',
    top: theme.spacingL,
    right: theme.spacingL,
    backgroundColor: theme.overlay,
    padding: theme.spacingS,
    borderRadius: 20,
  },
  buttonContainer: {
    marginTop: theme.spacingXL,
    marginBottom: theme.spacing2XL,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: theme.primary,
    padding: theme.spacingL,
    borderRadius: theme.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadowMedium,
  },
  submitButtonDisabled: {
    backgroundColor: theme.neutral600,
  },
  submitButtonText: {
    color: theme.neutral900,
    fontWeight: theme.fontSemiBold,
    fontSize: 16,
  },
});

export default CreateCoursePage;