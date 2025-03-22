// User type
export interface User {
  id: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

// Group type
export interface Group {
  id: string;
  name: string;
  description: string;
  created_at: string;
  created_by: string;
}

// Post type
export interface Post {
  id: string;
  user_id: string;
  title: string;
  description: string;
  type: PostType;
  created_at: string;
  user: User;
  likes_count?: number | null;
  comments_count?: number | null;
  is_liked?: boolean;
  group_info?: Group | null;
  visibility?: "Friends" | "Certain Groups" | "Just Me" | "Friends & Groups";
  selectedGroups?: string[];
}

export type PostType = "resolution" | "prayer" | "goal";

// Comment type
export interface Comment {
  id: string;
  user_id: string;
  commentable_id: string;
  commentable_type: string;
  content: string;
  created_at: string;
  updated_at: string;
  user: User;
}

// Notification type
export interface Notification {
  message: string;
  type: "error" | "success";
}
