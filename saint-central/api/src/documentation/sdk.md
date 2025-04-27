# SaintCentral SDK Documentation

## Table of Contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Authentication](#authentication)
- [Basic CRUD Operations](#basic-crud-operations)
- [Advanced Filtering](#advanced-filtering)
- [Joins and Relationships](#joins-and-relationships)
- [Pagination and Ordering](#pagination-and-ordering)
- [Transactions](#transactions)
- [Error Handling](#error-handling)
- [Type Safety](#type-safety)
- [Security Features](#security-features)
- [API Reference](#api-reference)

## Introduction

SaintCentral SDK is a TypeScript client library for interacting with your Supabase-powered backend through a secure API layer. It provides a similar experience to the Supabase client library but with enhanced security features and comprehensive filtering capabilities.

The SDK allows you to:

- Perform CRUD operations (Create, Read, Update, Delete)
- Execute complex queries with advanced filtering
- Manage database transactions
- Work with table relationships
- Maintain strong type safety

## Installation

```bash
# Using npm
npm install @saintcentral/sdk

# Using yarn
yarn add @saintcentral/sdk
```

To import and initialize the SDK:

```typescript
import saintcentral, { SaintCentral } from "@saintcentral/sdk";

// Initialize with default API endpoint
const client = saintcentral;

// Or specify a custom API endpoint
const customClient = new SaintCentral("https://your-api-endpoint.com");
```

## Authentication

Authentication is required for most operations. The SDK supports multiple authentication methods:

### Using Bearer Token

```typescript
// Directly with token
const client = saintcentral.auth("your-jwt-token");

// Or using an existing client
const authenticatedClient = client.auth("your-jwt-token");
```

### Using Supabase Session

```typescript
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient("your-supabase-url", "your-supabase-anon-key");

// Get session
const {
  data: { session },
} = await supabase.auth.getSession();

// Authenticate with session
const client = saintcentral.withAuth(session);
```

### Public Access (No Authentication)

```typescript
const publicClient = saintcentral.withoutAuth();
```

## Basic CRUD Operations

### SELECT (Read)

```typescript
// Get all records from a table
const { data: users } = await client.from("users").select().get();

// Get specific columns
const { data: profiles } = await client
  .from("users")
  .select(["id", "first_name", "last_name"])
  .get();

// Alternative syntax for columns
const { data: profiles } = await client.from("users").select("id,first_name,last_name").get();

// Get a single record
const { data: user } = await client.from("users").select().eq("id", "123").single().get();
```

### INSERT (Create)

```typescript
// Insert a single record
const { data: newUser } = await client.from("users").insert({
  email: "user@example.com",
  first_name: "John",
  last_name: "Doe",
});

// Insert multiple records
const { data: newUsers } = await client.from("users").insert([
  { email: "user1@example.com", first_name: "John", last_name: "Doe" },
  { email: "user2@example.com", first_name: "Jane", last_name: "Smith" },
]);
```

### UPDATE

```typescript
// Update a record
const { data: updatedUser } = await client
  .from("users")
  .update({ first_name: "Jane" })
  .eq("id", "123")
  .execute();

// Alternative syntax
const { data: updatedUser } = await client.update("users", { first_name: "Jane" }, { id: "123" });
```

### DELETE

```typescript
// Delete a record
const { data: deletedUser } = await client.from("users").delete().eq("id", "123").execute();

// Alternative syntax
const { data: deletedUser } = await client.delete("users", { id: "123" });
```

### UPSERT (Insert or Update)

```typescript
// Upsert a record
const { data: upsertedUser } = await client
  .from("users")
  .upsert({ id: "123", email: "user@example.com", first_name: "Updated" }, { onConflict: ["id"] });
```

## Advanced Filtering

SaintCentral SDK provides a rich set of filter methods that mirror Supabase's capabilities:

### Equality Filters

```typescript
// Equal to (=)
client.from("users").eq("status", "active");

// Not equal to (!=)
client.from("users").neq("status", "inactive");
```

### Comparison Filters

```typescript
// Greater than (>)
client.from("products").gt("price", 100);

// Greater than or equal to (>=)
client.from("products").gte("price", 100);

// Less than (<)
client.from("products").lt("price", 200);

// Less than or equal to (<=)
client.from("products").lte("price", 200);
```

### Text Filters

```typescript
// LIKE (case-sensitive)
client.from("users").like("email", "%@gmail.com");

// ILIKE (case-insensitive)
client.from("users").ilike("first_name", "jo%");
```

### Range Filters

```typescript
// IN (values in array)
client.from("users").in("id", ["123", "456", "789"]);

// IS (for null checks)
client.from("users").is("phone_number", null);
```

### Array Filters

```typescript
// Contains (array contains values)
client.from("products").contains("tags", ["premium", "featured"]);

// Contained By (array is contained by values)
client.from("products").containedBy("categories", ["electronics", "gadgets", "accessories"]);
```

### Full-text Search

```typescript
// Text search
client.from("posts").textSearch("content", "javascript frameworks", { config: "english" });
```

### Combining Filters

```typescript
// Multiple filters (AND)
client
  .from("users")
  .eq("status", "active")
  .gte("created_at", "2023-01-01")
  .lt("created_at", "2023-12-31");

// Custom filter
client.from("users").filter("login_count", "gt", 5).filter("last_login", "gte", "2023-01-01");
```

## Joins and Relationships

SaintCentral SDK supports various types of joins to query related data:

### Basic Join

```typescript
// Inner join (default)
const { data } = await client
  .from("users")
  .select(["id", "first_name", "last_name"])
  .join("posts", {
    foreignKey: "user_id",
    primaryKey: "id",
    columns: ["id", "title", "content"],
  })
  .get();
```

### Join Types

```typescript
// Left join
const { data } = await client
  .from("users")
  .select(["id", "first_name", "last_name"])
  .leftJoin("posts", {
    foreignKey: "user_id",
    primaryKey: "id",
    columns: ["id", "title"],
  })
  .get();

// Right join
const { data } = await client
  .from("posts")
  .select(["id", "title"])
  .rightJoin("users", {
    foreignKey: "user_id",
    primaryKey: "id",
    columns: ["id", "first_name", "last_name"],
  })
  .get();
```

## Pagination and Ordering

### Limit and Offset

```typescript
// Basic pagination
const { data: page1 } = await client.from("posts").select().limit(10).offset(0).get();

const { data: page2 } = await client.from("posts").select().limit(10).offset(10).get();
```

### Range-based Pagination

```typescript
// More efficient range-based pagination
const { data } = await client
  .from("posts")
  .select()
  .range(0, 9) // First 10 results (inclusive range)
  .get();
```

### Ordering Results

```typescript
// Single column ordering
const { data } = await client
  .from("posts")
  .select()
  .order("created_at", { ascending: false })
  .get();

// Multiple column ordering
const { data } = await client
  .from("users")
  .select()
  .order("last_name", { ascending: true })
  .order("first_name", { ascending: true })
  .get();

// Ordering with null handling
const { data } = await client
  .from("tasks")
  .select()
  .order("completed_at", { ascending: false, nullsFirst: false })
  .get();
```

### Count

```typescript
// Get count of records
const count = await client.from("users").count();

// Count with filters
const activeUserCount = await client.from("users").eq("status", "active").count();
```

## Transactions

Use transactions to execute multiple operations as a single unit:

```typescript
try {
  // Execute multiple operations in a transaction
  const result = await client.transaction(async (trx) => {
    // Create a user
    const { data: user } = await trx.from("users").insert({
      email: "user@example.com",
      first_name: "John",
      last_name: "Doe",
    });

    // Create a profile for the user
    const { data: profile } = await trx.from("profiles").insert({
      user_id: user[0].id,
      bio: "New user bio",
    });

    return { user, profile };
  });

  console.log("Transaction completed successfully:", result);
} catch (error) {
  console.error("Transaction failed:", error);
  // All changes will be rolled back automatically
}
```

## Error Handling

The SDK provides consistent error handling patterns:

```typescript
try {
  const { data, error } = await client.from("users").select().get();

  if (error) {
    console.error("Error fetching users:", error.message);
    return;
  }

  // Process data
  console.log("Users:", data);
} catch (e) {
  console.error("Unexpected error:", e);
}
```

## Type Safety

SaintCentral SDK provides strong TypeScript support:

```typescript
// Define your table types
interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  user_id: string;
  created_at: string;
}

// Use type-safe queries
const { data: users } = await client.from<User>("users").select().get<User[]>();

// TypeScript knows these properties exist
if (users) {
  const names = users.map((user) => `${user.first_name} ${user.last_name}`);
}

// Type-safe joins
const { data: userPosts } = await client
  .from<User>("users")
  .select(["id", "first_name", "last_name"])
  .join<Post>("posts", {
    foreignKey: "user_id",
    primaryKey: "id",
    columns: ["id", "title", "content"],
  })
  .get();
```

## Security Features

SaintCentral SDK includes several security features:

### Automatic Owner-Only Restrictions

Configured tables with `ownerOnly: true` automatically restrict data access to the authenticated user's own records.

### Column-Level Permissions

Tables can be configured with `allowedColumns` to restrict which fields users can access.

### Role-Based Access Control

The backend enforces role-based permissions when configured with `requiredRole`.

### Self-Table Restrictions

Special case for tables like "users" where the ID field matches the user's own ID.

## API Reference

### Client Methods

| Method                  | Description                                         |
| ----------------------- | --------------------------------------------------- |
| `auth(token)`           | Set authentication token                            |
| `withAuth(session)`     | Create authenticated instance from Supabase session |
| `withoutAuth()`         | Create instance without authentication              |
| `from(table)`           | Start a query for the specified table               |
| `transaction(callback)` | Execute operations in a transaction                 |

### Query Builder Methods

| Method                   | Description                      |
| ------------------------ | -------------------------------- |
| `select(columns?)`       | Select columns (string or array) |
| `get()`                  | Execute SELECT query (GET)       |
| `execute()`              | Execute SELECT query (POST)      |
| `insert(data)`           | Insert data                      |
| `upsert(data, options?)` | Insert or update data            |
| `update(data)`           | Update data                      |
| `delete()`               | Delete data                      |
| `single()`               | Return a single result           |
| `count()`                | Count matching records           |

### Filter Methods

| Method                                | Description                      |
| ------------------------------------- | -------------------------------- |
| `eq(column, value)`                   | Equal to                         |
| `neq(column, value)`                  | Not equal to                     |
| `gt(column, value)`                   | Greater than                     |
| `gte(column, value)`                  | Greater than or equal            |
| `lt(column, value)`                   | Less than                        |
| `lte(column, value)`                  | Less than or equal               |
| `like(column, value)`                 | LIKE pattern (case-sensitive)    |
| `ilike(column, value)`                | ILIKE pattern (case-insensitive) |
| `is(column, value)`                   | IS comparison (for null)         |
| `in(column, values)`                  | IN values                        |
| `contains(column, values)`            | Array contains                   |
| `containedBy(column, values)`         | Array is contained by            |
| `textSearch(column, query, options?)` | Full-text search                 |
| `filter(column, operator, value)`     | Custom filter                    |

### Join Methods

| Method                     | Description |
| -------------------------- | ----------- |
| `join(table, config)`      | Inner join  |
| `leftJoin(table, config)`  | Left join   |
| `rightJoin(table, config)` | Right join  |

### Pagination and Ordering

| Method                    | Description            |
| ------------------------- | ---------------------- |
| `limit(value)`            | Limit results          |
| `offset(value)`           | Offset results         |
| `range(from, to)`         | Range-based pagination |
| `order(column, options?)` | Order results          |
