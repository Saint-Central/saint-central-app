# SaintCentral Table Configuration

## Overview

The `tableConfig` module defines the configuration for all database tables accessible through the SaintCentral API. It implements an access control system that enforces permissions at the API level, ensuring data security and integrity. This documentation explains how to configure and use the table permission system.

## Table of Contents

1. [Core Components](#core-components)
2. [Permission Settings](#permission-settings)
3. [Special Permission Cases](#special-permission-cases)
4. [How Permissions Are Applied](#how-permissions-are-applied)
5. [Adding New Tables](#adding-new-tables)
6. [Example Configurations](#example-configurations)

## Core Components

The `tableConfig` module consists of two main exports:

### ALLOWED_TABLES

A simple array of strings that lists all table names that can be accessed through the API:

```typescript
export const ALLOWED_TABLES = [
  // User-related tables
  "users",
  // Add other tables here
];
```

Any table not listed in this array cannot be accessed via the API, regardless of other permissions.

### TABLE_PERMISSIONS

A detailed configuration object that defines specific permissions for each table:

```typescript
export const TABLE_PERMISSIONS: Record<
  string,
  {
    ownerOnly?: boolean;
    ownerIdColumn?: string;
    selfTable?: boolean;
    allowedColumns?: string[];
    forceConditions?: Record<string, any>;
    requiredRole?: string;
    operations?: ("select" | "insert" | "update" | "delete")[];
    description?: string;
  }
> = {
  // Table configurations here
};
```

## Permission Settings

Each table can have the following permission settings:

| Setting           | Type     | Default        | Description                                                                    |
| ----------------- | -------- | -------------- | ------------------------------------------------------------------------------ |
| `ownerOnly`       | boolean  | `false`        | When `true`, users can only access their own data                              |
| `ownerIdColumn`   | string   | `"user_id"`    | The column name that identifies the data owner                                 |
| `selfTable`       | boolean  | `false`        | For special cases like the users table where the owner's ID is the primary key |
| `allowedColumns`  | string[] | all columns    | Restricts which columns can be selected/updated                                |
| `forceConditions` | object   | none           | Conditions that are always applied to queries                                  |
| `requiredRole`    | string   | none           | Role required to access this table (e.g., "admin")                             |
| `operations`      | array    | all operations | Allowed operations: "select", "insert", "update", "delete"                     |
| `description`     | string   | none           | Human-readable description of the table's purpose                              |

## Special Permission Cases

### User Table (Self Table)

The `users` table uses the `selfTable: true` setting because the user's identity is stored in the primary key field (`id`) rather than a separate foreign key like `user_id`:

```typescript
users: {
  ownerOnly: true,
  selfTable: true,
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
}
```

With these settings:

- Users can only access their own profile (`ownerOnly: true`)
- The system knows to filter by the `id` column instead of `user_id` (`selfTable: true`)
- Only the listed columns are accessible
- Only select and update operations are allowed (insert and delete are prohibited)

### Friendship Tables (Bidirectional Relationships)

For tables that represent bidirectional relationships (like friendships), a special configuration can be used:

```typescript
friends: {
  ownerOnly: true,
  ownerIdColumn: "special_friendship",
  operations: ["select", "insert", "delete"],
  description: "User friendships"
}
```

When `ownerIdColumn` is set to `"special_friendship"`, the system automatically checks for the user's ID in either the `user_id_1` or `user_id_2` columns, allowing access to friendship records where the user appears on either side of the relationship.

## How Permissions Are Applied

When a request is made through the SaintCentral SDK, the following checks are applied in order:

1. **Table Access**: Is the table in the `ALLOWED_TABLES` list?
2. **Operation Permission**: Is the requested operation (select/insert/update/delete) allowed for this table?
3. **Authentication**: For protected tables, is the user authenticated?
4. **Role Check**: If `requiredRole` is set, does the user have this role?
5. **Owner Filter**: If `ownerOnly` is true, queries are automatically filtered to show only the user's data
6. **Column Access**: If `allowedColumns` is set, other columns cannot be accessed
7. **Forced Conditions**: If `forceConditions` is set, these conditions are always applied to any query

## Adding New Tables

To add a new table to the system:

1. Add the table name to the `ALLOWED_TABLES` array
2. Add a configuration entry to the `TABLE_PERMISSIONS` object

Example for adding a "posts" table:

```typescript
// In ALLOWED_TABLES array
"posts",

// In TABLE_PERMISSIONS object
posts: {
  ownerOnly: true, // Users can only access their own posts
  allowedColumns: [
    "id",
    "user_id",
    "title",
    "content",
    "created_at",
    "updated_at",
    "status"
  ],
  operations: ["select", "insert", "update", "delete"], // All operations allowed
  description: "User blog posts"
}
```

## Example Configurations

### Public Read-Only Table

```typescript
products: {
  ownerOnly: false, // Anyone can access
  operations: ["select"], // Read-only
  description: "Product catalog"
}
```

### Admin-Only Table

```typescript
site_settings: {
  requiredRole: "admin", // Only admins can access
  operations: ["select", "update"], // Read and update only
  description: "Site configuration settings"
}
```

### Table With Forced Conditions

```typescript
articles: {
  ownerOnly: false, // Anyone can access
  forceConditions: { status: "published" }, // Only published articles are accessible
  operations: ["select"],
  description: "Published articles"
}
```

### User Content With Moderation

```typescript
comments: {
  ownerOnly: true, // Users can only see their own comments
  allowedColumns: ["id", "user_id", "post_id", "content", "created_at", "status"],
  operations: ["select", "insert", "update"], // No delete
  description: "User comments on posts"
}
```
