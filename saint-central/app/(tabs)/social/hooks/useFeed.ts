import { useState, useEffect, useCallback } from "react";
import { Post, PostType, Comment, User, Group } from "../types";
import { supabase } from "../../../../supabaseClient";
import { parseSelectedGroups } from "../utils/formatters";

export default function useFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<"all" | "mine" | "friends" | "groups">(
    "all"
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState<boolean>(false);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [groupsLoaded, setGroupsLoaded] = useState<boolean>(false);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) setCurrentUserId(data.user.id);
      } catch (error) {
        console.error("Error getting current user:", error);
      }
    };
    getCurrentUser();
  }, []);

  // Fetch user groups
  useEffect(() => {
    if (currentUserId) fetchUserGroups();
  }, [currentUserId]);

  const fetchUserGroups = async (): Promise<void> => {
    try {
      if (!currentUserId) return;
      const { data, error } = await supabase
        .from("group_members")
        .select("group:groups(*)")
        .eq("user_id", currentUserId);
      if (error) throw error;
      const groups = data.map((item: any) => item.group);
      setUserGroups(groups || []);
      setGroupsLoaded(true);
    } catch (error: any) {
      console.error("Error fetching user groups:", error);
    }
  };

  // Fetch posts based on the selected filter
  useEffect(() => {
    if (filter === "all" && !groupsLoaded) return;
    fetchPosts();
  }, [filter, groupsLoaded]);

  // Fetch comments when a post is expanded
  useEffect(() => {
    if (expandedPostId) fetchComments(expandedPostId);
  }, [expandedPostId]);

  const getHeaderTitle = (): string => {
    switch (filter) {
      case "mine":
        return "My Posts";
      case "friends":
        return "Friends";
      case "groups":
        return "Groups";
      default:
        return "Community";
    }
  };

  const fetchPosts = async (type?: PostType): Promise<void> => {
    try {
      setIsLoading(true);
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");

      // First, fetch all posts with their user data
      let query = supabase
        .from("intentions") // Using the same table name as in the original code
        .select(`*, user:users (*), visibility, selected_groups`)
        .order("created_at", { ascending: false });

      // Apply filter based on current tab
      if (type) query = query.eq("type", type);

      // Get all posts first
      const { data: allPosts, error } = await query;
      if (error) throw error;

      // Get user's friends
      const { data: sentFriends, error: sentError } = await supabase
        .from("friends")
        .select("user_id_2")
        .eq("user_id_1", user.id)
        .eq("status", "accepted");
      if (sentError) throw sentError;

      const { data: receivedFriends, error: receivedError } = await supabase
        .from("friends")
        .select("user_id_1")
        .eq("user_id_2", user.id)
        .eq("status", "accepted");
      if (receivedError) throw receivedError;

      // Create a set of friend IDs
      const friendIds = new Set<string>();
      if (sentFriends) {
        sentFriends.forEach((row: { user_id_2: string }) => {
          friendIds.add(row.user_id_2);
        });
      }
      if (receivedFriends) {
        receivedFriends.forEach((row: { user_id_1: string }) => {
          friendIds.add(row.user_id_1);
        });
      }

      // Get user's group memberships and group members
      const userGroupIds = userGroups.map((group) => group.id);
      const { data: groupMembers, error: membersError } = await supabase
        .from("group_members")
        .select("user_id, group_id")
        .in("group_id", userGroupIds.length > 0 ? userGroupIds : [""]);
      if (membersError) throw membersError;

      // Create a map of group ID to member IDs
      const groupMembersMap = new Map<string, Set<string>>();
      if (groupMembers) {
        groupMembers.forEach(
          (member: { user_id: string; group_id: string }) => {
            if (!groupMembersMap.has(member.group_id)) {
              groupMembersMap.set(member.group_id, new Set<string>());
            }
            groupMembersMap.get(member.group_id)?.add(member.user_id);
          }
        );
      }

      // Filter posts based on visibility settings and current filter
      const filteredPosts = allPosts?.filter((post: any) => {
        // Parse selected groups
        const selectedGroups = parseSelectedGroups(post.selected_groups);

        // Current user's own posts always visible
        if (post.user_id === user.id) {
          return true;
        }

        // Apply filter specific filtering
        if (filter === "mine") {
          return post.user_id === user.id;
        } else if (filter === "friends") {
          // In friends filter, only show posts from friends that are visible to friends
          return (
            friendIds.has(post.user_id) &&
            (post.visibility === "Friends" ||
              post.visibility === "Friends & Groups")
          );
        } else if (filter === "groups") {
          // In groups filter, show only posts from group members that are visible to groups
          let isInSameGroup = false;
          // Check if post owner is in any of user's groups
          for (const groupId of userGroupIds) {
            const membersOfGroup = groupMembersMap.get(groupId);
            if (membersOfGroup && membersOfGroup.has(post.user_id)) {
              isInSameGroup = true;
              break;
            }
          }

          // For "Certain Groups", check if the current user is in one of the selected groups
          if (post.visibility === "Certain Groups") {
            // If no groups are selected, don't show the post
            if (!selectedGroups || selectedGroups.length === 0) return false;

            // Convert all to strings for consistent comparison
            const userGroupIdsStr = userGroupIds.map((id) => String(id));
            const selectedGroupsStr = selectedGroups.map((id) => String(id));

            // Check if there's any overlap between user's groups and post's selected groups
            const isInSelectedGroup = selectedGroupsStr.some((groupId) =>
              userGroupIdsStr.includes(groupId)
            );

            return isInSelectedGroup;
          }

          return (
            isInSameGroup &&
            (post.visibility === "Friends & Groups" ||
              post.visibility === "Certain Groups")
          );
        } else if (filter === "all") {
          // In "all" filter, show:
          // 1. All of the user's own posts
          // 2. Posts visible to the user based on visibility settings

          switch (post.visibility) {
            case "Just Me":
              // Only visible to creator
              return post.user_id === user.id;

            case "Friends":
              // Visible to creator and friends
              return post.user_id === user.id || friendIds.has(post.user_id);

            case "Certain Groups":
              // Visible to creator and members of selected groups
              if (post.user_id === user.id) return true;

              // If no groups are selected, only show to creator
              if (!selectedGroups || selectedGroups.length === 0)
                return post.user_id === user.id;

              // Convert all to strings for consistent comparison
              const userGroupIdsStr = userGroupIds.map((id) => String(id));
              const selectedGroupsStr = selectedGroups.map((id) => String(id));

              // Check if there's any overlap between user's groups and post's selected groups
              return selectedGroupsStr.some((groupId) =>
                userGroupIdsStr.includes(groupId)
              );

            case "Friends & Groups":
              // Visible to creator, friends, and group members
              if (post.user_id === user.id || friendIds.has(post.user_id)) {
                return true;
              }

              // Check if user is in same group as post creator
              for (const groupId of userGroupIds) {
                const membersOfGroup = groupMembersMap.get(groupId);
                if (membersOfGroup && membersOfGroup.has(post.user_id)) {
                  return true;
                }
              }
              return false;

            default:
              return false;
          }
        }

        return false;
      });

      // Get like and comment counts, check if user has liked each post
      const postsWithCounts = await Promise.all(
        (filteredPosts || []).map(async (post: any) => {
          const { count: likesCount, error: likesError } = await supabase
            .from("likes")
            .select("*", { count: "exact", head: false })
            .eq("likeable_id", post.id)
            .eq("likeable_type", "intentions");
          if (likesError) throw likesError;

          const { count: commentsCount, error: commentsError } = await supabase
            .from("comments")
            .select("*", { count: "exact", head: false })
            .eq("commentable_id", post.id)
            .eq("commentable_type", "intentions");
          if (commentsError) throw commentsError;

          const { data: userLike, error: userLikeError } = await supabase
            .from("likes")
            .select("id")
            .eq("likeable_id", post.id)
            .eq("likeable_type", "intentions")
            .eq("user_id", user.id)
            .maybeSingle();
          if (userLikeError) throw userLikeError;

          let groupInfo = null;
          if (userGroups.length > 0) {
            const isNotFriend = !friendIds.has(post.user_id);
            const showGroupInfo =
              (filter === "groups" && post.user_id !== user.id) ||
              (post.user_id !== user.id && isNotFriend);

            if (showGroupInfo) {
              const { data: userGroupData, error: userGroupError } =
                await supabase
                  .from("group_members")
                  .select("group_id")
                  .eq("user_id", post.user_id);
              if (userGroupError) throw userGroupError;

              const { data: currentUserGroups, error: currentUserGroupError } =
                await supabase
                  .from("group_members")
                  .select("group_id")
                  .eq("user_id", user.id);
              if (currentUserGroupError) throw currentUserGroupError;

              if (userGroupData && currentUserGroups) {
                const userGroupIds = userGroupData.map((g) => g.group_id);
                const currentUserGroupIds = currentUserGroups.map(
                  (g) => g.group_id
                );
                const sharedGroupIds = userGroupIds.filter((id) =>
                  currentUserGroupIds.includes(id)
                );

                if (sharedGroupIds.length > 0) {
                  const { data: groupData, error: groupError } = await supabase
                    .from("groups")
                    .select("*")
                    .eq("id", sharedGroupIds[0])
                    .single();
                  if (!groupError && groupData) {
                    groupInfo = groupData;
                  }
                }
              }
            }
          }

          return {
            ...post,
            likes_count: likesCount,
            comments_count: commentsCount,
            is_liked: !!userLike,
            group_info: groupInfo,
            selectedGroups: parseSelectedGroups(post.selected_groups),
          };
        })
      );

      setPosts(postsWithCounts || []);
    } catch (error: any) {
      console.error("Error fetching posts:", error);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async (postId: string): Promise<void> => {
    try {
      setCommentsLoading(true);
      const { data, error } = await supabase
        .from("comments")
        .select(`*, user:users(*)`)
        .eq("commentable_id", postId)
        .eq("commentable_type", "intentions")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      console.error("Error fetching comments:", error);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleLikePost = async (
    postId: string,
    isLiked: boolean
  ): Promise<void> => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");

      if (isLiked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("likeable_id", postId)
          .eq("likeable_type", "intentions")
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("likes").insert({
          user_id: user.id,
          likeable_id: postId,
          likeable_type: "intentions",
        });
        if (error) throw error;
      }

      setPosts(
        posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                is_liked: !isLiked,
                likes_count: isLiked
                  ? (post.likes_count || 1) - 1
                  : (post.likes_count || 0) + 1,
              }
            : post
        )
      );
    } catch (error: any) {
      console.error("Error toggling like:", error);
    }
  };

  const handleAddComment = async (
    postId: string,
    commentText: string
  ): Promise<void> => {
    if (!commentText.trim()) return;

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("comments")
        .insert({
          user_id: user.id,
          commentable_id: postId,
          commentable_type: "intentions",
          content: commentText,
        })
        .select(`*, user:users(*)`);

      if (error) throw error;

      if (data && data.length > 0) {
        setComments([data[0], ...comments]);

        // Update comment count in posts
        setPosts(
          posts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  comments_count: (post.comments_count || 0) + 1,
                }
              : post
          )
        );
      }
    } catch (error: any) {
      console.error("Error adding comment:", error);
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedPostId(expandedPostId === postId ? null : postId);
  };

  return {
    posts,
    isLoading,
    filter,
    setFilter,
    currentUserId,
    handleLikePost,
    handleAddComment,
    toggleComments,
    expandedPostId,
    comments,
    commentsLoading,
    getHeaderTitle,
  };
}
