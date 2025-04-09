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
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
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

// Interface definitions based on Supabase schema
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

interface MinistryMember {
  id: number;
  ministry_id: number;
  user_id: string;
  church_id: number;
  joined_at: string;
  member_status: string;
}

interface ChurchMember {
  id: number;
  church_id: number;
  user_id: string;
  role: string;
  joined_at: string;
}

// Type definition for navigation
type RootStackParamList = {
  home: { refresh?: boolean };
  ministryDetail: { ministryId: number };
  createMinistry: { selectedPresetId?: string };
  CreateMinistryScreen: { selectedPresetId?: string }; // Previously added for backward compatibility
  CreateMinistryGroupScreen: { selectedPresetId?: string }; // Added new correct screen route
};

// Define admin roles - UPDATED to only include admin and owner
const ADMIN_ROLES = ['admin', 'owner'];

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
  const route = useRoute<RouteProp<RootStackParamList, 'home'>>();
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [filteredMinistries, setFilteredMinistries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchText, setSearchText] = useState<string>("");
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [userChurchId, setUserChurchId] = useState<number | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Ref for search input
  const searchInputRef = useRef<TextInput>(null);

  // Check for refresh param
  useEffect(() => {
    // If this screen was navigated to with a refresh parameter, refresh the data
    if (route.params?.refresh) {
      fetchData();
    }
  }, [route.params]);

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

      // Check if user is a church member and get their church_id
      const { data: churchMember, error: churchMemberError } = await supabase
        .from("church_members")
        .select("church_id, role")
        .eq("user_id", user.id)
        .single();
        
      if (churchMemberError) {
        console.error("Error fetching church member data:", churchMemberError);
        // Don't throw here, as we can still show ministries even if role check fails
        setIsAdmin(false);
      } else {
        // Set user's church ID for later use
        setUserChurchId(churchMember?.church_id);
        
        // Check if user's role is in the admin roles list
        setIsAdmin(churchMember?.role && ADMIN_ROLES.includes(churchMember.role.toLowerCase()));
      }

      // Fetch ministries that belong to the user's church
      const { data: ministriesData, error: ministriesError } = await supabase
        .from("ministries")
        .select("*")
        .eq("church_id", churchMember?.church_id || 0)
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
    navigation.navigate({ name: 'home', params: { refresh: false } });
  };
  
  // Navigate to create ministry screen
  const navigateToCreateMinistry = () => {
    try {
      // Update primary navigation target to CreateMinistryGroupScreen
      navigation.navigate('CreateMinistryGroupScreen', {});
    } catch (error) {
      // If that route doesn't exist, try the older routes as fallbacks
      console.log("Falling back to alternate route names");
      try {
        navigation.navigate('CreateMinistryScreen', {});
      } catch (secondError) {
        navigation.navigate('createMinistry', { selectedPresetId: undefined });
      }
    }
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

      if (!userChurchId) {
        Alert.alert("Error", "You must be a member of a church to join a ministry");
        return;
      }

      const { error } = await supabase
        .from("ministry_members")
        .insert({
          ministry_id: ministryId,
          user_id: user.id,
          church_id: userChurchId,
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
              
              // First, delete all ministry members
              const { error: membersError } = await supabase
                .from("ministry_members")
                .delete()
                .eq("ministry_id", ministryId);
                
              if (membersError) {
                console.error("Error deleting ministry members:", membersError);
                throw membersError;
              }
              
              // Then, delete any ministry messages
              const { error: messagesError } = await supabase
                .from("ministry_messages")
                .delete()
                .eq("ministry_id", ministryId);
                
              if (messagesError) {
                console.error("Error deleting ministry messages:", messagesError);
                throw messagesError;
              }
              
              // Finally, delete the ministry itself
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
        <ActivityIndicator size="large" color="#2196F3" />
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
            <Ionicons name="arrow-back" size={24} color="#2196F3" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ministries</Text>
        </View>
        
        {/* Create Ministry Button - now only visible to admins */}
        {isAdmin && (
          <TouchableOpacity 
            style={styles.createMinistryButton}
            onPress={navigateToCreateMinistry}
          >
            <MaterialIcons name="add-circle" size={24} color="#2196F3" />
            <Text style={styles.createButtonText}>New</Text>
          </TouchableOpacity>
        )}
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
              onPress={navigateToCreateMinistry}
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
          onPress={navigateToCreateMinistry}
          activeOpacity={0.9}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}
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
    backgroundColor: '#2196F3',
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
  // Create button in header
  createMinistryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#2196F3",
  },
  createButtonText: {
    color: "#2196F3",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4,
  },
  // Add button
  addMinistryButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#2196F3", // Material Blue
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
    backgroundColor: "#2196F3",
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