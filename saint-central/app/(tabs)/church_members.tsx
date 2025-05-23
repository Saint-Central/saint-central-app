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
  SafeAreaView,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome5 } from "@expo/vector-icons";
import { useRoute, RouteProp } from "@react-navigation/native";
import { supabase } from "../../supabaseClient";
import Constants from "expo-constants";
import theme from "../../theme"; // Import theme file

// Type definitions based on the schema
type ChurchMember = {
  id: string;
  role: string;
  joined_at: string;
  user_id: string;
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

type PrivacySettings = {
  hide_email: boolean;
  hide_name: boolean;
  hide_phone: boolean;
};

type RouteParams = {
  church_id: string;
  church_name?: string;
};

type ChurchMembersScreenRouteProp = RouteProp<{ params: RouteParams }, 'params'>;

export default function ChurchMembersScreen() {
  const route = useRoute<ChurchMembersScreenRouteProp>();
  const { church_id, church_name } = route.params;
  
  const [members, setMembers] = useState<ChurchMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<ChurchMember | null>(null);
  const [memberPrivacySettings, setMemberPrivacySettings] = useState<Record<string, PrivacySettings>>({});
  const [updateLoading, setUpdateLoading] = useState(false);
  const [churchDisplayName, setChurchDisplayName] = useState(church_name || "Church");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    hide_email: false,
    hide_name: false,
    hide_phone: false,
  });
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  
  // Search functionality
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMembers, setFilteredMembers] = useState<ChurchMember[]>([]);

  // Get current user and their role on component mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setCurrentUserId(data.user.id);
        
        // Get the user's role in this church
        const { data: memberData, error: memberError } = await supabase
          .from("church_members")
          .select("role")
          .eq("church_id", church_id)
          .eq("user_id", data.user.id)
          .single();
        
        if (memberData) {
          setCurrentUserRole(memberData.role);
        }
      }
    };
    
    getCurrentUser();
  }, [church_id]);

  // Filter members based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredMembers(members);
      return;
    }
    
    const lowercaseQuery = searchQuery.toLowerCase();
    const filtered = members.filter(member => {
      if (member.hide_name && member.user_id !== currentUserId) {
        return false; // Don't include hidden names in search unless it's the current user
      }
      
      const firstName = member.user?.first_name?.toLowerCase() || "";
      const lastName = member.user?.last_name?.toLowerCase() || "";
      const email = member.user?.email?.toLowerCase() || "";
      const role = member.role?.toLowerCase() || "";
      
      return firstName.includes(lowercaseQuery) || 
             lastName.includes(lowercaseQuery) || 
             `${firstName} ${lastName}`.includes(lowercaseQuery) ||
             email.includes(lowercaseQuery) ||
             role.includes(lowercaseQuery);
    });
    
    setFilteredMembers(filtered);
  }, [searchQuery, members, currentUserId]);

  // Fetch church name if not provided
  useEffect(() => {
    const getChurchName = async () => {
      if (!church_name) {
        try {
          const { data, error } = await supabase
            .from("churches")
            .select("name")
            .eq("id", church_id)
            .single();
          
          if (data) {
            setChurchDisplayName(data.name);
          }
        } catch (error) {
          console.error("Error fetching church name:", error);
        }
      }
    };

    getChurchName();
  }, [church_id, church_name]);

  // Fetch church members
  const fetchMembers = async () => {
    try {
      setLoading(true);
      
      // Parse church_id to number for database query
      const churchIdNumber = Number(church_id);
      if (isNaN(churchIdNumber)) {
        console.error("Invalid church ID:", church_id);
        setMembers([]);
        return;
      }
      
      // Join church_members with users table using the foreign key
      const { data, error } = await supabase
        .from("church_members")
        .select(`
          id,
          role,
          joined_at,
          user_id,
          hide_email,
          hide_name,
          hide_phone,
          users!user_id (
            id,
            email,
            first_name,
            last_name,
            profile_image,
            phone_number
          )
        `)
        .eq("church_id", churchIdNumber);

      if (error) {
        console.error("Error fetching members:", error);
        return;
      }

      // Transform the data to match ChurchMember type
      const normalizedData = data.map(item => {
        const userData = Array.isArray(item.users) ? item.users[0] : item.users;
        return {
          id: item.id,
          role: item.role,
          joined_at: item.joined_at,
          user_id: item.user_id,
          hide_email: item.hide_email || false,
          hide_name: item.hide_name || false,
          hide_phone: item.hide_phone || false,
          user: userData ? {
            id: userData.id,
            email: userData.email,
            first_name: userData.first_name,
            last_name: userData.last_name,
            profile_image: userData.profile_image,
            phone_number: userData.phone_number
          } : null
        };
      });

      setMembers(normalizedData as ChurchMember[]);
      setFilteredMembers(normalizedData as ChurchMember[]); // Initialize filtered members with all members
    } catch (error) {
      console.error("Failed to fetch members:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [church_id]);

  const onRefresh = () => {
    setRefreshing(true);
    setSearchQuery(""); // Clear search when refreshing
    setSearchVisible(false); // Hide search when refreshing
    fetchMembers();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString();
  };

  // Handle opening the privacy settings modal
  const handlePrivacySettings = (member: ChurchMember) => {
    if (member.user_id === currentUserId) {
      setEditingMember(member);
      // Initialize privacy settings from the member's current settings
      setPrivacySettings({
        hide_email: member.hide_email || false,
        hide_name: member.hide_name || false,
        hide_phone: member.hide_phone || false,
      });
      setPrivacyModalVisible(true);
    } else {
      Alert.alert("Permission Denied", "You can only edit your own privacy settings.");
    }
  };

  // Handle saving privacy settings to database
  const savePrivacySettings = async () => {
    if (!editingMember) return;

    try {
      setUpdateLoading(true);

      const { error } = await supabase
        .from("church_members")
        .update({
          hide_email: privacySettings.hide_email,
          hide_name: privacySettings.hide_name,
          hide_phone: privacySettings.hide_phone
        })
        .eq("id", editingMember.id);

      if (error) {
        console.error("Error updating privacy settings:", error);
        Alert.alert("Error", "Failed to update privacy settings. Please try again.");
        return;
      }

      // Refresh the members list to show updated settings
      await fetchMembers();
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
      setSearchQuery(""); // Clear search query when hiding search
    }
    setSearchVisible(!searchVisible);
  };

  const renderMemberItem = ({ item }: { item: ChurchMember }) => {
    const isCurrentUser = item.user_id === currentUserId;
    // Only show private info if it's the user themselves
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
          colors={theme.gradientLight}
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
                  : "Anonymous Member"}
                {isCurrentUser && <Text style={styles.currentUserText}> (You)</Text>}
              </Text>
              
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{item.role || "Member"}</Text>
              </View>
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
            
            <View style={styles.detailRow}>
              <FontAwesome5 name="calendar" size={14} color={theme.textMedium} style={styles.icon} />
              <Text style={styles.detailText}>
                Member since: {formatDate(item.joined_at)}
              </Text>
            </View>
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
                Control what information other church members can see about you.
              </Text>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Hide Email Address</Text>
                  <Text style={styles.settingDescription}>
                    Your email will be visible only to you
                  </Text>
                </View>
                <Switch
                  value={privacySettings.hide_email}
                  onValueChange={(value) => 
                    setPrivacySettings(prev => ({ ...prev, hide_email: value }))
                  }
                  trackColor={{ false: theme.neutral300, true: theme.primary }}
                  thumbColor={theme.neutral50}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Hide Phone Number</Text>
                  <Text style={styles.settingDescription}>
                    Your phone number will be visible only to you
                  </Text>
                </View>
                <Switch
                  value={privacySettings.hide_phone}
                  onValueChange={(value) => 
                    setPrivacySettings(prev => ({ ...prev, hide_phone: value }))
                  }
                  trackColor={{ false: theme.neutral300, true: theme.primary }}
                  thumbColor={theme.neutral50}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Hide Name</Text>
                  <Text style={styles.settingDescription}>
                    You'll appear as "Anonymous Member" to other church members
                  </Text>
                </View>
                <Switch
                  value={privacySettings.hide_name}
                  onValueChange={(value) => 
                    setPrivacySettings(prev => ({ ...prev, hide_name: value }))
                  }
                  trackColor={{ false: theme.neutral300, true: theme.primary }}
                  thumbColor={theme.neutral50}
                />
              </View>

              <View style={styles.privacyNote}>
                <FontAwesome5 name="info-circle" size={14} color={theme.textMedium} style={styles.icon} />
                <Text style={styles.noteText}>
                  These settings control who can see your information in the church directory
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
                    <ActivityIndicator size="small" color={theme.neutral50} />
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
            placeholder="Search by name, role..."
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

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, {paddingTop: Constants.statusBarHeight}]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      {/* Status bar padding space */}
      <View style={{height: Constants.statusBarHeight, backgroundColor: theme.neutral50}} />
      
      {/* Header stays fixed at the top */}
      <View style={styles.header}>
        <View style={styles.headerMainContent}>
          <LinearGradient
            colors={theme.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerIcon}
          >
            <FontAwesome5 name="users" size={18} color={theme.neutral50} />
          </LinearGradient>
          <Text style={styles.headerTitle}>{churchDisplayName} Members</Text>
        </View>
        
        {/* Search Button */}
        <TouchableOpacity style={styles.searchButton} onPress={toggleSearch}>
          <FontAwesome5 
            name={searchVisible ? "times" : "search"} 
            size={18} 
            color={theme.primary} 
          />
        </TouchableOpacity>
      </View>
      
      {/* Search Bar */}
      {renderSearchBar()}
      
      {/* Content container */}
      <View style={styles.container}>
        <FlatList
          data={filteredMembers}
          renderItem={renderMemberItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={[theme.primary]} 
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome5 
                name={searchQuery ? "search" : "church"} 
                size={50} 
                color={theme.neutral300} 
              />
              <Text style={styles.emptyText}>
                {searchQuery 
                  ? "No members found matching your search" 
                  : "No members found for this church"}
              </Text>
            </View>
          }
        />
      </View>

      {/* Privacy Settings Modal */}
      {renderPrivacyModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: theme.neutral50,
  },
  container: {
    flex: 1,
    backgroundColor: theme.pageBg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacingL,
    paddingVertical: theme.spacingL,
    backgroundColor: theme.neutral50,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
    ...theme.shadowLight,
  },
  headerMainContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radiusMedium,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacingM,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: theme.fontBold,
    color: theme.textDark,
  },
  searchButton: {
    padding: theme.spacingS,
    borderRadius: theme.radiusSmall,
    backgroundColor: theme.neutral100,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.neutral50,
    paddingHorizontal: theme.spacingL,
    paddingVertical: theme.spacingM,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.neutral100,
    borderRadius: theme.radiusMedium,
    paddingVertical: theme.spacingS,
    paddingHorizontal: theme.spacingM,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  searchIcon: {
    marginRight: theme.spacingS,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.textDark,
    padding: 0,
  },
  clearButton: {
    padding: theme.spacingM,
    marginLeft: theme.spacingXS,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.pageBg,
  },
  listContainer: {
    padding: theme.spacingL,
    paddingBottom: theme.spacing4XL + theme.spacingXL, // Increased bottom padding further
  },
  memberCard: {
    borderRadius: theme.radiusLarge,
    overflow: "hidden",
    marginBottom: theme.spacingL,
    ...theme.shadowMedium,
  },
  cardGradient: {
    borderRadius: theme.radiusLarge,
    padding: theme.spacingL,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  memberHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacingM,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: theme.spacingL,
  },
  profileInitialsContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: theme.spacingL,
    justifyContent: "center",
    alignItems: "center",
  },
  initialsText: {
    fontSize: 18,
    fontWeight: theme.fontSemiBold,
    color: theme.neutral50,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: theme.textDark,
    marginBottom: theme.spacingXS,
  },
  currentUserText: {
    fontStyle: "italic",
    color: theme.textMedium,
  },
  roleBadge: {
    backgroundColor: theme.overlayLight,
    paddingHorizontal: theme.spacingM,
    paddingVertical: theme.spacingXS,
    borderRadius: theme.radiusSmall,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: `${theme.primary}30`,
  },
  roleText: {
    fontSize: 12,
    fontWeight: theme.fontSemiBold,
    color: theme.primary,
  },
  memberDetails: {
    backgroundColor: `${theme.neutral50}99`,
    borderRadius: theme.radiusMedium,
    padding: theme.spacingM,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacingS,
  },
  icon: {
    marginRight: theme.spacingM,
  },
  detailText: {
    fontSize: 14,
    color: theme.textDark,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 50,
  },
  emptyText: {
    fontSize: 16,
    color: theme.textMedium,
    marginTop: theme.spacingL,
    textAlign: "center",
  },
  actionButton: {
    padding: theme.spacingM,
    marginLeft: theme.spacingXS,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: theme.overlay,
  },
  modalContent: {
    backgroundColor: theme.neutral50,
    margin: 20,
    borderRadius: theme.radiusLarge,
    ...theme.shadowHeavy,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
    padding: theme.spacingL,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: theme.fontBold,
    color: theme.textDark,
  },
  modalBody: {
    padding: theme.spacingL,
  },
  description: {
    fontSize: 14,
    color: theme.textMedium,
    marginBottom: theme.spacingXL,
    lineHeight: 20,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacingM,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  settingInfo: {
    flex: 1,
    marginRight: theme.spacingL,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: theme.textDark,
    marginBottom: theme.spacingXS,
  },
  settingDescription: {
    fontSize: 12,
    color: theme.textMedium,
  },
  privacyNote: {
    flexDirection: "row",
    backgroundColor: theme.neutral100,
    borderRadius: theme.radiusSmall,
    padding: theme.spacingM,
    marginTop: theme.spacingXL,
    marginBottom: theme.spacingXL,
  },
  noteText: {
    fontSize: 12,
    color: theme.textMedium,
    flex: 1,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: theme.fontSemiBold,
    color: theme.textMedium,
    marginBottom: theme.spacingS,
  },
  input: {
    backgroundColor: theme.neutral100,
    borderRadius: theme.radiusMedium,
    padding: theme.spacingM,
    borderWidth: 1,
    borderColor: theme.divider,
    marginBottom: theme.spacingL,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacingXL,
  },
  cancelButton: {
    backgroundColor: theme.neutral100,
    paddingVertical: theme.spacingM,
    paddingHorizontal: theme.spacingXL,
    borderRadius: theme.radiusMedium,
    borderWidth: 1,
    borderColor: theme.divider,
    flex: 1,
    marginRight: theme.spacingS,
    alignItems: "center",
  },
  cancelButtonText: {
    color: theme.textMedium,
    fontWeight: theme.fontSemiBold,
  },
  saveButton: {
    backgroundColor: theme.primary,
    paddingVertical: theme.spacingM,
    paddingHorizontal: theme.spacingXL,
    borderRadius: theme.radiusMedium,
    flex: 1,
    marginLeft: theme.spacingS,
    alignItems: "center",
  },
  saveButtonText: {
    color: theme.neutral50,
    fontWeight: theme.fontSemiBold,
  },
});