import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { supabase } from '../../../../supabaseClient';
import { Church, Group, Ministry } from "../types";

interface GroupsViewProps {
  churches: Church[];
  isLoading: boolean;
  refreshing: boolean;
  navigateToHome: () => void;
  handleRefresh: () => void;
}

interface GroupWithMembers extends Group {
  memberCount: number;
  ministryName?: string;
}

const GroupsView = ({
  churches,
  isLoading,
  refreshing,
  navigateToHome,
  handleRefresh
}: GroupsViewProps) => {
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [syncingGroups, setSyncingGroups] = useState(false);

  useEffect(() => {
    loadGroups();
  }, [churches]);

  const loadGroups = async () => {
    try {
      if (churches.length === 0) return;
      
      // Get all regular groups
      const { data: existingGroups, error: groupsError } = await supabase
        .from("groups")
        .select("*")
        .in("church_id", churches.map(church => church.id));
      
      if (groupsError) throw groupsError;
      
      // Get all ministries
      const { data: ministries, error: ministriesError } = await supabase
        .from("ministries")
        .select("*")
        .in("church_id", churches.map(church => church.id));
      
      if (ministriesError) throw ministriesError;

      // Get member counts for each group
      const groupsWithMembers = await Promise.all((existingGroups || []).map(async (group) => {
        const { count } = await supabase
          .from("group_members")
          .select("*", { count: "exact", head: true })
          .eq("group_id", group.id);

        let ministryName;
        if (group.is_ministry_group) {
          // For ministry groups, find the matching ministry by church_id
          const ministry = ministries?.find(m => m.church_id === group.church_id);
          ministryName = ministry?.name || null;
        }

        return {
          ...group,
          memberCount: count || 0,
          ministryName
        };
      }));

      setGroups(groupsWithMembers || []);
      
      // Get ministry members that don't have groups yet
      const { data: ministryMembers, error: membersError } = await supabase
        .from("ministry_members")
        .select("*, ministries(name)")
        .in("church_id", churches.map(church => church.id));

      if (membersError) throw membersError;
      
      if (ministryMembers && ministryMembers.length > 0) {
        await syncGroupsWithMinistryMembers(ministryMembers, groupsWithMembers || []);
      }
    } catch (error) {
      console.error("Error loading groups:", error);
    }
  };

  const syncGroupsWithMinistryMembers = async (ministryMembers: any[], existingGroups: GroupWithMembers[]) => {
    try {
      setSyncingGroups(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create groups for ministry members that don't have one
      const newGroups = ministryMembers.map(member => ({
        name: `${member.ministries.name} Group`,
        description: `Group for ${member.ministries.name} ministry`,
        church_id: member.church_id,
        is_ministry_group: true,
        created_by: user?.id || null,
        created_at: new Date().toISOString()
      }));
      
      // Insert new groups
      const { data: createdGroups, error } = await supabase
        .from("groups")
        .insert(newGroups)
        .select();
      
      if (error) throw error;

      // Get member counts for new groups
      const newGroupsWithMembers = await Promise.all((createdGroups || []).map(async (group) => {
        const { count } = await supabase
          .from("group_members")
          .select("*", { count: "exact", head: true })
          .eq("group_id", group.id);

        const ministryMember = ministryMembers.find(m => m.church_id === group.church_id);
        
        return {
          ...group,
          memberCount: count || 0,
          ministryName: ministryMember?.ministries?.name
        };
      }));
      
      // Update local state with new groups
      setGroups([...existingGroups, ...newGroupsWithMembers]);

      // Add ministry member as group member
      for (const group of newGroupsWithMembers) {
        if (!group.is_ministry_group) continue;

        const ministryMember = ministryMembers.find(m => m.church_id === group.church_id);
        if (!ministryMember) continue;

        const { error: insertError } = await supabase
          .from("group_members")
          .insert({
            group_id: group.id,
            user_id: ministryMember.user_id,
            role: 'member',
            joined_at: new Date().toISOString()
          });

        if (insertError) throw insertError;
      }
      
    } catch (error) {
      console.error("Error syncing groups with ministry members:", error);
    } finally {
      setSyncingGroups(false);
    }
  };

  const renderItem = ({ item }: { item: GroupWithMembers }) => {
    const church = churches.find(c => c.id === item.church_id);
    
    return (
      <View style={styles.groupCard}>
        <Text style={styles.groupName}>{item.is_ministry_group ? item.ministryName : item.name}</Text>
        {item.description && (
          <Text style={styles.groupDescription}>{item.description}</Text>
        )}
        {church && (
          <Text style={styles.churchName}>Church: {church.name}</Text>
        )}
        <View style={styles.groupInfo}>
          <Text style={styles.members}>
            {item.is_ministry_group ? 'Ministry Group' : 'Standard Group'}
          </Text>
          <Text style={styles.memberCount}>
            {item.memberCount} {item.memberCount === 1 ? 'Member' : 'Members'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={navigateToHome} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Groups</Text>
      </View>
      
      {(isLoading || syncingGroups) ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4361EE" />
          {syncingGroups && (
            <Text style={styles.syncingText}>Creating groups for ministries...</Text>
          )}
        </View>
      ) : (
        <>
          {groups.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                You don't have any groups yet. Groups will be created automatically for each ministry.
              </Text>
            </View>
          ) : (
            <FlatList
              data={groups}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#4361EE",
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
    textAlign: "center",
    marginRight: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  syncingText: {
    marginTop: 16,
    color: "#666",
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  listContainer: {
    padding: 16,
  },
  groupCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  groupDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  churchName: {
    fontSize: 14,
    color: "#4361EE",
    marginBottom: 8,
  },
  members: {
    fontSize: 12,
    color: "#999",
  },
  groupInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  memberCount: {
    fontSize: 12,
    color: '#666',
  }
});

export default GroupsView;