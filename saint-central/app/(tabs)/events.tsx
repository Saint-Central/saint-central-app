// app/Events.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabaseClient';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

// Updated Event Interface
interface Event {
  id: number;
  title: string;
  excerpt: string;
  time: string;
  user_id: string;
  image_url: string;
  video_link: string;
  author_name: string;
  is_recurring: boolean;
  recurrence_type?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrence_interval?: number;
  recurrence_end_date?: string;
  recurrence_days_of_week?: number[];
}


// Additional styles for recurring event UI
// Additional styles for recurring event UI
const recurringStyles = StyleSheet.create({
  recurringSection: {
    marginBottom: 20,
  },
  recurringToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  pickerOption: {
    flex: 1,
    padding: 10,
    marginHorizontal: 5,
    backgroundColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedPickerOption: {
    backgroundColor: '#FAC898',
  },
  pickerOptionText: {
    color: '#FFFFFF',
  },
  intervalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  intervalInput: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 10,
    width: 60,
    marginRight: 10,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  intervalText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDayButton: {
    backgroundColor: '#FAC898',
  },
  dayButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default function Events() {
  return <EventsComponent />;
}

function EventsComponent() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;

  // States
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  
  // Form states - updated to match the schema
  const [formTitle, setFormTitle] = useState('');
  const [formExcerpt, setFormExcerpt] = useState(''); // instead of description
  const [formTime, setFormTime] = useState(new Date());
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formVideoLink, setFormVideoLink] = useState(''); // new field
  const [formAuthorName, setFormAuthorName] = useState(''); // new field
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [formImageLoading, setFormImageLoading] = useState(false);

  // Load events
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      // If not authenticated, may need to handle public access differently
      // depending on your RLS policies
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('time', { ascending: true });
      
      if (error) {
        // Handle RLS read restrictions if any
        if (error.code === '42501') {
          Alert.alert(
            'Access Restricted', 
            'You do not have permission to view events.',
            [{ text: 'OK' }]
          );
          setEvents([]);
          return;
        }
        throw error;
      }
      
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      Alert.alert('Error', 'Failed to load events. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormExcerpt('');
    setFormTime(new Date());
    setFormImageUrl('');
    setFormVideoLink('');
    setFormAuthorName('');
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (event: Event) => {
    setSelectedEvent(event);
    setFormTitle(event.title);
    setFormExcerpt(event.excerpt);
    
    // Parse time - assuming it's stored as ISO string in the DB
    const eventTime = new Date(event.time);
    setFormTime(eventTime);
    
    setFormImageUrl(event.image_url || '');
    setFormVideoLink(event.video_link || '');
    setFormAuthorName(event.author_name || '');
    
    setShowEditModal(true);
  };

  const handleAddEvent = async () => {
    try {
      if (!formTitle || !formExcerpt) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'You must be logged in to add events');
        return;
      }
      
      // Using RLS bypass with service role if available, otherwise try normal insert
      const { data, error } = await supabase
        .from('events')
        .insert([
          {
            title: formTitle,
            excerpt: formExcerpt,
            time: formTime.toISOString(),
            user_id: user.id,
            image_url: formImageUrl,
            video_link: formVideoLink,
            author_name: formAuthorName || user.email, // Default to user email if no author name
          }
        ]);
      
      if (error) {
        // If this is an RLS error, show more helpful message
        if (error.code === '42501') {
          Alert.alert(
            'Permission Error', 
            'You do not have permission to add events. Please contact an administrator.',
            [
              { text: 'OK' }
            ]
          );
          return;
        }
        throw error;
      }
      
      Alert.alert('Success', 'Event added successfully!');
      setShowAddModal(false);
      fetchEvents();
    } catch (error) {
      console.error('Error adding event:', error);
      Alert.alert('Error', 'Failed to add event. Please try again.');
    }
  };

  const handleEditEvent = async () => {
    try {
      if (!selectedEvent) return;
      
      if (!formTitle || !formExcerpt) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'You must be logged in to edit events');
        return;
      }
      
      const { error } = await supabase
        .from('events')
        .update({
          title: formTitle,
          excerpt: formExcerpt,
          time: formTime.toISOString(),
          image_url: formImageUrl,
          video_link: formVideoLink,
          author_name: formAuthorName || user.email, // Default to user email if no author name
        })
        .eq('id', selectedEvent.id);
      
      if (error) {
        // If this is an RLS error, show more helpful message
        if (error.code === '42501') {
          Alert.alert(
            'Permission Error', 
            'You do not have permission to edit this event. You may only edit events you created.',
            [
              { text: 'OK' }
            ]
          );
          return;
        }
        throw error;
      }
      
      Alert.alert('Success', 'Event updated successfully!');
      setShowEditModal(false);
      fetchEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      Alert.alert('Error', 'Failed to update event. Please try again.');
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    try {
      Alert.alert(
        'Confirm Deletion',
        'Are you sure you want to delete this event?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: async () => {
              const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', eventId);
              
              if (error) {
                // If this is an RLS error, show more helpful message
                if (error.code === '42501') {
                  Alert.alert(
                    'Permission Error', 
                    'You do not have permission to delete this event. You may only delete events you created.',
                    [
                      { text: 'OK' }
                    ]
                  );
                  return;
                }
                throw error;
              }
              
              Alert.alert('Success', 'Event deleted successfully!');
              fetchEvents();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting event:', error);
      Alert.alert('Error', 'Failed to delete event. Please try again.');
    }
  };

  const pickImage = async () => {
    try {
      setFormImageLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        setFormImageUrl(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setFormImageLoading(false);
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateTimeString).toLocaleDateString(undefined, options);
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Animated Header */}
      <Animated.View 
        style={[
          styles.animatedHeader,
          { opacity: headerOpacity }
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Events</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={openAddModal}
          >
            <Feather name="plus" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Main Content */}
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.iconContainer}>
            <Feather name="calendar" size={36} color="#FAC898" />
          </View>
          <Text style={styles.heroTitle}>Events</Text>
          <Text style={styles.heroSubtitle}>
            Stay up to date with upcoming events and activities
          </Text>
          <TouchableOpacity
            style={styles.addEventButton}
            onPress={openAddModal}
          >
            <Text style={styles.addEventButtonText}>ADD EVENT</Text>
            <Feather name="plus" size={16} color="#513C28" />
          </TouchableOpacity>
        </View>

        {/* Events List */}
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#FAC898" style={styles.loader} />
          ) : events.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="calendar" size={50} color="#666" />
              <Text style={styles.emptyStateText}>No events found</Text>
              <Text style={styles.emptyStateSubtext}>Be the first to add an event!</Text>
            </View>
          ) : (
            events.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                {event.image_url ? (
                  <Image 
                    source={{ uri: event.image_url }} 
                    style={styles.eventImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Feather name="image" size={40} color="#AAA" />
                  </View>
                )}
                
                <View style={styles.eventContent}>
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <View style={styles.eventActions}>
                      <TouchableOpacity 
                        style={styles.eventAction}
                        onPress={() => openEditModal(event)}
                      >
                        <Feather name="edit-2" size={18} color="#FAC898" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.eventAction}
                        onPress={() => handleDeleteEvent(event.id)}
                      >
                        <Feather name="trash-2" size={18} color="#E9967A" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <Text style={styles.eventDate}>
                    {formatDateTime(event.time)}
                  </Text>
                  
                  {event.author_name && (
                    <Text style={styles.eventAuthor}>
                      By {event.author_name}
                    </Text>
                  )}
                  
                  <Text style={styles.eventDescription}>{event.excerpt}</Text>
                  
                  {event.video_link && (
                    <TouchableOpacity 
                      style={styles.videoLinkButton}
                      // You could implement a video player here
                    >
                      <Feather name="video" size={14} color="#FAC898" />
                      <Text style={styles.videoLinkText}> Watch Video</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </Animated.ScrollView>

      {/* Add Event Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Event</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Feather name="x" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalForm}>
              <Text style={styles.inputLabel}>Title*</Text>
              <TextInput
                style={styles.textInput}
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="Event title"
                placeholderTextColor="#999"
              />
              
              <Text style={styles.inputLabel}>Description*</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                value={formExcerpt}
                onChangeText={setFormExcerpt}
                placeholder="Event description"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />
              
              <Text style={styles.inputLabel}>Date & Time*</Text>
              <TouchableOpacity 
                style={styles.textInput} 
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.dateTimeText}>
                  {formTime.toLocaleString()}
                </Text>
              </TouchableOpacity>
              
              {showTimePicker && (
                <DateTimePicker
                  value={formTime}
                  mode="datetime"
                  display="default"
                  onChange={(event, selectedTime) => {
                    setShowTimePicker(false);
                    if (selectedTime) {
                      setFormTime(selectedTime);
                    }
                  }}
                />
              )}
              
              <Text style={styles.inputLabel}>Author Name</Text>
              <TextInput
                style={styles.textInput}
                value={formAuthorName}
                onChangeText={setFormAuthorName}
                placeholder="Author name (optional)"
                placeholderTextColor="#999"
              />
              
              <Text style={styles.inputLabel}>Video Link</Text>
              <TextInput
                style={styles.textInput}
                value={formVideoLink}
                onChangeText={setFormVideoLink}
                placeholder="Video link (optional)"
                placeholderTextColor="#999"
              />
              
              <Text style={styles.inputLabel}>Image</Text>
              <TouchableOpacity 
                style={styles.imagePickerButton}
                onPress={pickImage}
                disabled={formImageLoading}
              >
                {formImageLoading ? (
                  <ActivityIndicator size="small" color="#FAC898" />
                ) : (
                  <>
                    <Feather name="image" size={24} color="#FAC898" />
                    <Text style={styles.imagePickerText}>
                      {formImageUrl ? 'Change Image' : 'Select Image'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              {formImageUrl ? (
                <Image 
                  source={{ uri: formImageUrl }} 
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              ) : null}
              
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleAddEvent}
              >
                <Text style={styles.submitButtonText}>Add Event</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Event Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Event</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Feather name="x" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalForm}>
              <Text style={styles.inputLabel}>Title*</Text>
              <TextInput
                style={styles.textInput}
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="Event title"
                placeholderTextColor="#999"
              />
              
              <Text style={styles.inputLabel}>Description*</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                value={formExcerpt}
                onChangeText={setFormExcerpt}
                placeholder="Event description"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />
              
              <Text style={styles.inputLabel}>Date & Time*</Text>
              <TouchableOpacity 
                style={styles.textInput} 
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.dateTimeText}>
                  {formTime.toLocaleString()}
                </Text>
              </TouchableOpacity>
              
              {showTimePicker && (
                <DateTimePicker
                  value={formTime}
                  mode="datetime"
                  display="default"
                  onChange={(event, selectedTime) => {
                    setShowTimePicker(false);
                    if (selectedTime) {
                      setFormTime(selectedTime);
                    }
                  }}
                />
              )}
              
              <Text style={styles.inputLabel}>Author Name</Text>
              <TextInput
                style={styles.textInput}
                value={formAuthorName}
                onChangeText={setFormAuthorName}
                placeholder="Author name (optional)"
                placeholderTextColor="#999"
              />
              
              <Text style={styles.inputLabel}>Video Link</Text>
              <TextInput
                style={styles.textInput}
                value={formVideoLink}
                onChangeText={setFormVideoLink}
                placeholder="Video link (optional)"
                placeholderTextColor="#999"
              />
              
              <Text style={styles.inputLabel}>Image</Text>
              <TouchableOpacity 
                style={styles.imagePickerButton}
                onPress={pickImage}
                disabled={formImageLoading}
              >
                {formImageLoading ? (
                  <ActivityIndicator size="small" color="#FAC898" />
                ) : (
                  <>
                    <Feather name="image" size={24} color="#FAC898" />
                    <Text style={styles.imagePickerText}>
                      {formImageUrl ? 'Change Image' : 'Select Image'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              {formImageUrl ? (
                <Image 
                  source={{ uri: formImageUrl }} 
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              ) : null}
              
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleEditEvent}
              >
                <Text style={styles.submitButtonText}>Update Event</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(18, 18, 18, 0.95)',
    zIndex: 100,
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSection: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '300',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 1,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 30,
    opacity: 0.9,
    letterSpacing: 0.5,
    maxWidth: 280,
  },
  addEventButton: {
    flexDirection: 'row',
    backgroundColor: '#FAC898',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addEventButtonText: {
    fontSize: 16,
    color: '#513C28',
    fontWeight: '600',
    marginRight: 8,
  },
  eventsSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  eventCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  eventImage: {
    width: '100%',
    height: 180,
  },
  placeholderImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  eventActions: {
    flexDirection: 'row',
  },
  eventAction: {
    marginLeft: 16,
  },
  eventDate: {
    fontSize: 14,
    color: '#FAC898',
    marginBottom: 8,
  },
  eventAuthor: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  eventDescription: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 12,
  },
  videoLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  videoLinkText: {
    color: '#FAC898',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#232323',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: height * 0.9,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalForm: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 15,
    color: '#FFFFFF',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textAreaInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateTimeText: {
    color: '#FFFFFF',
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#333',
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#FAC898',
    marginBottom: 20,
  },
  imagePickerText: {
    color: '#FAC898',
    marginLeft: 10,
    fontSize: 16,
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#FAC898',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#513C28',
  },
});