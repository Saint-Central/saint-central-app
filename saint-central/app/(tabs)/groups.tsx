import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ImageBackground,
  TextInput,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useCRUD } from "@/utils/crudClient";

// Reuse your background image
const backgroundImageRequire = require("../../assets/images/community-image.jpg");

interface Group {
  id: number;
  name: string;
  description: string;
  created_at: string;
  created_by: string;
  church_id?: number;
  is_ministry_group?: boolean;
}

interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  profile_image?: string;
  phone_number?: string;
  denomination?: string;
  role_partner?: string;
}

interface GroupMember {
  id: string;
  user_id: string;
  group_id: string;
  role: string;
  joined_at: string;
  user: UserData;
}

interface Notification {
  message: string;
  type: "error" | "success";
}

interface FriendRequestSent {
  id: string;
  user_id_1: string;
  user_id_2: string;
  status: string;
  created_at: string;
  user: UserData;
}

interface FriendRequestIncoming {
  id: string;
  user_id_1: string;
  user_id_2: string;
  status: string;
  created_at: string;
  user: UserData;
}

interface Friend {
  id: string;
  friend: UserData;
  created_at: string;
}

export default function GroupsScreen() {
  // Auth and CRUD hooks
  const { user } = useAuth();
  const { select, selectOne, insert, update, delete: deleteRecord } = useCRUD();

  // Groups & loading state
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Create Group state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newGroup, setNewGroup] = useState<{
    name: string;
    description: string;
    is_ministry_group: boolean;
    church_id?: number;
  }>({
    name: "",
    description: "",
    is_ministry_group: false,
    church_id: undefined,
  });
  const [selectedMembersForCreation, setSelectedMembersForCreation] = useState<string[]>([]);

  // Edit Group state
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editGroup, setEditGroup] = useState<{
    id: string;
    name: string;
    description: string;
  } | null>(null);

  // Delete confirmation overlay inside the Edit modal
  const [showDeleteConfirmOverlay, setShowDeleteConfirmOverlay] = useState<boolean>(false);

  // When adding members from a group card, this holds the group ID.
  const [selectedGroupForAddingMembers, setSelectedGroupForAddingMembers] = useState<string | null>(
    null,
  );
  const [existingMembers, setExistingMembers] = useState<string[]>([]);

  // Friend Selection UI
  const [showFriendSelectionOverlay, setShowFriendSelectionOverlay] = useState<boolean>(false);
  const [showFriendSelectionModal, setShowFriendSelectionModal] = useState<boolean>(false);

  // Friends list (fetched from Supabase)
  const [friends, setFriends] = useState<UserData[]>([]);

  // Notification
  const [notification, setNotification] = useState<Notification | null>(null);

  // Leave Group confirmation modal state
  const [selectedGroupToLeave, setSelectedGroupToLeave] = useState<string | null>(null);
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState<boolean>(false);

  // View members modal state
  const [showMembersModal, setShowMembersModal] = useState<boolean>(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<GroupMember[]>([]);
  const [selectedGroupForMembers, setSelectedGroupForMembers] = useState<Group | null>(null);
  const [membersLoading, setMembersLoading] = useState<boolean>(false);
  const [isManagingMembers, setIsManagingMembers] = useState<boolean>(false);

  // FAB animation state
  const [showFabMenu, setShowFabMenu] = useState(false);
  const fabMenuAnimation = React.useRef(new Animated.Value(0)).current;
  const fabRotation = fabMenuAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  // Friend-related state
  const [activeTab, setActiveTab] = useState<"groups" | "friends">("groups");
  const [friendTab, setFriendTab] = useState<"search" | "requests" | "list">("search");
  const [sentRequests, setSentRequests] = useState<FriendRequestSent[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestIncoming[]>([]);
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [friendRequestCount, setFriendRequestCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<UserData[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Fetch groups and friends when user is available
  useEffect(() => {
    if (user) {
      fetchGroups();
      fetchFriends(user.id);
      fetchFriendsList();
      fetchFriendRequests();
    }
  }, [user]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Fetch friend data when tab changes
  useEffect(() => {
    if (activeTab === "friends" && user) {
      if (friendTab === "requests") {
        fetchFriendRequests();
      } else if (friendTab === "list") {
        fetchFriendsList();
      }
    }
  }, [activeTab, friendTab, user]);

  // Fetch groups from database that the current user is a member of
  const fetchGroups = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      
      // First, get group IDs where user is a member
      const userGroupMemberships = await select("group_members", {
        select: "group_id",
        where: { user_id: user.id }
      });
      
      if (userGroupMemberships.length === 0) {
        setGroups([]);
        return;
      }
      
      // Extract group IDs
      const groupIds = userGroupMemberships.map(membership => membership.group_id);
      
      // Fetch group details for those IDs
      const groupsData = await select("groups", {
        select: "id, name, description, created_at, created_by, church_id, is_ministry_group",
        order: "created_at"
      });
      
      // Filter to only groups the user is a member of
      const userGroups = groupsData.filter(group => groupIds.includes(group.id));

      console.log("Fetched groups:", userGroups?.length || 0);
      setGroups(userGroups || []);
    } catch (error: any) {
      console.error("Error fetching groups:", error);
      setNotification({
        message: "Error fetching groups: " + (error?.message || String(error)),
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all members of a specific group
  const fetchGroupMembers = async (groupId: string, groupData: Group) => {
    try {
      setMembersLoading(true);
      
      // First, get group members data
      const membersData = await select("group_members", {
        select: "id, group_id, user_id, role, joined_at",
        where: { group_id: groupId },
        order: "joined_at"
      });
      
      // Then fetch user details for each member
      const membersWithUserData = await Promise.all(
        membersData.map(async (member) => {
          const userData = await selectOne("users", {
            select: "id, first_name, last_name, email, profile_image",
            where: { id: member.user_id }
          });
          
          return {
            ...member,
            user: userData
          };
        })
      );

      console.log("Fetched group members:", membersWithUserData?.length || 0);
      setSelectedGroupMembers(membersWithUserData || []);
      setSelectedGroupForMembers(groupData);
      setShowMembersModal(true);

      // Reset states
      setIsManagingMembers(false);

      // Pre-populate selected members if this is a group created by current user
      if (groupData.created_by === user?.id) {
        const memberIds = membersWithUserData?.map((member: GroupMember) => member.user_id) || [];
        setSelectedMembersForCreation(memberIds);
        setExistingMembers(memberIds);
        setSelectedGroupForAddingMembers(groupId);
      }
    } catch (error: any) {
      console.error("Error fetching group members:", error);
      setNotification({
        message: `Error fetching members: ${error?.message || String(error)}`,
        type: "error",
      });
    } finally {
      setMembersLoading(false);
    }
  };

  // Fetch friends using proper foreign key relationships
  const fetchFriends = async (userId: string) => {
    try {
      console.log("Fetching friends for user:", userId);
      
      // Get friends where current user is user_id_1 (outgoing accepted friendships)
      const sentFriends = await select("friends", {
        select: "id, user_id_1, user_id_2, status, created_at",
        where: { user_id_1: userId, status: "accepted" }
      });

      // Get friends where current user is user_id_2 (incoming accepted friendships)
      const receivedFriends = await select("friends", {
        select: "id, user_id_1, user_id_2, status, created_at",
        where: { user_id_2: userId, status: "accepted" }
      });

      // Combine and format the friends list
      let friendList: UserData[] = [];
      
      // Fetch user data for friends where current user is user_id_1
      if (sentFriends && sentFriends.length > 0) {
        const sentFriendUsers = await Promise.all(
          sentFriends.map(async (friendship) => {
            const userData = await selectOne("users", {
              select: "id, first_name, last_name, email, profile_image",
              where: { id: friendship.user_id_2 }
            });
            return userData;
          })
        );
        friendList = friendList.concat(sentFriendUsers.filter(Boolean));
      }
      
      // Fetch user data for friends where current user is user_id_2
      if (receivedFriends && receivedFriends.length > 0) {
        const receivedFriendUsers = await Promise.all(
          receivedFriends.map(async (friendship) => {
            const userData = await selectOne("users", {
              select: "id, first_name, last_name, email, profile_image",
              where: { id: friendship.user_id_1 }
            });
            return userData;
          })
        );
        friendList = friendList.concat(receivedFriendUsers.filter(Boolean));
      }

      console.log("Total friends found:", friendList.length);
      setFriends(friendList);
    } catch (error: any) {
      console.error("Error fetching friends:", error);
      setNotification({
        message: "Error fetching friends: " + (error?.message || String(error)),
        type: "error",
      });
    }
  };

  // When adding members from a group card, fetch existing member IDs and pre-select them
  const fetchExistingGroupMembers = async (groupId: string) => {
    try {
      const data = await select("group_members", {
        select: "user_id",
        where: { group_id: groupId }
      });
      
      const memberIds = data?.map((row: any) => row.user_id) || [];
      setExistingMembers(memberIds);
      setSelectedMembersForCreation(memberIds);
    } catch (error: any) {
      console.error("Error fetching group members:", error);
      setExistingMembers([]);
      setNotification({
        message: "Error fetching group members: " + (error?.message || String(error)),
        type: "error",
      });
    }
  };

  // Create Group with proper error handling
  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) {
      setNotification({
        message: "Please provide a group name.",
        type: "error",
      });
      return;
    }
    if (!user) {
      setNotification({
        message: "Not authenticated",
        type: "error",
      });
      return;
    }

    try {
      // Check for duplicate group names
      const existingGroups = await select("groups", {
        select: "id",
        where: { name: newGroup.name.trim() },
        limit: 1
      });

      if (existingGroups && existingGroups.length > 0) {
        setNotification({
          message: "A group with that name already exists.",
          type: "error",
        });
        return;
      }

      // Insert new group
      const groupData = await insert("groups", {
        name: newGroup.name.trim(),
        description: newGroup.description.trim() || null,
        created_by: user.id,
        is_ministry_group: newGroup.is_ministry_group,
        church_id: newGroup.church_id || null,
      });

      const newGroupId = groupData.id;

      // Insert current user as admin into group_members
      await insert("group_members", {
        group_id: newGroupId,
        user_id: user.id,
        role: "admin",
      });

      // Insert selected members (if any) as members
      if (selectedMembersForCreation.length > 0) {
        const filteredMembers = selectedMembersForCreation.filter(
          (friendId) => friendId !== user.id,
        );
        
        if (filteredMembers.length > 0) {
          // Insert members one by one since crudClient doesn't support bulk inserts
          for (const friendId of filteredMembers) {
            await insert("group_members", {
              group_id: newGroupId,
              user_id: friendId,
              role: "member",
            });
          }
        }
      }

      // Reset form and close modal
      setShowCreateModal(false);
      setNewGroup({ 
        name: "", 
        description: "", 
        is_ministry_group: false, 
        church_id: undefined 
      });
      setSelectedMembersForCreation([]);
      
      setNotification({
        message: "Group created successfully!",
        type: "success",
      });
      
      fetchGroups();
    } catch (error: any) {
      console.error("Error creating group:", error);
      setNotification({
        message: `Error creating group: ${error?.message || String(error)}`,
        type: "error",
      });
    }
  };

  // Update Group
  const handleUpdateGroup = async () => {
    if (!editGroup?.name.trim()) {
      setNotification({
        message: "Group name cannot be empty.",
        type: "error",
      });
      return;
    }
    
    try {
      await update(
        "groups",
        {
          name: editGroup.name.trim(),
          description: editGroup.description.trim() || null,
        },
        { id: editGroup.id }
      );
      
      setNotification({
        message: "Group updated successfully!",
        type: "success",
      });
      
      setShowEditModal(false);
      setEditGroup(null);
      fetchGroups();
    } catch (error: any) {
      console.error("Error updating group:", error);
      setNotification({
        message: `Error updating group: ${error?.message || String(error)}`,
        type: "error",
      });
    }
  };

  // Delete Group
  const handleDeleteGroup = async () => {
    if (!editGroup) return;
    
    try {
      // First delete group members (since crudClient doesn't have cascade)
      await deleteRecord("group_members", { group_id: editGroup.id });
      
      // Then delete the group
      await deleteRecord("groups", { id: editGroup.id });
      
      setNotification({
        message: "Group deleted successfully!",
        type: "success",
      });
      
      setShowDeleteConfirmOverlay(false);
      setShowEditModal(false);
      setEditGroup(null);
      fetchGroups();
    } catch (error: any) {
      console.error("Error deleting group:", error);
      setNotification({
        message: `Error deleting group: ${error?.message || String(error)}`,
        type: "error",
      });
    }
  };

  // Update Group Members with proper diff handling
  const handleUpdateGroupMembers = async () => {
    if (!selectedGroupForAddingMembers) return;

    // Don't allow removing yourself if you're the admin
    const currentUserIsAdmin = selectedGroupMembers.some(
      (member) => member.user_id === user?.id && member.role === "admin",
    );

    let processedSelectedMembers = [...selectedMembersForCreation];

    // If current user is admin, make sure they're in the selected list
    if (currentUserIsAdmin && user?.id && !processedSelectedMembers.includes(user.id)) {
      processedSelectedMembers.push(user.id);
    }

    // Compute members to add and remove
    const toAdd = processedSelectedMembers.filter(
      (friendId) => !existingMembers.includes(friendId),
    );

    const toRemove = existingMembers.filter(
      (friendId) =>
        !processedSelectedMembers.includes(friendId) &&
        !(friendId === user?.id && currentUserIsAdmin),
    );

    try {
      // Add new members one by one
      if (toAdd.length > 0) {
        for (const friendId of toAdd) {
          await insert("group_members", {
            group_id: selectedGroupForAddingMembers,
            user_id: friendId,
            role: "member",
          });
        }
      }

      // Remove members one by one
      if (toRemove.length > 0) {
        for (const friendId of toRemove) {
          await deleteRecord("group_members", {
            group_id: selectedGroupForAddingMembers,
            user_id: friendId
          });
        }
      }

      setNotification({
        message: "Group members updated successfully!",
        type: "success",
      });

      // Refresh the members list
      if (selectedGroupForMembers) {
        fetchGroupMembers(selectedGroupForAddingMembers, selectedGroupForMembers);
      }

      setShowFriendSelectionOverlay(false);
      setShowFriendSelectionModal(false);
      fetchGroups();
    } catch (error: any) {
      console.error("Error updating group members:", error);
      setNotification({
        message: `Error updating group members: ${error?.message || String(error)}`,
        type: "error",
      });
    }
  };

  // Leave Group functionality
  const handleLeaveGroup = async (groupId: string) => {
    if (!user) return;
    
    try {
      await deleteRecord("group_members", {
        group_id: groupId,
        user_id: user.id
      });
      
      setNotification({
        message: "You have left the group.",
        type: "success",
      });
      
      fetchGroups();
    } catch (error: any) {
      console.error("Error leaving group:", error);
      setNotification({
        message: `Error leaving group: ${error?.message || String(error)}`,
        type: "error",
      });
    }
  };

  // Friend request functions with proper error handling
  const fetchFriendRequests = async () => {
    if (!user) return;
    
    try {
      // Fetch sent requests (where current user is user_id_1)
      const sent = await select("friends", {
        select: "id, user_id_1, user_id_2, status, created_at",
        where: { user_id_1: user.id, status: "pending" },
        order: "created_at"
      });
      
      // Fetch user data for sent requests
      const formattedSent: FriendRequestSent[] = await Promise.all(
        sent.map(async (row: any) => {
          const userData = await selectOne("users", {
            select: "id, first_name, last_name, email, profile_image",
            where: { id: row.user_id_2 }
          });
          return {
            id: row.id,
            user_id_1: row.user_id_1,
            user_id_2: row.user_id_2,
            status: row.status,
            created_at: row.created_at,
            user: userData,
          };
        })
      );
      
      setSentRequests(formattedSent);

      // Fetch incoming requests (where current user is user_id_2)
      const incoming = await select("friends", {
        select: "id, user_id_1, user_id_2, status, created_at",
        where: { user_id_2: user.id, status: "pending" },
        order: "created_at"
      });
      
      // Fetch user data for incoming requests
      const formattedIncoming: FriendRequestIncoming[] = await Promise.all(
        incoming.map(async (row: any) => {
          const userData = await selectOne("users", {
            select: "id, first_name, last_name, email, profile_image",
            where: { id: row.user_id_1 }
          });
          return {
            id: row.id,
            user_id_1: row.user_id_1,
            user_id_2: row.user_id_2,
            status: row.status,
            created_at: row.created_at,
            user: userData,
          };
        })
      );
      
      setIncomingRequests(formattedIncoming);
      setFriendRequestCount(formattedIncoming.length);
      
      console.log("Friend requests - incoming:", formattedIncoming.length, "sent:", formattedSent.length);
    } catch (error: any) {
      console.error("Error fetching friend requests:", error);
      setNotification({
        message: "Error fetching friend requests: " + (error?.message || String(error)),
        type: "error",
      });
    }
  };

  const fetchFriendsList = async () => {
    if (!user) return;
    
    try {
      // Get friends where current user is user_id_1
      const sent = await select("friends", {
        select: "id, user_id_1, user_id_2, status, created_at",
        where: { user_id_1: user.id, status: "accepted" },
        order: "created_at"
      });

      // Get friends where current user is user_id_2
      const received = await select("friends", {
        select: "id, user_id_1, user_id_2, status, created_at",
        where: { user_id_2: user.id, status: "accepted" },
        order: "created_at"
      });

      // Fetch user data for sent friendships
      const sentFriendsWithData = await Promise.all(
        sent.map(async (row: any) => {
          const friendData = await selectOne("users", {
            select: "id, first_name, last_name, email, profile_image",
            where: { id: row.user_id_2 }
          });
          return {
            id: row.id,
            friend: friendData,
            created_at: row.created_at,
          };
        })
      );

      // Fetch user data for received friendships
      const receivedFriendsWithData = await Promise.all(
        received.map(async (row: any) => {
          const friendData = await selectOne("users", {
            select: "id, first_name, last_name, email, profile_image",
            where: { id: row.user_id_1 }
          });
          return {
            id: row.id,
            friend: friendData,
            created_at: row.created_at,
          };
        })
      );

      const formattedFriends: Friend[] = [
        ...sentFriendsWithData.filter((item: any) => item.friend),
        ...receivedFriendsWithData.filter((item: any) => item.friend),
      ];
      
      console.log("Friends list loaded:", formattedFriends.length);
      setFriendsList(formattedFriends);
    } catch (error: any) {
      console.error("Error fetching friends list:", error);
      setNotification({
        message: "Error fetching friends: " + (error?.message || String(error)),
        type: "error",
      });
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    
    try {
      setIsSearching(true);
      
      // Get all users first, then filter in memory since crudClient doesn't support complex queries
      const allUsers = await select("users", {
        select: "id, first_name, last_name, email, profile_image",
        limit: 100
      });
      
      // Filter by search query and exclude current user
      const searchResults = allUsers.filter(userData => {
        if (userData.id === user.id) return false;
        const query = searchQuery.toLowerCase();
        const firstName = userData.first_name?.toLowerCase() || "";
        const lastName = userData.last_name?.toLowerCase() || "";
        return firstName.includes(query) || lastName.includes(query);
      });
      
      // Filter out users who are already friends or have pending requests
      const existingFriendIds = new Set([
        ...friends.map(f => f.id),
        ...sentRequests.map(r => r.user_id_2),
        ...incomingRequests.map(r => r.user_id_1)
      ]);
      
      const filteredResults = searchResults.filter(userData => !existingFriendIds.has(userData.id));
      setSearchResults(filteredResults.slice(0, 20)); // Limit to 20 results
    } catch (error: any) {
      console.error("Error searching users:", error);
      setNotification({
        message: "Error searching users: " + (error?.message || String(error)),
        type: "error",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async (friendId: string) => {
    if (!user) return;
    
    try {
      await insert("friends", {
        user_id_1: user.id,
        user_id_2: friendId,
        status: "pending",
      });
      
      setNotification({
        message: "Friend request sent!",
        type: "success",
      });
      
      // Remove from search results
      setSearchResults(searchResults.filter(searchUser => searchUser.id !== friendId));
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      setNotification({
        message: "Error sending friend request: " + (error?.message || String(error)),
        type: "error",
      });
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await update("friends", { status: "accepted" }, { id: requestId });
      
      setNotification({
        message: "Friend request accepted!",
        type: "success",
      });
      
      fetchFriendRequests();
      fetchFriendsList();
    } catch (error: any) {
      console.error("Error accepting friend request:", error);
      setNotification({
        message: "Error accepting friend request: " + (error?.message || String(error)),
        type: "error",
      });
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await deleteRecord("friends", { id: requestId });
      
      setNotification({
        message: "Friend request declined",
        type: "success",
      });
      
      fetchFriendRequests();
    } catch (error: any) {
      console.error("Error declining friend request:", error);
      setNotification({
        message: "Error declining friend request: " + (error?.message || String(error)),
        type: "error",
      });
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await deleteRecord("friends", { id: requestId });
      
      setNotification({
        message: "Friend request canceled",
        type: "success",
      });
      
      fetchFriendRequests();
    } catch (error: any) {
      console.error("Error canceling friend request:", error);
      setNotification({
        message: "Error canceling friend request: " + (error?.message || String(error)),
        type: "error",
      });
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    try {
      await deleteRecord("friends", { id: friendshipId });
      
      setNotification({
        message: "Friend removed",
        type: "success",
      });
      
      fetchFriendsList();
    } catch (error: any) {
      console.error("Error removing friend:", error);
      setNotification({
        message: "Error removing friend: " + (error?.message || String(error)),
        type: "error",
      });
    }
  };

  // Toggle FAB menu
  const toggleFabMenu = (): void => {
    Animated.spring(fabMenuAnimation, {
      toValue: showFabMenu ? 0 : 1,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
    setShowFabMenu(!showFabMenu);
  };

  const handleFabOption = (option: string): void => {
    Animated.timing(fabMenuAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowFabMenu(false);
    });
    switch (option) {
      case "create":
        setShowCreateModal(true);
        break;
    }
  };

  // Toggle friend selection
  const toggleFriendSelectionHandler = (friendId: string) => {
    if (selectedMembersForCreation.includes(friendId)) {
      setSelectedMembersForCreation(selectedMembersForCreation.filter((id) => id !== friendId));
    } else {
      setSelectedMembersForCreation([...selectedMembersForCreation, friendId]);
    }
  };

  // Get role label with proper formatting
  const getRoleLabel = (role: string) => {
    switch (role.toLowerCase()) {
      case "admin":
        return (
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Admin</Text>
          </View>
        );
      case "member":
        return (
          <View style={[styles.roleBadge, styles.memberRoleBadge]}>
            <Text style={styles.roleBadgeText}>Member</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.roleBadge, styles.otherRoleBadge]}>
            <Text style={styles.roleBadgeText}>{role}</Text>
          </View>
        );
    }
  };

  // Render friend item in friend selection overlay/modal
  const renderFriendItem = ({ item }: { item: UserData }) => {
    const isSelected = selectedMembersForCreation.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.friendItem, isSelected && styles.friendItemSelected]}
        onPress={() => toggleFriendSelectionHandler(item.id)}
      >
        <Text style={styles.friendName}>
          {item.first_name} {item.last_name}
        </Text>
        {isSelected && <Feather name="check" size={18} color="#FAC898" />}
      </TouchableOpacity>
    );
  };

  // Render a group member item for the members modal
  const renderMemberItem = ({ item }: { item: GroupMember }) => {
    const canRemove =
      isManagingMembers &&
      !(item.user_id === user?.id && item.role === "admin") &&
      selectedGroupForMembers?.created_by === user?.id;

    const isSelected = selectedMembersForCreation.includes(item.user_id);

    return (
      <View style={styles.memberItem}>
        <View style={styles.memberAvatar}>
          <Text style={styles.memberInitials}>
            {item.user?.first_name?.[0] || ""}
            {item.user?.last_name?.[0] || ""}
          </Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {item.user?.first_name || ""} {item.user?.last_name || ""}
          </Text>
          {item.user_id === user?.id && <Text style={styles.currentUserTag}>(You)</Text>}
        </View>

        <View style={styles.memberActions}>
          {isManagingMembers && canRemove ? (
            <TouchableOpacity
              style={styles.memberRemoveButton}
              onPress={() => toggleFriendSelectionHandler(item.user_id)}
            >
              <Feather
                name={isSelected ? "check" : "x"}
                size={18}
                color={isSelected ? "#4CAF50" : "#DC3545"}
              />
            </TouchableOpacity>
          ) : (
            getRoleLabel(item.role)
          )}
        </View>
      </View>
    );
  };

  // Render a single group card
  const renderGroupItem = ({ item }: { item: Group }) => {
    return (
      <View style={styles.groupCard}>
        <View style={styles.groupHeader}>
          <View style={styles.groupIcon}>
            <Feather name="users" size={20} color="#FAC898" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.groupName}>{item.name}</Text>
            <Text style={styles.groupDate}>
              Created: {new Date(item.created_at).toLocaleDateString()}
            </Text>
            {item.is_ministry_group && (
              <Text style={styles.ministryLabel}>Ministry Group</Text>
            )}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* View Members Button */}
            <TouchableOpacity
              style={{ marginRight: 10 }}
              onPress={() => fetchGroupMembers(item.id.toString(), item)}
            >
              <Feather name="users" size={18} color="#FAC898" />
            </TouchableOpacity>

            {item.created_by === user?.id ? (
              <TouchableOpacity
                style={{ marginRight: 10 }}
                onPress={() => {
                  setEditGroup({
                    id: item.id.toString(),
                    name: item.name,
                    description: item.description,
                  });
                  setShowEditModal(true);
                }}
              >
                <Feather name="edit" size={18} color="#FAC898" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.leaveButton}
                onPress={() => {
                  setSelectedGroupToLeave(item.id.toString());
                  setShowLeaveConfirmModal(true);
                }}
              >
                <Text style={styles.leaveButtonText}>Leave</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {item.description ? (
          <Text style={styles.groupDescription}>{item.description}</Text>
        ) : (
          <Text style={styles.groupDescription}>No description provided.</Text>
        )}
      </View>
    );
  };

  return (
    <ImageBackground source={backgroundImageRequire} style={styles.backgroundImage}>
      <View style={[styles.backgroundOverlay, { opacity: 0.7 }]} />
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        {/* Notification Banner */}
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

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push("/community")}>
            <Feather name="arrow-left" size={24} color="#FAC898" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Groups & Friends</Text>
        </View>

        {/* Main Tabs */}
        <View style={styles.mainTabs}>
          <TouchableOpacity
            style={[styles.mainTab, activeTab === "groups" && styles.activeMainTab]}
            onPress={() => setActiveTab("groups")}
          >
            <Feather 
              name="users" 
              size={20} 
              color={activeTab === "groups" ? "#FAC898" : "rgba(255, 255, 255, 0.5)"} 
            />
            <Text style={[styles.mainTabText, activeTab === "groups" && styles.activeMainTabText]}>
              Groups
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mainTab, activeTab === "friends" && styles.activeMainTab]}
            onPress={() => setActiveTab("friends")}
          >
            <Feather 
              name="heart" 
              size={20} 
              color={activeTab === "friends" ? "#FAC898" : "rgba(255, 255, 255, 0.5)"} 
            />
            <Text style={[styles.mainTabText, activeTab === "friends" && styles.activeMainTabText]}>
              Friends {friendRequestCount > 0 && `(${friendRequestCount})`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content based on active tab */}
        {activeTab === "groups" ? (
          // Groups List
          isLoading ? (
            <View style={{ flex: 1, justifyContent: "center" }}>
              <ActivityIndicator size="large" color="#FAC898" />
            </View>
          ) : (
            <FlatList
              data={groups}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderGroupItem}
              contentContainerStyle={styles.groupsList}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No groups yet.</Text>
                  <TouchableOpacity
                    style={styles.emptyStateButton}
                    onPress={() => setShowCreateModal(true)}
                  >
                    <Text style={styles.emptyStateButtonText}>Create a Group</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )
        ) : (
          // Friends Section
          <View style={{ flex: 1 }}>
            {/* Friend Tabs */}
            <View style={styles.friendsTabs}>
              <TouchableOpacity
                style={[styles.friendTab, friendTab === "search" && styles.activeFriendTab]}
                onPress={() => setFriendTab("search")}
              >
                <Text style={[styles.friendTabText, friendTab === "search" && styles.activeFriendTabText]}>
                  Search
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.friendTab, friendTab === "requests" && styles.activeFriendTab]}
                onPress={() => setFriendTab("requests")}
              >
                <Text style={[styles.friendTabText, friendTab === "requests" && styles.activeFriendTabText]}>
                  Requests
                </Text>
                {friendRequestCount > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{friendRequestCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.friendTab, friendTab === "list" && styles.activeFriendTab]}
                onPress={() => setFriendTab("list")}
              >
                <Text style={[styles.friendTabText, friendTab === "list" && styles.activeFriendTabText]}>
                  Friends
                </Text>
              </TouchableOpacity>
            </View>

            {/* Friend Tab Content */}
            {friendTab === "search" && (
              <View style={{ flex: 1 }}>
                <View style={styles.searchContainer}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search friends..."
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                  />
                  <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                    <Feather name="search" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                {isSearching ? (
                  <ActivityIndicator size="large" color="#FAC898" style={{ marginTop: 20 }} />
                ) : (
                  <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <View style={styles.userCard}>
                        <View style={styles.userInfo}>
                          <View style={styles.userAvatar}>
                            <Feather name="user" size={24} color="#FAC898" />
                          </View>
                          <View>
                            <Text style={styles.userName}>
                              {item.first_name} {item.last_name}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity 
                          style={styles.addFriendButton} 
                          onPress={() => handleAddFriend(item.id)}
                        >
                          <Feather name="user-plus" size={18} color="#FFFFFF" />
                          <Text style={styles.addFriendText}>Add Friend</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    contentContainerStyle={styles.usersList}
                    ListEmptyComponent={
                      <Text style={styles.emptyStateText}>
                        {searchQuery ? "No users found" : "Search for friends"}
                      </Text>
                    }
                  />
                )}
              </View>
            )}

            {friendTab === "requests" && (
              <View style={{ flex: 1 }}>
                {incomingRequests.length === 0 && sentRequests.length === 0 ? (
                  <Text style={styles.emptyStateText}>No friend requests</Text>
                ) : (
                  <ScrollView contentContainerStyle={styles.requestsList}>
                    {incomingRequests.length > 0 && (
                      <>
                        <Text style={styles.sectionTitle}>Incoming Requests</Text>
                        {incomingRequests.map((request) => (
                          <View key={request.id} style={styles.requestCard}>
                            <View style={styles.userInfo}>
                              <View style={styles.userAvatar}>
                                <Feather name="user" size={24} color="#FAC898" />
                              </View>
                              <View>
                                <Text style={styles.userName}>
                                  {request.user.first_name} {request.user.last_name}
                                </Text>
                                <Text style={styles.requestDate}>
                                  {new Date(request.created_at).toLocaleDateString()}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.requestActions}>
                              <TouchableOpacity
                                style={styles.acceptButton}
                                onPress={() => handleAcceptRequest(request.id)}
                              >
                                <Feather name="check" size={18} color="#FFFFFF" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.declineButton}
                                onPress={() => handleDeclineRequest(request.id)}
                              >
                                <Feather name="x" size={18} color="#FFFFFF" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </>
                    )}
                    {sentRequests.length > 0 && (
                      <>
                        <Text style={styles.sectionTitle}>Sent Requests</Text>
                        {sentRequests.map((request) => (
                          <View key={request.id} style={styles.requestCard}>
                            <View style={styles.userInfo}>
                              <View style={styles.userAvatar}>
                                <Feather name="user" size={24} color="#FAC898" />
                              </View>
                              <View>
                                <Text style={styles.userName}>
                                  {request.user.first_name} {request.user.last_name}
                                </Text>
                                <Text style={styles.requestDate}>
                                  {new Date(request.created_at).toLocaleDateString()}
                                </Text>
                              </View>
                            </View>
                            <TouchableOpacity
                              style={styles.cancelButton}
                              onPress={() => handleCancelRequest(request.id)}
                            >
                              <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </>
                    )}
                  </ScrollView>
                )}
              </View>
            )}

            {friendTab === "list" && (
              <FlatList
                data={friendsList}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.friendCard}>
                    <View style={styles.userInfo}>
                      <View style={styles.userAvatar}>
                        <Feather name="user" size={24} color="#FAC898" />
                      </View>
                      <View>
                        <Text style={styles.userName}>
                          {item.friend.first_name} {item.friend.last_name}
                        </Text>
                        <Text style={styles.friendSince}>
                          Friends since {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.removeFriendButton}
                      onPress={() => handleRemoveFriend(item.id)}
                    >
                      <Feather name="user-x" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                )}
                contentContainerStyle={styles.friendsList}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No friends yet</Text>
                    <TouchableOpacity
                      style={styles.emptyStateButton}
                      onPress={() => setFriendTab("search")}
                    >
                      <Text style={styles.emptyStateButtonText}>Find Friends</Text>
                    </TouchableOpacity>
                  </View>
                }
              />
            )}
          </View>
        )}

        {/* Floating Action Button */}
        <TouchableOpacity style={styles.fab} onPress={toggleFabMenu}>
          <Animated.View style={{ transform: [{ rotate: fabRotation }] }}>
            <Feather name="plus" size={26} color="#FFFFFF" />
          </Animated.View>
        </TouchableOpacity>

        {/* FAB Menu */}
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
            <TouchableOpacity style={styles.fabMenuItem} onPress={() => handleFabOption("create")}>
              <Feather name="edit" size={22} color="#FAC898" />
              <Text style={styles.fabMenuItemText}>Create Group</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Group Members Modal */}
        <Modal
          visible={showMembersModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setShowMembersModal(false);
            setSelectedGroupMembers([]);
            setSelectedGroupForMembers(null);
            setIsManagingMembers(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedGroupForMembers?.name} Members</Text>
                <View style={{ flexDirection: "row" }}>
                  {/* Only show manage/done button for group admins */}
                  {selectedGroupForMembers?.created_by === user?.id && (
                    <TouchableOpacity
                      style={{ marginRight: 15 }}
                      onPress={() => setIsManagingMembers(!isManagingMembers)}
                    >
                      <Feather
                        name={isManagingMembers ? "check" : "edit-2"}
                        size={20}
                        color="#FAC898"
                      />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => {
                      setShowMembersModal(false);
                      setSelectedGroupMembers([]);
                      setSelectedGroupForMembers(null);
                      setIsManagingMembers(false);
                    }}
                  >
                    <Feather name="x" size={24} color="#FAC898" />
                  </TouchableOpacity>
                </View>
              </View>

              {membersLoading ? (
                <ActivityIndicator size="large" color="#FAC898" style={{ marginVertical: 20 }} />
              ) : (
                <>
                  <View style={styles.membersHeaderRow}>
                    <Text style={styles.memberCountText}>
                      {selectedGroupMembers.length}{" "}
                      {selectedGroupMembers.length === 1 ? "member" : "members"}
                    </Text>

                    {/* Show Add Members button when in managing mode */}
                    {isManagingMembers && selectedGroupForMembers?.created_by === user?.id && (
                      <TouchableOpacity
                        style={styles.addMembersButton}
                        onPress={() => setShowFriendSelectionOverlay(true)}
                      >
                        <Feather name="user-plus" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <FlatList
                    data={selectedGroupMembers}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMemberItem}
                    contentContainerStyle={styles.membersList}
                    ListEmptyComponent={
                      <Text style={styles.emptyMembersText}>No members found</Text>
                    }
                  />

                  {/* Save changes button when in managing mode */}
                  {isManagingMembers && selectedGroupForMembers?.created_by === user?.id && (
                    <TouchableOpacity
                      style={styles.saveChangesButton}
                      onPress={() => {
                        handleUpdateGroupMembers();
                        setIsManagingMembers(false);
                      }}
                    >
                      <Text style={styles.saveChangesButtonText}>Save Changes</Text>
                    </TouchableOpacity>
                  )}

                  {/* Friend Selection Overlay */}
                  {showFriendSelectionOverlay && (
                    <View style={styles.friendSelectionOverlay}>
                      <Text style={styles.modalTitle}>Add New Members</Text>
                      <FlatList
                        data={friends.filter(
                          (friend) =>
                            !selectedGroupMembers.some((member) => member.user_id === friend.id),
                        )}
                        keyExtractor={(item) => item.id}
                        renderItem={renderFriendItem}
                        contentContainerStyle={{ maxHeight: 300 }}
                        ListEmptyComponent={
                          <Text style={styles.emptyMembersText}>No friends to add</Text>
                        }
                      />
                      <View style={styles.modalActions}>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => setShowFriendSelectionOverlay(false)}
                        >
                          <Text style={styles.cancelButtonText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Create Group Modal */}
        <Modal
          visible={showCreateModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCreateModal(false)}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>New Group</Text>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Group Name</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newGroup.name}
                    onChangeText={(text) => setNewGroup({ ...newGroup, name: text })}
                    placeholder="Enter group name..."
                    placeholderTextColor="rgba(250, 200, 152, 0.5)"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Description</Text>
                  <TextInput
                    style={styles.formTextarea}
                    value={newGroup.description}
                    onChangeText={(text) => setNewGroup({ ...newGroup, description: text })}
                    placeholder="Enter group description..."
                    placeholderTextColor="rgba(250, 200, 152, 0.5)"
                    multiline
                    numberOfLines={3}
                  />
                </View>
                <View style={styles.formGroup}>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setNewGroup({ ...newGroup, is_ministry_group: !newGroup.is_ministry_group })}
                  >
                    <View style={[styles.checkbox, newGroup.is_ministry_group && styles.checkboxChecked]}>
                      {newGroup.is_ministry_group && <Feather name="check" size={16} color="#FFFFFF" />}
                    </View>
                    <Text style={styles.checkboxLabel}>This is a Ministry Group</Text>
                  </TouchableOpacity>
                </View>
                {selectedMembersForCreation.length > 0 && (
                  <View style={styles.selectedMembersContainer}>
                    <Text style={styles.selectedMembersLabel}>Members:</Text>
                    <FlatList
                      data={friends.filter((f) => selectedMembersForCreation.includes(f.id))}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <Text style={styles.selectedMemberText}>
                          {item.first_name} {item.last_name}
                        </Text>
                      )}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.addMembersButton}
                  onPress={() => setShowFriendSelectionOverlay(true)}
                >
                  <Text style={styles.addMembersButtonText}>Add Members</Text>
                </TouchableOpacity>

                {/* Friend Selection Overlay within Create Modal */}
                {showFriendSelectionOverlay && !selectedGroupForAddingMembers && (
                  <View style={styles.friendSelectionOverlay}>
                    <Text style={styles.modalTitle}>Select Members</Text>
                    <FlatList
                      data={friends}
                      keyExtractor={(item) => item.id}
                      renderItem={renderFriendItem}
                      contentContainerStyle={{ maxHeight: 300 }}
                    />
                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => setShowFriendSelectionOverlay(false)}
                      >
                        <Text style={styles.cancelButtonText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowCreateModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
                    <Text style={styles.createButtonText}>Create</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Edit Group Modal */}
        {showEditModal && editGroup && (
          <Modal
            visible={showEditModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => {
              setShowEditModal(false);
              setEditGroup(null);
              setShowDeleteConfirmOverlay(false);
            }}
          >
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Edit Group</Text>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Group Name</Text>
                    <TextInput
                      style={styles.formInput}
                      value={editGroup.name}
                      onChangeText={(text) => setEditGroup({ ...editGroup, name: text })}
                      placeholder="Enter group name..."
                      placeholderTextColor="rgba(250, 200, 152, 0.5)"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Description</Text>
                    <TextInput
                      style={styles.formTextarea}
                      value={editGroup.description}
                      onChangeText={(text) => setEditGroup({ ...editGroup, description: text })}
                      placeholder="Enter group description..."
                      placeholderTextColor="rgba(250, 200, 152, 0.5)"
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                  <View style={styles.modalActions}>
                    <View style={styles.leftActions}>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => setShowDeleteConfirmOverlay(true)}
                      >
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.rightActions}>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => {
                          setShowEditModal(false);
                          setEditGroup(null);
                          setShowDeleteConfirmOverlay(false);
                        }}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.createButton} onPress={handleUpdateGroup}>
                        <Text style={styles.createButtonText}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Delete Confirmation Overlay inside Edit Modal */}
                  {showDeleteConfirmOverlay && (
                    <View style={styles.confirmOverlay}>
                      <View style={styles.confirmOverlayContent}>
                        <Text style={styles.confirmOverlayText}>
                          Are you sure you want to delete this group?
                        </Text>
                        <View style={styles.confirmOverlayButtons}>
                          <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setShowDeleteConfirmOverlay(false)}
                          >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteGroup}>
                            <Text style={styles.deleteButtonText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        )}

        {/* Leave Group Confirmation Modal */}
        {showLeaveConfirmModal && (
          <Modal
            visible={showLeaveConfirmModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowLeaveConfirmModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Confirm Leave</Text>
                <Text style={styles.modalText}>Are you sure you want to leave this group?</Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowLeaveConfirmModal(false);
                      setSelectedGroupToLeave(null);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => {
                      if (selectedGroupToLeave) {
                        handleLeaveGroup(selectedGroupToLeave);
                      }
                      setShowLeaveConfirmModal(false);
                      setSelectedGroupToLeave(null);
                    }}
                  >
                    <Text style={styles.deleteButtonText}>Leave</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  membersHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  memberActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  memberRemoveButton: {
    padding: 8,
  },
  saveChangesButton: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: "center",
    marginTop: 15,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
    width: "100%",
  },
  saveChangesButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  backgroundImage: { flex: 1, width: "100%", height: "100%" },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 1)",
  },
  container: { flex: 1, paddingTop: Platform.OS === "android" ? 20 : 0 },
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(250, 200, 152, 0.1)",
  },
  backButton: { marginRight: 15 },
  headerTitle: {
    fontSize: 36,
    fontWeight: "300",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  groupsList: { padding: 15, paddingBottom: 100 },
  groupCard: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  groupHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  groupName: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
  groupDate: { color: "rgba(250, 200, 152, 0.8)", fontSize: 12, marginTop: 2 },
  ministryLabel: { 
    color: "rgba(250, 200, 152, 0.9)", 
    fontSize: 11, 
    marginTop: 2,
    fontStyle: "italic" 
  },
  groupDescription: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
    lineHeight: 20,
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
  emptyStateButtonText: { color: "#FFFFFF", fontWeight: "600" },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  modalContent: {
    backgroundColor: "rgba(41, 37, 36, 0.95)",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    paddingBottom: 10,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 5,
  },
  modalText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  formGroup: { marginBottom: 15 },
  formLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: "rgba(41, 37, 36, 0.9)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    color: "#FFFFFF",
    padding: 12,
    fontSize: 16,
  },
  formTextarea: {
    backgroundColor: "rgba(41, 37, 36, 0.9)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    color: "#FFFFFF",
    padding: 12,
    fontSize: 16,
    height: 80,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  leftActions: { justifyContent: "center", alignItems: "flex-start" },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  cancelButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  createButton: {
    backgroundColor: "rgba(250, 200, 152, 0.2)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(250, 200, 152, 0.4)",
  },
  createButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  deleteButton: {
    backgroundColor: "rgba(220, 38, 38, 0.2)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.4)",
  },
  deleteButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.2)",
    justifyContent: "space-between",
  },
  friendItemSelected: { backgroundColor: "rgba(16,185,129,0.3)" },
  friendName: { color: "#FFFFFF", fontSize: 16 },
  selectedMembersContainer: { marginBottom: 10 },
  selectedMembersLabel: { color: "#FFFFFF", fontSize: 14, marginBottom: 5 },
  selectedMemberText: { color: "#FAC898", fontSize: 14, marginRight: 10 },
  addMembersButton: {
    backgroundColor: "rgba(250, 200, 152, 0.2)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: "flex-start",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(250, 200, 152, 0.4)",
  },
  addMembersButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  friendSelectionOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.95)",
    padding: 20,
    borderRadius: 20,
    zIndex: 10,
  },
  confirmOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  confirmOverlayContent: {
    backgroundColor: "rgba(41, 37, 36, 0.95)",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmOverlayText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  confirmOverlayButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  leaveButton: {
    backgroundColor: "rgba(220,38,38,0.2)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: "flex-end",
    marginTop: 10,
  },
  leaveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  membersList: {
    paddingTop: 10,
    paddingBottom: 20,
    maxHeight: 400,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(250, 200, 152, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(250, 200, 152, 0.3)",
  },
  memberInitials: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  memberInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  memberName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  currentUserTag: {
    color: "#FAC898",
    fontSize: 14,
    marginLeft: 5,
    fontStyle: "italic",
  },
  roleBadge: {
    backgroundColor: "rgba(250, 200, 152, 0.2)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(250, 200, 152, 0.4)",
  },
  memberRoleBadge: {
    backgroundColor: "rgba(100, 100, 255, 0.2)",
    borderColor: "rgba(100, 100, 255, 0.4)",
  },
  otherRoleBadge: {
    backgroundColor: "rgba(180, 180, 180, 0.2)",
    borderColor: "rgba(180, 180, 180, 0.4)",
  },
  roleBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  memberCountText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    marginBottom: 10,
  },
  emptyMembersText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 16,
    textAlign: "center",
    padding: 20,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "transparent",
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "rgba(250, 200, 152, 0.3)",
    borderColor: "rgba(250, 200, 152, 0.6)",
  },
  checkboxLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  mainTabs: {
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  mainTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginHorizontal: 5,
  },
  activeMainTab: {
    backgroundColor: "rgba(250, 200, 152, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(250, 200, 152, 0.4)",
  },
  mainTabText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  activeMainTabText: {
    color: "#FAC898",
  },
  friendsTabs: {
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  friendTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginHorizontal: 2,
    position: "relative",
  },
  activeFriendTab: {
    backgroundColor: "rgba(250, 200, 152, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(250, 200, 152, 0.4)",
  },
  friendTabText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 14,
    fontWeight: "600",
  },
  activeFriendTabText: {
    color: "#FAC898",
  },
  tabBadge: {
    position: "absolute",
    top: 2,
    right: 5,
    backgroundColor: "#DC2626",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: "#FFFFFF",
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: "rgba(250, 200, 152, 0.3)",
    borderRadius: 20,
    padding: 10,
  },
  userCard: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(250, 200, 152, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  userName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  addFriendButton: {
    backgroundColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  addFriendText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 5,
  },
  usersList: {
    paddingBottom: 20,
  },
  requestsList: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  sectionTitle: {
    color: "#FAC898",
    fontSize: 18,
    fontWeight: "600",
    marginVertical: 15,
  },
  requestCard: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 15,
    padding: 15,
    marginVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  requestDate: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: "row",
    gap: 10,
  },
  acceptButton: {
    backgroundColor: "rgba(16, 185, 129, 0.4)",
    borderRadius: 15,
    padding: 8,
  },
  declineButton: {
    backgroundColor: "rgba(220, 38, 38, 0.4)",
    borderRadius: 15,
    padding: 8,
  },
  friendCard: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  friendSince: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    marginTop: 2,
  },
  removeFriendButton: {
    backgroundColor: "rgba(220, 38, 38, 0.3)",
    borderRadius: 15,
    padding: 8,
  },
  friendsList: {
    paddingBottom: 20,
  },
});