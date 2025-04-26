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
};
