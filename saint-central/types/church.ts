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
