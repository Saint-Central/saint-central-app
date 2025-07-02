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
import theme from "../../theme";

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

type ChurchMembersScreenRouteProp = RouteProp<{ params: RouteParams }, "params">;

export default function ChurchMembersScreen() {
  const route = useRoute<ChurchMembersScreenRouteProp>();
  const { church_id, church_name } = route.params;

  const [members, setMembers] = useState<ChurchMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<ChurchMember | null>(null);
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
    const filtered = members.filter((member) => {
      if (member.hide_name && member.user_id !== currentUserId) {
        return false;
      }

      const firstName = member.user?.first_name?.toLowerCase() || "";
      const lastName = member.user?.last_name?.toLowerCase() || "";
      const email = member.user?.email?.toLowerCase() || "";
      const role = member.role?.toLowerCase() || "";

      return (
        firstName.includes(lowercaseQuery) ||
        lastName.includes(lowercaseQuery) ||
        `${firstName} ${lastName}`.includes(lowercaseQuery) ||
        email.includes(lowercaseQuery) ||
        role.includes(lowercaseQuery)
      );
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

      const churchIdNumber = Number(church_id);
      if (isNaN(churchIdNumber)) {
        console.error("Invalid church ID:", church_id);
        setMembers([]);
        return;
      }

      const { data, error } = await supabase
        .from("church_members")
        .select(
          `
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
        `,
        )
        .eq("church_id", churchIdNumber);

      if (error) {
        console.error("Error fetching members:", error);
        return;
      }

      const normalizedData = data.map((item) => {
        const userData = Array.isArray(item.users) ? item.users[0] : item.users;
        return {
          id: item.id,
          role: item.role,
          joined_at: item.joined_at,
          user_id: item.user_id,
          hide_email: item.hide_email ?? false,
          hide_name: item.hide_name ?? false,
          hide_phone: item.hide_phone ?? false,
          user: userData
            ? {
                id: userData.id,
                email: userData.email,
                first_name: userData.first_name,
                last_name: userData.last_name,
                profile_image: userData.profile_image,
                phone_number: userData.phone_number,
              }
            : null,
        };
      });

      setMembers(normalizedData as ChurchMember[]);
      setFilteredMembers(normalizedData as ChurchMember[]);
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
    setSearchQuery("");
    setSearchVisible(false);
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
          hide_phone: privacySettings.hide_phone,
        })
        .eq("id", editingMember.id);

      if (error) {
        console.error("Error updating privacy settings:", error);
        Alert.alert("Error", "Failed to update privacy settings. Please try again.");
        return;
      }

      await fetchMembers();
      setPrivacyModalVisible(false);
      Alert.alert("Success", "Privacy settings updated successfully!");
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

  const renderMemberItem = ({ item }: { item: ChurchMember }) => {
    const isCurrentUser = item.user_id === currentUserId;
    
    const showEmail = isCurrentUser || !item.hide_email;
    const showName = isCurrentUser || !item.hide_name;
    const showPhone = isCurrentUser || !item.hide_phone;

    const getInitials = () => {
      if (!showName) return "?";
      const first = item.user?.first_name?.[0] || "";
      const last = item.user?.last_name?.[0] || "";
      return (first + last).toUpperCase() || "?";
    };

    const getRoleColor = (role: string) => {
      switch (role?.toLowerCase()) {
        case 'admin':
          return theme.gradientSecondary;
        case 'pastor':
          return theme.gradientPrimary;
        case 'leader':
          return theme.gradientInfo;
        default:
          return theme.gradientNeutral;
      }
    };

    return (
      <View style={styles.memberCard}>
        <LinearGradient
          colors={[theme.neutral800, theme.neutral700]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.memberHeader}>
            {/* Profile Section */}
            <View style={styles.profileSection}>
              {item.user?.profile_image && showName ? (
                <View style={styles.profileImageContainer}>
                  <Image source={{ uri: item.user.profile_image }} style={styles.profileImage} />
                  <View style={styles.profileGlow} />
                </View>
              ) : (
                <LinearGradient
                  colors={theme.gradientPrimary}
                  style={styles.profileInitialsContainer}
                >
                  <Text style={styles.initialsText}>{getInitials()}</Text>
                  <View style={styles.profileGlow} />
                </LinearGradient>
              )}
            </View>

            {/* Member Info */}
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>
                {showName
                  ? `${item.user?.first_name || ""} ${item.user?.last_name || ""}`.trim()
                  : "Anonymous Member"}
                {isCurrentUser && <Text style={styles.currentUserText}> (You)</Text>}
              </Text>

              <LinearGradient
                colors={getRoleColor(item.role)}
                style={styles.roleBadge}
              >
                <Text style={styles.roleText}>{item.role || "Member"}</Text>
              </LinearGradient>
            </View>

            {/* Privacy Button */}
            {isCurrentUser && (
              <TouchableOpacity
                style={styles.privacyButton}
                onPress={() => handlePrivacySettings(item)}
              >
                <LinearGradient
                  colors={theme.gradientWarm}
                  style={styles.privacyButtonGradient}
                >
                  <FontAwesome5 name="user-shield" size={16} color={theme.textWhite} />
                  <Text style={styles.privacyButtonText}>Privacy</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* Member Details */}
          <View style={styles.memberDetails}>
            {item.user?.email && showEmail && (
              <View style={styles.detailRow}>
                <LinearGradient
                  colors={theme.gradientPrimary}
                  style={styles.iconContainer}
                >
                  <FontAwesome5 name="envelope" size={12} color={theme.textWhite} />
                </LinearGradient>
                <Text style={styles.detailText}>{item.user.email}</Text>
              </View>
            )}

            {item.user?.phone_number && showPhone && (
              <View style={styles.detailRow}>
                <LinearGradient
                  colors={theme.gradientInfo}
                  style={styles.iconContainer}
                >
                  <FontAwesome5 name="phone" size={12} color={theme.textWhite} />
                </LinearGradient>
                <Text style={styles.detailText}>{item.user.phone_number}</Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <LinearGradient
                colors={theme.gradientSuccess}
                style={styles.iconContainer}
              >
                <FontAwesome5 name="calendar" size={12} color={theme.textWhite} />
              </LinearGradient>
              <Text style={styles.detailText}>Member since: {formatDate(item.joined_at)}</Text>
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
        animationType="fade"
        transparent={true}
        visible={privacyModalVisible}
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <LinearGradient
                colors={[theme.neutral800, theme.neutral700]}
                style={styles.modalGradient}
              >
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <LinearGradient
                      colors={theme.gradientPrimary}
                      style={styles.modalIconContainer}
                    >
                      <FontAwesome5 name="user-shield" size={20} color={theme.textWhite} />
                    </LinearGradient>
                    <Text style={styles.modalTitle}>Privacy Settings</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => setPrivacyModalVisible(false)}
                  >
                    <LinearGradient
                      colors={[theme.neutral600, theme.neutral500]}
                      style={styles.closeButtonGradient}
                    >
                      <FontAwesome5 name="times" size={16} color={theme.textMedium} />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Modal Body */}
                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <Text style={styles.description}>
                    Control what information other church members can see about you. Even church administrators cannot view hidden information.
                  </Text>

                  <View style={styles.settingsContainer}>
                    {/* Email Setting */}
                    <View style={styles.settingCard}>
                      <LinearGradient
                        colors={[theme.neutral700, theme.neutral600]}
                        style={styles.settingGradient}
                      >
                        <View style={styles.settingContent}>
                          <View style={styles.settingInfo}>
                            <View style={styles.settingLabelRow}>
                              <LinearGradient
                                colors={theme.gradientPrimary}
                                style={styles.settingIconContainer}
                              >
                                <FontAwesome5 name="envelope" size={14} color={theme.textWhite} />
                              </LinearGradient>
                              <Text style={styles.settingLabel}>Hide Email Address</Text>
                            </View>
                            <Text style={styles.settingDescription}>
                              Your email will be visible only to you
                            </Text>
                          </View>
                          <Switch
                            value={privacySettings.hide_email}
                            onValueChange={(value) =>
                              setPrivacySettings((prev) => ({ ...prev, hide_email: value }))
                            }
                            trackColor={{ false: theme.neutral500, true: theme.primary }}
                            thumbColor={theme.accent2}
                          />
                        </View>
                      </LinearGradient>
                    </View>

                    {/* Phone Setting */}
                    <View style={styles.settingCard}>
                      <LinearGradient
                        colors={[theme.neutral700, theme.neutral600]}
                        style={styles.settingGradient}
                      >
                        <View style={styles.settingContent}>
                          <View style={styles.settingInfo}>
                            <View style={styles.settingLabelRow}>
                              <LinearGradient
                                colors={theme.gradientInfo}
                                style={styles.settingIconContainer}
                              >
                                <FontAwesome5 name="phone" size={14} color={theme.textWhite} />
                              </LinearGradient>
                              <Text style={styles.settingLabel}>Hide Phone Number</Text>
                            </View>
                            <Text style={styles.settingDescription}>
                              Your phone number will be visible only to you
                            </Text>
                          </View>
                          <Switch
                            value={privacySettings.hide_phone}
                            onValueChange={(value) =>
                              setPrivacySettings((prev) => ({ ...prev, hide_phone: value }))
                            }
                            trackColor={{ false: theme.neutral500, true: theme.primary }}
                            thumbColor={theme.accent2}
                          />
                        </View>
                      </LinearGradient>
                    </View>

                    {/* Name Setting */}
                    <View style={styles.settingCard}>
                      <LinearGradient
                        colors={[theme.neutral700, theme.neutral600]}
                        style={styles.settingGradient}
                      >
                        <View style={styles.settingContent}>
                          <View style={styles.settingInfo}>
                            <View style={styles.settingLabelRow}>
                              <LinearGradient
                                colors={theme.gradientSecondary}
                                style={styles.settingIconContainer}
                              >
                                <FontAwesome5 name="user" size={14} color={theme.textWhite} />
                              </LinearGradient>
                              <Text style={styles.settingLabel}>Hide Name</Text>
                            </View>
                            <Text style={styles.settingDescription}>
                              You'll appear as "Anonymous Member" to other church members
                            </Text>
                          </View>
                          <Switch
                            value={privacySettings.hide_name}
                            onValueChange={(value) =>
                              setPrivacySettings((prev) => ({ ...prev, hide_name: value }))
                            }
                            trackColor={{ false: theme.neutral500, true: theme.primary }}
                            thumbColor={theme.accent2}
                          />
                        </View>
                      </LinearGradient>
                    </View>
                  </View>

                  {/* Privacy Note */}
                  <View style={styles.privacyNote}>
                    <LinearGradient
                      colors={[`${theme.primary}20`, `${theme.accent1}15`]}
                      style={styles.privacyNoteGradient}
                    >
                      <LinearGradient
                        colors={theme.gradientPrimary}
                        style={styles.noteIconContainer}
                      >
                        <FontAwesome5 name="shield-alt" size={16} color={theme.textWhite} />
                      </LinearGradient>
                      <Text style={styles.noteText}>
                        Your privacy is protected. Even church administrators cannot see your hidden information. Only you can view your complete profile.
                      </Text>
                    </LinearGradient>
                  </View>

                  {/* Modal Actions */}
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => setPrivacyModalVisible(false)}
                    >
                      <LinearGradient
                        colors={[theme.neutral600, theme.neutral500]}
                        style={styles.cancelButtonGradient}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={savePrivacySettings}
                      disabled={updateLoading}
                    >
                      <LinearGradient
                        colors={theme.gradientPrimary}
                        style={styles.saveButtonGradient}
                      >
                        {updateLoading ? (
                          <ActivityIndicator size="small" color={theme.textWhite} />
                        ) : (
                          <>
                            <FontAwesome5 name="check" size={16} color={theme.textWhite} style={{marginRight: 8}} />
                            <Text style={styles.saveButtonText}>Save Settings</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </LinearGradient>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    );
  };

  // Render search bar
  const renderSearchBar = () => {
    if (!searchVisible) return null;

    return (
      <View style={styles.searchBarContainer}>
        <LinearGradient
          colors={[theme.neutral800, theme.neutral700]}
          style={styles.searchBarGradient}
        >
          <View style={styles.searchBar}>
            <FontAwesome5
              name="search"
              size={16}
              color={theme.accent1}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, role..."
              placeholderTextColor={theme.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
            />
          </View>
          {searchQuery !== "" && (
            <TouchableOpacity style={styles.clearButton} onPress={() => setSearchQuery("")}>
              <FontAwesome5 name="times-circle" size={16} color={theme.textMedium} />
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <LinearGradient
        colors={[theme.pageBg, theme.neutral800]}
        style={[styles.loadingContainer, { paddingTop: Constants.statusBarHeight }]}
      >
        <LinearGradient
          colors={theme.gradientPrimary}
          style={styles.loadingIconContainer}
        >
          <FontAwesome5 name="church" size={24} color={theme.textWhite} />
        </LinearGradient>
        <ActivityIndicator size="large" color={theme.primary} style={{marginTop: theme.spacingL}} />
        <Text style={styles.loadingText}>Loading members...</Text>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <LinearGradient
        colors={[theme.pageBg, theme.neutral800]}
        style={styles.backgroundGradient}
      >
        {/* Status bar padding */}
        <View style={{ height: Constants.statusBarHeight }} />

        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={[theme.neutral800, theme.neutral700]}
            style={styles.headerGradient}
          >
            <View style={styles.headerMainContent}>
              <LinearGradient
                colors={theme.gradientPrimary}
                style={styles.headerIcon}
              >
                <FontAwesome5 name="users" size={20} color={theme.textWhite} />
              </LinearGradient>
              <View>
                <Text style={styles.headerTitle}>{churchDisplayName}</Text>
                <Text style={styles.headerSubtitle}>Church Members</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.searchButton} onPress={toggleSearch}>
              <LinearGradient
                colors={searchVisible ? theme.gradientSecondary : theme.gradientPrimary}
                style={styles.searchButtonGradient}
              >
                <FontAwesome5 
                  name={searchVisible ? "times" : "search"} 
                  size={16} 
                  color={theme.textWhite} 
                />
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Search Bar */}
        {renderSearchBar()}

        {/* Content */}
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
                tintColor={theme.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <LinearGradient
                  colors={theme.gradientNeutral}
                  style={styles.emptyIconContainer}
                >
                  <FontAwesome5
                    name={searchQuery ? "search" : "church"}
                    size={40}
                    color={theme.textWhite}
                  />
                </LinearGradient>
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
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    marginHorizontal: theme.spacingL,
    marginBottom: theme.spacingM,
  },
  headerGradient: {
    borderRadius: theme.radiusLarge,
    padding: theme.spacingL,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...theme.shadowMedium,
  },
  headerMainContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: theme.radiusLarge,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacingL,
    ...theme.shadowLight,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.textMedium,
    marginTop: 2,
  },
  searchButton: {
    borderRadius: theme.radiusMedium,
    overflow: 'hidden',
  },
  searchButtonGradient: {
    padding: theme.spacingM,
    borderRadius: theme.radiusMedium,
  },
  searchBarContainer: {
    marginHorizontal: theme.spacingL,
    marginBottom: theme.spacingM,
  },
  searchBarGradient: {
    borderRadius: theme.radiusLarge,
    padding: theme.spacingM,
    flexDirection: "row",
    alignItems: "center",
    ...theme.shadowLight,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.cardBg,
    borderRadius: theme.radiusMedium,
    paddingVertical: theme.spacingM,
    paddingHorizontal: theme.spacingL,
  },
  searchIcon: {
    marginRight: theme.spacingM,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.textWhite,
    padding: 0,
  },
  clearButton: {
    padding: theme.spacingM,
    marginLeft: theme.spacingS,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingIconContainer: {
    width: 60,
    height: 60,
    borderRadius: theme.radiusFull,
    justifyContent: "center",
    alignItems: "center",
    ...theme.shadowMedium,
  },
  loadingText: {
    color: theme.textMedium,
    fontSize: 16,
    marginTop: theme.spacingM,
  },
  listContainer: {
    padding: theme.spacingL,
    paddingBottom: theme.spacing4XL,
  },
  memberCard: {
    borderRadius: theme.radiusXL,
    overflow: "hidden",
    marginBottom: theme.spacingXL,
    ...theme.shadowMedium,
  },
  cardGradient: {
    borderRadius: theme.radiusXL,
    padding: theme.spacingXL,
  },
  memberHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacingL,
  },
  profileSection: {
    position: 'relative',
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: theme.radiusFull,
    marginRight: theme.spacingL,
  },
  profileInitialsContainer: {
    width: 60,
    height: 60,
    borderRadius: theme.radiusFull,
    marginRight: theme.spacingL,
    justifyContent: "center",
    alignItems: "center",
    ...theme.shadowLight,
  },
  profileGlow: {
    position: 'absolute',
    top: -5,
    left: -5,
    width: 70,
    height: 70,
    borderRadius: theme.radiusFull,
    backgroundColor: `${theme.primary}20`,
    zIndex: -1,
  },
  initialsText: {
    fontSize: 24,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 18,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginBottom: theme.spacingS,
  },
  currentUserText: {
    fontStyle: "italic",
    color: theme.accent2,
  },
  roleBadge: {
    paddingHorizontal: theme.spacingL,
    paddingVertical: theme.spacingS,
    borderRadius: theme.radiusFull,
    alignSelf: "flex-start",
    ...theme.shadowLight,
  },
  roleText: {
    fontSize: 12,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  memberDetails: {
    backgroundColor: theme.cardBg,
    borderRadius: theme.radiusLarge,
    padding: theme.spacingL,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacingM,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: theme.radiusSmall,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacingM,
  },
  detailText: {
    fontSize: 14,
    color: theme.textMedium,
    flex: 1,
  },
  privacyButton: {
    borderRadius: theme.radiusLarge,
    overflow: 'hidden',
    ...theme.shadowMedium,
  },
  privacyButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacingL,
    paddingVertical: theme.spacingM,
  },
  privacyButtonText: {
    color: theme.textWhite,
    fontSize: 12,
    fontWeight: theme.fontBold,
    marginLeft: theme.spacingS,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing3XL,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: theme.radiusFull,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacingL,
    ...theme.shadowMedium,
  },
  emptyText: {
    fontSize: 16,
    color: theme.textMedium,
    textAlign: "center",
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: '90%',
    maxHeight: '85%',
  },
  modalContent: {
    borderRadius: theme.radiusXL,
    overflow: 'hidden',
    ...theme.shadowHeavy,
  },
  modalGradient: {
    borderRadius: theme.radiusXL,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacingXL,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.radiusMedium,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacingM,
    ...theme.shadowLight,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
  },
  closeButton: {
    borderRadius: theme.radiusMedium,
    overflow: 'hidden',
  },
  closeButtonGradient: {
    padding: theme.spacingM,
  },
  modalBody: {
    padding: theme.spacingXL,
  },
  description: {
    fontSize: 16,
    color: theme.textMedium,
    marginBottom: theme.spacing2XL,
    lineHeight: 24,
    textAlign: "center",
  },
  settingsContainer: {
    marginBottom: theme.spacingXL,
  },
  settingCard: {
    borderRadius: theme.radiusLarge,
    overflow: 'hidden',
    marginBottom: theme.spacingL,
    ...theme.shadowLight,
  },
  settingGradient: {
    borderRadius: theme.radiusLarge,
  },
  settingContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacingL,
  },
  settingInfo: {
    flex: 1,
    marginRight: theme.spacingL,
  },
  settingLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacingS,
  },
  settingIconContainer: {
    width: 28,
    height: 28,
    borderRadius: theme.radiusSmall,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacingM,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: theme.textWhite,
  },
  settingDescription: {
    fontSize: 13,
    color: theme.textLight,
    marginLeft: 40,
    lineHeight: 18,
  },
  privacyNote: {
    marginBottom: theme.spacingXL,
  },
  privacyNoteGradient: {
    borderRadius: theme.radiusLarge,
    padding: theme.spacingL,
    flexDirection: "row",
    alignItems: "flex-start",
    borderLeftWidth: 4,
    borderLeftColor: theme.primary,
  },
  noteIconContainer: {
    width: 32,
    height: 32,
    borderRadius: theme.radiusMedium,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacingM,
    marginTop: 2,
  },
  noteText: {
    fontSize: 13,
    color: theme.textMedium,
    flex: 1,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacingL,
  },
  cancelButton: {
    flex: 1,
    marginRight: theme.spacingM,
    borderRadius: theme.radiusLarge,
    overflow: 'hidden',
  },
  cancelButtonGradient: {
    paddingVertical: theme.spacingL,
    paddingHorizontal: theme.spacingXL,
    alignItems: "center",
  },
  cancelButtonText: {
    color: theme.textMedium,
    fontWeight: theme.fontSemiBold,
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    marginLeft: theme.spacingM,
    borderRadius: theme.radiusLarge,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacingL,
    paddingHorizontal: theme.spacingXL,
  },
  saveButtonText: {
    color: theme.textWhite,
    fontWeight: theme.fontBold,
    fontSize: 16,
  },
});