export interface UserData {
    id: string;
    first_name: string;
    last_name: string;
    created_at: string;
    email?: string;
  }
  
  export interface Church {
    id: string;
    name: string;
    description: string;
    created_at: string;
    founded?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    role?: string;
    members_count?: number;
  }
  
  export interface ChurchMember {
    id: string;
    church_id: string;
    user_id: string;
    role: string;
    hide_email: boolean;
    hide_name: boolean;
    hide_phone: boolean;
    joined_at: string;
    user?: {
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      profile_image: string | null;
      phone_number: string | null;
    };
  }
  
  export interface SupabaseChurchMember {
    id: string;
    church_id: string;
    user_id: string;
    role: string;
    hide_email: boolean;
    hide_name: boolean;
    hide_phone: boolean;
    joined_at: string;
    users: {
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      profile_image: string | null;
      phone_number: string | null;
    } | null;
  }
  
  export interface SupabaseUser {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    profile_image: string | null;
    phone_number: string | null;
  }
  
  export interface SupabaseResponse {
    id: string;
    role: string;
    user_id: string;
    hide_email: boolean;
    hide_name: boolean;
    hide_phone: boolean;
    created_at: string;
    users: SupabaseUser | null;
  }
  
  export interface Group {
    id: string;
    name: string;
    description: string;
    created_at: string;
    created_by: string;
    church_id: string;
  }
  
  export interface Intention {
    id: string;
    user_id: string;
    title: string;
    description: string;
    type: IntentionType;
    created_at: string;
    user: UserData;
    likes_count?: number | null;
    comments_count?: number | null;
    is_liked?: boolean;
    visibility: VisibilityType;
    selected_groups: string[];
    selected_friends: string[];
    selected_church: string;
    church?: Church;
  }
  
  export interface NewIntention {
    title: string;
    description: string;
    type: IntentionType;
    visibility: VisibilityType;
    selected_groups: string[];
    selected_friends: string[];
    selected_church: string | null;
  }
  
  export interface EditingIntention extends Intention {
    selected_groups: string[];
    selected_friends: string[];
  }
  
  export interface DeleteModalState {
    isOpen: boolean;
    intentionId: string | null;
  }
  
  export type IntentionType =
    | "prayer"
    | "praise"
    | "spiritual"
    | "family"
    | "health"
    | "work"
    | "personal"
    | "other";
  
  export type VisibilityType = "Church" | "Just Me";
  
  export interface Notification {
    message: string;
    type: "error" | "success";
  }
  
  export interface Comment {
    id: string;
    user_id: string;
    commentable_id: string;
    commentable_type: string;
    content: string;
    created_at: string;
    updated_at: string;
    user: UserData;
  }
  
  // Define the views/screens for navigation
  export type AppView = "home" | "churches" | "churchDetails" | "intentions" | "groups";