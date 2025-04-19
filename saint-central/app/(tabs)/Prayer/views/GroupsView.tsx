import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { Church, Group, Notification } from "../types";
import { styles } from "../styles";

interface GroupsViewProps {
  groups: Group[];
  selectedChurch: Church | null;
  currentUserId: string | null;
  currentUserRole: string;
  notification: Notification | null;
  refreshing: boolean;
  isLoading: boolean;
  setCurrentView: (view: "home" | "churchDetails") => void;
  handleRefresh: () => void;
}

const GroupsView: React.FC<GroupsViewProps> = ({
  groups,
  selectedChurch,
  currentUserId,
  currentUserRole,
  notification,
  refreshing,
  isLoading,
  setCurrentView,
  handleRefresh,
}) => {
  const renderGroupCard = ({ item }: { item: Group }) => {
    return (
      <View style={styles.intentionCard}>
        <View style={styles.intentionHeader}>
          <FontAwesome5 name="users" size={20} color="#4361EE" />
          <View style={styles.intentionHeaderText}>
            <Text style={styles.intentionAuthor}>{item.name}</Text>
            <Text style={styles.authorTag}>{item.description}</Text>
          </View>
        </View>
        <View style={styles.intentionMeta}>
          <Text style={styles.intentionTime}>
            Created {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
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
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {selectedChurch ? `${selectedChurch.name} Groups` : "My Groups"}
          </Text>
        </View>
      </View>
      
      <FlatList
        data={groups}
        renderItem={renderGroupCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.intentionList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <FontAwesome5 name="users" size={50} color="#CBD5E1" />
            <Text style={styles.emptyStateText}>
              {isLoading
                ? "Loading groups..."
                : "No groups to show."}
            </Text>
          </View>
        }
      />
      
      {isLoading && !groups.length && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4361EE" />
        </View>
      )}
    </SafeAreaView>
  );
};

export default GroupsView; 