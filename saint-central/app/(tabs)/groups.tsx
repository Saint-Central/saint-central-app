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
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { supabase } from "../../supabaseClient";
import { router } from "expo-router";

// Reuse your background image
const backgroundImageRequire = require("../../assets/images/community-image.jpg");

interface Group {
  id: string;
  name: string;
  description: string;
  created_at: string;
  created_by: string;
}

interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

interface GroupMember {
  id: string;
  user_id: string;
  group_id: string;
  role: string;
  user: UserData;
}

interface Notification {
  message: string;
  type: "error" | "success";
}

export default function GroupsScreen() {
  // Groups & loading state
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Create Group state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newGroup, setNewGroup] = useState<{
    name: string;
    description: string;
  }>({
    name: "",
    description: "",
  });
  // Holds friend IDs selected for group creation or membership update.
  const [selectedMembersForCreation, setSelectedMembersForCreation] = useState<
    string[]
  >([]);

  // Edit Group state
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editGroup, setEditGroup] = useState<{
    id: string;
    name: string;
    description: string;
  } | null>(null);

  // Delete confirmation overlay inside the Edit modal
  const [showDeleteConfirmOverlay, setShowDeleteConfirmOverlay] =
    useState<boolean>(false);

  // When adding members from a group card, this holds the group ID.
  const [selectedGroupForAddingMembers, setSelectedGroupForAddingMembers] =
    useState<string | null>(null);
  // Holds the original member IDs of the group.
  const [existingMembers, setExistingMembers] = useState<string[]>([]);

  // Friend Selection UI:
  // For Create/Edit modals, use an overlay.
  const [showFriendSelectionOverlay, setShowFriendSelectionOverlay] =
    useState<boolean>(false);
  // For group card add-members, use a separate modal.
  const [showFriendSelectionModal, setShowFriendSelectionModal] =
    useState<boolean>(false);

  // Friends list (fetched from Supabase)
  const [friends, setFriends] = useState<UserData[]>([]);

  // Notification & current user
  const [notification, setNotification] = useState<Notification | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Leave Group confirmation modal state
  const [selectedGroupToLeave, setSelectedGroupToLeave] = useState<
    string | null
  >(null);
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] =
    useState<boolean>(false);

  // NEW: View members modal state
  const [showMembersModal, setShowMembersModal] = useState<boolean>(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<
    GroupMember[]
  >([]);
  const [selectedGroupForMembers, setSelectedGroupForMembers] =
    useState<Group | null>(null);
  const [membersLoading, setMembersLoading] = useState<boolean>(false);
  const [isManagingMembers, setIsManagingMembers] = useState<boolean>(false);

  // FAB animation state
  const [showFabMenu, setShowFabMenu] = useState(false);
  const fabMenuAnimation = React.useRef(new Animated.Value(0)).current;
  const fabRotation = fabMenuAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  useEffect(() => {
    getCurrentUser();
  }, []);

  // New: Once currentUserId is set, fetch groups
  useEffect(() => {
    if (currentUserId) {
      fetchGroups();
    }
  }, [currentUserId]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Get current user and fetch friends
  const getCurrentUser = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setCurrentUserId(data.user.id);
        fetchFriends(data.user.id);
      }
    } catch (error) {
      console.error("Error getting current user:", error);
    }
  };

  // Fetch groups from Supabase that the current user is a member of
  const fetchGroups = async () => {
    if (!currentUserId) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("groups")
        .select("*, group_members!inner(*)")
        .eq("group_members.user_id", currentUserId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setGroups(data || []);
    } catch (error: any) {
      console.error("Error fetching groups:", error);
      setNotification({
        message:
          "Error fetching groups: " +
          (error instanceof Error ? error.message : String(error)),
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
      const { data, error } = await supabase
        .from("group_members")
        .select("*, user:users(*)")
        .eq("group_id", groupId);

      if (error) throw error;
      setSelectedGroupMembers(data || []);
      setSelectedGroupForMembers(groupData);
      setShowMembersModal(true);

      // Reset states
      setIsManagingMembers(false);

      // Pre-populate selected members if this is a group created by current user
      if (groupData.created_by === currentUserId) {
        const memberIds =
          data?.map((member: GroupMember) => member.user_id) || [];
        setSelectedMembersForCreation(memberIds);
        setExistingMembers(memberIds);
        setSelectedGroupForAddingMembers(groupId);
      }
    } catch (error: any) {
      console.error("Error fetching group members:", error);
      setNotification({
        message: `Error fetching members: ${
          error instanceof Error ? error.message : String(error)
        }`,
        type: "error",
      });
    } finally {
      setMembersLoading(false);
    }
  };

  // Fetch friends using explicit relationship aliases
  const fetchFriends = async (userId: string) => {
    try {
      const { data: sent, error: sentError } = await supabase
        .from("friends")
        .select("user_id_2, user_2:users!friends_user_id_2_fkey(*)")
        .eq("user_id_1", userId)
        .eq("status", "accepted");
      if (sentError) throw sentError;

      const { data: incoming, error: incomingError } = await supabase
        .from("friends")
        .select("user_id_1, user_1:users!friends_user_id_1_fkey(*)")
        .eq("user_id_2", userId)
        .eq("status", "accepted");
      if (incomingError) throw incomingError;

      let friendList: UserData[] = [];
      if (sent) {
        friendList = friendList.concat(sent.map((row: any) => row.user_2));
      }
      if (incoming) {
        friendList = friendList.concat(incoming.map((row: any) => row.user_1));
      }
      setFriends(friendList);
    } catch (error: any) {
      console.error("Error fetching friends:", error);
    }
  };

  // When adding members from a group card, fetch existing member IDs and pre-select them.
  const fetchExistingGroupMembers = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId);
      if (error) throw error;
      const memberIds = data.map((row: any) => row.user_id);
      setExistingMembers(memberIds);
      // Pre-populate the selection state with the existing members.
      setSelectedMembersForCreation(memberIds);
    } catch (error: any) {
      console.error("Error fetching group members:", error);
      setExistingMembers([]);
    }
  };

  // Create Group
  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) {
      setNotification({
        message: "Please provide a group name.",
        type: "error",
      });
      return;
    }
    try {
      // Duplicate check
      const { data: duplicate, error: duplicateError } = await supabase
        .from("groups")
        .select("*")
        .eq("name", newGroup.name.trim());
      if (duplicateError) throw duplicateError;
      if (duplicate && duplicate.length > 0) {
        setNotification({
          message: "A group with that name already exists.",
          type: "error",
        });
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Not authenticated");

      // Insert new group
      const { data: groupData, error } = await supabase
        .from("groups")
        .insert({
          name: newGroup.name.trim(),
          description: newGroup.description.trim(),
          created_by: userData.user.id,
        })
        .select();
      if (error) throw error;
      const newGroupId = groupData[0].id;

      // Insert current user as admin into group_members
      const { error: adminInsertError } = await supabase
        .from("group_members")
        .insert({
          group_id: newGroupId,
          user_id: userData.user.id,
          role: "admin",
        });
      if (adminInsertError) throw adminInsertError;

      // Insert selected members (if any) as members
      if (selectedMembersForCreation.length > 0) {
        // Remove current user if accidentally included
        const filteredMembers = selectedMembersForCreation.filter(
          (friendId) => friendId !== userData.user.id
        );
        if (filteredMembers.length > 0) {
          const membersPayload = filteredMembers.map((friendId) => ({
            group_id: newGroupId,
            user_id: friendId,
            role: "member",
          }));
          const { error: membersError } = await supabase
            .from("group_members")
            .insert(membersPayload);
          if (membersError) throw membersError;
        }
      }
      setShowCreateModal(false);
      setNewGroup({ name: "", description: "" });
      setNotification({
        message: "Group created successfully!",
        type: "success",
      });
      fetchGroups();
    } catch (error: any) {
      console.error("Error creating group:", error);
      setNotification({
        message: `Error creating group: ${
          error instanceof Error ? error.message : String(error)
        }`,
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
      const { error } = await supabase
        .from("groups")
        .update({
          name: editGroup.name.trim(),
          description: editGroup.description.trim(),
        })
        .eq("id", editGroup.id);
      if (error) throw error;
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
        message: `Error updating group: ${
          error instanceof Error ? error.message : String(error)
        }`,
        type: "error",
      });
    }
  };

  // Delete Group
  const handleDeleteGroup = async () => {
    if (!editGroup) return;
    try {
      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", editGroup.id);
      if (error) throw error;
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
        message: `Error deleting group: ${
          error instanceof Error ? error.message : String(error)
        }`,
        type: "error",
      });
    }
  };

  // Update Group Members – compute diff and update membership.
  const handleUpdateGroupMembers = async () => {
    if (!selectedGroupForAddingMembers) return;

    // Don't allow removing yourself if you're the admin
    const currentUserIsAdmin = selectedGroupMembers.some(
      (member) => member.user_id === currentUserId && member.role === "admin"
    );

    let processedSelectedMembers = [...selectedMembersForCreation];

    // If current user is admin, make sure they're in the selected list
    if (
      currentUserIsAdmin &&
      !processedSelectedMembers.includes(currentUserId!)
    ) {
      processedSelectedMembers.push(currentUserId!);
    }

    // Compute friend IDs to add (in selectedMembersForCreation but not in existingMembers)
    const toAdd = processedSelectedMembers.filter(
      (friendId) => !existingMembers.includes(friendId)
    );

    // Compute friend IDs to remove (in existingMembers but not in selectedMembersForCreation)
    const toRemove = existingMembers.filter(
      (friendId) =>
        !processedSelectedMembers.includes(friendId) &&
        !(friendId === currentUserId && currentUserIsAdmin) // Don't remove yourself if admin
    );

    try {
      if (toAdd.length > 0) {
        const addPayload = toAdd.map((friendId) => ({
          group_id: selectedGroupForAddingMembers,
          user_id: friendId,
          role: "member",
        }));
        const { error: addError } = await supabase
          .from("group_members")
          .insert(addPayload);
        if (addError) throw addError;
      }

      if (toRemove.length > 0) {
        // Delete records by matching both group_id and user_id
        const { error: removeError } = await supabase
          .from("group_members")
          .delete()
          .eq("group_id", selectedGroupForAddingMembers)
          .in("user_id", toRemove);
        if (removeError) throw removeError;
      }

      setNotification({
        message: "Group members updated successfully!",
        type: "success",
      });

      // Refresh the members list
      if (selectedGroupForMembers) {
        fetchGroupMembers(
          selectedGroupForAddingMembers,
          selectedGroupForMembers
        );
      }

      setShowFriendSelectionOverlay(false);
      setShowFriendSelectionModal(false);
      fetchGroups();
    } catch (error: any) {
      console.error("Error updating group members:", error);
      setNotification({
        message: `Error updating group members: ${
          error instanceof Error ? error.message : String(error)
        }`,
        type: "error",
      });
    }
  };

  // New: Leave Group Functionality
  const handleLeaveGroup = async (groupId: string) => {
    if (!currentUserId) return;
    try {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", currentUserId);
      if (error) throw error;
      setNotification({
        message: "You have left the group.",
        type: "success",
      });
      fetchGroups();
    } catch (error: any) {
      console.error("Error leaving group:", error);
      setNotification({
        message: `Error leaving group: ${
          error instanceof Error ? error.message : String(error)
        }`,
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
      // Additional options can be added here.
    }
  };

  // Toggle friend selection in the friend selection overlay/modal.
  const toggleFriendSelectionHandler = (friendId: string) => {
    if (selectedMembersForCreation.includes(friendId)) {
      setSelectedMembersForCreation(
        selectedMembersForCreation.filter((id) => id !== friendId)
      );
    } else {
      setSelectedMembersForCreation([...selectedMembersForCreation, friendId]);
    }
  };

  // NEW: Get role label with proper formatting
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

  // Render friend item in friend selection overlay/modal.
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
    // In manage mode, don't allow removing yourself if you're the admin
    const canRemove =
      isManagingMembers &&
      !(item.user_id === currentUserId && item.role === "admin") &&
      selectedGroupForMembers?.created_by === currentUserId;

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
          {item.user_id === currentUserId && (
            <Text style={styles.currentUserTag}>(You)</Text>
          )}
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

  // Render a single group card with Edit button and View Members button
  // Also shows a "Leave Group" button for groups not created by the current user.
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
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* View Members Button */}
            <TouchableOpacity
              style={{ marginRight: 10 }}
              onPress={() => fetchGroupMembers(item.id, item)}
            >
              <Feather name="users" size={18} color="#FAC898" />
            </TouchableOpacity>

            {item.created_by === currentUserId ? (
              <TouchableOpacity
                style={{ marginRight: 10 }}
                onPress={() => {
                  setEditGroup({
                    id: item.id,
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
                  setSelectedGroupToLeave(item.id);
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
    <ImageBackground
      source={backgroundImageRequire}
      style={styles.backgroundImage}
    >
      <View style={[styles.backgroundOverlay, { opacity: 0.7 }]} />
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        {/* Notification Banner */}
        {notification && (
          <View
            style={[
              styles.notification,
              notification.type === "error"
                ? styles.errorNotification
                : styles.successNotification,
            ]}
          >
            <Text style={styles.notificationText}>{notification.message}</Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={24} color="#FAC898" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Groups</Text>
        </View>

        {/* Groups List */}
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <ActivityIndicator size="large" color="#FAC898" />
          </View>
        ) : (
          <FlatList
            data={groups}
            keyExtractor={(item) => item.id}
            renderItem={renderGroupItem}
            contentContainerStyle={styles.groupsList}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No groups yet.</Text>
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={() => setShowCreateModal(true)}
                >
                  <Text style={styles.emptyStateButtonText}>
                    Create a Group
                  </Text>
                </TouchableOpacity>
              </View>
            }
          />
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
            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={() => handleFabOption("create")}
            >
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
                <Text style={styles.modalTitle}>
                  {selectedGroupForMembers?.name} Members
                </Text>
                <View style={{ flexDirection: "row" }}>
                  {/* Only show manage/done button for group admins */}
                  {selectedGroupForMembers?.created_by === currentUserId && (
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
                <ActivityIndicator
                  size="large"
                  color="#FAC898"
                  style={{ marginVertical: 20 }}
                />
              ) : (
                <>
                  <View style={styles.membersHeaderRow}>
                    <Text style={styles.memberCountText}>
                      {selectedGroupMembers.length}{" "}
                      {selectedGroupMembers.length === 1 ? "member" : "members"}
                    </Text>

                    {/* Show Add Members button when in managing mode */}
                    {isManagingMembers &&
                      selectedGroupForMembers?.created_by === currentUserId && (
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
                      <Text style={styles.emptyMembersText}>
                        No members found
                      </Text>
                    }
                  />

                  {/* Save changes button when in managing mode */}
                  {isManagingMembers &&
                    selectedGroupForMembers?.created_by === currentUserId && (
                      <TouchableOpacity
                        style={styles.saveChangesButton}
                        onPress={() => {
                          handleUpdateGroupMembers();
                          setIsManagingMembers(false);
                        }}
                      >
                        <Text style={styles.saveChangesButtonText}>
                          Save Changes
                        </Text>
                      </TouchableOpacity>
                    )}

                  {/* Friend Selection Overlay */}
                  {showFriendSelectionOverlay && (
                    <View style={styles.friendSelectionOverlay}>
                      <Text style={styles.modalTitle}>Add New Members</Text>
                      <FlatList
                        data={friends.filter(
                          (friend) =>
                            !selectedGroupMembers.some(
                              (member) => member.user_id === friend.id
                            )
                        )}
                        keyExtractor={(item) => item.id}
                        renderItem={renderFriendItem}
                        contentContainerStyle={{ maxHeight: 300 }}
                        ListEmptyComponent={
                          <Text style={styles.emptyMembersText}>
                            No friends to add
                          </Text>
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
                    onChangeText={(text) =>
                      setNewGroup({ ...newGroup, name: text })
                    }
                    placeholder="Enter group name..."
                    placeholderTextColor="rgba(250, 200, 152, 0.5)"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Description</Text>
                  <TextInput
                    style={styles.formTextarea}
                    value={newGroup.description}
                    onChangeText={(text) =>
                      setNewGroup({ ...newGroup, description: text })
                    }
                    placeholder="Enter group description..."
                    placeholderTextColor="rgba(250, 200, 152, 0.5)"
                    multiline
                    numberOfLines={3}
                  />
                </View>
                {selectedMembersForCreation.length > 0 && (
                  <View style={styles.selectedMembersContainer}>
                    <Text style={styles.selectedMembersLabel}>Members:</Text>
                    <FlatList
                      data={friends.filter((f) =>
                        selectedMembersForCreation.includes(f.id)
                      )}
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
                {showFriendSelectionOverlay &&
                  !selectedGroupForAddingMembers && (
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
                  <TouchableOpacity
                    style={styles.createButton}
                    onPress={handleCreateGroup}
                  >
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
                      onChangeText={(text) =>
                        setEditGroup({ ...editGroup, name: text })
                      }
                      placeholder="Enter group name..."
                      placeholderTextColor="rgba(250, 200, 152, 0.5)"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Description</Text>
                    <TextInput
                      style={styles.formTextarea}
                      value={editGroup.description}
                      onChangeText={(text) =>
                        setEditGroup({ ...editGroup, description: text })
                      }
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
                      <TouchableOpacity
                        style={styles.createButton}
                        onPress={handleUpdateGroup}
                      >
                        <Text style={styles.createButtonText}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Friend Selection Overlay within Edit Modal for updating members */}
                  {showFriendSelectionOverlay &&
                    selectedGroupForAddingMembers && (
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
                          <TouchableOpacity
                            style={styles.createButton}
                            onPress={handleUpdateGroupMembers}
                          >
                            <Text style={styles.createButtonText}>Save</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

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
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={handleDeleteGroup}
                          >
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

        {/* Friend Selection Modal for Adding Members from Group Card */}
        {!showCreateModal &&
          !showEditModal &&
          showFriendSelectionModal &&
          selectedGroupForAddingMembers && (
            <Modal
              visible={true}
              transparent={true}
              animationType="fade"
              onRequestClose={() => {
                setSelectedMembersForCreation([]);
                setSelectedGroupForAddingMembers(null);
                setShowFriendSelectionModal(false);
              }}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
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
                      onPress={() => {
                        setSelectedMembersForCreation([]);
                        setSelectedGroupForAddingMembers(null);
                        setShowFriendSelectionModal(false);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Done</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.createButton}
                      onPress={handleUpdateGroupMembers}
                    >
                      <Text style={styles.createButtonText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
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
                <Text style={styles.modalText}>
                  Are you sure you want to leave this group?
                </Text>
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
  // Friend Selection Overlay style – used within Create and Edit modals
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
  // NEW: Member list styles
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
});
