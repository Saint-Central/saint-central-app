/**
 * Table Configuration
 * This file contains the configuration for all tables accessible via the Select API.
 */

/**
 * Tables that are allowed to be queried via the Select API
 */
export const ALLOWED_TABLES = [
  // User-related tables
  "users",
  "profiles",
  "friends",

  // Content tables
  "culture_posts",
  "faith_posts",
  "news_posts",
  "womens_ministry_posts",
  "pending_posts",

  // Interaction tables
  "comments",
  "likes",

  // Feature-specific tables
  "intentions",
  "lent_tasks",

  // E-commerce tables
  "products",
  "orders",

  // Administrative tables
  "admin_logs",
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

    // If false, prevents any updates to this table (defaults to false)
    allowUpdate?: boolean;

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
    allowUpdate: true,
    description: "User accounts and profile information",
  },

  profiles: {
    ownerOnly: true,
    allowUpdate: true,
    description: "Extended user profile information",
  },

  products: {
    // Public table, anyone can read
    allowedColumns: ["id", "name", "description", "price", "category", "created_at"],
    allowUpdate: false, // Only admins should update products
    description: "Product catalog accessible to all users",
  },

  orders: {
    ownerOnly: true,
    allowUpdate: true,
    description: "User orders with order details",
  },

  intentions: {
    ownerOnly: true,
    allowUpdate: true,
    description: "Prayer intentions created by users",
  },

  lent_tasks: {
    ownerOnly: true,
    allowUpdate: true,
    description: "Lent-related tasks and progress tracking",
  },

  culture_posts: {
    // Public, but can only edit your own
    ownerOnly: false,
    allowUpdate: true,
    description: "Public posts related to cultural topics",
  },

  faith_posts: {
    // Public, but can only edit your own
    ownerOnly: false,
    allowUpdate: true,
    description: "Public posts related to faith topics",
  },

  news_posts: {
    // Public, but can only edit your own
    ownerOnly: false,
    allowUpdate: true,
    description: "Public news and announcements",
  },

  womens_ministry_posts: {
    // Public, but can only edit your own
    ownerOnly: false,
    allowUpdate: true,
    description: "Public posts related to women's ministry",
  },

  comments: {
    ownerOnly: true,
    allowUpdate: true,
    description: "User comments on posts",
  },

  likes: {
    ownerOnly: true,
    allowUpdate: true,
    description: "User likes for posts and comments",
  },

  pending_posts: {
    ownerOnly: true,
    allowUpdate: true,
    description: "Posts pending approval before publication",
  },

  friends: {
    ownerOnly: true,
    // Special case: friends can have user_id_1 or user_id_2
    ownerIdColumn: "special_friendship", // This is a marker for special handling
    allowUpdate: true,
    description: "User friendships and connections",
  },

  admin_logs: {
    requiredRole: "admin",
    allowUpdate: false, // Admin logs should never be updated
    description: "Administrative logs accessible only to admin users",
  },
};
