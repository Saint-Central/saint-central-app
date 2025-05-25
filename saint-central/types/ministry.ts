// Define interfaces for our database models
export interface Ministry {
  id: number;
  image_url: string;
  church_id: number;
  name: string;
  description: string;
  created_at: string;
  is_system_generated: boolean;
}
