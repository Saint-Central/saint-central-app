import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from "react-native";

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
  likeAnimations: { [taskId: string]: any };
  heartAnimations: { [taskId: string]: any };
  getHeaderTitle: () => string;
  renderTaskGroupCard: (
    group: { key: string; tasks: LentTask[] },
    handleLikeToggle: (task: LentTask) => void,
    handleOpenComments: (task: LentTask) => void,
    showConfirmDelete: (taskId: string) => void,
    handleDeleteRecurringGroup: (recurrenceId: string) => void,
    handleToggleRecurringGroupCompletion: (
      recurrenceId: string,
      currentAllCompleted: boolean,
    ) => void,
    currentUserId: string,
    handleToggleTaskCompletion: (task: LentTask) => void,
    showCompletionConfirm: (
      recurrenceId: string,
      currentAllCompleted: boolean,
      task: LentTask,
    ) => void,
    likeAnimations: { [taskId: string]: any },
    heartAnimations: { [taskId: string]: any },
  ) => React.ReactNode;
  renderTaskCard: (task: LentTask, isUserTask: boolean) => React.ReactNode;
}

const LentListView: React.FC<LentListViewProps> = ({
  tasksFilter,
  groupedMyTasks,
  friendTasks,
  lentTasks,
  currentUserId,
  handleLikeToggle,
  handleOpenComments,
  showConfirmDelete,
  handleDeleteRecurringGroup,
  handleToggleRecurringGroupCompletion,
  handleToggleTaskCompletion,
  showCompletionConfirm,
  handleEditTask,
  likeAnimations,
  heartAnimations,
  getHeaderTitle,
  renderTaskGroupCard,
  renderTaskCard,
}) => {
  return (
    <View style={styles.container}>
      {/* My Tasks Section */}
      {tasksFilter === "all" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Tasks</Text>
          
          {groupedMyTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                You haven't added any tasks yet.
              </Text>
            </View>
          ) : (
            <View style={styles.tasksList}>
              {groupedMyTasks.map((group) => (
                <View key={group.key} style={styles.taskItem}>
                  {renderTaskGroupCard(
                    group,
                    handleLikeToggle,
                    handleOpenComments,
                    showConfirmDelete,
                    handleDeleteRecurringGroup,
                    handleToggleRecurringGroupCompletion,
                    currentUserId,
                    handleToggleTaskCompletion,
                    showCompletionConfirm,
                    likeAnimations,
                    heartAnimations,
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}
      
      {/* Friends & Groups Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {tasksFilter === "all" ? "Friends & Groups" : getHeaderTitle()}
        </Text>
        
        {tasksFilter === "all" ? (
          friendTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No tasks from friends or groups yet.
              </Text>
            </View>
          ) : (
            <View style={styles.tasksList}>
              {friendTasks.map((task) => (
                <View key={task.id} style={styles.taskItem}>
                  {renderTaskCard(task, false)}
                </View>
              ))}
            </View>
          )
        ) : lentTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No {tasksFilter === "friends" ? "friends'" : "group"} tasks available.
            </Text>
          </View>
        ) : (
          <View style={styles.tasksList}>
            {lentTasks.map((task) => (
              <View key={task.id} style={styles.taskItem}>
                {renderTaskCard(task, task.user_id === currentUserId)}
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  
  section: {
    marginBottom: 32,
  },
  
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fbbf24",
    marginBottom: 16,
    textAlign: "left",
  },
  
  tasksList: {
    gap: 16,
  },
  
  taskItem: {
    // Individual task container - let the parent components handle their own styling
  },
  
  emptyState: {
    backgroundColor: "#1f2937",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },
  
  emptyText: {
    color: "#9ca3af",
    fontSize: 16,
    textAlign: "center",
  },
});

export default LentListView;