/**
 * Table Configuration
 * This file contains the configuration for all tables accessible via the API.
 */

/**
 * Tables that are allowed to be queried via the API
 */
export const ALLOWED_TABLES = [
  // User-related tables
  "users",
  "user_roles",
  "profiles",
  "friend_requests",
  "friendships",

  // Content tables
  "posts",
  "comments",
  "likes",

  // Application tables
  "settings",
  "notifications",

  // Public tables
  "products",
  "categories",
  "tags",
];

/**
 * Permission rules for each table
 * This maps tables to requirements for access control
 */
export const TABLE_PERMISSIONS: Record<
  string,
  {
    // If true, user can only access their own data
    ownerOnly?: boolean;

    // The column name that identifies the owner (defaults to "user_id")
    ownerIdColumn?: string;

    // For special cases like the users table where the user's own ID is in the "id" field
    selfTable?: boolean;

    // If provided, restricts which columns can be selected
    allowedColumns?: string[];

    // If provided, enforces specific conditions that must be applied
    forceConditions?: Record<string, any>;

    // Required role to access this table (if any)
    requiredRole?: string;

    // Operations allowed on this table
    operations?: ("select" | "insert" | "update" | "delete")[];

    // Description of the table for documentation
    description?: string;
  }
> = {
  users: {
    ownerOnly: true,
    selfTable: true, // Special case: user's own ID is in the "id" field
    allowedColumns: [
      "id",
      "email",
      "first_name",
      "last_name",
      "created_at",
      "updated_at",
      "profile_image",
      "phone_number",
      "denomination",
    ],
    operations: ["select", "update"],
    description: "User accounts and profile information",
  },

  profiles: {
    ownerOnly: true,
    operations: ["select", "insert", "update", "delete"],
    description: "Extended user profile information",
  },

  user_roles: {
    requiredRole: "admin", // Only admins can manage roles
    operations: ["select"],
    description: "User role assignments",
  },

  friend_requests: {
    ownerOnly: true,
    operations: ["select", "insert", "update", "delete"],
    description: "Friend request tracking",
  },

  friendships: {
    ownerOnly: true,
    ownerIdColumn: "special_friendship", // Special handling for friendships
    operations: ["select", "insert", "update", "delete"],
    description: "User friendships",
  },

  posts: {
    ownerOnly: true,
    operations: ["select", "insert", "update", "delete"],
    description: "User posts and content",
    allowedColumns: [
      "id",
      "user_id",
      "content",
      "title",
      "created_at",
      "updated_at",
      "image_url",
      "likes_count",
      "comments_count",
      "status",
    ],
  },

  comments: {
    ownerOnly: true,
    operations: ["select", "insert", "update", "delete"],
    description: "Comments on posts",
  },

  likes: {
    ownerOnly: true,
    operations: ["select", "insert", "delete"],
    description: "Likes on posts and comments",
  },

  notifications: {
    ownerOnly: true,
    operations: ["select", "update"],
    description: "User notifications",
  },

  settings: {
    ownerOnly: true,
    operations: ["select", "update"],
    description: "User application settings",
  },

  products: {
    operations: ["select"], // Public read-only access
    forceConditions: { active: true }, // Only show active products
    description: "Product catalog - publicly readable",
  },

  categories: {
    operations: ["select"], // Public read-only access
    description: "Product categories - publicly readable",
  },

  tags: {
    operations: ["select"], // Public read-only access
    description: "Content tags - publicly readable",
  },
};
