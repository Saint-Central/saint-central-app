import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useCRUD } from '../utils/crudClient';

// Types
export interface PrayerIntention {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  type: IntentionType;
  created_at: Date;
  visibility: IntentionVisibility;
  selected_groups?: string[];
  selected_friends?: string[];
  completed: boolean;
  favorite: boolean;
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
  user?: UserData; // Add user data for compatibility with community.tsx
}

export interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  created_at: Date;
  created_by: string;
  church_id?: number;
  is_ministry_group?: boolean;
  ministry_id?: number;
}

export type IntentionType =
  | "prayer"
  | "goal"
  | "resolution"
  | "spiritual"
  | "family"
  | "health"
  | "work"
  | "friends"
  | "world"
  | "personal"
  | "other";

export type IntentionVisibility =
  | "Just Me"
  | "Friends"
  | "Friends & Groups"
  | "Certain Friends"
  | "Certain Groups";

export interface PrayerIntentionsContextType {
  // Data
  intentions: PrayerIntention[];
  loading: boolean;
  refreshing: boolean;
  userGroups: Group[];
  userFriends: UserData[];
  
  // Actions
  fetchIntentions: () => Promise<void>;
  addIntention: (intentionData: Partial<PrayerIntention>) => Promise<void>;
  updateIntention: (id: string, updates: Partial<PrayerIntention>) => Promise<void>;
  deleteIntention: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  toggleCompleted: (id: string) => Promise<void>;
  refreshIntentions: () => Promise<void>;
  
  // Filters
  getFilteredIntentions: (filter?: {
    type?: IntentionType | 'all';
    visibility?: 'all' | 'mine' | 'friends' | 'groups';
    completed?: boolean;
    favorite?: boolean;
  }) => PrayerIntention[];
}

const PrayerIntentionsContext = createContext<PrayerIntentionsContextType | undefined>(undefined);

export const usePrayerIntentions = () => {
  const context = useContext(PrayerIntentionsContext);
  if (context === undefined) {
    throw new Error('usePrayerIntentions must be used within a PrayerIntentionsProvider');
  }
  return context;
};

interface PrayerIntentionsProviderProps {
  children: ReactNode;
}

export const PrayerIntentionsProvider: React.FC<PrayerIntentionsProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const crud = useCRUD();
  const [intentions, setIntentions] = useState<PrayerIntention[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [userFriends, setUserFriends] = useState<UserData[]>([]);

  // Fetch user's groups
  const fetchUserGroups = async () => {
    if (!user) return;

    try {
      // First get the user's group memberships
      const memberships = await crud.select("group_members", {
        where: { user_id: user.id },
      });

      if (!memberships || memberships.length === 0) {
        setUserGroups([]);
        return;
      }

      // Get the group IDs from memberships
      const groupIds = memberships.map((membership) => membership.group_id);

      // Fetch the groups based on the IDs
      const groups = await crud.select("groups", {
        where: { id: groupIds },
      });

      // Format the data
      const formattedGroups: Group[] = (groups || []).map((group) => ({
        ...group,
        created_at: new Date(group.created_at),
      }));

      setUserGroups(formattedGroups);
    } catch (error) {
      console.error("Error fetching user groups:", error);
      setUserGroups([]);
    }
  };

  // Fetch user's friends
  const fetchUserFriends = async () => {
    if (!user) return;

    try {
      const friendships = await crud.select("friends", {
        where: { user_id_1: user.id, status: "accepted" },
      });

      // Get friend user data
      const friendIds = friendships.map(f => f.user_id_2);
      const users = await crud.select("users", {
        where: { id: friendIds },
      });

      const formattedFriends: UserData[] = users.map((friend) => ({
        id: friend.id,
        first_name: friend.first_name,
        last_name: friend.last_name,
        created_at: friend.created_at,
      }));

      setUserFriends(formattedFriends);
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  };

  // Fetch all prayer intentions with visibility filtering
  const fetchIntentions = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get user's friends
      const sentFriends = await crud.select("friends", {
        where: { user_id_1: user.id, status: "accepted" },
      });

      const receivedFriends = await crud.select("friends", {
        where: { user_id_2: user.id, status: "accepted" },
      });

      // Create a set of friend IDs
      const friendIds = new Set();
      if (sentFriends) {
        sentFriends.forEach((friend) => friendIds.add(friend.user_id_2));
      }
      if (receivedFriends) {
        receivedFriends.forEach((friend) => friendIds.add(friend.user_id_1));
      }

      // Get user's groups
      const userGroupsData = await crud.select("group_members", {
        where: { user_id: user.id },
      });

      const userGroupIds = userGroupsData ? userGroupsData.map((g) => g.group_id) : [];

      // Fetch all intentions
      const data = await crud.select("intentions");

      // Filter intentions based on visibility
      const filteredData = await Promise.all(
        data.map(async (item) => {
          // Always show user's own intentions
          if (item.user_id === user.id) return item;

          // Check visibility settings
          switch (item.visibility) {
            case "Just Me":
              return null;
            case "Friends":
              return friendIds.has(item.user_id) ? item : null;
            case "Certain Friends":
              return item.selected_friends?.includes(user.id) ? item : null;
            case "Certain Groups":
              // Check if user is in any of the selected groups
              const creatorGroups = await crud.select("group_members", {
                where: { user_id: item.user_id },
              });
              
              if (!creatorGroups) return null;
              
              const creatorGroupIds = creatorGroups.map(g => g.group_id);
              return creatorGroupIds.some(groupId => userGroupIds.includes(groupId)) ? item : null;
            default:
              return null;
          }
        })
      );

      // Remove null values
      const validIntentions = filteredData.filter((item) => item !== null);

      // Get unique user IDs from valid intentions
      const userIds = [...new Set(validIntentions.map((item) => item.user_id))];
      
      // Fetch user data
      const users = await crud.select("users", {
        where: { id: userIds },
      });

      // Create user lookup map
      const userMap = users.reduce((acc: any, user: any) => {
        acc[user.id] = user;
        return acc;
      }, {});

      // Format the data with user information
      const formattedIntentions = validIntentions.map((item) => ({
        id: item.id,
        user_id: item.user_id,
        title: item.title,
        description: item.description || "",
        type: item.type as IntentionType,
        created_at: new Date(item.created_at),
        visibility: item.visibility as IntentionVisibility,
        selected_groups: item.selected_groups || [],
        selected_friends: item.selected_friends || [],
        completed: item.completed || false,
        favorite: item.favorite || false,
        likes_count: item.likes_count || 0,
        comments_count: item.comments_count || 0,
        is_liked: item.is_liked || false,
        user: userMap[item.user_id] || { first_name: 'Unknown', last_name: 'User', id: item.user_id, created_at: new Date().toISOString() },
      }));

      // Sort by created_at descending (newest first)
      formattedIntentions.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

      setIntentions(formattedIntentions);
    } catch (error) {
      console.error("Error loading intentions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Add new intention
  const addIntention = async (intentionData: Partial<PrayerIntention>) => {
    if (!user) throw new Error("User not authenticated");

    const newIntentionData = {
      user_id: user.id,
      title: intentionData.title || "",
      description: intentionData.description || "",
      type: intentionData.type || "prayer",
      created_at: new Date().toISOString(),
      visibility: intentionData.visibility || "Just Me",
      selected_groups: intentionData.selected_groups || [],
      selected_friends: intentionData.selected_friends || [],
      completed: intentionData.completed || false,
      favorite: intentionData.favorite || false,
    };

    const data = await crud.insert("intentions", newIntentionData);

    // Fetch current user data
    const userData = await crud.selectOne("users", {
      where: { id: user.id },
    });

    if (!userData) {
      console.warn("Could not fetch user data");
    }

    // Add to local state with user data
    const newIntention: PrayerIntention = {
      ...data,
      created_at: new Date(data.created_at),
      user: userData || {
        id: user.id,
        first_name: 'You',
        last_name: '',
        created_at: new Date().toISOString(),
      },
    };

    setIntentions(prev => [newIntention, ...prev]);
  };

  // Update intention
  const updateIntention = async (id: string, updates: Partial<PrayerIntention>) => {
    await crud.update("intentions", updates, { id });

    // Update local state
    setIntentions(prev => 
      prev.map(intention => 
        intention.id === id ? { ...intention, ...updates } : intention
      )
    );
  };

  // Delete intention
  const deleteIntention = async (id: string) => {
    await crud.delete("intentions", { id });

    // Remove from local state
    setIntentions(prev => prev.filter(intention => intention.id !== id));
  };

  // Toggle favorite status
  const toggleFavorite = async (id: string) => {
    const intention = intentions.find(i => i.id === id);
    if (!intention) return;

    await updateIntention(id, { favorite: !intention.favorite });
  };

  // Toggle completed status
  const toggleCompleted = async (id: string) => {
    const intention = intentions.find(i => i.id === id);
    if (!intention) return;

    await updateIntention(id, { completed: !intention.completed });
  };

  // Refresh intentions
  const refreshIntentions = async () => {
    setRefreshing(true);
    await fetchIntentions();
  };

  // Get filtered intentions
  const getFilteredIntentions = (filter?: {
    type?: IntentionType | 'all';
    visibility?: 'all' | 'mine' | 'friends' | 'groups';
    completed?: boolean;
    favorite?: boolean;
  }) => {
    let filtered = [...intentions];

    if (filter?.type && filter.type !== 'all') {
      filtered = filtered.filter(i => i.type === filter.type);
    }

    if (filter?.visibility) {
      switch (filter.visibility) {
        case 'mine':
          filtered = filtered.filter(i => i.user_id === user?.id);
          break;
        case 'friends':
          filtered = filtered.filter(i => 
            i.user_id !== user?.id && 
            (i.visibility === 'Friends' || i.visibility === 'Friends & Groups')
          );
          break;
        case 'groups':
          filtered = filtered.filter(i => 
            i.visibility === 'Certain Groups' || i.visibility === 'Friends & Groups'
          );
          break;
      }
    }

    if (filter?.completed !== undefined) {
      filtered = filtered.filter(i => i.completed === filter.completed);
    }

    if (filter?.favorite !== undefined) {
      filtered = filtered.filter(i => i.favorite === filter.favorite);
    }

    return filtered;
  };

  // Initialize data when user changes
  useEffect(() => {
    if (user) {
      fetchIntentions();
      fetchUserGroups();
      fetchUserFriends();
    } else {
      setIntentions([]);
      setUserGroups([]);
      setUserFriends([]);
      setLoading(false);
    }
  }, [user]);

  const value: PrayerIntentionsContextType = {
    intentions,
    loading,
    refreshing,
    userGroups,
    userFriends,
    fetchIntentions,
    addIntention,
    updateIntention,
    deleteIntention,
    toggleFavorite,
    toggleCompleted,
    refreshIntentions,
    getFilteredIntentions,
  };

  return (
    <PrayerIntentionsContext.Provider value={value}>
      {children}
    </PrayerIntentionsContext.Provider>
  );
};

export default PrayerIntentionsProvider;