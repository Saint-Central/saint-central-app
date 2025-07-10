import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Switch,
  StatusBar,
  SafeAreaView
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome5, Feather } from "@expo/vector-icons";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { useAuth, User } from "@/contexts/AuthContext";
import { useCRUD } from "@/utils/crudClient";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import theme from "@/constants/theme";

// Type definitions based on the schema
type VolunteerEnrollment = {
  id: string;
  user_id: string;
  volunteer_id: string;
  enrollment_date: string;
  hide_email: boolean;
  hide_name: boolean;
  hide_phone: boolean;
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    profile_image: string | null;
    phone_number: string | null;
  };
};

type Volunteer = {
  id: string;
  description: string;
  time: string;
  location: string;
  host: string;
  image_url?: string;
  church_id: string;
  user_id: string;
};

type PrivacySettings = {
  hide_email: boolean;
  hide_name: boolean;
  hide_phone: boolean;
};

type RouteParams = {
  volunteerId: string;
};

type VolunteerDetailsScreenRouteProp = RouteProp<{ params: RouteParams }, 'params'>;

interface PrivacySettingsModalProps {
  visible: boolean;
  onClose: () => void;
  enrollment: VolunteerEnrollment;
  onSaveComplete?: () => void;
}

// Privacy settings modal component
export const PrivacySettingsModal: React.FC<PrivacySettingsModalProps> = ({ 
  visible, 
  onClose, 
  enrollment, 
  onSaveComplete 
}) => {
  const crud = useCRUD();
  
  // Initialize privacy settings
  const [settings, setSettings] = useState<PrivacySettings>({
    hide_email: true,
    hide_name: false,
    hide_phone: true
  });
  
  const [loading, setLoading] = useState(false);

  // Load actual values from enrollment when component mounts
  useEffect(() => {
    if (enrollment) {
      console.log("Loading enrollment settings:", enrollment);
      
      // Check if the values are explicitly defined as booleans
      const hide_email = enrollment.hide_email === false ? false : true;
      const hide_name = enrollment.hide_name === true ? true : false;
      const hide_phone = enrollment.hide_phone === false ? false : true;
      
      setSettings({
        hide_email: hide_email,
        hide_name: hide_name,
        hide_phone: hide_phone
      });
      
      console.log("Set settings to:", { hide_email, hide_name, hide_phone });
    }
  }, [enrollment]);

  // Save privacy settings to database
  const saveSettings = async () => {
    if (!enrollment) return;
    
    try {
      setLoading(true);
      console.log("Saving settings to database:", settings);

      await crud.update("volunteer_enrollment", {
        hide_email: settings.hide_email,
        hide_name: settings.hide_name,
        hide_phone: settings.hide_phone
      }, { id: enrollment.id });

      // Success
      Alert.alert("Success", "Privacy settings updated successfully");
      if (onSaveComplete) onSaveComplete();
      if (onClose) onClose();
    } catch (error) {
      console.error("Exception saving privacy settings:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Toggle switch helper that directly updates state
  const toggleSwitch = (field: keyof typeof settings) => {
    // When switch is ON (blue/true), we want to set hide_* to FALSE
    // When switch is OFF (gray/false), we want to set hide_* to TRUE
    setSettings(prev => {
      const newSettings = { ...prev };
      newSettings[field] = !prev[field];
      console.log(`Toggled ${field} from ${prev[field]} to ${newSettings[field]}`);
      return newSettings;
    });
  };

  return (
    <View style={styles.modalContainer}>
      <Text style={styles.modalTitle}>Privacy Settings</Text>
      
      {/* Email Privacy */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Show Email Address</Text>
          <Text style={styles.settingDescription}>
            ON: Your email is visible | OFF: Your email is hidden
          </Text>
        </View>
        <Switch
          // Switch is ON when hide_email is FALSE (showing email)
          value={!settings.hide_email}
          onValueChange={() => toggleSwitch('hide_email')}
          trackColor={{ false: theme.neutral600, true: theme.primary }}
          thumbColor="#FFFFFF"
        />
      </View>
      
      {/* Phone Privacy */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Show Phone Number</Text>
          <Text style={styles.settingDescription}>
            ON: Your phone is visible | OFF: Your phone is hidden
          </Text>
        </View>
        <Switch
          // Switch is ON when hide_phone is FALSE (showing phone)
          value={!settings.hide_phone}
          onValueChange={() => toggleSwitch('hide_phone')}
          trackColor={{ false: theme.neutral600, true: theme.primary }}
          thumbColor="#FFFFFF"
        />
      </View>
      
      {/* Name Privacy */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Show Name</Text>
          <Text style={styles.settingDescription}>
            ON: Your name is visible | OFF: You appear as "Anonymous"
          </Text>
        </View>
        <Switch
          // Switch is ON when hide_name is FALSE (showing name)
          value={!settings.hide_name}
          onValueChange={() => toggleSwitch('hide_name')}
          trackColor={{ false: theme.neutral600, true: theme.primary }}
          thumbColor="#FFFFFF"
        />
      </View>

      <View style={styles.modalButtonContainer}>
        {loading ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <>
            <Text 
              style={styles.cancelButton}
              onPress={onClose}
            >
              Cancel
            </Text>
            <Text 
              style={styles.saveButton}
              onPress={saveSettings}
            >
              Save Settings
            </Text>
          </>
        )}
      </View>
    </View>
  );
};

export default function VolunteerDetailsPage() {
  const route = useRoute<VolunteerDetailsScreenRouteProp>();
  const navigation = useNavigation();
  const { volunteerId } = route.params;
  
  // Auth and CRUD
  const { user } = useAuth();
  const crud = useCRUD();
  
  // States for volunteer details and enrollments
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [enrollments, setEnrollments] = useState<VolunteerEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEnrolled, setCurrentUserEnrolled] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [churchId, setChurchId] = useState<string | null>(null);
  
  // Privacy modal states
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<VolunteerEnrollment | null>(null);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    hide_email: true, // Default to hidden for privacy
    hide_name: false,
    hide_phone: true, // Default to hidden for privacy
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  
  // Search functionality
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEnrollments, setFilteredEnrollments] = useState<VolunteerEnrollment[]>([]);

  const router = useRouter();

  // Configure status bar on component mount
  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(theme.pageBg);
      StatusBar.setTranslucent(false);
    }
  }, []);

  // Get current user on component mount
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        if (user) {
          setCurrentUserId(user.id);
          
          // Check if the user is enrolled in this volunteer opportunity
          const enrollmentData = await crud.selectOne("volunteer_enrollment", {
            where: { volunteer_id: volunteerId, user_id: user.id }
          });
            
          if (enrollmentData) {
            setCurrentUserEnrolled(true);
            
            // Load user's privacy settings with explicit checks for boolean values
            const hide_email = enrollmentData.hide_email === false ? false : true;
            const hide_name = enrollmentData.hide_name === true ? true : false;
            const hide_phone = enrollmentData.hide_phone === false ? false : true;
            
            setPrivacySettings({
              hide_email,
              hide_name,
              hide_phone
            });
            
            console.log("Loaded user privacy settings:", { hide_email, hide_name, hide_phone });
          }
          
          // Fetch the volunteer opportunity to get church_id
          const volunteerData = await crud.selectOne("volunteer", {
            where: { id: volunteerId },
            select: "church_id"
          });
            
          if (volunteerData) {
            setChurchId(volunteerData.church_id);
            
            // Now check user's role in this church
            const memberData = await crud.selectOne("church_members", {
              where: { church_id: volunteerData.church_id, user_id: user.id },
              select: "role"
            });
              
            if (memberData) {
              setCurrentUserRole(memberData.role);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
    };
    
    getCurrentUser();
  }, [volunteerId, user]);

  // Fetch volunteer details
  useEffect(() => {
    const fetchVolunteerDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch volunteer details
        const data = await crud.selectOne("volunteer", {
          where: { id: volunteerId }
        });
        
        if (data) {
          setVolunteer(data);
        }
      } catch (error) {
        console.error("Error fetching volunteer details:", error);
        Alert.alert("Error", "Failed to load volunteer opportunity details");
      } finally {
        setLoading(false);
      }
    };
    
    fetchVolunteerDetails();
  }, [volunteerId]);

  // Fetch enrollments for this volunteer opportunity
  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      
      // Get enrollment data first
      const enrollmentData = await crud.select("volunteer_enrollment", {
        where: { volunteer_id: volunteerId }
      });
      
      if (enrollmentData) {
        // Then get user data for each enrollment
        const enrichedEnrollments = await Promise.all(
          enrollmentData.map(async (enrollment: any) => {
            const userData = await crud.selectOne("users", {
              where: { id: enrollment.user_id },
              select: "id, email, first_name, last_name, profile_image, phone_number"
            });
            
            // Make sure boolean values are properly set
            const hide_email = enrollment.hide_email === false ? false : true;
            const hide_name = enrollment.hide_name === true ? true : false;
            const hide_phone = enrollment.hide_phone === false ? false : true;
            
            return {
              ...enrollment,
              hide_email,
              hide_name,
              hide_phone,
              user: userData
            };
          })
        );
        
        setEnrollments(enrichedEnrollments);
        setFilteredEnrollments(enrichedEnrollments);
      }
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      Alert.alert("Error", "Failed to load enrolled volunteers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load enrollments on mount
  useEffect(() => {
    fetchEnrollments();
  }, [volunteerId]);

  // Filter enrollments based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEnrollments(enrollments);
      return;
    }
    
    const lowercaseQuery = searchQuery.toLowerCase();
    const filtered = enrollments.filter(enrollment => {
      if (
        enrollment.hide_name && 
        enrollment.user_id !== currentUserId
      ) {
        return false; // Skip hidden names unless it's the current user
      }
      
      const firstName = enrollment.user?.first_name?.toLowerCase() || "";
      const lastName = enrollment.user?.last_name?.toLowerCase() || "";
      const email = enrollment.user?.email?.toLowerCase() || "";
      
      return firstName.includes(lowercaseQuery) || 
             lastName.includes(lowercaseQuery) || 
             `${firstName} ${lastName}`.includes(lowercaseQuery) ||
             email.includes(lowercaseQuery);
    });
    
    setFilteredEnrollments(filtered);
  }, [searchQuery, enrollments, currentUserId]);

  // Check if current user is admin or owner of the church
  const isUserAdmin = () => {
    return currentUserRole === 'admin' || currentUserRole === 'owner';
  };

  // Pull-to-refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    setSearchQuery("");
    setSearchVisible(false);
    fetchEnrollments();
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  // Format time for display
  const formatTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Handle opening the privacy settings modal
  const handlePrivacySettings = (enrollment: VolunteerEnrollment) => {
    if (enrollment.user_id === currentUserId) {
      setEditingEnrollment(enrollment);
      
      // Initialize privacy settings from the enrollment's current settings
      // with explicit checks for boolean values
      const hide_email = enrollment.hide_email === false ? false : true;
      const hide_name = enrollment.hide_name === true ? true : false;
      const hide_phone = enrollment.hide_phone === false ? false : true;
      
      setPrivacySettings({
        hide_email,
        hide_name,
        hide_phone
      });
      
      console.log("Set privacy settings for modal:", { hide_email, hide_name, hide_phone });
      
      setPrivacyModalVisible(true);
    } else {
      Alert.alert("Permission Denied", "You can only edit your own privacy settings.");
    }
  };

  // Handle saving privacy settings to database
  const savePrivacySettings = async () => {
    if (!editingEnrollment) return;

    try {
      setUpdateLoading(true);
      
      console.log("Saving privacy settings to database:", privacySettings);

      await crud.update("volunteer_enrollment", {
        hide_email: privacySettings.hide_email,
        hide_name: privacySettings.hide_name,
        hide_phone: privacySettings.hide_phone
      }, { id: editingEnrollment.id });

      // Refresh the enrollments list to show updated settings
      await fetchEnrollments();
      setPrivacyModalVisible(false);
      Alert.alert("Success", "Privacy settings updated successfully.");
    } catch (error) {
      console.error("Error saving privacy settings:", error);
      Alert.alert("Error", "Failed to save privacy settings. Please try again.");
    } finally {
      setUpdateLoading(false);
    }
  };

  // Toggle search visibility
  const toggleSearch = () => {
    if (searchVisible) {
      setSearchQuery("");
    }
    setSearchVisible(!searchVisible);
  };

  // Handle enrolling in this volunteer opportunity
  const handleEnroll = async () => {
    if (!currentUserId) {
      Alert.alert("Sign In Required", "Please sign in to volunteer for this opportunity.");
      return;
    }
    
    if (currentUserEnrolled) {
      Alert.alert("Already Enrolled", "You are already volunteering for this opportunity.");
      return;
    }
    
    try {
      setLoading(true);
      
      // Add new enrollment - we keep the same default values
      await crud.insert("volunteer_enrollment", {
        user_id: currentUserId,
        volunteer_id: volunteerId,
        enrollment_date: new Date().toISOString(),
        hide_email: true,  // Default to hiding email for privacy
        hide_name: false,  // Default to showing name
        hide_phone: true,  // Default to hiding phone for privacy
      });
      
      Alert.alert("Success", "You have successfully signed up for this volunteer opportunity!");
      setCurrentUserEnrolled(true);
      await fetchEnrollments();
    } catch (error) {
      console.error("Error enrolling in volunteer opportunity:", error);
      Alert.alert("Error", "Failed to sign up. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Render each enrolled volunteer item
  const renderEnrolledMemberItem = ({ item }: { item: VolunteerEnrollment }) => {
    const isCurrentUser = item.user_id === currentUserId;
    
    // MODIFIED: Removed isAdmin from these conditions so admins can't bypass privacy settings
    const showEmail = isCurrentUser || !item.hide_email;
    const showName = isCurrentUser || !item.hide_name;
    const showPhone = isCurrentUser || !item.hide_phone;

    // Get initials for the avatar placeholder
    const getInitials = () => {
      if (!showName) return "?";
      
      const first = item.user?.first_name?.[0] || "";
      const last = item.user?.last_name?.[0] || "";
      return (first + last).toUpperCase() || "?";
    };

    return (
      <View style={styles.memberCard}>
        <LinearGradient
          colors={[theme.cardBg, theme.cardBg]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.memberHeader}>
            {/* Profile Image or Initials */}
            {item.user?.profile_image && showName ? (
              <Image 
                source={{ uri: item.user.profile_image }} 
                style={styles.profileImage} 
              />
            ) : (
              <LinearGradient
                colors={theme.gradientPrimary}
                style={styles.profileInitialsContainer}
              >
                <Text style={styles.initialsText}>{getInitials()}</Text>
              </LinearGradient>
            )}
            
            {/* Member Name and Role */}
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>
                {showName 
                  ? `${item.user?.first_name || ''} ${item.user?.last_name || ''}`.trim() 
                  : "Anonymous Volunteer"}
                {isCurrentUser && <Text style={styles.currentUserText}> (You)</Text>}
              </Text>
              
              <Text style={styles.enrollmentDate}>
                Signed up: {formatDate(item.enrollment_date)}
              </Text>
            </View>

            {/* Privacy Settings Button - only for current user */}
            {isCurrentUser && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handlePrivacySettings(item)}
              >
                <FontAwesome5 name="user-shield" size={18} color={theme.primary} />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Member Details */}
          <View style={styles.memberDetails}>
            {(showEmail || isCurrentUser) && (
              <View style={styles.detailRow}>
                <FontAwesome5 name="envelope" size={14} color={theme.textMedium} style={styles.icon} />
                <Text style={styles.detailText}>
                  {showEmail 
                    ? item.user?.email || 'No email provided'
                    : '*****@****** (Hidden)'}
                  {!showEmail && isCurrentUser && " (Only visible to you)"}
                </Text>
              </View>
            )}

            {(showPhone || isCurrentUser) && item.user?.phone_number && (
              <View style={styles.detailRow}>
                <FontAwesome5 name="phone" size={14} color={theme.textMedium} style={styles.icon} />
                <Text style={styles.detailText}>
                  {showPhone 
                    ? item.user.phone_number
                    : '****-****-**** (Hidden)'}
                  {!showPhone && isCurrentUser && " (Only visible to you)"}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </View>
    );
  };

  // Render privacy settings modal
  const renderPrivacyModal = () => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={privacyModalVisible}
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Privacy Settings</Text>
              <TouchableOpacity onPress={() => setPrivacyModalVisible(false)}>
                <FontAwesome5 name="times" size={20} color={theme.textMedium} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.description}>
                Control what information other volunteers can see about you.
              </Text>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Show Email Address</Text>
                  <Text style={styles.settingDescription}>
                    ON: Your email is visible to others | OFF: Your email is hidden
                  </Text>
                </View>
                <Switch
                  // Switch is ON when hide_email is FALSE (showing email)
                  value={!privacySettings.hide_email}
                  onValueChange={() => {
                    setPrivacySettings(prev => {
                      const newSettings = { ...prev, hide_email: !prev.hide_email };
                      console.log(`Toggle hide_email from ${prev.hide_email} to ${newSettings.hide_email}`);
                      return newSettings;
                    });
                  }}
                  trackColor={{ false: theme.neutral600, true: theme.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Show Phone Number</Text>
                  <Text style={styles.settingDescription}>
                    ON: Your phone number is visible to others | OFF: Your phone number is hidden
                  </Text>
                </View>
                <Switch
                  // Switch is ON when hide_phone is FALSE (showing phone)
                  value={!privacySettings.hide_phone}
                  onValueChange={() => {
                    setPrivacySettings(prev => {
                      const newSettings = { ...prev, hide_phone: !prev.hide_phone };
                      console.log(`Toggle hide_phone from ${prev.hide_phone} to ${newSettings.hide_phone}`);
                      return newSettings;
                    });
                  }}
                  trackColor={{ false: theme.neutral600, true: theme.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Show Name</Text>
                  <Text style={styles.settingDescription}>
                    ON: Your name is visible to others | OFF: You appear as "Anonymous Volunteer"
                  </Text>
                </View>
                <Switch
                  // Switch is ON when hide_name is FALSE (showing name)
                  value={!privacySettings.hide_name}
                  onValueChange={() => {
                    setPrivacySettings(prev => {
                      const newSettings = { ...prev, hide_name: !prev.hide_name };
                      console.log(`Toggle hide_name from ${prev.hide_name} to ${newSettings.hide_name}`);
                      return newSettings;
                    });
                  }}
                  trackColor={{ false: theme.neutral600, true: theme.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.privacyNote}>
                <FontAwesome5 name="info-circle" size={14} color={theme.textMedium} style={styles.icon} />
                <Text style={styles.noteText}>
                  These settings apply to everyone viewing this volunteer opportunity, including admins. Only you will be able to see your own hidden information. When the switch is blue (ON), information is shown to others. When OFF, information is hidden.
                </Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setPrivacyModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={savePrivacySettings}
                  disabled={updateLoading}
                >
                  {updateLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Settings</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  // Render search bar
  const renderSearchBar = () => {
    if (!searchVisible) return null;
    
    return (
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <FontAwesome5 name="search" size={16} color={theme.textMedium} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor={theme.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
            clearButtonMode="while-editing"
          />
        </View>
        {searchQuery !== "" && (
          <TouchableOpacity 
            style={styles.clearButton} 
            onPress={() => setSearchQuery("")}
          >
            <FontAwesome5 name="times-circle" size={16} color={theme.textMedium} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Render the volunteer details section
  const renderVolunteerDetails = () => {
    if (!volunteer) return null;
    
    // Get volunteer color based on description
    const getVolunteerColor = () => {
      const title = (volunteer.description?.toLowerCase() || '');
      
      if (title.includes("bible") || title.includes("study")) {
        return theme.accent1;
      } else if (title.includes("sunday") || title.includes("service") || title.includes("worship")) {
        return theme.secondary;
      } else if (title.includes("youth") || title.includes("meetup") || title.includes("young")) {
        return theme.warning;
      } else if (title.includes("prayer") || title.includes("breakfast")) {
        return theme.accent3;
      } else if (title.includes("meeting") || title.includes("committee")) {
        return theme.primary;
      } else if (title.includes("music") || title.includes("choir") || title.includes("practice")) {
        return theme.accent1;
      } else if (title.includes("volunteer") || title.includes("serve") || title.includes("outreach")) {
        return theme.error;
      }
      return theme.neutral600;
    };
    
    return (
      <View style={styles.volunteerDetailsContainer}>
        {/* Volunteer image if available */}
        {volunteer.image_url && (
          <View style={styles.volunteerImageContainer}>
            <Image
              source={{ uri: volunteer.image_url }}
              style={styles.volunteerImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.imageGradient}
            />
          </View>
        )}
        
        {/* Volunteer content */}
        <View style={styles.volunteerContent}>
          <View style={styles.volunteerHeader}>
            <View style={[styles.volunteerBadge, { backgroundColor: getVolunteerColor() }]}>
              <Text style={styles.volunteerBadgeText}>VOLUNTEER</Text>
            </View>
            
            <Text style={styles.volunteerTitle}>
              {volunteer.description || 'Untitled Volunteer Opportunity'}
            </Text>
            
            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <FontAwesome5 name="clock" size={14} color={theme.textMedium} style={styles.icon} />
                <Text style={styles.detailText}>
                  {formatDate(volunteer.time)} • {formatTime(volunteer.time)}
                </Text>
              </View>
              
              <View style={styles.detailItem}>
                <FontAwesome5 name="map-marker-alt" size={14} color={theme.textMedium} style={styles.icon} />
                <Text style={styles.detailText}>
                  {volunteer.location || 'Location TBD'}
                </Text>
              </View>
              
              <View style={styles.detailItem}>
                <FontAwesome5 name="user" size={14} color={theme.textMedium} style={styles.icon} />
                <Text style={styles.detailText}>
                  Coordinator: {volunteer.host || 'TBD'}
                </Text>
              </View>
            </View>
            
            {!currentUserEnrolled && (
              <TouchableOpacity
                style={styles.enrollButton}
                onPress={handleEnroll}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <FontAwesome5 name="user-plus" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.enrollButtonText}>Sign Up</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            
            {currentUserEnrolled && (
              <View style={styles.enrolledBadge}>
                <FontAwesome5 name="check-circle" size={16} color={theme.success} style={{ marginRight: 8 }} />
                <Text style={styles.enrolledText}>You are signed up</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading && !refreshing && !volunteer) {
    return (
      <View style={[styles.loadingContainer, {paddingTop: Constants.statusBarHeight}]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.outerContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.push('/volunteerhomepage')}
        >
          <FontAwesome5 name="arrow-left" size={18} color={theme.primary} />
        </TouchableOpacity>
        <Text style={styles.headerText}>Volunteer Details</Text>
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={toggleSearch}
        >
          <FontAwesome5 name={searchVisible ? "times" : "search"} size={18} color={theme.primary} />
        </TouchableOpacity>
      </View>
      
      {/* Search Bar */}
      {renderSearchBar()}
      
      {/* Volunteer details and enrollment list */}
      <FlatList
        data={filteredEnrollments}
        renderItem={renderEnrolledMemberItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            {/* Volunteer details section */}
            {renderVolunteerDetails()}
            
            {/* Enrolled volunteers header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Volunteers ({enrollments.length})
              </Text>
            </View>
          </>
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome5 
              name={searchQuery ? "search" : "users"} 
              size={50} 
              color={theme.neutral600} 
            />
            <Text style={styles.emptyText}>
              {searchQuery 
                ? "No volunteers found matching your search" 
                : "No one has signed up for this opportunity yet"}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[theme.primary]} 
          />
        }
      />
      
      {/* Privacy Settings Modal */}
      {renderPrivacyModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: theme.pageBg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: theme.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
    ...theme.shadowLight,
  },
  headerMainContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
  },
  searchButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.pageBg,
  },
  volunteerDetailsContainer: {
    backgroundColor: theme.cardBg,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 0,
    overflow: "hidden",
    ...theme.shadowMedium,
  },
  volunteerImageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  volunteerImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
  },
  volunteerContent: {
    padding: 16,
  },
  volunteerHeader: {
    width: '100%',
  },
  volunteerBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  volunteerBadgeText: {
    fontSize: 12,
    fontWeight: theme.fontSemiBold,
    color: '#FFFFFF',
  },
  volunteerTitle: {
    fontSize: 22,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginBottom: 12,
  },
  detailsRow: {
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 15,
    color: theme.textMedium,
  },
  enrollButton: {
    backgroundColor: theme.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    ...theme.shadowLight,
  },
  enrollButtonText: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: "#FFFFFF",
  },
  enrolledBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.success,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  enrolledText: {
    fontSize: 14,
    fontWeight: theme.fontSemiBold,
    color: theme.success,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: theme.pageBg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.cardBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.pageBg,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.textWhite,
    padding: 0,
  },
  clearButton: {
    padding: 10,
    marginLeft: 4,
  },
  listContainer: {
    paddingBottom: 16,
  },
  memberCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    overflow: "hidden",
    ...theme.shadowLight,
  },
  cardGradient: {
    padding: 16,
  },
  memberHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 14,
  },
  profileInitialsContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  initialsText: {
    fontSize: 18,
    fontWeight: theme.fontSemiBold,
    color: "#FFFFFF",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: theme.textWhite,
    marginBottom: 4,
  },
  currentUserText: {
    fontStyle: "italic",
    color: theme.textLight,
  },
  enrollmentDate: {
    fontSize: 13,
    color: theme.textLight,
  },
  memberDetails: {
    backgroundColor: theme.pageBg,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  icon: {
    marginRight: 10,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 50,
    backgroundColor: theme.cardBg,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  emptyText: {
    fontSize: 16,
    color: theme.textLight,
    marginTop: 16,
    textAlign: "center",
  },
  actionButton: {
    padding: 10,
    marginLeft: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: theme.overlay,
  },
  modalContent: {
    backgroundColor: theme.cardBg,
    margin: 20,
    borderRadius: 16,
    ...theme.shadowHeavy,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
  },
  modalBody: {
    padding: 16,
  },
  description: {
    fontSize: 14,
    color: theme.textLight,
    marginBottom: 20,
    lineHeight: 20,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: theme.textWhite,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: theme.textLight,
  },
  privacyNote: {
    flexDirection: "row",
    backgroundColor: theme.pageBg,
    borderRadius: 8,
    padding: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  noteText: {
    fontSize: 12,
    color: theme.textLight,
    flex: 1,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: theme.pageBg,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.divider,
    flex: 1,
    marginRight: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: theme.textLight,
    fontWeight: theme.fontSemiBold,
  },
  saveButton: {
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
    marginLeft: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: theme.fontSemiBold,
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },
  headerText: {
    fontSize: 18,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
});