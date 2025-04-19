import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet,
  Animated,
  ImageBackground 
} from 'react-native';
import { Feather } from "@expo/vector-icons";
import { IntentionCard } from '../components/IntentionCard';
import { FilterDropdown } from '../components/FilterDropdown';
import { FAB } from '../components/FAB'; 
import { BackgroundLayout } from '../components/BackgroundLayout';
import { supabase } from '../../supabaseClient';

export default function CommunityFeedPage({ navigation }) {
  const [intentions, setIntentions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [intentionsFilter, setIntentionsFilter] = useState("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [notification, setNotification] = useState(null);
  const [expandedCommentId, setExpandedCommentId] = useState(null);
  
  // Animation refs
  const likeScaleAnimations = useRef(new Map());
  const likeOpacityAnimations = useRef(new Map());
  const fabMenuAnimation = useRef(new Animated.Value(0)).current;
  const filterDropdownAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    fetchIntentions();
    getCurrentUser();
  }, [intentionsFilter]);
  
  useEffect(() => {
    // Animation for filter dropdown
    Animated.timing(filterDropdownAnim, {
      toValue: showFilterDropdown ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showFilterDropdown]);

  const getCurrentUser = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setCurrentUserId(data.user.id);
    } catch (error) {
      console.error("Error getting current user:", error);
    }
  };

  const fetchIntentions = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('intentions')
        .select(`
          *,
          user:user_id (
            id,
            first_name,
            last_name,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      // Add filters based on intentionsFilter
      if (intentionsFilter === "mine") {
        query = query.eq('user_id', user.id);
      } else if (intentionsFilter === "friends") {
        // This would require more complex logic to filter by friends
        // Simplified for this example
      }

      const { data, error } = await query;

      if (error) throw error;
      setIntentions(data || []);
    } catch (error) {
      console.error('Error fetching intentions:', error);
      setNotification({
        message: 'Failed to fetch intentions',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getLikeScaleAnimation = (intentionId) => {
    if (!likeScaleAnimations.current.has(intentionId)) {
      likeScaleAnimations.current.set(intentionId, new Animated.Value(1));
    }
    return likeScaleAnimations.current.get(intentionId);
  };

  const getLikeOpacityAnimation = (intentionId) => {
    if (!likeOpacityAnimations.current.has(intentionId)) {
      likeOpacityAnimations.current.set(intentionId, new Animated.Value(0));
    }
    return likeOpacityAnimations.current.get(intentionId);
  };

  const handleLikeIntention = async (intentionId, isLiked) => {
    try {
      // Animation for like button
      const scaleAnim = getLikeScaleAnimation(intentionId);
      const opacityAnim = getLikeOpacityAnimation(intentionId);
      
      if (!isLiked) {
        Animated.parallel([
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 0.8,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
              toValue: 1.5,
              friction: 3,
              tension: 40,
              useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
              toValue: 1,
              friction: 3,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(opacityAnim, {
              toValue: 0.6,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      }
      
      // Database operations for liking/unliking
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      if (isLiked) {
        await supabase
          .from("likes")
          .delete()
          .eq("likeable_id", intentionId)
          .eq("likeable_type", "intentions")
          .eq("user_id", user.id);
      } else {
        await supabase.from("likes").insert({
          user_id: user.id,
          likeable_id: intentionId,
          likeable_type: "intentions",
        });
      }
      
      // Update the intentions state
      setIntentions(
        intentions.map((intention) =>
          intention.id === intentionId
            ? {
                ...intention,
                is_liked: !isLiked,
                likes_count: isLiked
                  ? (intention.likes_count || 1) - 1
                  : (intention.likes_count || 0) + 1,
              }
            : intention
        )
      );
    } catch (error) {
      console.error("Error toggling like:", error);
      setNotification({
        message: `Error ${isLiked ? "unliking" : "liking"} intention`,
        type: "error"
      });
    }
  };

  const handleToggleComments = (intentionId) => {
    // Navigate to detailed intention view with comments
    navigation.navigate('IntentionDetail', { intentionId });
  };

  const toggleFabMenu = () => {
    Animated.spring(fabMenuAnimation, {
      toValue: showFabMenu ? 0 : 1,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
    setShowFabMenu(!showFabMenu);
  };

  return (
    <BackgroundLayout>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerTitleContainer}
          onPress={() => setShowFilterDropdown(!showFilterDropdown)}
        >
          <Text style={styles.headerTitle}>
            {intentionsFilter === "mine" ? "My Posts" : 
             intentionsFilter === "friends" ? "Friends" :
             intentionsFilter === "groups" ? "Groups" : "Community"}
          </Text>
          <View style={styles.headerFilterIndicator}>
            <Feather
              name={showFilterDropdown ? "chevron-up" : "chevron-down"}
              size={18}
              color="#FAC898"
            />
          </View>
        </TouchableOpacity>
      </View>
      
      {/* Filter dropdown with animation */}
      <Animated.View
        pointerEvents={showFilterDropdown ? "auto" : "none"}
        style={[
          styles.filterDropdown,
          {
            opacity: filterDropdownAnim,
            transform: [
              {
                translateY: filterDropdownAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <FilterDropdown 
          currentFilter={intentionsFilter}
          onSelectFilter={setIntentionsFilter}
        />
      </Animated.View>
      
      <FlatList
        data={intentions}
        renderItem={({ item }) => (
          <IntentionCard
            item={item}
            currentUserId={currentUserId}
            onLike={handleLikeIntention}
            onComment={handleToggleComments}
            onEdit={() => navigation.navigate('EditIntention', { intention: item })}
            likeScaleAnim={getLikeScaleAnimation(item.id)}
            likeOpacityAnim={getLikeOpacityAnimation(item.id)}
            isCommentsExpanded={expandedCommentId === item.id}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.intentionList}
        refreshing={isLoading}
        onRefresh={fetchIntentions}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {intentionsFilter === "mine"
                ? "No intentions yet."
                : intentionsFilter === "friends"
                  ? "No friend intentions."
                  : intentionsFilter === "groups"
                    ? "No group intentions."
                    : "No posts to show."}
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => navigation.navigate('CreateIntention')}
            >
              <Text style={styles.emptyStateButtonText}>Create New Intention</Text>
            </TouchableOpacity>
          </View>
        }
      />
      
      {/* FAB with menu */}
      <TouchableOpacity style={styles.fab} onPress={toggleFabMenu}>
        <Animated.View style={{ 
          transform: [{ 
            rotate: fabMenuAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: ["0deg", "45deg"],
            })
          }] 
        }}>
          <Feather name="plus" size={26} color="#FFFFFF" />
        </Animated.View>
      </TouchableOpacity>
      
      {showFabMenu && (
        <Animated.View
          style={[
            styles.fabMenu,
            {
              opacity: fabMenuAnimation,
              transform: [
                {
                  translateY: fabMenuAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              setShowFabMenu(false);
              navigation.navigate('CreateIntention');
            }}
          >
            <Feather name="edit" size={22} color="#FAC898" />
            <Text style={styles.fabMenuItemText}>Add Intention</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.fabMenuItem} 
            onPress={() => {
              setShowFabMenu(false);
              navigation.navigate('Friends');
            }}
          >
            <Feather name="users" size={22} color="#FAC898" />
            <Text style={styles.fabMenuItemText}>Friends</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.fabMenuItem} 
            onPress={() => {
              setShowFabMenu(false);
              navigation.navigate('Groups');
            }}
          >
            <Feather name="users" size={22} color="#FAC898" />
            <Text style={styles.fabMenuItemText}>Groups</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
      
      {notification && (
        <View
          style={[
            styles.notification,
            notification.type === "error" ? styles.errorNotification : styles.successNotification,
          ]}
        >
          <Text style={styles.notificationText}>{notification.message}</Text>
        </View>
      )}
    </BackgroundLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 15,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(250, 200, 152, 0.1)",
    zIndex: 10,
  },
  headerTitleContainer: { 
    flexDirection: "row", 
    alignItems: "center" 
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: "300",
    color: "#FFFFFF",
    letterSpacing: 1,
    marginRight: 10,
  },
  headerFilterIndicator: { 
    alignItems: "center", 
    justifyContent: "center" 
  },
  filterDropdown: {
    position: "absolute",
    top: 70,
    left: 15,
    right: 15,
    backgroundColor: "rgba(41, 37, 36, 0.95)",
    borderRadius: 10,
    padding: 5,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  intentionList: { 
    padding: 15, 
    paddingBottom: 100 
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    marginTop: 20,
  },
  emptyStateText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 15,
  },
  emptyStateButton: {
    backgroundColor: "rgba(250, 200, 152, 0.2)",
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(250, 200, 152, 0.4)",
  },
  emptyStateButtonText: { 
    color: "#FFFFFF", 
    fontWeight: "600" 
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(233, 150, 122, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 1000,
  },
  fabMenu: {
    position: "absolute",
    right: 20,
    bottom: 170,
    borderRadius: 15,
    backgroundColor: "rgba(41, 37, 36, 0.95)",
    padding: 10,
    paddingVertical: 15,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    width: 180,
  },
  fabMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  fabMenuItemText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginLeft: 10,
    fontWeight: "500",
  },
  notification: {
    position: "absolute",
    top: 50,
    left: 15,
    right: 15,
    padding: 12,
    borderRadius: 15,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 1,
  },
  errorNotification: {
    backgroundColor: "rgba(220, 38, 38, 0.2)",
    borderColor: "rgba(220, 38, 38, 0.4)",
  },
  successNotification: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderColor: "rgba(16, 185, 129, 0.4)",
  },
  notificationText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});