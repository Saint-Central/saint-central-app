// Church interface based on database schema
export interface Church {
  id: number;
  category: string;
  name: string;
  description: string;
  founded: string;
  phone: string;
  email: string;
  mass_schedule: string;
  website: string;
  image: string;
  address: string;
  lat: number;
  lng: number;
  created_at: string;
}

// Member interface
export interface ChurchMember {
  id: number;
  church_id: number;
  user_id: string;
  role: string;
  joined_at: string;
}

export interface ChurchEvent {
  id: number;
  time: string;
  created_by: string;
  title: string;
  image_url: string;
  excerpt: string;
  video_link: string | null;
  author_name: string;
  is_recurring: boolean;
  recurrence_type: string | null;
  recurrence_interval: number | null;
  recurrence_end_date: string | null;
  recurrence_days_of_week: number[] | null;
  church_id: number;
  event_location: string;
}
