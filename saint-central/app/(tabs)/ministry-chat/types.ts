// Interface definitions
export interface Ministry {
  id: number;
  church_id: number;
  name: string;
  description: string;
  image_url?: string;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
}

export interface MinistryMember {
  id: number;
  ministry_id: number;
  user_id: string;
  church_id: number;
  joined_at: string;
  role: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
  profile_image?: string;
}

export interface Message {
  id: number | string;
  ministry_id: number;
  user_id: string;
  sent_at: string;
  message_text: string;
  attachment_url?: string;
  user?: User;
  _status: "sending" | "sent" | "error";
}

export interface MessageGroup {
  date: string;
  messages: Message[];
}
