import React, { useState, useEffect } from "react";
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
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { supabase } from "../../supabaseClient";
import {
  Ionicons,
  MaterialIcons,
  Feather,
  AntDesign,
  FontAwesome5,
} from "@expo/vector-icons";
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from "expo-linear-gradient";

// Ministry group interface
interface MinistryGroup {
  id: number;
  name: string;
  description: string;
  image: string;
  last_active: string;
  notification_count: number;
  member_count: number;
  is_member: boolean;
  status_message?: string;
}

// Route params interface
interface RouteParams {
  churchId?: number;
}

// Add type definition for navigation
type RootStackParamList = {
  ministries: undefined;
  ministryChat: { groupId: number };
  createMinistryGroup: undefined;
  // ... other screen types ...
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

// Format time to display like WhatsApp
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

export default function MinistryGroupsScreen(): JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const [joinedGroups, setJoinedGroups] = useState<MinistryGroup[]>([]);
  const [availableGroups, setAvailableGroups] = useState<MinistryGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>("");
  const [churchId, setChurchId] = useState<number | null>(null);

  // Fetch groups data
  useEffect(() => {
    async function fetchGroups(): Promise<void> {
      try {
        setLoading(true);
        
        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("Error getting user:", userError);
          throw userError;
        }

        if (!user) {
          console.error("No user logged in");
          throw new Error("No user logged in");
        }

        // Get church ID from route params or from user's membership
        const params = route.params as RouteParams;
        let churchIdToUse = params?.churchId;

        if (!churchIdToUse) {
          // Fetch from membership
          const { data: memberData, error: memberError } = await supabase
            .from("church_members")
            .select("church_id")
            .eq("user_id", user.id)
            .single();

          if (memberError) {
            console.error("Error fetching membership:", memberError);
            throw memberError;
          }

          churchIdToUse = memberData.church_id;
        }

        setChurchId(churchIdToUse ?? null);
        
        // Fetch groups the user is a member of
        const { data: membershipData, error: membershipError } = await supabase
          .from("ministry_group_members")
          .select("ministry_group_id")
          .eq("user_id", user.id);
          
        if (membershipError) {
          console.error("Error fetching group memberships:", membershipError);
          throw membershipError;
        }
        
        const memberGroupIds = membershipData.map(item => item.ministry_group_id);
        
        // Fetch all ministry groups for this church
        const { data: groupsData, error: groupsError } = await supabase
          .from("ministry_groups")
          .select("*")
          .eq("church_id", churchIdToUse);
          
        if (groupsError) {
          console.error("Error fetching ministry groups:", groupsError);
          throw groupsError;
        }
        
        // Fetch notification counts
        // This would be a real implementation with your notification system
        const notificationCounts = {
          1: 5, // Group ID 1 has 5 notifications
          2: 2, // Group ID 2 has 2 notifications
          // Add more as needed
        };
        
        // Process groups data
        const userGroups: MinistryGroup[] = [];
        const otherGroups: MinistryGroup[] = [];
        
        groupsData.forEach(group => {
          const processedGroup: MinistryGroup = {
            id: group.id,
            name: group.name,
            description: group.description,
            image: group.image || "",
            last_active: group.last_active || new Date().toISOString(),
            notification_count: notificationCounts[group.id as keyof typeof notificationCounts] || 0,
            member_count: group.member_count || 0,
            is_member: memberGroupIds.includes(group.id),
            status_message: group.status_message || "",
          };
          
          if (processedGroup.is_member) {
            userGroups.push(processedGroup);
          } else {
            otherGroups.push(processedGroup);
          }
        });
        
        // Demo data if no groups exist
        if (userGroups.length === 0) {
          userGroups.push({
            id: 1,
            name: "Ministry Worship Team",
            description: "Worship team coordination",
            image: "",
            last_active: new Date().toISOString(),
            notification_count: 5,
            member_count: 15,
            is_member: true,
            status_message: "~ Pastor James added a new song",
          },
          {
            id: 2,
            name: "Ministry All Members",
            description: "General announcements",
            image: "",
            last_active: new Date().toISOString(),
            notification_count: 2,
            member_count: 120,
            is_member: true,
            status_message: "~ Sarah joined from the community",
          });
        }
        
        if (otherGroups.length === 0) {
          otherGroups.push({
            id: 3,
            name: "Ministry Youth Committee",
            description: "Youth activities planning",
            image: "",
            last_active: new Date().toISOString(),
            notification_count: 0,
            member_count: 42,
            is_member: false,
          },
          {
            id: 4,
            name: "Ministry Outreach Team",
            description: "Community service coordination",
            image: "",
            last_active: new Date().toISOString(),
            notification_count: 0,
            member_count: 35,
            is_member: false,
          },
          {
            id: 5,
            name: "Ministry Bible Study Group",
            description: "Weekly Bible study discussions",
            image: "",
            last_active: new Date().toISOString(),
            notification_count: 0,
            member_count: 29,
            is_member: false,
          });
        }
        
        setJoinedGroups(userGroups);
        setAvailableGroups(otherGroups);
      } catch (error) {
        console.error("Error fetching ministry groups:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchGroups();
  }, []);
  
  // Navigate back to ministries screen
  const navigateBack = () => {
    navigation.navigate('ministries');
  };
  
  // Navigate to a specific group chat
  const navigateToGroupChat = (groupId: number) => {
    navigation.navigate('ministryChat', { groupId });
  };
  
  // Navigate to create new group screen
  const navigateToCreateGroup = () => {
    navigation.navigate('createMinistryGroup');
  };
  
  // Render joined group item
  const renderJoinedGroupItem = ({ item }: { item: MinistryGroup }) => (
    <TouchableOpacity 
      style={styles.groupItem}
      onPress={() => navigateToGroupChat(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.groupAvatar}>
        {item.image ? (
          <Image 
            source={{ uri: item.image }} 
            style={styles.groupAvatarImage} 
          />
        ) : (
          <View style={styles.groupAvatarPlaceholder}>
            <FontAwesome5 name="church" size={22} color="#fff" />
          </View>
        )}
      </View>
      
      <View style={styles.groupContent}>
        <View style={styles.groupHeaderRow}>
          <Text style={styles.groupName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.groupTimestamp}>
            {formatTime(item.last_active)}
          </Text>
        </View>
        
        <View style={styles.groupDescriptionRow}>
          <Text style={styles.groupDescription} numberOfLines={1}>
            {item.status_message || item.description}
          </Text>
          
          {item.notification_count > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>
                {item.notification_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
  
  // Render available group item
  const renderAvailableGroupItem = ({ item }: { item: MinistryGroup }) => (
    <TouchableOpacity 
      style={styles.groupItem}
      onPress={() => navigateToGroupChat(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.groupAvatar}>
        {item.image ? (
          <Image 
            source={{ uri: item.image }} 
            style={styles.groupAvatarImage} 
          />
        ) : (
          <View style={styles.groupAvatarPlaceholder}>
            <FontAwesome5 name="church" size={22} color="#fff" />
          </View>
        )}
      </View>
      
      <View style={styles.groupContent}>
        <View style={styles.groupHeaderRow}>
          <Text style={styles.groupName} numberOfLines={1}>
            {item.name}
          </Text>
          <Feather name="chevron-right" size={20} color="#8696A0" />
        </View>
        
        <View style={styles.groupDescriptionRow}>
          <Text style={styles.groupMemberCount} numberOfLines={1}>
            {item.member_count} members
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121B22" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={navigateBack}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ministry Groups</Text>
        </View>
        
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {/* Announcements Banner - Similar to WhatsApp */}
      <TouchableOpacity style={styles.announcementsBanner} activeOpacity={0.8}>
        <View style={styles.announcementsIconContainer}>
          <Ionicons name="megaphone" size={24} color="#fff" />
        </View>
        
        <View style={styles.announcementsContent}>
          <Text style={styles.announcementsTitle}>Announcements</Text>
          <Text style={styles.announcementsDescription}>
            Welcome to the ministry community!
          </Text>
        </View>
        
        <Text style={styles.announcementsCount}>2/10/25</Text>
      </TouchableOpacity>
      
      {/* Search Box */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#8696A0" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search ministries..."
            placeholderTextColor="#8696A0"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>
      
      {/* Main Content */}
      <FlatList
        data={[] as MinistryGroup[]}
        renderItem={() => null}
        ListHeaderComponent={() => (
          <>
            {/* Groups you're in section */}
            {joinedGroups.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Groups you're in</Text>
                {joinedGroups.map((group) => (
                  <React.Fragment key={`joined-${group.id}`}>
                    {renderJoinedGroupItem({ item: group })}
                  </React.Fragment>
                ))}
              </>
            )}
            
            {/* Groups you can join section */}
            {availableGroups.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Groups you can join</Text>
                {availableGroups.map((group) => (
                  <React.Fragment key={`available-${group.id}`}>
                    {renderAvailableGroupItem({ item: group })}
                  </React.Fragment>
                ))}
              </>
            )}
          </>
        )}
        keyExtractor={(item) => item.id?.toString()}
      />
      
      {/* Add Group Button */}
      <TouchableOpacity 
        style={styles.addGroupButton}
        onPress={navigateToCreateGroup}
        activeOpacity={0.9}
      >
        <AntDesign name="plus" size={24} color="#fff" />
        <Text style={styles.addGroupButtonText}>Add group</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121B22",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1F2C34",
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
    color: "#fff",
  },
  menuButton: {
    padding: 4,
  },
  announcementsBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#1F2C34",
    borderBottomWidth: 1,
    borderBottomColor: "#263238",
  },
  announcementsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#075E54",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  announcementsContent: {
    flex: 1,
  },
  announcementsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  announcementsDescription: {
    fontSize: 14,
    color: "#8696A0",
  },
  announcementsCount: {
    fontSize: 12,
    color: "#8696A0",
  },
  searchContainer: {
    padding: 8,
    backgroundColor: "#1F2C34",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#323739",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: "#fff",
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#8696A0",
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  groupItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#128C7E",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  groupAvatarImage: {
    width: 48,
    height: 48,
  },
  groupAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#128C7E",
    justifyContent: "center",
    alignItems: "center",
  },
  groupContent: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#263238",
    paddingBottom: 12,
    justifyContent: "center",
  },
  groupHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  groupName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    flex: 1,
  },
  groupTimestamp: {
    fontSize: 12,
    color: "#8696A0",
  },
  groupDescriptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  groupDescription: {
    fontSize: 14,
    color: "#8696A0",
    flex: 1,
  },
  groupMemberCount: {
    fontSize: 14,
    color: "#8696A0",
  },
  notificationBadge: {
    backgroundColor: "#00A884",
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  notificationText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  addGroupButton: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00A884",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  addGroupButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});