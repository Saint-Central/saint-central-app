// SimplifiedMinistriesScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  Image,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../supabaseClient";
import {
  Ionicons,
  MaterialIcons,
  FontAwesome5,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

// Simplified Ministry interface based on single table schema
interface Ministry {
  id: number;
  church_id: number;
  name: string;
  description: string;
  image_url?: string;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
}

// Ministry member interface
interface MinistryMember {
  id: number;
  ministry_id: number;
  user_id: string;
  church_id: number;
  joined_at: string;
  member_status: string;
}

// Type definition for navigation
type RootStackParamList = {
  home: undefined;
  ministryDetail: { ministryId: number };
  createMinistry: undefined;
};

// Define admin roles
const ADMIN_ROLES = ['admin', 'leader', 'pastor'];

type NavigationProp = StackNavigationProp<RootStackParamList>;

// Format time to display
const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  
  // Check if today
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  
  // If within the last week, return day name
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (date > weekAgo) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  
  // Otherwise return date
  return date.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
};

// Get avatar color based on ministry name
const getAvatarColor = (name: string): string => {
  const colors = [
    '#25D366', // WhatsApp Green
    '#34B7F1', // WhatsApp Blue
    '#075E54', // WhatsApp Dark Green
    '#128C7E', // WhatsApp Teal
    '#4CAF50', // Material Green
    '#2196F3', // Material Blue
    '#673AB7', // Material Deep Purple
    '#FF9800', // Material Orange
  ];
  
  // Simple hash function to pick a consistent color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// Generate initials from ministry name
const getInitials = (name: string): string => {
  if (!name) return '?';
  
  const words = name.split(' ');
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

export default function SimplifiedMinistriesScreen(): JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [filteredMinistries, setFilteredMinistries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchText, setSearchText] = useState<string>("");
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [newMinistryName, setNewMinistryName] = useState<string>("");
  const [newMinistryDescription, setNewMinistryDescription] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Ref for search input
  const searchInputRef = useRef<TextInput>(null);

  // Filter ministries when search text changes
  useEffect(() => {
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      setFilteredMinistries(
        ministries.filter(ministry => 
          ministry.name.toLowerCase().includes(searchLower) || 
          (ministry.description && ministry.description.toLowerCase().includes(searchLower))
        )
      );
    } else {
      setFilteredMinistries(ministries);
    }
  }, [searchText, ministries]);

  // Fetch ministries data
  useEffect(() => {
    // Animate content fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    fetchData();
  }, []);

  // Header animations based on scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const headerElevation = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 15],
    extrapolate: "clamp",
  });

  async function fetchData(): Promise<void> {
    try {
      setLoading(true);
      console.log("Fetching ministries data...");

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError);
        throw userError;
      }

      if (!user) {
        console.error("No user logged in");
        throw new Error("No user logged in");
      }

      // Check if user is an admin by fetching their role from church_members
      const { data: churchMember, error: churchMemberError } = await supabase
        .from("church_members")
        .select("role")
        .eq("user_id", user.id)
        .single();
        
      if (churchMemberError) {
        console.error("Error fetching church member role:", churchMemberError);
        // Don't throw here, as we can still show ministries even if role check fails
        setIsAdmin(false);
      } else {
        // Check if user's role is in the admin roles list
        setIsAdmin(churchMember?.role && ADMIN_ROLES.includes(churchMember.role.toLowerCase()));
      }

      // Fetch ministries from the single table
      const { data: ministriesData, error: ministriesError } = await supabase
        .from("ministries")
        .select("*")
        .order('created_at', { ascending: false });

      if (ministriesError) {
        console.error("Error fetching ministries data:", ministriesError);
        throw ministriesError;
      }

      // Fetch member counts for each ministry
      const { data: memberCounts, error: countError } = await supabase
        .from("ministry_members")
        .select('ministry_id')
        .in('ministry_id', ministriesData.map(m => m.id));

      if (countError) {
        console.error("Error fetching member counts:", countError);
      }

      // Count members for each ministry
      const memberCountMap = memberCounts?.reduce<Record<number, number>>((acc, curr) => {
        acc[curr.ministry_id] = (acc[curr.ministry_id] || 0) + 1;
        return acc;
      }, {}) || {};

      // Fetch user's memberships
      const { data: membershipData, error: membershipError } = await supabase
        .from("ministry_members")
        .select("ministry_id")
        .eq("user_id", user.id);
        
      if (membershipError) {
        console.error("Error fetching ministry memberships:", membershipError);
      }
      
      const memberMinistryIds = membershipData?.map(item => item.ministry_id) || [];
      
      // Process the ministries data with member counts and membership status
      const processedMinistries = ministriesData.map(ministry => ({
        ...ministry,
        member_count: memberCountMap[ministry.id] || 0,
        is_member: memberMinistryIds.includes(ministry.id)
      }));

      // Store ministries
      setMinistries(processedMinistries || []);

    } catch (error) {
      console.error("Error in data fetch:", error);
      setError(error instanceof Error ? error : new Error("Unknown error"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Navigate to ministry detail screen
  const navigateToMinistryDetail = (ministryId: number) => {
    navigation.navigate('ministryDetail', { ministryId });
  };
  
  // Navigate to home
  const navigateToHome = () => {
    navigation.navigate('home');
  };
  
  // Join a ministry
  const handleJoinMinistry = async (ministryId: number): Promise<void> => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError);
        throw userError;
      }

      if (!user) {
        Alert.alert("Error", "You must be logged in to join a ministry");
        return;
      }

      const { error } = await supabase
        .from("ministry_members")
        .insert({
          ministry_id: ministryId,
          user_id: user.id,
          church_id: 1, // Using default church ID
          joined_at: new Date().toISOString(),
          member_status: "member"
        });

      if (error) {
        console.error("Error joining ministry:", error);
        throw error;
      }

      // Refresh the ministries list
      fetchData();
      Alert.alert("Success", "You have joined the ministry!");

    } catch (error) {
      console.error("Error joining ministry:", error);
      Alert.alert("Error", "Could not join the ministry. Please try again.");
    }
  };

  // Leave a ministry
  const handleLeaveMinistry = async (ministryId: number): Promise<void> => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError);
        throw userError;
      }

      if (!user) {
        Alert.alert("Error", "You must be logged in to leave a ministry");
        return;
      }

      const { error } = await supabase
        .from("ministry_members")
        .delete()
        .eq("ministry_id", ministryId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error leaving ministry:", error);
        throw error;
      }

      // Refresh the ministries list
      fetchData();
      Alert.alert("Success", "You have left the ministry.");

    } catch (error) {
      console.error("Error leaving ministry:", error);
      Alert.alert("Error", "Could not leave the ministry. Please try again.");
    }
  };

  // Add a new ministry and add creator as a member
  const handleAddMinistry = async () => {
    if (newMinistryName.trim() === "") {
      Alert.alert("Error", "Ministry name is required");
      return;
    }

    try {
      setLoading(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError);
        throw userError;
      }

      if (!user) {
        console.error("No user logged in");
        throw new Error("No user logged in");
      }
      
      // Create new ministry
      const newMinistry = {
        name: newMinistryName,
        description: newMinistryDescription,
        church_id: 1, // Using a default church_id since we're working with a single table
        created_at: new Date().toISOString()
      };

      const { data: ministryData, error } = await supabase
        .from("ministries")
        .insert(newMinistry)
        .select();

      if (error) {
        console.error("Error adding ministry:", error);
        throw error;
      }

      if (!ministryData || ministryData.length === 0) {
        throw new Error("Ministry was created but no data was returned");
      }

      // Add creator as a member with "leader" status
      const newMember = {
        ministry_id: ministryData[0].id,
        user_id: user.id,
        church_id: 1, // Using the same default church_id
        joined_at: new Date().toISOString(),
        member_status: "leader" // Set the creator as the leader
      };

      const { error: memberError } = await supabase
        .from("ministry_members")
        .insert(newMember);

      if (memberError) {
        console.error("Error adding creator as member:", memberError);
        // Don't throw here, as the ministry was already created
        Alert.alert(
          "Partial Success", 
          "Ministry was created but there was an error adding you as a member."
        );
      }

      // Reset form and close modal
      setNewMinistryName("");
      setNewMinistryDescription("");
      setIsModalVisible(false);

      // Refresh ministries list
      fetchData();
      
      if (!memberError) {
        Alert.alert("Success", "Ministry created and you were added as the leader!");
      }

    } catch (error) {
      console.error("Error adding ministry:", error);
      Alert.alert("Error", "Failed to add ministry. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Delete a ministry
  const handleDeleteMinistry = async (ministryId: number) => {
    Alert.alert(
      "Delete Ministry",
      "Are you sure you want to delete this ministry?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              
              const { error } = await supabase
                .from("ministries")
                .delete()
                .eq("id", ministryId);

              if (error) {
                console.error("Error deleting ministry:", error);
                throw error;
              }

              // Refresh ministries list
              fetchData();
              Alert.alert("Success", "Ministry deleted successfully!");

            } catch (error) {
              console.error("Error deleting ministry:", error);
              Alert.alert("Error", "Failed to delete ministry. Please try again.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Handle pull to refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Focus search input
  const focusSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Clear search input
  const clearSearch = () => {
    setSearchText("");
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

  // Render ministry avatar
  const renderMinistryAvatar = (ministry: Ministry) => {
    if (ministry.image_url) {
      return (
        <Image 
          source={{ uri: ministry.image_url }} 
          style={styles.ministryAvatarImage} 
        />
      );
    }
    
    // Placeholder with initials
    const avatarColor = getAvatarColor(ministry.name);
    const initials = getInitials(ministry.name);
    
    return (
      <View 
        style={[
          styles.ministryAvatarPlaceholder, 
          { backgroundColor: avatarColor }
        ]}
      >
        <Text style={styles.ministryAvatarInitials}>{initials}</Text>
      </View>
    );
  };

  // Render ministry item
  const renderMinistryItem = ({ item }: { item: Ministry }) => {
    return (
      <TouchableOpacity 
        style={styles.ministryItem}
        onPress={() => navigateToMinistryDetail(item.id)}
        activeOpacity={0.7}
        onLongPress={() => {
          if (item.is_member) {
            Alert.alert(
              "Leave Ministry",
              `Are you sure you want to leave ${item.name}?`,
              [
                { text: "Cancel", style: "cancel" },
                { 
                  text: "Leave", 
                  style: "destructive",
                  onPress: () => handleLeaveMinistry(item.id)
                }
              ]
            );
          } else {
            handleJoinMinistry(item.id);
          }
        }}
      >
        <View style={styles.ministryAvatar}>
          {renderMinistryAvatar(item)}
        </View>
        
        <View style={styles.ministryContent}>
          <View style={styles.ministryHeaderRow}>
            <Text style={styles.ministryName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.ministryTimestamp}>
              {formatTime(item.created_at)}
            </Text>
          </View>
          
          <View style={styles.ministryDescriptionRow}>
            <Text style={styles.ministryDescription} numberOfLines={1}>
              {item.description || 'No description'}
            </Text>
            
            <View style={styles.ministryMeta}>
              {(item.member_count ?? 0) > 0 && (
                <View style={styles.memberCountBadge}>
                  <Text style={styles.memberCountText}>
                    {item.member_count}
                  </Text>
                </View>
              )}
              
              {item.is_member && (
                <View style={styles.memberStatusBadge}>
                  <Text style={styles.memberStatusText}>Member</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#075E54" />
        <Text style={styles.loadingText}>Loading ministries...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={40} color="#FF006E" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>
            {error?.message || "Could not load ministries information"}
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={navigateToHome}
          >
            <Text style={styles.errorButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Floating header effect */}
      <Animated.View
        style={[
          styles.floatingHeader,
          {
            opacity: headerOpacity,
            elevation: headerElevation,
            shadowOpacity: headerOpacity,
          },
        ]}
      >
        <BlurView intensity={85} tint="light" style={styles.blurView} />
      </Animated.View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={navigateToHome}>
            <Ionicons name="arrow-back" size={24} color="#075E54" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ministries</Text>
        </View>
      </View>
      
      {/* Search Box */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search ministries..."
            placeholderTextColor="#94A3B8"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Empty state */}
      {!loading && filteredMinistries.length === 0 && (
        <View style={styles.emptyStateContainer}>
          <FontAwesome5 name="church" size={64} color="#C0C0C0" />
          <Text style={styles.emptyStateTitle}>No Ministries Found</Text>
          <Text style={styles.emptyStateSubtitle}>
            {searchText 
              ? `No results found for "${searchText}"`
              : "Add a ministry to get started"
            }
          </Text>
          
          {!searchText && isAdmin && (
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={() => setIsModalVisible(true)}
            >
              <Text style={styles.emptyStateButtonText}>Add New Ministry</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Ministries List */}
      <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
        {!loading && filteredMinistries.length > 0 && (
          <FlatList
            style={styles.mainList}
            data={filteredMinistries}
            renderItem={renderMinistryItem}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            ListFooterComponent={() => <View style={styles.listFooter} />}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        )}
      </Animated.View>
      
      {/* Add Ministry Button (FAB) - Only visible for admins */}
      {isAdmin && (
        <TouchableOpacity 
          style={styles.addMinistryButton}
          onPress={() => setIsModalVisible(true)}
          activeOpacity={0.9}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Modal for adding ministry */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Ministry</Text>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputContainer}>
              <Text style={styles.modalInputLabel}>Ministry Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter ministry name"
                placeholderTextColor="#94A3B8"
                value={newMinistryName}
                onChangeText={setNewMinistryName}
                autoFocus
              />
            </View>

            <View style={styles.modalInputContainer}>
              <Text style={styles.modalInputLabel}>Description</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                placeholder="Enter ministry description"
                placeholderTextColor="#94A3B8"
                value={newMinistryDescription}
                onChangeText={setNewMinistryDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleAddMinistry}
              >
                <Text style={styles.modalSaveButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 85 : 65,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(203, 213, 225, 0.5)",
    backgroundColor: "#FFFFFF",
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    paddingTop: Platform.OS === "ios" ? 30 : 12,
    backgroundColor: "#FFFFFF",
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  // Search styles
  searchContainer: {
    padding: 8,
    backgroundColor: "#FFFFFF",
    zIndex: 5,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: "#1E293B",
    fontSize: 16,
  },
  // Empty state
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyStateButton: {
    backgroundColor: '#075E54',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginTop: 24,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Main list styles
  mainList: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 8,
  },
  // Ministry item styles
  ministryItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  ministryAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  ministryAvatarImage: {
    width: 48,
    height: 48,
  },
  ministryAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#075E54",
    justifyContent: "center",
    alignItems: "center",
  },
  ministryAvatarInitials: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ministryContent: {
    flex: 1,
    justifyContent: "center",
  },
  ministryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  ministryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    flex: 1,
  },
  ministryTimestamp: {
    fontSize: 12,
    color: "#64748B",
  },
  ministryDescriptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ministryDescription: {
    fontSize: 14,
    color: "#64748B",
    flex: 1,
  },
  ministryMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  memberCountBadge: {
    backgroundColor: "#25D366", // WhatsApp light green
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  memberCountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  memberStatusBadge: {
    backgroundColor: "#075E54", // WhatsApp green
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  memberStatusText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "500",
  },
  // Add button
  addMinistryButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#25D366", // WhatsApp light green
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  listFooter: {
    height: 80, // Space for FAB
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  modalInputContainer: {
    marginBottom: 20,
  },
  modalInputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    fontSize: 16,
    color: "#1E293B",
  },
  textArea: {
    height: 100,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
  },
  modalSaveButton: {
    backgroundColor: "#075E54", // WhatsApp green
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748B",
  },
  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: "#075E54",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});