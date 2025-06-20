export type Course = {
  id: number;
  time: string;
  location: string;
  host: string;
  user_id: string;
  course_id?: number;
  church_id: number;
  description: string;
  image_url?: string;
};

export type CourseEnrollment = {
  id: number;
  enrollment_date: string;
  user_id: string;
  course_id: number;
  hide_email: boolean;
  hide_phone: boolean;
  hide_name: boolean;
};
