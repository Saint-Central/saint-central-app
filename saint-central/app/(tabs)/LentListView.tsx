import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/contexts/AuthContext";
import { useCRUD } from "@/utils/crudClient";

// --------------------
// Types
// --------------------
interface LentTask {
  id: string;
  user_id: string;
  event: string;
  description: string;
  date: string;
  created_at: string;
  user: {
    first_name: string;
    last_name: string;
    email: string;
  };
  likes_count?: number;
  comments_count?: number;
  liked_by_current_user?: boolean;
  group_info?: Group | null;
  visibility?: "Friends" | "Certain Groups" | "Just Me" | "Friends & Groups";
  selectedGroups?: (number | string)[];
  completed?: boolean;
  recurrence_id?: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  created_at: string;
  created_by: string;
}

interface LentListViewProps {
  tasksFilter: "all" | "friends" | "groups";
  groupedMyTasks: { key: string; tasks: LentTask[] }[];
  friendTasks: LentTask[];
  lentTasks: LentTask[];
  currentUserId: string;
  handleLikeToggle: (task: LentTask) => void;
  handleOpenComments: (task: LentTask) => void;
  showConfirmDelete: (taskId: string) => void;
  handleDeleteRecurringGroup: (recurrenceId: string) => void;
  handleToggleRecurringGroupCompletion: (
    recurrenceId: string,
    currentAllCompleted: boolean,
  ) => void;
  handleToggleTaskCompletion: (task: LentTask) => void;
  showCompletionConfirm: (
    recurrenceId: string,
    currentAllCompleted: boolean,
    task: LentTask,
  ) => void;
  handleEditTask: (task: LentTask) => void;
  likeAnimations: { [taskId: string]: Animated.Value };
  heartAnimations: { [taskId: string]: Animated.Value };
  getHeaderTitle: () => string;
  onRefresh?: () => void;
}

// Theme colors
const theme = {
  neutral900: '#1a1a1a',
  neutral800: '#262626',
  neutral700: '#404040',
  neutral600: '#525252',
  neutral500: '#737373',
  neutral400: '#a3a3a3',
  neutral300: '#d4d4d4',
  neutral100: '#f5f5f5',
  neutral50: '#fafafa',
  textWhite: '#ffffff',
  primary: '#f59e0b',
  secondary: '#10b981',
  tertiary: '#8b5cf6',
  accent1: '#f97316',
  accent2: '#06b6d4',
  accent3: '#84cc16',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
};

const visibilityOptions = [
  {
    label: "Friends",
    icon: <Feather name="users" size={12} color={theme.neutral400} />,
  },
  {
    label: "Certain Groups", 
    icon: <Feather name="grid" size={12} color={theme.neutral400} />,
  },
  {
    label: "Friends & Groups",
    icon: <MaterialCommunityIcons name="earth" size={12} color={theme.neutral400} />,
  },
  { 
    label: "Just Me", 
    icon: <Feather name="user" size={12} color={theme.neutral400} /> 
  },
];

// Helper function to format dates
const formatDateUTC = (dateStr: string): string => {
  const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const [year, month, day] = datePart.split("-");
  return `${Number(month)}/${Number(day)}/${year}`;
};

// Helper function to format relative time
const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
};

// Main component
const LentListView: React.FC<LentListViewProps> = ({
  tasksFilter,
  groupedMyTasks,
  friendTasks,
  lentTasks,
  currentUserId,
  handleLikeToggle: parentHandleLikeToggle,
  handleOpenComments,
  showConfirmDelete: parentShowConfirmDelete,
  handleDeleteRecurringGroup,
  handleToggleRecurringGroupCompletion,
  handleToggleTaskCompletion: parentHandleToggleTaskCompletion,
  showCompletionConfirm,
  handleEditTask,
  likeAnimations,
  heartAnimations,
  getHeaderTitle,
  onRefresh,
}) => {
  // Auth and CRUD hooks
  const { user } = useAuth();
  const { select, insert, update, delete: deleteRecord } = useCRUD();

  // Local state for database operations
  const [loading, setLoading] = useState(false);
  const [localTasks, setLocalTasks] = useState<LentTask[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Sync with parent tasks
  useEffect(() => {
    setLocalTasks([...groupedMyTasks.flatMap(g => g.tasks), ...friendTasks, ...lentTasks]);
  }, [groupedMyTasks, friendTasks, lentTasks]);

  // Memoized friend colors for consistent user identification
  const friendColors = useMemo(() => {
    const colors = [
      theme.tertiary,
      theme.secondary,
      theme.accent1,
      theme.accent2,
      theme.accent3,
      theme.primary,
    ];
    const uniqueFriends = Array.from(new Set(friendTasks.map(task => task.user.email)));
    const colorMap: { [email: string]: string } = {};
    uniqueFriends.forEach((email, index) => {
      colorMap[email] = colors[index % colors.length];
    });
    return colorMap;
  }, [friendTasks]);

  // Show notification function
  const showNotification = useCallback((message: string, type: "error" | "success") => {
    Alert.alert(type === "error" ? "Error" : "Success", message);
  }, []);

  // Enhanced like toggle with database integration
  const handleLikeToggle = useCallback(async (task: LentTask) => {
    if (!user?.id) return;

    const willBeLiked = !task.liked_by_current_user;
    const newLikeCount = willBeLiked 
      ? (task.likes_count || 0) + 1 
      : Math.max(0, (task.likes_count || 0) - 1);

    // Optimistic update
    setLocalTasks(prevTasks =>
      prevTasks.map(t =>
        t.id === task.id
          ? {
              ...t,
              likes_count: newLikeCount,
              liked_by_current_user: willBeLiked,
            }
          : t
      )
    );

    // Trigger animation
    if (parentHandleLikeToggle) {
      parentHandleLikeToggle(task);
    }

    try {
      if (willBeLiked) {
        // Add like to database
        await insert("likes", {
          user_id: user.id,
          likeable_id: task.id,
          likeable_type: "lent_tasks",
        });
      } else {
        // Remove like from database
        await deleteRecord("likes", {
          likeable_id: task.id,
          likeable_type: "lent_tasks",
          user_id: user.id
        });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      
      // Revert optimistic update on error
      setLocalTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === task.id
            ? {
                ...t,
                likes_count: task.likes_count || 0,
                liked_by_current_user: task.liked_by_current_user || false,
              }
            : t
        )
      );
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      showNotification(`Error updating like: ${errorMessage}`, "error");
      
      // Refresh data from parent
      if (onRefresh) {
        onRefresh();
      }
    }
  }, [user?.id, insert, deleteRecord, showNotification, onRefresh, parentHandleLikeToggle]);

  // Enhanced task completion toggle with database integration
  const handleToggleTaskCompletion = useCallback(async (task: LentTask) => {
    if (!user?.id || task.user_id !== user.id) return;

    const newCompleted = !task.completed;

    // Optimistic update
    setLocalTasks(prevTasks =>
      prevTasks.map(t =>
        t.id === task.id ? { ...t, completed: newCompleted } : t
      )
    );

    // Trigger parent handler for additional UI updates
    if (parentHandleToggleTaskCompletion) {
      parentHandleToggleTaskCompletion(task);
    }

    try {
      await update("lent_tasks", { completed: newCompleted }, { id: task.id });
    } catch (error) {
      console.error("Error updating task completion:", error);
      
      // Revert optimistic update on error
      setLocalTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === task.id ? { ...t, completed: !newCompleted } : t
        )
      );
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      showNotification(`Error updating task: ${errorMessage}`, "error");
      
      // Refresh data from parent
      if (onRefresh) {
        onRefresh();
      }
    }
  }, [user?.id, update, showNotification, onRefresh, parentHandleToggleTaskCompletion]);

  // Enhanced delete confirmation with database integration
  const showConfirmDelete = useCallback((taskId: string) => {
    const task = localTasks.find(t => t.id === taskId);
    const isRecurring = localTasks.some(t => t.recurrence_id === taskId);
    
    const title = isRecurring ? "Delete Recurring Tasks" : "Delete Task";
    const message = isRecurring
      ? "Are you sure you want to delete all tasks in this recurring series? This action cannot be undone."
      : "Are you sure you want to delete this task? This action cannot be undone.";

    Alert.alert(
      title,
      message,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => handleConfirmDelete(taskId, isRecurring)
        }
      ]
    );
  }, [localTasks]);

  // Handle confirmed delete with database integration
  const handleConfirmDelete = useCallback(async (taskId: string, isRecurring: boolean) => {
    try {
      setLoading(true);

      if (isRecurring) {
        // Delete all tasks in recurring series
        await deleteRecord("lent_tasks", { recurrence_id: taskId });
        
        // Remove from local state
        setLocalTasks(prevTasks => 
          prevTasks.filter(t => t.recurrence_id !== taskId)
        );
        
        showNotification("Recurring tasks deleted successfully!", "success");
      } else {
        // Delete single task
        await deleteRecord("lent_tasks", { id: taskId });
        
        // Remove from local state
        setLocalTasks(prevTasks => 
          prevTasks.filter(t => t.id !== taskId)
        );
        
        showNotification("Task deleted successfully!", "success");
      }

      // Refresh parent data
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showNotification(`Error deleting task: ${errorMessage}`, "error");
    } finally {
      setLoading(false);
    }
  }, [deleteRecord, showNotification, onRefresh]);

  // Refresh data from database
  const handleRefresh = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setRefreshing(true);
      
      // Fetch updated tasks from database
      const userTasks = await select("lent_tasks", {
        where: { user_id: user.id }
      });
      
      // Update local state with fresh data
      setLocalTasks(userTasks);
      
      // Trigger parent refresh
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error refreshing tasks:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showNotification(`Error refreshing: ${errorMessage}`, "error");
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, select, onRefresh, showNotification]);

  // Render individual task card
  const renderTaskCard = (task: LentTask, isUserTask: boolean) => {
    // Initialize animations if needed
    if (!likeAnimations[task.id]) {
      likeAnimations[task.id] = new Animated.Value(1);
    }
    if (!heartAnimations[task.id]) {
      heartAnimations[task.id] = new Animated.Value(task.liked_by_current_user ? 1 : 0);
    }

    const scaleAnim = likeAnimations[task.id];
    const heartAnim = heartAnimations[task.id];

    return (
      <View key={task.id} style={styles.taskCard}>
        <LinearGradient
          colors={task.completed 
            ? ['rgba(16, 185, 129, 0.1)', 'rgba(5, 150, 105, 0.05)']
            : ['rgba(139, 92, 246, 0.08)', 'rgba(124, 58, 237, 0.04)']}
          style={styles.taskCardGradient}
        >
          {/* Status indicator */}
          <View style={[
            styles.taskStatusIndicator,
            { backgroundColor: task.completed ? theme.success : theme.tertiary }
          ]} />
          
          {/* Header section */}
          <View style={styles.taskHeader}>
            <View style={styles.taskHeaderLeft}>
              {isUserTask && (
                <TouchableOpacity
                  onPress={() => handleToggleTaskCompletion(task)}
                  style={[
                    styles.checkbox,
                    task.completed && styles.checkboxCompleted
                  ]}
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={theme.textWhite} />
                  ) : task.completed ? (
                    <MaterialCommunityIcons
                      name="check"
                      size={16}
                      color={theme.textWhite}
                    />
                  ) : (
                    <View style={styles.checkboxInner} />
                  )}
                </TouchableOpacity>
              )}
              
              {!isUserTask && (
                <View 
                  style={[
                    styles.friendIndicator,
                    { backgroundColor: friendColors[task.user.email] || theme.tertiary }
                  ]} 
                />
              )}
              
              <View style={styles.taskTitleContainer}>
                <Text style={[
                  styles.taskTitle, 
                  task.completed && styles.completedTaskTitle
                ]}>
                  {task.event}
                </Text>
                <View style={styles.taskMetaRow}>
                  {!isUserTask && (
                    <View style={styles.authorTag}>
                      <MaterialCommunityIcons name="account-circle" size={14} color={theme.tertiary} />
                      <Text style={styles.authorText}>
                        {task.user.first_name} {task.user.last_name}
                      </Text>
                    </View>
                  )}
                  <View style={styles.dateTag}>
                    <MaterialCommunityIcons name="calendar" size={14} color={theme.neutral400} />
                    <Text style={styles.dateText}>{formatDateUTC(task.date)}</Text>
                  </View>
                  <View style={styles.relativeTimeTag}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color={theme.neutral500} />
                    <Text style={styles.relativeTimeText}>{formatRelativeTime(task.created_at)}</Text>
                  </View>
                </View>
              </View>
            </View>
            
            {task.completed && (
              <View style={styles.completedBadge}>
                <MaterialCommunityIcons name="check-circle" size={24} color={theme.success} />
              </View>
            )}
          </View>

          {/* Tags section */}
          <View style={styles.tagsContainer}>
            {task.group_info && (
              <View style={styles.groupTag}>
                <MaterialCommunityIcons name="account-group" size={12} color={theme.secondary} />
                <Text style={styles.groupTagText}>{task.group_info.name}</Text>
              </View>
            )}
            {task.visibility && (
              <View style={styles.visibilityTag}>
                {visibilityOptions.find(option => option.label === task.visibility)?.icon}
                <Text style={styles.visibilityTagText}>{task.visibility}</Text>
              </View>
            )}
          </View>

          {/* Description */}
          <Text style={styles.taskDescription}>{task.description}</Text>

          {/* Interaction bar */}
          <View style={styles.interactionBar}>
            <TouchableOpacity
              style={[styles.likeButton, task.liked_by_current_user && styles.likedButton]}
              onPress={() => handleLikeToggle(task)}
              activeOpacity={0.8}
              disabled={loading}
            >
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <MaterialCommunityIcons
                  name={task.liked_by_current_user ? "heart" : "heart-outline"}
                  size={20}
                  color={task.liked_by_current_user ? theme.error : theme.neutral400}
                />
              </Animated.View>
              <Text style={[
                styles.interactionText,
                task.liked_by_current_user && { color: theme.error, fontWeight: '600' }
              ]}>
                {task.likes_count || 0}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.commentButton}
              onPress={() => handleOpenComments(task)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="comment-outline" size={20} color={theme.neutral400} />
              <Text style={styles.interactionText}>{task.comments_count || 0}</Text>
            </TouchableOpacity>

            {isUserTask && (
              <View style={styles.taskActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditTask(task)}
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  <MaterialCommunityIcons name="pencil" size={16} color={theme.tertiary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => showConfirmDelete(task.id)}
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color={theme.error} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </LinearGradient>
      </View>
    );
  };

  // Render recurring task group card
  const renderRecurringTaskCard = (group: { key: string; tasks: LentTask[] }) => {
    const task = group.tasks[0];
    const isRecurring = group.tasks.length > 1;
    const allCompleted = group.tasks.every(t => t.completed);
    const startDate = isRecurring ? formatDateUTC(group.tasks[0].date) : "";
    const endDate = isRecurring ? formatDateUTC(group.tasks[group.tasks.length - 1].date) : "";

    // Initialize animations if needed
    if (!likeAnimations[task.id]) {
      likeAnimations[task.id] = new Animated.Value(1);
    }
    if (!heartAnimations[task.id]) {
      heartAnimations[task.id] = new Animated.Value(task.liked_by_current_user ? 1 : 0);
    }

    const scaleAnim = likeAnimations[task.id];

    return (
      <View key={group.key} style={styles.recurringTaskCard}>
        <LinearGradient
          colors={allCompleted 
            ? ['rgba(16, 185, 129, 0.12)', 'rgba(5, 150, 105, 0.06)']
            : ['rgba(139, 92, 246, 0.1)', 'rgba(124, 58, 237, 0.05)']}
          style={styles.taskCardGradient}
        >
          {/* Recurring indicator */}
          <View style={[
            styles.recurringIndicator,
            { backgroundColor: allCompleted ? theme.success : theme.tertiary }
          ]}>
            <MaterialCommunityIcons name="repeat" size={16} color={theme.textWhite} />
          </View>

          {/* Header section */}
          <View style={styles.taskHeader}>
            <View style={styles.taskHeaderLeft}>
              <TouchableOpacity
                onPress={() => showCompletionConfirm(group.key, allCompleted, task)}
                style={[
                  styles.checkbox,
                  allCompleted && styles.checkboxCompleted
                ]}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={theme.textWhite} />
                ) : allCompleted ? (
                  <MaterialCommunityIcons
                    name="check"
                    size={16}
                    color={theme.textWhite}
                  />
                ) : (
                  <View style={styles.checkboxInner} />
                )}
              </TouchableOpacity>
              
              <View style={styles.taskTitleContainer}>
                <View style={styles.recurringTitleRow}>
                  <Text style={[
                    styles.taskTitle, 
                    allCompleted && styles.completedTaskTitle
                  ]}>
                    {task.event}
                  </Text>
                  <View style={styles.recurringBadge}>
                    <MaterialCommunityIcons name="repeat" size={12} color={theme.textWhite} />
                    <Text style={styles.recurringBadgeText}>Recurring</Text>
                  </View>
                </View>
                <View style={styles.taskMetaRow}>
                  <View style={styles.dateRangeTag}>
                    <MaterialCommunityIcons name="calendar-range" size={14} color={theme.neutral400} />
                    <Text style={styles.dateText}>{startDate} - {endDate}</Text>
                  </View>
                  <View style={styles.taskCountTag}>
                    <MaterialCommunityIcons name="counter" size={14} color={theme.neutral400} />
                    <Text style={styles.taskCountText}>{group.tasks.length} tasks</Text>
                  </View>
                </View>
              </View>
            </View>
            
            {allCompleted && (
              <View style={styles.completedBadge}>
                <MaterialCommunityIcons name="check-circle" size={24} color={theme.success} />
              </View>
            )}
          </View>

          {/* Progress bar for recurring tasks */}
          <View style={styles.progressSection}>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar,
                  { 
                    width: `${(group.tasks.filter(t => t.completed).length / group.tasks.length) * 100}%`,
                    backgroundColor: allCompleted ? theme.success : theme.tertiary
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {group.tasks.filter(t => t.completed).length} of {group.tasks.length} completed
            </Text>
          </View>

          {/* Tags section */}
          <View style={styles.tagsContainer}>
            {task.group_info && (
              <View style={styles.groupTag}>
                <MaterialCommunityIcons name="account-group" size={12} color={theme.secondary} />
                <Text style={styles.groupTagText}>{task.group_info.name}</Text>
              </View>
            )}
            {task.visibility && (
              <View style={styles.visibilityTag}>
                {visibilityOptions.find(option => option.label === task.visibility)?.icon}
                <Text style={styles.visibilityTagText}>{task.visibility}</Text>
              </View>
            )}
          </View>

          {/* Description */}
          <Text style={styles.taskDescription}>{task.description}</Text>

          {/* Interaction bar */}
          <View style={styles.interactionBar}>
            <TouchableOpacity
              style={[styles.likeButton, task.liked_by_current_user && styles.likedButton]}
              onPress={() => handleLikeToggle(task)}
              activeOpacity={0.8}
              disabled={loading}
            >
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <MaterialCommunityIcons
                  name={task.liked_by_current_user ? "heart" : "heart-outline"}
                  size={20}
                  color={task.liked_by_current_user ? theme.error : theme.neutral400}
                />
              </Animated.View>
              <Text style={[
                styles.interactionText,
                task.liked_by_current_user && { color: theme.error, fontWeight: '600' }
              ]}>
                {task.likes_count || 0}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.commentButton}
              onPress={() => handleOpenComments(task)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="comment-outline" size={20} color={theme.neutral400} />
              <Text style={styles.interactionText}>{task.comments_count || 0}</Text>
            </TouchableOpacity>

            <View style={styles.taskActions}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => showConfirmDelete(task.recurrence_id || "")}
                activeOpacity={0.8}
                disabled={loading}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={16} color={theme.error} />
                <Text style={styles.deleteButtonText}>Delete Series</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.tertiary}
          colors={[theme.tertiary]}
        />
      }
    >
      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.tertiary} />
          <Text style={styles.loadingText}>Updating...</Text>
        </View>
      )}

      {/* My Tasks Section */}
      {tasksFilter === "all" && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account-circle" size={24} color={theme.primary} />
            <Text style={styles.sectionTitle}>My Tasks</Text>
            <View style={styles.taskCountBadge}>
              <Text style={styles.taskCountBadgeText}>{groupedMyTasks.length}</Text>
            </View>
          </View>
          
          {groupedMyTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="calendar-plus" size={48} color={theme.neutral500} />
              <Text style={styles.emptyTitle}>No Tasks Yet</Text>
              <Text style={styles.emptyText}>
                You haven't added any tasks for your Lent journey yet. Start by adding your first spiritual goal!
              </Text>
              <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
                <MaterialCommunityIcons name="refresh" size={16} color={theme.tertiary} />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.tasksList}>
              {groupedMyTasks.map((group) => (
                group.tasks.length > 1 
                  ? renderRecurringTaskCard(group)
                  : renderTaskCard(group.tasks[0], true)
              ))}
            </View>
          )}
        </View>
      )}
      
      {/* Friends & Groups Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons 
            name={tasksFilter === "friends" ? "account-group" : tasksFilter === "groups" ? "account-multiple" : "earth"} 
            size={24} 
            color={theme.secondary} 
          />
          <Text style={styles.sectionTitle}>
            {tasksFilter === "all" ? "Friends & Groups" : getHeaderTitle()}
          </Text>
          <View style={styles.taskCountBadge}>
            <Text style={styles.taskCountBadgeText}>
              {tasksFilter === "all" ? friendTasks.length : lentTasks.length}
            </Text>
          </View>
        </View>
        
        {tasksFilter === "all" ? (
          friendTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="account-group-outline" size={48} color={theme.neutral500} />
              <Text style={styles.emptyTitle}>No Community Tasks</Text>
              <Text style={styles.emptyText}>
                No tasks from friends or groups yet. Connect with others to see their spiritual journeys!
              </Text>
              <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
                <MaterialCommunityIcons name="refresh" size={16} color={theme.tertiary} />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.tasksList}>
              {friendTasks.map((task) => renderTaskCard(task, false))}
            </View>
          )
        ) : lentTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons 
              name={tasksFilter === "friends" ? "account-heart-outline" : "account-group-outline"} 
              size={48} 
              color={theme.neutral500} 
            />
            <Text style={styles.emptyTitle}>
              No {tasksFilter === "friends" ? "Friends'" : "Group"} Tasks
            </Text>
            <Text style={styles.emptyText}>
              No {tasksFilter === "friends" ? "friends'" : "group"} tasks available. 
              {tasksFilter === "friends" 
                ? " Add friends to see their spiritual journey!" 
                : " Join groups to participate in community challenges!"
              }
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
              <MaterialCommunityIcons name="refresh" size={16} color={theme.tertiary} />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.tasksList}>
            {lentTasks.map((task) => renderTaskCard(task, task.user_id === currentUserId))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.neutral900,
  },
  
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  
  loadingText: {
    color: theme.textWhite,
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  
  section: {
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(139, 92, 246, 0.2)',
  },
  
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.textWhite,
    marginLeft: 12,
    flex: 1,
    letterSpacing: 0.5,
  },
  
  taskCountBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  
  taskCountBadgeText: {
    color: theme.tertiary,
    fontSize: 14,
    fontWeight: '600',
  },
  
  tasksList: {
    gap: 16,
  },
  
  // Task Card Styles
  taskCard: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  
  recurringTaskCard: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  
  taskCardGradient: {
    padding: 20,
    position: 'relative',
  },
  
  taskStatusIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  
  recurringIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  
  taskHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: 'transparent',
  },
  
  checkboxCompleted: {
    backgroundColor: theme.tertiary,
    borderColor: theme.tertiary,
  },
  
  checkboxInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  
  friendIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  
  taskTitleContainer: {
    flex: 1,
  },
  
  recurringTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.textWhite,
    lineHeight: 24,
    flex: 1,
  },
  
  completedTaskTitle: {
    textDecorationLine: 'line-through',
    color: theme.neutral400,
  },
  
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  
  recurringBadgeText: {
    fontSize: 10,
    color: theme.textWhite,
    fontWeight: '600',
  },
  
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  
  authorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  
  authorText: {
    fontSize: 13,
    color: theme.tertiary,
    fontWeight: '500',
  },
  
  dateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  
  dateRangeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  
  dateText: {
    fontSize: 13,
    color: theme.neutral400,
    fontWeight: '400',
  },
  
  relativeTimeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  
  relativeTimeText: {
    fontSize: 12,
    color: theme.neutral500,
    fontStyle: 'italic',
  },
  
  taskCountTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  
  taskCountText: {
    fontSize: 13,
    color: theme.neutral400,
    fontWeight: '500',
  },
  
  completedBadge: {
    marginLeft: 12,
  },
  
  progressSection: {
    marginVertical: 16,
  },
  
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  
  progressText: {
    fontSize: 13,
    color: theme.neutral400,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  
  groupTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  
  groupTagText: {
    fontSize: 12,
    color: theme.secondary,
    fontWeight: '500',
  },
  
  visibilityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  
  visibilityTagText: {
    fontSize: 12,
    color: theme.neutral400,
    fontWeight: '500',
  },
  
  taskDescription: {
    fontSize: 15,
    color: theme.neutral300,
    lineHeight: 22,
    marginBottom: 20,
  },
  
  interactionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.1)',
    gap: 20,
  },
  
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  likedButton: {
    // Add any special styling for liked state
  },
  
  interactionText: {
    fontSize: 14,
    color: theme.neutral400,
    fontWeight: '500',
  },
  
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 8,
  },
  
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  
  deleteButtonText: {
    fontSize: 12,
    color: theme.error,
    fontWeight: '500',
  },
  
  // Empty State Styles
  emptyState: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.textWhite,
    marginTop: 16,
    marginBottom: 8,
  },
  
  emptyText: {
    color: theme.neutral400,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
    marginBottom: 16,
  },
  
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  
  refreshButtonText: {
    color: theme.tertiary,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default LentListView;