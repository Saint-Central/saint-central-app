import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { User } from '@supabase/supabase-js';
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
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesome5 } from '@expo/vector-icons';

type VolunteerFormData = {
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

const CreateVolunteerPage: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const volunteerId = params.volunteerId as string | undefined;
  const isEditMode = !!volunteerId;
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userChurches, setUserChurches] = useState<Church[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<VolunteerFormData>({
    description: '',
    time: new Date(),
    location: '',
    host: '',
    church_id: '',
    user_id: '',
  });

  // Fetch user and authorization on component mount
  useEffect(() => {
    const fetchUserAndAuth = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (data?.user) {
          setUser(data.user);
          // Set user_id in form data
          setFormData(prev => ({ ...prev, user_id: data.user.id }));
          await fetchUserChurches(data.user.id);
        } else {
          // Handle not authenticated
          Alert.alert('Authentication Required', 'You must be logged in to create volunteer opportunities');
          // Navigate to home page
          router.replace('/volunteerhomepage');
          return;
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        Alert.alert('Authentication Error', 'Failed to verify your credentials');
        // Navigate to home page
        router.replace('/volunteerhomepage');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndAuth();
  }, []);

  // Fetch existing volunteer opportunity data if in edit mode
  useEffect(() => {
    if (isEditMode && user) {
      fetchVolunteerData();
    }
  }, [volunteerId, user]);

  // Fetch existing volunteer opportunity data from Supabase
  const fetchVolunteerData = async () => {
    if (!volunteerId) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('volunteer')
        .select('*')
        .eq('id', volunteerId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        console.log('Fetched volunteer data:', data);
        
        // Update form data with existing values
        setFormData({
          description: data.description || '',
          time: new Date(data.time),
          location: data.location || '',
          host: data.host || '',
          image_url: data.image_url,
          church_id: data.church_id,
          user_id: data.user_id || user?.id || '',
        });
        
        // Set image URI if there's an existing image
        if (data.image_url) {
          setImageUri(data.image_url);
        }
      }
    } catch (error) {
      console.error('Error fetching volunteer data:', error);
      Alert.alert('Error', 'Failed to load volunteer opportunity data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch churches where the user is admin or owner
  const fetchUserChurches = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('church_members')
        .select(`
          church_id,
          churches:church_id (
            id,
            name
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      if (data && data.length > 0) {
        const churches = data.map((item: any) => ({
          id: item.churches.id,
          name: item.churches.name,
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
  const handleChange = (name: keyof VolunteerFormData, value: any) => {
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

  // Upload image to Supabase storage and get public URL
  const uploadImage = async (): Promise<string | undefined> => {
    if (!imageUri) return undefined;
    
    // If the image URI is already a remote URL and matches the current image_url, no need to upload again
    if (imageUri.startsWith('http') && imageUri === formData.image_url) {
      return imageUri;
    }
    
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Generate a unique file name
      const fileExt = imageUri.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${fileName}`;
      
      // Upload the file to volunteer-bucket
      const { error: uploadError } = await supabase.storage
        .from('volunteer-bucket')
        .upload(filePath, blob);
        
      if (uploadError) throw uploadError;
      
      // Get the public URL for the uploaded image
      const { data } = supabase.storage
        .from('volunteer-bucket')
        .getPublicUrl(filePath);
        
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  // Handle form submission (create or update)
  const handleSubmit = async () => {
    // Validate form
    if (!formData.description) {
      setErrorMessage('Please enter a volunteer opportunity title or description');
      return;
    }
    if (!formData.location) {
      setErrorMessage('Please enter a location');
      return;
    }
    if (!formData.host) {
      setErrorMessage('Please enter a coordinator or contact person name');
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
      const volunteerData = {
        ...formData,
        image_url: imageUrl,
        time: formData.time.toISOString(),
      };
      
      let error;
      
      if (isEditMode && volunteerId) {
        // Update existing volunteer opportunity
        console.log('Updating volunteer opportunity:', volunteerId);
        const { error: updateError } = await supabase
          .from('volunteer')
          .update(volunteerData)
          .eq('id', volunteerId);
        
        error = updateError;
        setSuccessMessage('Volunteer opportunity updated successfully!');
      } else {
        // Create new volunteer opportunity
        console.log('Creating new volunteer opportunity');
        const { error: insertError } = await supabase
          .from('volunteer')
          .insert([volunteerData]);
        
        error = insertError;
        setSuccessMessage('Volunteer opportunity created successfully!');
      }
      
      if (error) throw error;
      
      // Navigate back to volunteer home page after a short delay
      setTimeout(() => {
        router.replace('/volunteerhomepage');
      }, 2000);
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} volunteer opportunity:`, error);
      setErrorMessage(`Failed to ${isEditMode ? 'update' : 'create'} volunteer opportunity. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4361EE" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.replace('/volunteerhomepage')}
          >
            <FontAwesome5 name="arrow-left" size={18} color="#4361EE" />
          </TouchableOpacity>
          <Text style={styles.headerText}>
            {isEditMode ? 'Edit Volunteer Opportunity' : 'Create New Volunteer Opportunity'}
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
                <FontAwesome5 name="exclamation-circle" size={18} color="#E53E3E" style={{marginRight: 8}} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}
            
            {successMessage && (
              <View style={styles.successContainer}>
                <FontAwesome5 name="check-circle" size={18} color="#16A34A" style={{marginRight: 8}} />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            )}
            
            {/* Volunteer Image Upload - Moved to top for better UX */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Opportunity Image</Text>
              <TouchableOpacity 
                style={styles.imageUploadButton}
                onPress={pickImage}
              >
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <FontAwesome5 name="image" size={32} color="#CBD5E0" />
                    <Text style={styles.imageUploadText}>
                      Upload Opportunity Image
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
                  <FontAwesome5 name="times-circle" size={20} color="#FFFFFF" />
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

            {/* Volunteer Description */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Opportunity Title/Description</Text>
              <TextInput
                style={styles.input}
                value={formData.description}
                onChangeText={(value) => handleChange('description', value)}
                placeholder="Enter volunteer opportunity title or description"
                placeholderTextColor="#A0AEC0"
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
                  <FontAwesome5 name="calendar" size={16} color="#4361EE" style={styles.dateTimeIcon} />
                  <Text style={styles.dateTimeText}>
                    {formData.time.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <FontAwesome5 name="clock" size={16} color="#4361EE" style={styles.dateTimeIcon} />
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
                placeholder="Enter opportunity location"
                placeholderTextColor="#A0AEC0"
              />
            </View>

            {/* Host */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Coordinator/Contact Person</Text>
              <TextInput
                style={styles.input}
                value={formData.host}
                onChangeText={(value) => handleChange('host', value)}
                placeholder="Enter coordinator or contact person name"
                placeholderTextColor="#A0AEC0"
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
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={styles.buttonInner}>
                    <FontAwesome5 name="save" size={16} color="#FFFFFF" style={{marginRight: 8}} />
                    <Text style={styles.submitButtonText}>
                      {isEditMode ? 'Update Opportunity' : 'Create Opportunity'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
  },
  headerSpacer: {
    width: 36, // Same width as back button for balance
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30, // Add padding at bottom for iOS safe area
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4A5568',
  },
  formContainer: {
    padding: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: '#DC2626',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    flex: 1,
    color: '#16A34A',
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#4A5568',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    borderRadius: 8,
    fontSize: 16,
    color: '#1A202C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  churchOption: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  churchOptionSelected: {
    backgroundColor: '#4361EE',
    borderColor: '#4361EE',
  },
  churchOptionText: {
    color: '#4A5568',
    fontWeight: '500',
  },
  churchOptionTextSelected: {
    color: '#FFFFFF',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dateTimeButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateTimeIcon: {
    marginRight: 8,
  },
  dateTimeText: {
    color: '#1A202C',
    fontSize: 15,
  },
  imageUploadButton: {
    width: '100%',
    height: 200,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  imageUploadText: {
    color: '#4A5568',
    fontWeight: '600',
    marginTop: 12,
    fontSize: 16,
  },
  imageHelpText: {
    color: '#A0AEC0',
    fontSize: 14,
    marginTop: 6,
  },
  removeImageButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 20,
  },
  buttonContainer: {
    marginTop: 24,
    marginBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: '#4361EE',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2D3748',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default CreateVolunteerPage;