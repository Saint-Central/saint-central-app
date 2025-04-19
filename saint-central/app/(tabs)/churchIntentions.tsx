import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Vibration,
  Animated,
  LayoutAnimation,
  UIManager,
  InputAccessoryView,
  Keyboard,
  Alert,
  RefreshControl,
  ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather, FontAwesome, FontAwesome5 } from "@expo/vector-icons";
import { supabase } from "../../supabaseClient";
import { LinearGradient } from "expo-linear-gradient";
import Constants from "expo-constants";

// Enable LayoutAnimation for Android
if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// Interface definitions
interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  created_at: string;
  email?: string;
}

interface Church {
  id: string;
  name: string;
  description: string;
  created_at: string;
  founded?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  role?: string;
  members_count?: number;
}

interface ChurchMember {
  id: string;
  church_id: string;
  user_id: string;
  role: string;
  hide_email: boolean;
  hide_name: boolean;
  hide_phone: boolean;
  created_at: string;
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    profile_image: string | null;
    phone_number: string | null;
  };
}

interface SupabaseChurchMember {
  id: string;
  church_id: string;
  user_id: string;
  role: string;
  hide_email: boolean;
  hide_name: boolean;
  hide_phone: boolean;
  created_at: string;
  users: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    profile_image: string | null;
    phone_number: string | null;
  } | null;
}

interface SupabaseUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_image: string | null;
  phone_number: string | null;
}

interface SupabaseResponse {
  id: string;
  role: string;
  user_id: string;
  hide_email: boolean;
  hide_name: boolean;
  hide_phone: boolean;
  created_at: string;
  users: SupabaseUser | null;
}

interface Group {
  id: string;
  name: string;
  description: string;
  created_at: string;
  created_by: string;
  church_id: string;
}

interface Intention {
  id: string;
  user_id: string;
  title: string;
  description: string;
  type: IntentionType;
  created_at: string;
  user: UserData;
  likes_count?: number | null;
  comments_count?: number | null;
  is_liked?: boolean;
  visibility: VisibilityType;
  selected_groups: string[];
  selected_friends: string[];
  selected_church: string;
  church?: Church;
}

interface NewIntention {
  title: string;
  description: string;
  type: IntentionType;
  visibility: VisibilityType;
  selected_groups: string[];
  selected_friends: string[];
  selected_church: string | null;
}

interface EditingIntention extends Intention {
  selected_groups: string[];
  selected_friends: string[];
}

interface DeleteModalState {
  isOpen: boolean;
  intentionId: string | null;
}

type IntentionType =
  | "prayer"
  | "praise"
  | "spiritual"
  | "family"
  | "health"
  | "work"
  | "personal"
  | "other";

type VisibilityType = "Church" | "Certain Groups" | "Just Me" | "Certain Members";

interface Notification {
  message: string;
  type: "error" | "success";
}

interface Comment {
  id: string;
  user_id: string;
  commentable_id: string;
  commentable_type: string;
  content: string;
  created_at: string;
  updated_at: string;
  user: UserData;
}

// Define the views/screens for navigation
type AppView = "home" | "churches" | "churchDetails" | "intentions";

// Helper: Convert the returned selected_groups field to a proper array
const parseSelectedGroups = (selected_groups: any): (number | string)[] => {
  if (Array.isArray(selected_groups)) {
    return selected_groups;
  } else if (typeof selected_groups === "string") {
    try {
      return JSON.parse(selected_groups);
    } catch (e) {
      return selected_groups
        .replace(/[\[\]]/g, "")
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");
    }
  }
  return [];
};

// Helper: Convert the returned selected_friends field to a proper array
const parseSelectedMembers = (selected_members: any): (number | string)[] => {
  if (Array.isArray(selected_members)) {
    return selected_members;
  } else if (typeof selected_members === "string") {
    try {
      return JSON.parse(selected_members);
    } catch (e) {
      return selected_members
        .replace(/[\[\]]/g, "")
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");
    }
  }
  return [];
};

// Define visibility options with icons
const visibilityOptions = [
  {
    label: "Church",
    icon: <FontAwesome5 name="church" size={16} color="#FFFFFF" />,
  },
  {
    label: "Certain Groups",
    icon: <Feather name="users" size={16} color="#FFFFFF" />,
  },
  {
    label: "Certain Members",
    icon: <Feather name="user-check" size={16} color="#FFFFFF" />,
  },
  { label: "Just Me", icon: <Feather name="user" size={16} color="#FFFFFF" /> },
];

// Separate IntentionCard component
interface IntentionCardProps {
  item: Intention;
  currentUserId: string;
  onLike: (intentionId: string, isLiked: boolean) => void;
  onComment: (intentionId: string) => void;
  onEdit: (intention: Intention) => void;
  onDelete: (intentionId: string) => void;
  likeScaleAnim: Animated.Value;
  likeOpacityAnim: Animated.Value;
  isCommentsExpanded: boolean;
  comments: Comment[];
  newComment: string;
  setNewComment: (text: string) => void;
  handleAddComment: (intentionId: string) => void;
  commentsLoading: boolean;
  userRole: string;
}

const IntentionCard: React.FC<IntentionCardProps> = ({
  item,
  currentUserId,
  onLike,
  onComment,
  onEdit,
  onDelete,
  likeScaleAnim,
  likeOpacityAnim,
  isCommentsExpanded,
  comments,
  newComment,
  setNewComment,
  handleAddComment,
  commentsLoading,
  userRole,
}) => {
  const renderCommentItem = ({ item: comment }: { item: Comment }) => (
    <View style={styles.commentItem}>
      <View style={styles.commentHeader}>
        <View style={styles.commentAvatar}>
          <Feather name="user" size={18} color="#4361EE" />
        </View>
        <View style={styles.commentUser}>
          <Text style={styles.commentUserName}>
            {comment.user.first_name} {comment.user.last_name}
          </Text>
          <Text style={styles.commentTime}>
            {new Date(comment.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            • {new Date(comment.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <Text style={styles.commentContent}>{comment.content}</Text>
    </View>
  );

  return (
    <View style={styles.intentionCard}>
      <LinearGradient
        colors={["rgba(58, 134, 255, 0.05)", "rgba(67, 97, 238, 0.1)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.intentionHeader}>
          <View style={styles.intentionAvatar}>
            <Feather name="user" size={18} color="#4361EE" />
          </View>
          <View style={styles.intentionHeaderText}>
            <Text style={styles.intentionAuthor}>
              {item.user.first_name} {item.user.last_name}
              {item.user_id === currentUserId && <Text style={styles.authorTag}> • You</Text>}
            </Text>
            <View style={styles.intentionMeta}>
              <View style={styles.intentionTypeTag}>
                {item.type === "prayer" ? (
                  <FontAwesome5 name="pray" size={12} color="#4361EE" />
                ) : item.type === "praise" ? (
                  <FontAwesome5 name="church" size={12} color="#4361EE" />
                ) : item.type === "spiritual" ? (
                  <FontAwesome name="star" size={12} color="#4361EE" />
                ) : item.type === "family" ? (
                  <Feather name="users" size={12} color="#4361EE" />
                ) : item.type === "health" ? (
                  <Feather name="heart" size={12} color="#4361EE" />
                ) : item.type === "work" ? (
                  <Feather name="briefcase" size={12} color="#4361EE" />
                ) : item.type === "personal" ? (
                  <Feather name="user" size={12} color="#4361EE" />
                ) : (
                  <FontAwesome5 name="pray" size={12} color="#4361EE" />
                )}
                <Text style={styles.intentionTypeText}>
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </Text>
              </View>
              <Text style={styles.intentionTime}>
                {new Date(item.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                • {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
            {item.church && (
              <View style={styles.churchTag}>
                <FontAwesome5 name="church" size={12} color="#4361EE" />
                <Text style={styles.churchTagText}>
                  {item.visibility === "Church" ? "Shared with: " : "Church: "}
                  {item.church.name}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.intentionContent}>
          <Text style={styles.intentionTitle}>{item.title}</Text>
          <Text style={styles.intentionDescription}>{item.description}</Text>
        </View>
        <View style={styles.intentionActions}>
          <TouchableOpacity
            style={[styles.intentionAction, item.is_liked && styles.intentionActionActive]}
            onPress={() => onLike(item.id, !!item.is_liked)}
          >
            <View style={styles.likeButtonContainer}>
              <Animated.View
                style={[
                  styles.likeRipple,
                  {
                    opacity: likeOpacityAnim,
                    transform: [{ scale: Animated.multiply(likeScaleAnim, 2) }],
                  },
                ]}
              />
              <Animated.View style={{ transform: [{ scale: likeScaleAnim }] }}>
                <FontAwesome
                  name={item.is_liked ? "heart" : "heart-o"}
                  size={18}
                  color={item.is_liked ? "#E9967A" : "#4361EE"}
                />
              </Animated.View>
            </View>
            <Text style={[styles.actionText, item.is_liked && styles.actionTextActive]}>
              {item.is_liked ? "Prayed" : "Pray"} {item.likes_count ? `(${item.likes_count})` : ""}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.intentionAction} onPress={() => onComment(item.id)}>
            <Feather name="message-circle" size={18} color="#4361EE" />
            <Text style={styles.actionText}>
              {isCommentsExpanded ? "Hide Comments" : "Comment"}{" "}
              {item.comments_count ? `(${item.comments_count})` : ""}
            </Text>
          </TouchableOpacity>
          {(item.user_id === currentUserId || userRole === "admin" || userRole === "pastor") && (
            <TouchableOpacity style={styles.intentionAction} onPress={() => onEdit(item)}>
              <Feather name="edit" size={18} color="#4361EE" />
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
          )}
          {(item.user_id === currentUserId || userRole === "admin" || userRole === "pastor") && (
            <TouchableOpacity style={styles.intentionAction} onPress={() => onDelete(item.id)}>
              <Feather name="trash-2" size={18} color="#E9967A" />
              <Text style={[styles.actionText, { color: "#E9967A" }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
        {isCommentsExpanded && (
          <View style={styles.commentsSection}>
            <View style={styles.commentsDivider} />
            <View style={styles.addCommentContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="rgba(67, 97, 238, 0.5)"
                value={newComment}
                onChangeText={setNewComment}
                multiline={true}
                inputAccessoryViewID="accessoryViewID"
              />
              <TouchableOpacity style={styles.sendButton} onPress={() => handleAddComment(item.id)}>
                <Feather name="send" size={22} color="#4361EE" />
              </TouchableOpacity>
            </View>
            {commentsLoading ? (
              <ActivityIndicator size="small" color="#4361EE" style={styles.commentsLoading} />
            ) : (
              <>
                {comments.length > 0 ? (
                  <FlatList
                    data={comments}
                    renderItem={renderCommentItem}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    contentContainerStyle={styles.commentsList}
                  />
                ) : (
                  <View style={styles.emptyComments}>
                    <Text style={styles.emptyCommentsText}>No comments yet.</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

export default function ChurchApp() {
  // Main app state
  const [currentView, setCurrentView] = useState<AppView>("home");
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [churches, setChurches] = useState<Church[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<Notification | null>(null);
  
  // Intentions screen state
  const [intentions, setIntentions] = useState<Intention[]>([]);
  const [intentionsFilter, setIntentionsFilter] = useState<string>("all");
  const [showIntentionModal, setShowIntentionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingIntention, setEditingIntention] = useState<EditingIntention | null>(null);
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    intentionId: null,
  });
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState<string>("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null);
  const [churchMembers, setChurchMembers] = useState<ChurchMember[]>([]);
  const [churchGroups, setChurchGroups] = useState<Group[]>([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showVisibilityDropdownNew, setShowVisibilityDropdownNew] = useState(false);
  const [showVisibilityDropdownEdit, setShowVisibilityDropdownEdit] = useState(false);
  const [createDescriptionFocused, setCreateDescriptionFocused] = useState(false);
  const [editDescriptionFocused, setEditDescriptionFocused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Animation related refs
  const filterDropdownAnim = useRef(new Animated.Value(0)).current;
  const likeScaleAnimations = useRef(new Map<string, Animated.Value>()).current;
  const likeOpacityAnimations = useRef(new Map<string, Animated.Value>()).current;
  
  // New intention state
  const [newIntention, setNewIntention] = useState<NewIntention>({
    title: "",
    description: "",
    type: "prayer",
    visibility: "Church",
    selected_groups: [],
    selected_friends: [],
    selected_church: null,
  });

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          setCurrentUserId(data.user.id);
          setUserData({
            id: data.user.id,
            first_name: data.user.user_metadata?.first_name || '',
            last_name: data.user.user_metadata?.last_name || '',
            created_at: data.user.created_at,
            email: data.user.email
          });
          
          // If a church is selected, get the user's role in that church
          if (selectedChurch) {
            const { data: memberData } = await supabase
              .from("church_members")
              .select("role")
              .eq("church_id", selectedChurch.id)
              .eq("user_id", data.user.id)
              .single();
            
            if (memberData) {
              setCurrentUserRole(memberData.role);
            }
          }
          
          // Fetch user's churches
          fetchUserChurches(data.user.id);
        }
      } catch (error) {
        console.error("Error getting current user:", error);
      }
    };
    
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    if (expandedCommentId) fetchComments(expandedCommentId);
  }, [expandedCommentId]);

  useEffect(() => {
    Animated.timing(filterDropdownAnim, {
      toValue: showFilterDropdown ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showFilterDropdown]);

  useEffect(() => {
    if (currentView === "intentions" && selectedChurch) {
      fetchIntentions();
      fetchChurchMembers();
      fetchChurchGroups();
    }
  }, [currentView, selectedChurch, intentionsFilter]);

  // When selecting a church, update related state
  useEffect(() => {
    if (selectedChurch) {
      setNewIntention({
        ...newIntention,
        selected_church: selectedChurch.id,
      });
    }
  }, [selectedChurch]);

  const fetchUserChurches = async (userId: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from("church_members")
        .select(`
          role,
          church_id,
          churches:church_id (
            id,
            name,
            description,
            created_at
          )
        `)
        .eq("user_id", userId);
        
      if (error) throw error;
      
      // Get member counts for each church
      const churchesWithCounts = await Promise.all(
        (data || []).map(async (item: any) => {
          const churchData = Array.isArray(item.churches) ? item.churches[0] : item.churches;
          
          if (!churchData) {
            console.warn(`No church data found for church_id: ${item.church_id}`);
            return null;
          }
          
          const { count } = await supabase
            .from("church_members")
            .select("*", { count: "exact", head: true })
            .eq("church_id", item.church_id);
            
          const church: Church = {
            id: item.church_id,
            name: churchData.name,
            description: churchData.description,
            created_at: churchData.created_at,
            role: item.role,
            members_count: count || 0
          };
          
          return church;
        })
      );
      
      // Filter out any null values and set the churches
      setChurches(churchesWithCounts.filter((church): church is Church => church !== null));
    } catch (error) {
      console.error("Error fetching churches:", error);
      setNotification({
        message: "Error fetching churches",
        type: "error",
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const fetchChurchDetails = async (churchId: string) => {
    try {
      setIsLoading(true);

      // Get church details
      const { data, error } = await supabase
        .from("churches")
        .select("*")
        .eq("id", churchId)
        .single();
        
      if (error) throw error;
      
      // Get member count
      const { count } = await supabase
        .from("church_members")
        .select("*", { count: "exact", head: true })
        .eq("church_id", churchId);
      
      // Get user's role in this church
      const { data: memberData } = await supabase
        .from("church_members")
        .select("role")
        .eq("church_id", churchId)
        .eq("user_id", currentUserId)
        .single();
      
      if (memberData) {
        setCurrentUserRole(memberData.role);
      }
        
      setSelectedChurch({
        ...data,
        members_count: count || 0,
        role: memberData?.role,
      });
    } catch (error) {
      console.error("Error fetching church details:", error);
      setNotification({
        message: "Error fetching church details",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChurchMembers = async () => {
    try {
      if (!selectedChurch) return;

      const { data, error } = await supabase
        .from("church_members")
        .select(`
          id,
          role,
          user_id,
          hide_email,
          hide_name,
          hide_phone,
          created_at,
          users (
            id,
            email,
            first_name,
            last_name,
            profile_image,
            phone_number
          )
        `)
        .eq('church_id', selectedChurch.id);

      if (error) throw error;

      if (data) {
        const typedData = data as unknown as SupabaseResponse[];
        const mappedMembers: ChurchMember[] = typedData.map(item => ({
          id: item.id,
          church_id: selectedChurch.id,
          role: item.role,
          user_id: item.user_id,
          hide_email: item.hide_email,
          hide_name: item.hide_name,
          hide_phone: item.hide_phone,
          created_at: item.created_at,
          user: item.users ? {
            id: item.users.id,
            email: item.users.email,
            first_name: item.users.first_name,
            last_name: item.users.last_name,
            profile_image: item.users.profile_image,
            phone_number: item.users.phone_number
          } : undefined
        }));
        setChurchMembers(mappedMembers);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchChurchGroups = async () => {
    try {
      if (!selectedChurch) return;
      
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("church_id", selectedChurch.id);
      
      if (error) throw error;
      setChurchGroups(data || []);
    } catch (error) {
      console.error("Error fetching church groups:", error);
    }
  };

  const fetchIntentions = async () => {
    try {
      if (!selectedChurch) return;
      
      setIsLoading(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");
      
      // Base query for intentions
      let query = supabase
        .from("intentions")
        .select(`
          *,
          user:user_id (id, first_name, last_name, created_at),
          church:selected_church (id, name, description, created_at),
          visibility,
          selected_groups,
          selected_friends
        `)
        .eq("selected_church", selectedChurch.id)
        .order("created_at", { ascending: false });
      
      // Apply filter based on intentionsFilter
      if (intentionsFilter === "mine") {
        query = query.eq("user_id", user.id);
      } else if (intentionsFilter === "prayers") {
        query = query.eq("type", "prayer");
      } else if (intentionsFilter === "praise") {
        query = query.eq("type", "praise");
      }
      
      const { data: allIntentions, error } = await query;
      if (error) throw error;
      
      // Filter intentions based on visibility
      const filteredIntentions = await Promise.all((allIntentions || []).filter(async (intention) => {
        // Current user's own intentions always visible
        if (intention.user_id === user.id) {
          return true;
        }
        
        // Admin or pastor sees all intentions
        if (currentUserRole === "admin" || currentUserRole === "pastor") {
          return true;
        }
        
        // Check visibility settings
        switch (intention.visibility) {
          case "Just Me":
            return intention.user_id === user.id;
            
          case "Church":
            return true; // Already filtered by selected_church
            
          case "Certain Groups":
            const selectedGroups = parseSelectedGroups(intention.selected_groups);
            
            // Check if user is in one of the selected groups
            for (const groupId of selectedGroups) {
              const { data: groupMember } = await supabase
                .from("group_members")
                .select("id")
                .eq("group_id", groupId)
                .eq("user_id", user.id)
                .maybeSingle();
                
              if (groupMember) return true;
            }
            return false;
            
          case "Certain Members":
            const selectedMembers = parseSelectedMembers(intention.selected_friends);
            return selectedMembers.includes(user.id);
            
          default:
            return false;
        }
      }));
      
      // Get like and comment counts, check if user has liked each intention
      const intentionsWithCounts = await Promise.all(
        filteredIntentions.map(async (intention) => {
          const { count: likesCount } = await supabase
            .from("likes")
            .select("*", { count: "exact", head: false })
            .eq("likeable_id", intention.id)
            .eq("likeable_type", "intentions");
            
          const { count: commentsCount } = await supabase
            .from("comments")
            .select("*", { count: "exact", head: false })
            .eq("commentable_id", intention.id)
            .eq("commentable_type", "intentions");
            
          const { data: userLike } = await supabase
            .from("likes")
            .select("id")
            .eq("likeable_id", intention.id)
            .eq("likeable_type", "intentions")
            .eq("user_id", user.id)
            .maybeSingle();

    return {
            ...intention,
            likes_count: likesCount,
            comments_count: commentsCount,
            is_liked: !!userLike,
            selected_groups: parseSelectedGroups(intention.selected_groups),
            selected_friends: parseSelectedMembers(intention.selected_friends),
          };
        })
      );
      
      setIntentions(intentionsWithCounts || []);
    } catch (error) {
      console.error("Error fetching intentions:", error);
      setNotification({
        message: "Error fetching intentions: " + (error instanceof Error ? error.message : String(error)),
        type: "error",
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const fetchComments = async (intentionId: string) => {
    try {
      setCommentsLoading(true);
      const { data, error } = await supabase
        .from("comments")
        .select(`*, user:user_id(*)`)
        .eq("commentable_id", intentionId)
        .eq("commentable_type", "intentions")
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
      setComments([]);
      setNotification({
        message: "Error fetching comments: " + (error instanceof Error ? error.message : String(error)),
        type: "error",
      });
    } finally {
      setCommentsLoading(false);
    }
  };

  // Toggle group selection for new intention
  const toggleNewGroupSelection = (groupId: string) => {
    const currentSelected = newIntention.selected_groups;
    const updatedGroups = currentSelected.includes(groupId)
      ? currentSelected.filter((id: string) => id !== groupId)
      : [...currentSelected, groupId];
    setNewIntention((prev: NewIntention) => ({
      ...prev,
      selected_groups: updatedGroups
    }));
  };

  // Toggle group selection for editing intention
  const toggleEditGroupSelection = (groupId: string) => {
    if (!editingIntention) return;
    const currentSelected = editingIntention.selected_groups;
    const updatedGroups = currentSelected.includes(groupId)
      ? currentSelected.filter((id: string) => id !== groupId)
      : [...currentSelected, groupId];
    setEditingIntention((prev: EditingIntention | null) => {
      if (!prev) return null;
    return {
        ...prev,
        selected_groups: updatedGroups
    };
  });
  };

  // Toggle member selection for new intention
  const toggleNewMemberSelection = (memberId: string) => {
    const currentSelected = newIntention.selected_friends;
    const updatedFriends = currentSelected.includes(memberId)
      ? currentSelected.filter((id: string) => id !== memberId)
      : [...currentSelected, memberId];
    setNewIntention((prev: NewIntention) => ({
      ...prev,
      selected_friends: updatedFriends
    }));
  };

  // Toggle member selection for editing intention
  const toggleEditMemberSelection = (memberId: string) => {
    if (!editingIntention) return;
    const currentSelected = editingIntention.selected_friends;
    const updatedFriends = currentSelected.includes(memberId)
      ? currentSelected.filter((id: string) => id !== memberId)
      : [...currentSelected, memberId];
    setEditingIntention((prev: EditingIntention | null) => {
      if (!prev) return null;
    return {
        ...prev,
        selected_friends: updatedFriends
    };
  });
  };

  const getLikeScaleAnimation = (intentionId: string): Animated.Value => {
    if (!likeScaleAnimations.has(intentionId)) {
      likeScaleAnimations.set(intentionId, new Animated.Value(1));
    }
    return likeScaleAnimations.get(intentionId) || new Animated.Value(1);
  };

  const getLikeOpacityAnimation = (intentionId: string): Animated.Value => {
    if (!likeOpacityAnimations.has(intentionId)) {
      likeOpacityAnimations.set(intentionId, new Animated.Value(0));
    }
    return likeOpacityAnimations.get(intentionId) || new Animated.Value(0);
  };

  const handleLikeIntention = async (intentionId: string, isLiked: boolean) => {
    try {
      Vibration.vibrate(50);
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
      } else {
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");
      
      if (isLiked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("likeable_id", intentionId)
          .eq("likeable_type", "intentions")
          .eq("user_id", user.id);
          
        if (error) throw error;
      } else {
        const { data: intentionData, error: intentionError } = await supabase
          .from("intentions")
          .select("id")
          .eq("id", intentionId)
          .single();
          
        if (intentionError) throw intentionError;
        if (!intentionData) throw new Error("Intention not found");
        
        const { error } = await supabase.from("likes").insert({
          user_id: user.id,
          likeable_id: intentionId,
          likeable_type: "intentions",
        });
        
        if (error) throw error;
      }
      
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
        message: `Error ${isLiked ? "unliking" : "liking"} intention: ${
          error instanceof Error ? error.message : String(error)
        }`,
        type: "error",
      });
    }
  };

  const handleAddComment = async (intentionId: string) => {
    if (!newComment.trim()) {
      setNotification({ message: "Please enter a comment", type: "error" });
      return;
    }
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("comments")
        .insert({
          user_id: user.id,
          commentable_id: intentionId,
          commentable_type: "intentions",
          content: newComment,
        })
        .select(`*, user:user_id(*)`);
        
      if (error) throw error;
      
      if (data && data.length > 0) setComments([...comments, data[0]]);
      
      setIntentions(
        intentions.map((intention) =>
          intention.id === intentionId
            ? {
                ...intention,
                comments_count: (intention.comments_count || 0) + 1,
              }
            : intention
        )
      );
      
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
      setNotification({
        message: `Error adding comment: ${error instanceof Error ? error.message : String(error)}`,
        type: "error",
      });
    }
  };

  const handleToggleComments = (intentionId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expandedCommentId === intentionId) setExpandedCommentId(null);
    else setExpandedCommentId(intentionId);
  };

  const handleCreateIntention = async () => {
    if (!newIntention.title || !newIntention.description || !newIntention.type) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('intentions')
        .insert([
          {
            title: newIntention.title,
            description: newIntention.description,
            type: newIntention.type,
            visibility: newIntention.visibility,
            user_id: userData?.id,
            church_id: selectedChurch?.id,
            selected_groups: newIntention.selected_groups,
            selected_friends: newIntention.selected_friends,
            selected_church: selectedChurch?.id || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setIntentions([...intentions, data]);
      setNewIntention({
        title: '',
        description: '',
        type: 'prayer',
        visibility: 'Church',
        selected_groups: [],
        selected_friends: [],
        selected_church: selectedChurch?.id || null,
      });
      setShowIntentionModal(false);
    } catch (error) {
      console.error('Error creating intention:', error);
      Alert.alert('Error', 'Failed to create intention');
    }
  };

  const handleEditIntention = (intention: Intention) => {
    setEditingIntention({
      ...intention,
      selected_groups: intention.selected_groups || [],
      selected_friends: intention.selected_friends || []
    } as EditingIntention);
    setShowEditModal(true);
  };

  const handleUpdateIntention = async () => {
    if (!editingIntention?.id || !editingIntention.title || !editingIntention.description || !editingIntention.type) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('intentions')
        .update({
          title: editingIntention.title,
          description: editingIntention.description,
          type: editingIntention.type,
          visibility: editingIntention.visibility,
          selected_groups: editingIntention.selected_groups,
          selected_friends: editingIntention.selected_friends,
        })
        .eq('id', editingIntention.id)
        .select()
        .single();

      if (error) throw error;

      setIntentions(intentions.map(i => i.id === editingIntention.id ? data : i));
      setEditingIntention(null);
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating intention:', error);
      Alert.alert('Error', 'Failed to update intention');
    }
  };

  const handleDeleteClick = (intentionId: string) => {
    setDeleteModal({ isOpen: true, intentionId });
  };

  const handleDeleteIntention = async () => {
    const { intentionId } = deleteModal;
    if (!intentionId) {
      setDeleteModal({ isOpen: false, intentionId: null });
      return;
    }
    
    try {
      const { error } = await supabase.from("intentions").delete().eq("id", intentionId);
      if (error) throw error;
      
      setNotification({
        message: "Intention deleted successfully!",
        type: "success",
      });
      
      setDeleteModal({ isOpen: false, intentionId: null });
      fetchIntentions();
    } catch (error) {
      console.error("Error deleting intention:", error);
      setNotification({
        message: `Error deleting intention: ${
          error instanceof Error ? error.message : String(error)
        }`,
        type: "error",
      });
    }
  };

  const handleSelectFilter = (filter: string) => {
    setIntentionsFilter(filter);
    setShowFilterDropdown(false);
  };

  const getIntentionsHeaderTitle = () => {
    switch (intentionsFilter) {
      case "mine":
        return "My Intentions";
      case "prayers":
        return "Prayer Requests";
      case "praise":
        return "Praises";
      default:
        return `${selectedChurch?.name || "Church"} Intentions`;
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    if (currentView === "churches" && currentUserId) {
      fetchUserChurches(currentUserId);
    } else if (currentView === "intentions") {
      fetchIntentions();
    }
  };

  const navigateToHome = () => {
    setCurrentView("home");
  };

  const navigateToChurches = () => {
    setCurrentView("churches");
  };

  const navigateToChurchDetails = (church: Church) => {
    setSelectedChurch(church);
    fetchChurchDetails(church.id);
    setCurrentView("churchDetails");
  };

  const navigateToIntentions = (church?: Church) => {
    if (church) {
      setSelectedChurch(church);
      setCurrentView("intentions");
      setNewIntention(prev => ({
        ...prev,
        selected_church: church.id
      }));
    }
  };

  const renderIntentionCard = ({ item }: { item: Intention }) => {
    const scaleAnim = getLikeScaleAnimation(item.id);
    const opacityAnim = getLikeOpacityAnimation(item.id);
    const isCommentsExpanded = expandedCommentId === item.id;
    
    return (
      <IntentionCard
        item={item}
        currentUserId={currentUserId || ''}
        onLike={handleLikeIntention}
        onComment={handleToggleComments}
        onEdit={handleEditIntention}
        onDelete={handleDeleteClick}
        likeScaleAnim={scaleAnim}
        likeOpacityAnim={opacityAnim}
        isCommentsExpanded={isCommentsExpanded}
        comments={comments}
        newComment={newComment}
        setNewComment={setNewComment}
        handleAddComment={handleAddComment}
        commentsLoading={commentsLoading}
        userRole={currentUserRole || ''}
      />
    );
  };
  
  // Render member option for selection
  const renderMemberOption = (member: ChurchMember, isSelected: boolean, onSelect: (id: string) => void) => {
    const isCurrentUser = member.user_id === currentUserId;
    const showName = isCurrentUser || !member.hide_name;

    return (
      <TouchableOpacity
        key={member.id}
        style={[
          styles.memberOption,
          isSelected ? styles.memberOptionSelected : null,
        ]}
        onPress={() => onSelect(member.user_id)}
      >
        <Text style={styles.memberOptionText}>
          {showName 
            ? `${member.user?.first_name || ''} ${member.user?.last_name || ''}`.trim() 
            : "Anonymous Member"}
          {isCurrentUser && " (You)"}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render church option for selection
  const renderChurchOption = (church: Church, selectedChurchId: string | null, onSelect: (id: string) => void) => (
    <TouchableOpacity
      key={church.id}
      style={[
        styles.churchOption,
        church.id === selectedChurchId ? styles.churchOptionSelected : null,
      ]}
      onPress={() => onSelect(church.id)}
    >
      <Text style={styles.churchOptionText}>{church.name}</Text>
    </TouchableOpacity>
  );

  // Render church card
  const renderChurchCard = ({ item }: { item: Church }) => (
    <TouchableOpacity style={styles.churchCard} onPress={() => navigateToChurchDetails(item)}>
                <LinearGradient
        colors={["rgba(58, 134, 255, 0.05)", "rgba(67, 97, 238, 0.1)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <LinearGradient
            colors={["#3A86FF", "#4361EE"]}
            style={styles.iconContainer}
          >
            <FontAwesome5 name="church" size={24} color="#FFFFFF" />
                </LinearGradient>
          <View style={styles.churchInfo}>
            <Text style={styles.churchName}>{item.name}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{item.role || "Member"}</Text>
            </View>
          </View>
            </View>

        <Text style={styles.churchDescription}>
          {item.description || "No description available"}
                </Text>

        <View style={styles.churchStats}>
          <View style={styles.statItem}>
            <FontAwesome5 name="users" size={14} color="#64748B" />
            <Text style={styles.statText}>{item.members_count || 0} Members</Text>
          </View>
              </View>

        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.viewButton}
            onPress={() => navigateToChurchDetails(item)}
          >
            <Text style={styles.viewButtonText}>Church Details</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.intentionsButton}
            onPress={() => navigateToIntentions(item)}
          >
            <FontAwesome5 name="praying-hands" size={16} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.intentionsButtonText}>Prayer Intentions</Text>
          </TouchableOpacity>
                </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  // Render the Home View
  const renderHomeView = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Faith Connect</Text>
        <TouchableOpacity style={styles.profileButton}>
          <Feather name="user" size={24} color="#4361EE" />
        </TouchableOpacity>
              </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Welcome</Text>
        
        {/* Feature Cards */}
        <View style={styles.featureCards}>
          <TouchableOpacity style={styles.featureCard} onPress={navigateToChurches}>
            <LinearGradient
              colors={["#3A86FF", "#4361EE"]}
              style={styles.iconContainer}
            >
              <FontAwesome5 name="church" size={24} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.featureTitle}>My Churches</Text>
            <Text style={styles.featureDescription}>
              View and manage your church memberships
                  </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard} onPress={() => navigateToIntentions()}>
            <LinearGradient
              colors={["#4361EE", "#3A86FF"]}
              style={styles.iconContainer}
            >
              <FontAwesome5 name="praying-hands" size={24} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.featureTitle}>Prayer Intentions</Text>
            <Text style={styles.featureDescription}>
              Share and pray for intentions with your church
                </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard}>
                  <LinearGradient
              colors={["#3A86FF", "#4361EE"]}
              style={styles.iconContainer}
            >
              <Feather name="users" size={24} color="#FFFFFF" />
                  </LinearGradient>
            <Text style={styles.featureTitle}>Community</Text>
            <Text style={styles.featureDescription}>
              Connect with other members of your faith community
            </Text>
                </TouchableOpacity>
              </View>
      </ScrollView>
    </SafeAreaView>
  );

  // Render the Churches View
  const renderChurchesView = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={navigateToHome} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Churches</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <FlatList
        data={churches}
        renderItem={renderChurchCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh} 
            colors={["#4361EE"]} 
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="church" size={50} color="#CBD5E1" />
            <Text style={styles.emptyText}>
              You are not a member of any churches yet
            </Text>
            <TouchableOpacity style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>Join a Church</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );

  // Render the Church Details View
  const renderChurchDetailsView = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentView("churches")} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Church Details</Text>
        <View style={{ width: 40 }} />
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4361EE" />
        </View>
      ) : !selectedChurch ? (
        <View style={styles.errorContainer}>
          <FontAwesome5 name="church" size={50} color="#CBD5E1" />
          <Text style={styles.errorText}>Church not found</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => setCurrentView("churches")}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <View style={styles.churchHeader}>
                <LinearGradient
              colors={["#3A86FF", "#4361EE"]}
              style={styles.churchIcon}
            >
              <FontAwesome5 name="church" size={32} color="#FFFFFF" />
                </LinearGradient>
            
            <View style={styles.churchHeaderInfo}>
              <Text style={styles.churchName}>{selectedChurch.name}</Text>
              {currentUserRole && (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{currentUserRole}</Text>
                </View>
              )}
            </View>
            </View>

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>
              {selectedChurch.description || "No description available."}
              </Text>

            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Feather name="users" size={16} color="#4361EE" />
              </View>
              <Text style={styles.detailText}>
                {selectedChurch.members_count} Members
                </Text>
            </View>
            
            {selectedChurch.founded && (
              <View style={styles.detailItem}>
                <View style={styles.detailIconContainer}>
                  <Feather name="calendar" size={16} color="#4361EE" />
                </View>
                <Text style={styles.detailText}>
                  Founded: {new Date(selectedChurch.founded).toLocaleDateString()}
                </Text>
              </View>
            )}
            
            {selectedChurch.address && (
              <View style={styles.detailItem}>
                <View style={styles.detailIconContainer}>
                  <Feather name="map-pin" size={16} color="#4361EE" />
                    </View>
                <Text style={styles.detailText}>{selectedChurch.address}</Text>
              </View>
            )}
            
            {selectedChurch.phone && (
              <View style={styles.detailItem}>
                <View style={styles.detailIconContainer}>
                  <Feather name="phone" size={16} color="#4361EE" />
            </View>
                <Text style={styles.detailText}>{selectedChurch.phone}</Text>
          </View>
            )}
            
            {selectedChurch.email && (
              <View style={styles.detailItem}>
                <View style={styles.detailIconContainer}>
                  <Feather name="mail" size={16} color="#4361EE" />
        </View>
                <Text style={styles.detailText}>{selectedChurch.email}</Text>
              </View>
            )}
            
            {selectedChurch.website && (
              <View style={styles.detailItem}>
                <View style={styles.detailIconContainer}>
                  <Feather name="globe" size={16} color="#4361EE" />
          </View>
                <Text style={styles.detailText}>{selectedChurch.website}</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.featuresTitle}>Features</Text>
          
          <View style={styles.featuresContainer}>
            <TouchableOpacity style={styles.featureCard} onPress={() => navigateToIntentions(selectedChurch)}>
            <LinearGradient
                colors={["rgba(58, 134, 255, 0.05)", "rgba(67, 97, 238, 0.1)"]}
                style={styles.featureCardContent}
              >
                <View style={styles.featureIconContainer}>
                  <FontAwesome5 name="praying-hands" size={24} color="#4361EE" />
                </View>
                <Text style={styles.featureTitle}>Prayer Intentions</Text>
                <Text style={styles.featureDescription}>
                  Share and pray for intentions with your church community
                </Text>
            </LinearGradient>
          </TouchableOpacity>
            
            <TouchableOpacity style={styles.featureCard}>
              <LinearGradient
                colors={["rgba(58, 134, 255, 0.05)", "rgba(67, 97, 238, 0.1)"]}
                style={styles.featureCardContent}
              >
                <View style={styles.featureIconContainer}>
                  <Feather name="users" size={24} color="#4361EE" />
        </View>
                <Text style={styles.featureTitle}>Members</Text>
                <Text style={styles.featureDescription}>
                  View and connect with other members of your church
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.featureCard}>
              <LinearGradient
                colors={["rgba(58, 134, 255, 0.05)", "rgba(67, 97, 238, 0.1)"]}
                style={styles.featureCardContent}
              >
                <View style={styles.featureIconContainer}>
                  <Feather name="grid" size={24} color="#4361EE" />
          </View>
                <Text style={styles.featureTitle}>Groups</Text>
                <Text style={styles.featureDescription}>
                  Join ministry and small groups within your church
                </Text>
              </LinearGradient>
            </TouchableOpacity>
        </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );

  // Render the Intentions View
  const renderIntentionsView = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
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
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => selectedChurch ? setCurrentView("churchDetails") : navigateToHome()}
        >
          <Feather name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.headerTitleContainer}
          onPress={() => setShowFilterDropdown(!showFilterDropdown)}
        >
          <Text style={styles.headerTitle}>{getIntentionsHeaderTitle()}</Text>
          <View style={styles.headerFilterIndicator}>
            <Feather
              name={showFilterDropdown ? "chevron-up" : "chevron-down"}
              size={18}
              color="#4361EE"
            />
        </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowIntentionModal(true)}
        >
          <Feather name="plus" size={24} color="#4361EE" />
        </TouchableOpacity>
          </View>
      
      {/* Filter Dropdown */}
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
        <TouchableOpacity
          style={[styles.filterOption, intentionsFilter === "all" && styles.activeFilterOption]}
          onPress={() => handleSelectFilter("all")}
        >
          <Text
            style={[
              styles.filterOptionText,
              intentionsFilter === "all" && styles.activeFilterOptionText,
            ]}
          >
            All Intentions
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterOption, intentionsFilter === "prayers" && styles.activeFilterOption]}
          onPress={() => handleSelectFilter("prayers")}
        >
          <Text
            style={[
              styles.filterOptionText,
              intentionsFilter === "prayers" && styles.activeFilterOptionText,
            ]}
          >
            Prayer Requests
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterOption, intentionsFilter === "praise" && styles.activeFilterOption]}
          onPress={() => handleSelectFilter("praise")}
        >
          <Text
            style={[
              styles.filterOptionText,
              intentionsFilter === "praise" && styles.activeFilterOptionText,
            ]}
          >
            Praises
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterOption, intentionsFilter === "mine" && styles.activeFilterOption]}
          onPress={() => handleSelectFilter("mine")}
        >
          <Text
            style={[
              styles.filterOptionText,
              intentionsFilter === "mine" && styles.activeFilterOptionText,
            ]}
          >
            My Intentions
          </Text>
        </TouchableOpacity>
      </Animated.View>
      
      {/* Intentions List */}
      <FlatList
        data={intentions}
        renderItem={renderIntentionCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.intentionList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <FontAwesome5 name="praying-hands" size={50} color="#CBD5E1" />
            <Text style={styles.emptyStateText}>
              {isLoading
                ? "Loading intentions..."
                : intentionsFilter === "mine"
                ? "You haven't shared any intentions yet."
                : intentionsFilter === "prayers"
                ? "No prayer requests to show."
                : intentionsFilter === "praise"
                ? "No praises to show."
                : "No intentions to show."}
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => setShowIntentionModal(true)}
            >
              <Text style={styles.emptyStateButtonText}>Share Intention</Text>
          </TouchableOpacity>
        </View>
        }
      />
      
      {/* Create Intention Modal */}
      <Modal
        visible={showIntentionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowIntentionModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalOverlay}>
            <ScrollView style={styles.modalScrollView}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>New Intention</Text>
                
                {/* Type Selection */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Type</Text>
                  <View style={styles.pickerContainer}>
                    {[
                      "prayer",
                      "praise",
                      "spiritual",
                      "family",
                      "health",
                      "work",
                      "personal",
                      "other",
                    ].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeOption,
                          newIntention.type === type && styles.selectedTypeOption,
                        ]}
                        onPress={() =>
                          setNewIntention({
                            ...newIntention,
                            type: type as IntentionType,
                          })
                        }
                      >
                        <Text style={styles.typeOptionText}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
          </View>
        </View>
                
                {/* Church Selection - if no selectedChurch is provided */}
                {!selectedChurch && churches.length > 0 && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Select Church</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.churchesContainer}
                    >
                      {churches.map((church) => (
                        renderChurchOption(
                          church, 
                          newIntention.selected_church, 
                          (id) => setNewIntention({...newIntention, selected_church: id})
                        )
                      ))}
                    </ScrollView>
        </View>
                )}
                
                {/* Visibility Selection */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Visibility</Text>
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setShowVisibilityDropdownNew(!showVisibilityDropdownNew)}
                  >
                    <View style={styles.dropdownContent}>
                      {
                        visibilityOptions.find(
                          (option) => option.label === newIntention.visibility,
                        )?.icon
                      }
                      <Text style={[styles.dropdownText, { marginLeft: 8 }]}>
                        {newIntention.visibility}
                      </Text>
                    </View>
                    <Feather
                      name={showVisibilityDropdownNew ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="#4361EE"
                    />
                  </TouchableOpacity>
                  
                  {showVisibilityDropdownNew && (
                    <View style={styles.dropdownOptions}>
                      {visibilityOptions.map((option) => (
        <TouchableOpacity
                          key={option.label}
                          style={styles.dropdownOption}
                          onPress={() => {
                            setNewIntention({
                              ...newIntention,
                              visibility: option.label as VisibilityType,
                              selected_groups:
                                option.label === "Certain Groups"
                                  ? newIntention.selected_groups
                                  : [],
                              selected_friends:
                                option.label === "Certain Members"
                                  ? newIntention.selected_friends
                                  : [],
                            });
                            setShowVisibilityDropdownNew(false);
                          }}
                        >
                          <View style={styles.dropdownOptionContent}>
                            {option.icon}
                            <Text style={styles.dropdownOptionText}>{option.label}</Text>
                          </View>
        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  
                  {/* Group selection section */}
                  {newIntention.visibility === "Certain Groups" && (
                    <View style={styles.groupSelectorContainer}>
                      <Text style={styles.groupSelectorLabel}>Select Groups:</Text>
                      <View style={styles.groupSelectorList}>
                        {churchGroups.length === 0 ? (
                          <Text style={styles.noGroupsText}>No groups available</Text>
                        ) : (
                          churchGroups.map((group) => (
                            <TouchableOpacity
                              key={group.id}
                              style={[
                                styles.groupOption,
                                newIntention.selected_groups &&
                                newIntention.selected_groups.includes(group.id)
                                  ? styles.groupOptionSelected
                                  : null,
                              ]}
                              onPress={() => toggleNewGroupSelection(group.id)}
                            >
                              <Text style={styles.groupOptionText}>{group.name}</Text>
        </TouchableOpacity>
                          ))
                        )}
      </View>
                    </View>
                  )}
                  
                  {/* Member selection section */}
                  {newIntention.visibility === "Certain Members" && (
                    <View style={styles.memberSelectorContainer}>
                      <Text style={styles.memberSelectorLabel}>
                        Select Members ({churchMembers.length})
            </Text>
                      <ScrollView
                        style={styles.memberSelectorList}
                        contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap" }}
                        showsVerticalScrollIndicator={true}
                      >
                        {churchMembers.length === 0 ? (
                          <Text style={styles.noMembersText}>
                            No members found. Please select a different visibility option.
                          </Text>
                        ) : (
                          churchMembers.map((member) => (
                            renderMemberOption(
                              member,
                              newIntention.selected_friends.includes(member.user_id),
                              toggleNewMemberSelection
                            )
                          ))
                        )}
                      </ScrollView>
                    </View>
                  )}
                </View>
                
                {/* Title Field */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Title</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newIntention.title}
                    onChangeText={(text) => setNewIntention({ ...newIntention, title: text })}
                    placeholder="Enter title..."
                    placeholderTextColor="rgba(67, 97, 238, 0.5)"
                    inputAccessoryViewID="accessoryViewID"
                  />
          </View>
                
                {/* Description Field */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Description</Text>
                  <View style={styles.textInputContainer}>
                    <TextInput
                      style={[
                        styles.formTextarea,
                        createDescriptionFocused && styles.formTextareaFocused,
                      ]}
                      value={newIntention.description}
                      onChangeText={(text) =>
                        setNewIntention({ ...newIntention, description: text })
                      }
                      placeholder="Enter description..."
                      placeholderTextColor="rgba(67, 97, 238, 0.5)"
                      multiline={true}
                      numberOfLines={4}
                      textAlignVertical="top"
                      inputAccessoryViewID="accessoryViewID"
                      onFocus={() => setCreateDescriptionFocused(true)}
                      onBlur={() => setCreateDescriptionFocused(false)}
                    />
                    {createDescriptionFocused && (
                      <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => {
                          Keyboard.dismiss();
                          setCreateDescriptionFocused(false);
                        }}
                      >
                        <Feather name="check" size={20} color="#4361EE" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <InputAccessoryView nativeID="accessoryViewID">
                  <View style={styles.accessory}>
                    <TouchableOpacity onPress={() => Keyboard.dismiss()}>
                      <Text style={styles.accessoryText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </InputAccessoryView>
                
                {/* Modal Actions */}
                <View style={styles.modalActions}>
              <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowIntentionModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.createButton} onPress={handleCreateIntention}>
                    <Text style={styles.createButtonText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Edit Intention Modal */}
      <Modal
        visible={showEditModal && editingIntention !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowEditModal(false);
          setEditingIntention(null);
        }}
      >
        {editingIntention && (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Edit Intention</Text>
                
                {/* Type Selection */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Type</Text>
                  <View style={styles.pickerContainer}>
                    {[
                      "prayer",
                      "praise",
                      "spiritual",
                      "family",
                      "health",
                      "work",
                      "personal",
                      "other",
                    ].map((type) => (
                      <TouchableOpacity
                        key={type}
                    style={[
                          styles.typeOption,
                          editingIntention.type === type && styles.selectedTypeOption,
                        ]}
                        onPress={() =>
                          setEditingIntention({
                            ...editingIntention,
                            type: type as IntentionType,
                          })
                        }
                      >
                        <Text style={styles.typeOptionText}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
              </TouchableOpacity>
            ))}
                  </View>
          </View>

                {/* Church Selection - if no selectedChurch is provided */}
                {!selectedChurch && churches.length > 0 && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Select Church</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.churchesContainer}
                    >
                      {churches.map((church) => (
                        renderChurchOption(
                          church, 
                          editingIntention.selected_church,
                          (id) => setEditingIntention({...editingIntention, selected_church: id})
                        )
                      ))}
                    </ScrollView>
                  </View>
                )}
                
                {/* Visibility Selection */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Visibility</Text>
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setShowVisibilityDropdownEdit(!showVisibilityDropdownEdit)}
                  >
                    <View style={styles.dropdownContent}>
                      {
                        visibilityOptions.find(
                          (option) => option.label === editingIntention.visibility,
                        )?.icon
                      }
                      <Text style={[styles.dropdownText, { marginLeft: 8 }]}>
                        {editingIntention.visibility}
                      </Text>
                    </View>
                    <Feather
                      name={showVisibilityDropdownEdit ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="#4361EE"
                    />
                  </TouchableOpacity>
                  
                  {showVisibilityDropdownEdit && (
                    <View style={styles.dropdownOptions}>
                      {visibilityOptions.map((option) => (
                <TouchableOpacity 
                          key={option.label}
                          style={styles.dropdownOption}
                  onPress={() => {
                            setEditingIntention({
                              ...editingIntention,
                              visibility: option.label as VisibilityType,
                              selected_groups:
                                option.label === "Certain Groups"
                                  ? editingIntention.selected_groups || []
                                  : [],
                              selected_friends:
                                option.label === "Certain Members"
                                  ? editingIntention.selected_friends || []
                                  : [],
                            });
                            setShowVisibilityDropdownEdit(false);
                          }}
                        >
                          <View style={styles.dropdownOptionContent}>
                            {option.icon}
                            <Text style={styles.dropdownOptionText}>{option.label}</Text>
                    </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  
                  {/* Group selection section */}
                  {editingIntention.visibility === "Certain Groups" && (
                    <View style={styles.groupSelectorContainer}>
                      <Text style={styles.groupSelectorLabel}>Select Groups:</Text>
                      <View style={styles.groupSelectorList}>
                        {churchGroups.length === 0 ? (
                          <Text style={styles.noGroupsText}>No groups available</Text>
                        ) : (
                          churchGroups.map((group) => (
                            <TouchableOpacity
                              key={group.id}
                              style={[
                                styles.groupOption,
                                editingIntention.selected_groups &&
                                editingIntention.selected_groups.includes(group.id)
                                  ? styles.groupOptionSelected
                                  : null,
                              ]}
                              onPress={() => toggleEditGroupSelection(group.id)}
                            >
                              <Text style={styles.groupOptionText}>{group.name}</Text>
                            </TouchableOpacity>
                          ))
                        )}
                      </View>
                    </View>
                  )}
                  
                  {/* Member selection section */}
                  {editingIntention.visibility === "Certain Members" && (
                    <View style={styles.memberSelectorContainer}>
                      <Text style={styles.memberSelectorLabel}>
                        Select Members ({churchMembers.length})
                      </Text>
                      <ScrollView
                        style={styles.memberSelectorList}
                        contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap" }}
                        showsVerticalScrollIndicator={true}
                      >
                        {churchMembers.length === 0 ? (
                          <Text style={styles.noMembersText}>
                            No members found. Please select a different visibility option.
                          </Text>
                        ) : (
                          churchMembers.map((member) => (
                            renderMemberOption(
                              member,
                              editingIntention.selected_friends?.includes(member.user_id),
                              toggleEditMemberSelection
                            )
                          ))
                        )}
                      </ScrollView>
                          </View>
                  )}
                    </View>
                
                {/* Title Field */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Title</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editingIntention.title}
                    onChangeText={(text) =>
                      setEditingIntention({
                        ...editingIntention,
                        title: text,
                      })
                    }
                    placeholder="Enter title..."
                    placeholderTextColor="rgba(67, 97, 238, 0.5)"
                    inputAccessoryViewID="accessoryViewID"
                  />
                  </View>
                
                {/* Description Field */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Description</Text>
                  <TextInput
                    style={[
                      styles.formTextarea,
                      editDescriptionFocused && styles.formTextareaFocused,
                    ]}
                    value={editingIntention.description}
                    onChangeText={(text) =>
                      setEditingIntention({
                        ...editingIntention,
                        description: text,
                      })
                    }
                    placeholder="Enter description..."
                    placeholderTextColor="rgba(67, 97, 238, 0.5)"
                    multiline={true}
                    numberOfLines={4}
                    textAlignVertical="top"
                    inputAccessoryViewID="accessoryViewID"
                    onFocus={() => setEditDescriptionFocused(true)}
                    onBlur={() => setEditDescriptionFocused(false)}
                  />
                </View>
                
                <InputAccessoryView nativeID="accessoryViewID">
                  <View style={styles.accessory}>
                    <TouchableOpacity onPress={() => Keyboard.dismiss()}>
                      <Text style={styles.accessoryText}>Done</Text>
                </TouchableOpacity>
                  </View>
                </InputAccessoryView>

                {/* Modal Actions */}
                <View style={styles.modalActions}>
                <TouchableOpacity 
                    style={styles.cancelButton}
                  onPress={() => {
                      setShowEditModal(false);
                      setEditingIntention(null);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.createButton} onPress={handleUpdateIntention}>
                    <Text style={styles.createButtonText}>Update</Text>
                  </TouchableOpacity>
                    </View>
                          </View>
            </View>
          </KeyboardAvoidingView>
        )}
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModal.isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModal({ isOpen: false, intentionId: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.modalTitle}>Delete Intention</Text>
            <Text style={styles.modalText}>Are you sure you want to delete this intention?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setDeleteModal({ isOpen: false, intentionId: null })}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteIntention}>
                <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
              </View>
      </Modal>
      
      {isLoading && !intentions.length && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4361EE" />
          </View>
      )}
    </SafeAreaView>
  );

  // Main render based on current view
  if (isLoading && !currentView) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4361EE" />
      </View>
    );
  }

  switch (currentView) {
    case "churches":
      return renderChurchesView();
    case "churchDetails":
      return renderChurchDetailsView();
    case "intentions":
      return renderIntentionsView();
    case "home":
    default:
      return renderHomeView();
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingTop: Platform.OS === "android" ? Constants.statusBarHeight : 0,
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
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(226, 232, 240, 0.8)",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginRight: 5,
  },
  headerFilterIndicator: {
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  addButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  filterDropdown: {
    position: "absolute",
    top: 80,
    left: 15,
    right: 15,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 5,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  activeFilterOption: {
    backgroundColor: "rgba(67, 97, 238, 0.1)",
  },
  filterOptionText: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "500",
  },
  activeFilterOptionText: {
    color: "#4361EE",
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E293B",
  },
  profileButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 16,
  },
  featureCards: {
    flexDirection: "column",
    gap: 16,
  },
  featureCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#4361EE",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  intentionList: {
    padding: 15,
    paddingBottom: 100,
  },
  cardGradient: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(203, 213, 225, 0.5)",
  },
  intentionCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#4361EE",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  intentionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  intentionAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(67, 97, 238, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    borderWidth: 1,
    borderColor: "rgba(67, 97, 238, 0.2)",
  },
  intentionHeaderText: {
    flex: 1,
  },
  intentionAuthor: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  authorTag: {
    fontStyle: "italic",
    color: "#64748B",
  },
  intentionMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  intentionTypeTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(67, 97, 238, 0.2)",
  },
  intentionTypeText: {
    color: "#4361EE",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "600",
  },
  intentionTime: {
    color: "#64748B",
    fontSize: 12,
  },
  churchTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(67, 97, 238, 0.2)",
  },
  churchTagText: {
    color: "#4361EE",
    fontSize: 12,
    marginLeft: 5,
    fontWeight: "600",
  },
  intentionContent: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  intentionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  intentionDescription: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
  },
  intentionActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    flexWrap: "wrap",
  },
  intentionAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    marginRight: 8,
    marginBottom: 8,
  },
  intentionActionActive: {
    backgroundColor: "rgba(233, 150, 122, 0.1)",
    borderColor: "rgba(233, 150, 122, 0.3)",
  },
  likeButtonContainer: {
    position: "relative",
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  likeRipple: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(233, 150, 122, 0.3)",
  },
  actionText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
  },
  actionTextActive: {
    color: "#E9967A",
  },
  commentsSection: {
    marginTop: 15,
  },
  commentsDivider: {
    height: 1,
    backgroundColor: "rgba(226, 232, 240, 0.8)",
    marginVertical: 10,
  },
  commentsList: {
    paddingVertical: 10,
  },
  commentsLoading: {
    marginVertical: 10,
  },
  commentItem: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(67, 97, 238, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(67, 97, 238, 0.2)",
  },
  commentUser: {
    flex: 1,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  commentTime: {
    fontSize: 12,
    color: "#64748B",
  },
  commentContent: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
  },
  emptyComments: {
    padding: 10,
    alignItems: "center",
  },
  emptyCommentsText: {
    color: "#64748B",
    fontSize: 14,
  },
  addCommentContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 25,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: "#1E293B",
    marginRight: 10,
    maxHeight: 80,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(67, 97, 238, 0.2)",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    marginTop: 20,
  },
  emptyStateText: {
    color: "#64748B",
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: "#4361EE",
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyStateButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  churchCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#4361EE",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  churchInfo: {
    flex: 1,
  },
  churchName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  churchDescription: {
    fontSize: 14,
    color: "#334155",
    marginBottom: 16,
    lineHeight: 20,
  },
  churchStats: {
    flexDirection: "row",
    marginBottom: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  statText: {
    fontSize: 14,
    color: "#64748B",
    marginLeft: 6,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  viewButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    flex: 1,
    marginRight: 8,
    alignItems: "center",
  },
  viewButtonText: {
    color: "#64748B",
    fontWeight: "600",
    fontSize: 14,
  },
  intentionsButton: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#4361EE",
    borderRadius: 8,
    flex: 1.5,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonIcon: {
    marginRight: 8,
  },
  intentionsButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748B",
    marginTop: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  emptyButton: {
    backgroundColor: "#4361EE",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    paddingVertical: 20,
  },
  modalScrollView: {
    maxHeight: "90%",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    margin: 20,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  confirmModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    margin: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 20,
  },
  modalText: {
    fontSize: 16,
    color: "#334155",
    marginBottom: 24,
    textAlign: "center",
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 8,
  },
  pickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  typeOption: {
    flex: 1,
    minWidth: "30%",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    marginBottom: 8,
  },
  selectedTypeOption: {
    backgroundColor: "#EEF2FF",
    borderColor: "rgba(67, 97, 238, 0.4)",
  },
  typeOptionText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "500",
  },
  formInput: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    color: "#1E293B",
    padding: 12,
    fontSize: 16,
  },
  formTextarea: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    color: "#1E293B",
    padding: 12,
    height: 120,
    fontSize: 16,
    textAlignVertical: "top",
  },
  formTextareaFocused: {
    height: 200,
    borderColor: "rgba(67, 97, 238, 0.4)",
  },
  textInputContainer: {
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    right: 10,
    top: 10,
    backgroundColor: "#EEF2FF",
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(67, 97, 238, 0.2)",
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  dropdownText: {
    color: "#1E293B",
    fontSize: 16,
  },
  dropdownContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  dropdownOptions: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(226, 232, 240, 0.8)",
  },
  dropdownOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dropdownOptionText: {
    color: "#1E293B",
    fontSize: 16,
  },
  groupSelectorContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  groupSelectorLabel: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  groupSelectorList: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  groupOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    marginRight: 8,
    marginBottom: 8,
  },
  groupOptionSelected: {
    backgroundColor: "#EEF2FF",
    borderColor: "rgba(67, 97, 238, 0.4)",
  },
  groupOptionText: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "500",
  },
  noGroupsText: {
    color: "#64748B",
    fontSize: 14,
    fontStyle: "italic",
    marginTop: 5,
  },
  memberSelectorContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    maxHeight: 200,
  },
  memberSelectorLabel: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  memberSelectorList: {
    maxHeight: 120,
  },
  memberOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    marginRight: 8,
    marginBottom: 8,
    minWidth: 150,
  },
  memberOptionSelected: {
    backgroundColor: "#EEF2FF",
    borderColor: "rgba(67, 97, 238, 0.4)",
  },
  memberOptionText: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  noMembersText: {
    color: "#64748B",
    fontSize: 14,
    fontStyle: "italic",
    marginTop: 5,
    textAlign: "center",
  },
  churchesContainer: {
    flexDirection: "row",
    paddingVertical: 5,
  },
  churchOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    marginRight: 10,
  },
  churchOptionSelected: {
    backgroundColor: "#EEF2FF",
    borderColor: "rgba(67, 97, 238, 0.4)",
  },
  churchOptionText: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "600",
  },
  accessory: {
    backgroundColor: "#F1F5F9",
    padding: 15,
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "rgba(226, 232, 240, 0.8)",
  },
  accessoryText: {
    color: "#4361EE",
    fontSize: 16,
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingVertical: 12,
    marginRight: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  cancelButtonText: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "600",
  },
  createButton: {
    flex: 1,
    backgroundColor: "#4361EE",
    borderRadius: 8,
    paddingVertical: 12,
    marginLeft: 8,
    alignItems: "center",
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    paddingVertical: 12,
    marginLeft: 8,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  churchHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  churchIcon: {
    width: 70,
    height: 70,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  churchHeaderInfo: {
    flex: 1,
  },
  roleBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(79, 70, 229, 0.2)",
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4F46E5",
  },
  contentContainer: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#4361EE",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  description: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  detailIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(67, 97, 238, 0.2)",
  },
  detailText: {
    fontSize: 14,
    color: "#334155",
    flex: 1,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 16,
  },
  featuresContainer: {
    flexDirection: "column",
    gap: 16,
    marginBottom: 30,
  },
  featureCardContent: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(203, 213, 225, 0.5)",
  },
  featureIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "#64748B",
    marginTop: 16,
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: "#4361EE",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  errorButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});