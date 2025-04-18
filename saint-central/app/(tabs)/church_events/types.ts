export interface ChurchBasic {
  id: number;
  name: string;
}

export interface Church {
  id: number;
  name: string;
}

export interface ChurchEvent {
  id: number;
  title: string;
  excerpt: string;
  image_url?: string | null;
  video_link?: string | null;
  event_date?: string | null;
  time: string;
  author_name?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  is_deleted: boolean;
  is_recurring: boolean;
  recurrence_type?: string | null;
  recurrence_interval?: number | null;
  recurrence_days_of_week?: number[] | null;
  recurrence_end_date?: string | null;
  churches?: Church | null;
  color?: string;
  formatted_time?: string;
  event_location?: string | null;
  church_id?: number;
}

export interface EventFormData {
  title: string;
  time: string;
  image_url: string | null;
  excerpt: string;
  video_link: string | null;
  author_name: string;
  event_location: string;
  is_recurring: boolean;
  recurrence_type: "daily" | "weekly" | "monthly" | "yearly" | null;
  recurrence_interval: number | null;
  recurrence_end_date: string | null;
  recurrence_days_of_week: number[] | null;
  church_id: number;
}

export interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  dayOfWeek: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: ChurchEvent[];
}

export interface UserChurch {
  id: number;
  name: string;
  role: string;
}

export type CalendarViewType = "month" | "list";
