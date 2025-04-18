export interface ChurchBasic {
  id: number;
  name: string;
}

export interface ChurchEvent {
  id: number;
  time: string;
  created_by: string;
  title: string;
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
  churches?: {
    id: number;
    name: string;
  };
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
