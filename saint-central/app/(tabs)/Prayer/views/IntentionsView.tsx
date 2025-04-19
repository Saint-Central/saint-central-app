import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  RefreshControl,
  Animated,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { Church, Comment, DeleteModalState, EditingIntention, Intention, NewIntention, Notification } from "../types";
import { styles } from "../styles";
import IntentionCard from "../components/IntentionCard";
import CreateIntentionModal from "../components/CreateIntentionModal";
import EditIntentionModal from "../components/EditIntentionModal";
import DeleteIntentionModal from "../components/DeleteIntentionModal";

interface IntentionsViewProps {
  intentions: Intention[];
  selectedChurch: Church | null;
  currentUserId: string | null;
  currentUserRole: string;
  intentionsFilter: string;
  showIntentionModal: boolean;
  showEditModal: boolean;
  editingIntention: EditingIntention | null;
  deleteModal: DeleteModalState;
  comments: Comment[];
  newComment: string;
  commentsLoading: boolean;
  expandedCommentId: string | null;
  showFilterDropdown: boolean;
  filterDropdownAnim: Animated.Value;
  likeScaleAnimations: Map<string, Animated.Value>;
  likeOpacityAnimations: Map<string, Animated.Value>;
  newIntention: NewIntention;
  churchGroups: any[];
  churchMembers: any[];
  notification: Notification | null;
  refreshing: boolean;
  showVisibilityDropdownNew: boolean;
  showVisibilityDropdownEdit: boolean;
  createDescriptionFocused: boolean;
  editDescriptionFocused: boolean;
  churches: Church[];
  setCurrentView: (view: "home" | "churchDetails" | "groups") => void;
  setShowFilterDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  handleSelectFilter: (filter: string) => void;
  setShowIntentionModal: React.Dispatch<React.SetStateAction<boolean>>;
  setNewIntention: React.Dispatch<React.SetStateAction<NewIntention>>;
  setShowVisibilityDropdownNew: React.Dispatch<React.SetStateAction<boolean>>;
  toggleNewGroupSelection: (groupId: string) => void;
  toggleNewMemberSelection: (memberId: string) => void;
  setCreateDescriptionFocused: React.Dispatch<React.SetStateAction<boolean>>;
  handleCreateIntention: () => void;
  handleLikeIntention: (intentionId: string, isLiked: boolean) => void;
  handleToggleComments: (intentionId: string) => void;
  setNewComment: React.Dispatch<React.SetStateAction<string>>;
  handleAddComment: (intentionId: string) => void;
  handleEditIntention: (intention: Intention) => void;
  setEditingIntention: React.Dispatch<React.SetStateAction<EditingIntention | null>>;
  setShowVisibilityDropdownEdit: React.Dispatch<React.SetStateAction<boolean>>;
  toggleEditGroupSelection: (groupId: string) => void;
  toggleEditMemberSelection: (memberId: string) => void;
  setEditDescriptionFocused: React.Dispatch<React.SetStateAction<boolean>>;
  handleUpdateIntention: (intention: Intention) => void;
  setShowEditModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleDeleteClick: (intentionId: string) => void;
  setDeleteModal: React.Dispatch<React.SetStateAction<DeleteModalState>>;
  handleDeleteIntention: (intention: Intention) => void;
  handleRefresh: () => void;
  isLoading: boolean;
}

const IntentionsView: React.FC<IntentionsViewProps> = ({
  intentions,
  selectedChurch,
  currentUserId,
  currentUserRole,
  intentionsFilter,
  showIntentionModal,
  showEditModal,
  editingIntention,
  deleteModal,
  comments,
  newComment,
  commentsLoading,
  expandedCommentId,
  showFilterDropdown,
  filterDropdownAnim,
  likeScaleAnimations,
  likeOpacityAnimations,
  newIntention,
  churchGroups,
  churchMembers,
  notification,
  refreshing,
  showVisibilityDropdownNew,
  showVisibilityDropdownEdit,
  createDescriptionFocused,
  editDescriptionFocused,
  churches,
  setCurrentView,
  setShowFilterDropdown,
  handleSelectFilter,
  setShowIntentionModal,
  setNewIntention,
  setShowVisibilityDropdownNew,
  toggleNewGroupSelection,
  toggleNewMemberSelection,
  setCreateDescriptionFocused,
  handleCreateIntention,
  handleLikeIntention,
  handleToggleComments,
  setNewComment,
  handleAddComment,
  handleEditIntention,
  setEditingIntention,
  setShowVisibilityDropdownEdit,
  toggleEditGroupSelection,
  toggleEditMemberSelection,
  setEditDescriptionFocused,
  handleUpdateIntention,
  setShowEditModal,
  handleDeleteClick,
  setDeleteModal,
  handleDeleteIntention,
  handleRefresh,
  isLoading,
}) => {
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

  const getLikeScaleAnimation = (intentionId: string): Animated.Value => {
    return likeScaleAnimations.get(intentionId) || new Animated.Value(1);
  };

  const getLikeOpacityAnimation = (intentionId: string): Animated.Value => {
    return likeOpacityAnimations.get(intentionId) || new Animated.Value(0);
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

  return (
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
          onPress={() => selectedChurch ? setCurrentView("churchDetails") : setCurrentView("home")}
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
        
        <View style={styles.headerRightButtons}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setCurrentView("groups")}
          >
            <FontAwesome5 name="users" size={20} color="#4361EE" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowIntentionModal(true)}
          >
            <Feather name="plus" size={24} color="#4361EE" />
          </TouchableOpacity>
        </View>
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
      <CreateIntentionModal
        visible={showIntentionModal}
        newIntention={newIntention}
        setNewIntention={setNewIntention}
        churches={churches}
        churchGroups={churchGroups}
        churchMembers={churchMembers}
        selectedChurch={selectedChurch}
        createDescriptionFocused={createDescriptionFocused}
        setCreateDescriptionFocused={setCreateDescriptionFocused}
        showVisibilityDropdownNew={showVisibilityDropdownNew}
        setShowVisibilityDropdownNew={setShowVisibilityDropdownNew}
        toggleNewGroupSelection={toggleNewGroupSelection}
        toggleNewMemberSelection={toggleNewMemberSelection}
        handleCreateIntention={handleCreateIntention}
        setShowIntentionModal={setShowIntentionModal}
      />
      
      {/* Edit Intention Modal */}
      <EditIntentionModal
        visible={showEditModal}
        editingIntention={editingIntention}
        setEditingIntention={setEditingIntention}
        churches={churches}
        churchGroups={churchGroups}
        churchMembers={churchMembers}
        selectedChurch={selectedChurch}
        editDescriptionFocused={editDescriptionFocused}
        setEditDescriptionFocused={setEditDescriptionFocused}
        showVisibilityDropdownEdit={showVisibilityDropdownEdit}
        setShowVisibilityDropdownEdit={setShowVisibilityDropdownEdit}
        toggleEditGroupSelection={toggleEditGroupSelection}
        toggleEditMemberSelection={toggleEditMemberSelection}
        handleUpdateIntention={() => editingIntention && handleUpdateIntention(editingIntention)}
        setShowEditModal={setShowEditModal}
      />
      
      {/* Delete Confirmation Modal */}
      <DeleteIntentionModal
        deleteModal={deleteModal}
        setDeleteModal={setDeleteModal}
        handleDeleteIntention={() => {
          const intention = intentions.find(i => i.id === deleteModal.intentionId);
          intention && handleDeleteIntention(intention);
        }}
      />
      
      {isLoading && !intentions.length && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4361EE" />
        </View>
      )}
    </SafeAreaView>
  );
};

export default IntentionsView;