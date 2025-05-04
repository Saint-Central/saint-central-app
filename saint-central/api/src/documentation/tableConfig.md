# SaintCentral Table Configuration

This document provides guidance on configuring database tables for the SaintCentral API, including permissions, access controls, and security best practices.

## Table of Contents

- [Introduction](#introduction)
- [Table Configuration Structure](#table-configuration-structure)
- [Allowed Tables](#allowed-tables)
- [Table Permissions](#table-permissions)
- [Owner-Based Access Control](#owner-based-access-control)
- [Column Restrictions](#column-restrictions)
- [Operation Restrictions](#operation-restrictions)
- [Forced Conditions](#forced-conditions)
- [Role-Based Access](#role-based-access)
- [Configuration Examples](#configuration-examples)
- [Best Practices](#best-practices)

## Introduction

SaintCentral uses a configuration-based approach to define which database tables can be accessed through the API and what operations can be performed on them. This configuration system is the first layer of defense in your data security strategy, working alongside Row Level Security (RLS) policies in Supabase.

The table configuration system serves several key purposes:

1. **Access Control**: Define which tables can be accessed via the API
2. **Operation Control**: Limit which operations (select, insert, update, delete) are allowed on each table
3. **Data Isolation**: Implement owner-based access control to ensure users can only access their own data
4. **Field Restriction**: Control which columns can be accessed on each table
5. **Conditional Access**: Enforce specific query conditions that must be applied

## Table Configuration Structure

Table configurations are defined in the `tableConfig.ts` file, which contains two main exports:

1. `ALLOWED_TABLES`: An array of table names that can be accessed via the API
2. `TABLE_PERMISSIONS`: A map of tables to their permission settings

## Allowed Tables

The `ALLOWED_TABLES` array defines which tables can be accessed through the API:

```javascript
export const ALLOWED_TABLES = [
  // User-related tables
  "users",
  "service_times",
  "church_members",
  "churches",
  // Add other tables as needed
];
```

Any table not included in this list cannot be accessed via the API, regardless of database permissions.

## Table Permissions

The `TABLE_PERMISSIONS` object defines detailed permission settings for each table:

```javascript
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
  // Table configurations go here
};
```

## Owner-Based Access Control

Owner-based access control restricts users to only accessing their own data. This is configured using the `ownerOnly` and `ownerIdColumn` properties:

```javascript
"posts": {
  ownerOnly: true,
  ownerIdColumn: "author_id", // Default is "user_id" if not specified
  // Other settings...
}
```

When `ownerOnly` is set to `true`, the API automatically adds a filter condition to ensure users can only access their own data.

### Self Tables

Some tables, like the `users` table, are special because the user's ID is stored in the primary key field rather than a foreign key. For these tables, use the `selfTable` property:

```javascript
"users": {
  ownerOnly: true,
  selfTable: true, // User's ID is in the "id" field
  // Other settings...
}
```

## Column Restrictions

You can restrict which columns can be accessed on each table using the `allowedColumns` property:

```javascript
"users": {
  allowedColumns: [
    "id",
    "email",
    "first_name",
    "last_name",
    "profile_image",
  ],
  // Other settings...
}
```

When `allowedColumns` is specified, attempts to access other columns will be rejected, even if the database would allow it.

## Operation Restrictions

Control which operations (select, insert, update, delete) are allowed on each table using the `operations` property:

```javascript
"audit_logs": {
  operations: ["select", "insert"], // Only allow select and insert
  // Other settings...
}
```

If `operations` is not specified, all operations are allowed (subject to other permission checks).

## Forced Conditions

You can enforce specific query conditions that must be applied for all operations on a table using the `forceConditions` property:

```javascript
"posts": {
  forceConditions: {
    "status": "published" // Only allow access to published posts
  },
  // Other settings...
}
```

These conditions are automatically added to all queries, regardless of the conditions specified by the client.

## Role-Based Access

Control access based on user roles using the `requiredRole` property:

```javascript
"admin_settings": {
  requiredRole: "admin", // Only users with admin role can access
  // Other settings...
}
```

When `requiredRole` is specified, only users with that role will be granted access to the table.

## Configuration Examples

### User Table Example

```javascript
"users": {
  ownerOnly: true,
  selfTable: true, // User's ID is in the "id" field
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

### Posts Table Example

```javascript
"posts": {
  ownerOnly: true, // Users can only access their own posts
  ownerIdColumn: "author_id", // Column containing the user ID
  allowedColumns: [
    "id",
    "title",
    "content",
    "created_at",
    "updated_at",
    "author_id",
    "status",
    "image_url",
  ],
  operations: ["select", "insert", "update", "delete"],
  description: "Blog posts created by users",
}
```

### Public Content Table Example

```javascript
"news_articles": {
  ownerOnly: false, // Everyone can access all news articles
  allowedColumns: [
    "id",
    "title",
    "content",
    "published_at",
    "author_name",
    "image_url",
  ],
  forceConditions: {
    "status": "published", // Only published articles are accessible
  },
  operations: ["select"], // Read-only
  description: "Public news articles",
}
```

### Admin-Only Table Example

```javascript
"system_settings": {
  ownerOnly: false,
  requiredRole: "admin", // Only admins can access
  operations: ["select", "update"],
  description: "System-wide settings",
}
```

## Best Practices

Follow these best practices when configuring tables:

### Principle of Least Privilege

- ✅ Only allow the minimum required tables in `ALLOWED_TABLES`
- ✅ Only expose the necessary columns in `allowedColumns`
- ✅ Only permit required operations in `operations`
- ✅ Use `ownerOnly: true` whenever possible
- ❌ Don't allow access to sensitive system tables

### Data Isolation

- ✅ Use `ownerOnly: true` with a proper `ownerIdColumn`
- ✅ Implement `forceConditions` to further restrict access
- ✅ Use `requiredRole` for role-based permissions
- ❌ Don't rely solely on client-side filtering

### Defensive Configuration

- ✅ Always specify `allowedColumns` to prevent data leakage
- ✅ Always specify `operations` to prevent unwanted modifications
- ✅ Add descriptive `description` for documentation
- ✅ Prefer denying access by default, then explicitly allowing it
- ❌ Don't assume defaults will be secure

### Layered Security

- ✅ Combine table configuration with Supabase RLS policies
- ✅ Implement additional validation in your API handlers
- ✅ Review configurations when data models change
- ❌ Don't rely on a single layer of security
