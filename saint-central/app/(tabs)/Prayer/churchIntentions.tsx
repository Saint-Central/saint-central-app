import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  ActivityIndicator,
  Vibration,
  Animated,
  LayoutAnimation,
  UIManager,
  Platform,
  Keyboard,
  Alert,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { supabase } from '../../../supabaseClient';
import {
  AppView,
  Church,
  ChurchMember,
  Comment,
  DeleteModalState,
  EditingIntention,
  Group,
  Intention,
  NewIntention,
  Notification,
  UserData,
  IntentionType,
  VisibilityType
} from "./types";
import { parseSelectedGroups, parseSelectedMembers } from "./utils";
import { styles as importedStyles } from "./styles";
import HomeView from "./views/HomeView";
import ChurchesView from "./views/ChurchesView";
import ChurchDetailsView from "./views/ChurchDetailsView";
import IntentionsView from "./views/IntentionsView";

// Enable LayoutAnimation for Android
if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface IntentionCardProps {
  intention: Intention;
  onEdit: (intention: Intention) => Promise<void>;
  onDelete: (intention: Intention) => Promise<void>;
}

const IntentionCard = ({ intention, onEdit, onDelete }: IntentionCardProps): JSX.Element => {
  return (
    <View style={importedStyles.card}>
      {/* ... existing card content ... */}
      <TouchableOpacity onPress={() => onEdit(intention)}>
        <Text>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onDelete(intention)}>
        <Text>Delete</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function ChurchIntentions() {
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
      setChurches(churchesWithCounts.filter((church: Church | null): church is Church => church !== null));
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
        const typedData = data as any[];
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
    try {
      if (!newIntention.title || !newIntention.description || !newIntention.type || !newIntention.visibility) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const intentionData = {
        ...newIntention,
        type: newIntention.type as IntentionType,
        visibility: newIntention.visibility as VisibilityType,
        selected_church: selectedChurch?.id || null,
        selected_groups: parseSelectedGroups(newIntention.selected_groups),
        selected_friends: parseSelectedMembers(newIntention.selected_friends),
      };

      const { error } = await supabase
        .from('intentions')
        .insert([intentionData]);

      if (error) throw error;

      setNewIntention({
        title: '',
        description: '',
        type: 'personal' as IntentionType,
        visibility: 'private' as VisibilityType,
        selected_groups: [],
        selected_friends: [],
        selected_church: null,
      });

      Alert.alert('Success', 'Intention created successfully');
    } catch (error) {
      console.error('Error creating intention:', error);
      Alert.alert('Error', 'Failed to create intention');
    }
  };

  const handleEditIntention = async (intention: Intention) => {
    setEditingIntention({
      ...intention,
      selected_groups: intention.selected_groups || [],
      selected_friends: intention.selected_friends || []
    });
  };

  const handleUpdateIntention = async (intention: Intention) => {
    try {
      const { error } = await supabase
        .from('intentions')
        .update({
          ...intention,
          type: intention.type as IntentionType,
          visibility: intention.visibility as VisibilityType,
        })
        .eq('id', intention.id);

      if (error) throw error;

      Alert.alert('Success', 'Intention updated successfully');
    } catch (error) {
      console.error('Error updating intention:', error);
      Alert.alert('Error', 'Failed to update intention');
    }
  };

  const handleDeleteIntention = async (intention: Intention) => {
    setDeleteModal({
      isOpen: true,
      intentionId: intention.id
    });
  };

  const handleSelectFilter = (filter: string) => {
    setIntentionsFilter(filter);
    setShowFilterDropdown(false);
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
    } else {
      setCurrentView("intentions");
    }
  };

  const handleDeleteClick = (intentionId: string) => {
    const intention = intentions.find(i => i.id === intentionId);
    if (intention) {
      handleDeleteIntention(intention);
    }
  };

  // Main render based on current view
  if (isLoading && !currentView) {
    return (
      <View style={importedStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#4361EE" />
      </View>
    );
  }

  switch (currentView) {
    case "churches":
      return (
        <ChurchesView
          churches={churches}
          navigateToHome={navigateToHome}
          navigateToChurchDetails={navigateToChurchDetails}
          navigateToIntentions={navigateToIntentions}
          refreshing={refreshing}
          handleRefresh={handleRefresh}
        />
      );
    case "churchDetails":
      return (
        <ChurchDetailsView
          selectedChurch={selectedChurch}
          isLoading={isLoading}
          currentUserRole={currentUserRole}
          setCurrentView={setCurrentView}
          navigateToIntentions={navigateToIntentions}
        />
      );
    case "intentions":
      return (
        <IntentionsView
          intentions={intentions}
          selectedChurch={selectedChurch}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          intentionsFilter={intentionsFilter}
          showIntentionModal={showIntentionModal}
          showEditModal={showEditModal}
          editingIntention={editingIntention}
          deleteModal={deleteModal}
          comments={comments}
          newComment={newComment}
          commentsLoading={commentsLoading}
          expandedCommentId={expandedCommentId}
          showFilterDropdown={showFilterDropdown}
          filterDropdownAnim={filterDropdownAnim}
          likeScaleAnimations={likeScaleAnimations}
          likeOpacityAnimations={likeOpacityAnimations}
          newIntention={newIntention}
          churchGroups={churchGroups}
          churchMembers={churchMembers}
          notification={notification}
          refreshing={refreshing}
          showVisibilityDropdownNew={showVisibilityDropdownNew}
          showVisibilityDropdownEdit={showVisibilityDropdownEdit}
          createDescriptionFocused={createDescriptionFocused}
          editDescriptionFocused={editDescriptionFocused}
          churches={churches}
          setCurrentView={setCurrentView}
          setShowFilterDropdown={setShowFilterDropdown}
          handleSelectFilter={handleSelectFilter}
          setShowIntentionModal={setShowIntentionModal}
          setNewIntention={setNewIntention}
          setShowVisibilityDropdownNew={setShowVisibilityDropdownNew}
          toggleNewGroupSelection={toggleNewGroupSelection}
          toggleNewMemberSelection={toggleNewMemberSelection}
          setCreateDescriptionFocused={setCreateDescriptionFocused}
          handleCreateIntention={handleCreateIntention}
          handleLikeIntention={handleLikeIntention}
          handleToggleComments={handleToggleComments}
          setNewComment={setNewComment}
          handleAddComment={handleAddComment}
          handleEditIntention={handleEditIntention}
          setEditingIntention={setEditingIntention}
          setShowVisibilityDropdownEdit={setShowVisibilityDropdownEdit}
          toggleEditGroupSelection={toggleEditGroupSelection}
          toggleEditMemberSelection={toggleEditMemberSelection}
          setEditDescriptionFocused={setEditDescriptionFocused}
          handleUpdateIntention={handleUpdateIntention}
          setShowEditModal={setShowEditModal}
          handleDeleteClick={handleDeleteClick}
          setDeleteModal={setDeleteModal}
          handleDeleteIntention={handleDeleteIntention}
          handleRefresh={handleRefresh}
          isLoading={isLoading}
        />
      );
    case "home":
    default:
      return (
        <HomeView
          navigateToChurches={navigateToChurches}
          navigateToIntentions={navigateToIntentions}
        />
      );
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});