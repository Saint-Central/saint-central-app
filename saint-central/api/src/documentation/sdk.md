# SaintCentral SDK Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Authentication](#authentication)
4. [Basic Usage](#basic-usage)
5. [Query Building](#query-building)
6. [Data Operations](#data-operations)
7. [Advanced Features](#advanced-features)
8. [API Reference](#api-reference)
9. [Table Permissions](#table-permissions)
10. [Error Handling](#error-handling)
11. [Examples](#examples)

## Introduction

SaintCentral SDK is a simplified TypeScript client for interacting with the SaintCentral API. It provides a fluent interface for building and executing queries against the backend database, with built-in support for authentication, filtering, pagination, and more.

The SDK abstracts away the complexity of direct API interactions, allowing you to focus on your application logic rather than API implementation details. It works seamlessly in both web and React Native environments, providing a consistent interface across platforms.

### Key Features

- **Authentication Management**: Easy token-based authentication
- **Fluent Query Interface**: Build complex queries with a chainable API
- **Type Safety**: Full TypeScript support with generic response types
- **Multiple Execution Methods**: Support for both GET and POST requests
- **CRUD Operations**: Complete support for Create, Read, Update, and Delete operations
- **Table Permissions**: Automatic handling of permissions at the API level
- **Error Handling**: Consistent error reporting across all operations

## Installation and Setup

The SaintCentral SDK is typically included directly in your project source code rather than being installed as a package. You'll find it in your project's source directory.

### SDK Location

The SDK is usually located at:

```
/saint-central/api/src/sdk.ts
```

### Importing the SDK

Import the SDK in your project files:

```typescript
// Import the default singleton instance
import saintcentral from "../api/src/sdk"; // Adjust the path as needed

// Or import the class directly
import { SaintCentral } from "../api/src/sdk";
```

### API Base URL

By default, the SDK is configured to use the following API endpoint:

```
https://saint-central-api.colinmcherney.workers.dev
```

If you need to use a different API endpoint, you can create a new instance with a custom base URL:

```typescript
import { SaintCentral } from "../api/src/sdk";

// Create a custom instance with a different API endpoint
const customClient = new SaintCentral("https://your-custom-api-endpoint.com");
```

## Authentication

### Using the default instance with authentication

```typescript
// Authenticate with a JWT token
saintcentral.auth("your-jwt-token");

// Make authenticated requests
const response = await saintcentral.from("users").get();
```

### Creating a new instance with authentication

```typescript
// Create a new instance with authentication
const client = saintcentral.withAuth("your-jwt-token");

// Make authenticated requests
const response = await client.from("users").get();
```

### Removing authentication

```typescript
// Create a new instance without authentication
const publicClient = saintcentral.withoutAuth();

// Make public requests
const response = await publicClient.from("products").get();
```

## Basic Usage

### Simple Data Retrieval

```typescript
// Get all users
const response = await saintcentral.from("users").get();

// Get a specific user by ID
const userResponse = await saintcentral.from("users").where("id", "user-123").single().get();
```

### Inserting Data

```typescript
// Insert a single record
const insertResponse = await saintcentral.insert("products", {
  name: "New Product",
  price: 29.99,
  category: "electronics",
});

// Insert multiple records
const batchInsertResponse = await saintcentral.insert("products", [
  { name: "Product 1", price: 19.99, category: "electronics" },
  { name: "Product 2", price: 29.99, category: "electronics" },
]);
```

### Updating Data

```typescript
// Update records
const updateResponse = await saintcentral.update(
  "products",
  { price: 24.99, updated_at: new Date() },
  { id: "product-123" },
);
```

### Deleting Data

```typescript
// Delete records
const deleteResponse = await saintcentral.delete("products", { id: "product-123" });
```

## Query Building

The SDK provides a fluent interface for building queries:

### Selecting Specific Columns

```typescript
// Select specific columns
const response = await saintcentral
  .from("users")
  .select(["id", "first_name", "last_name", "email"])
  .get();

// Alternative syntax
const response = await saintcentral.from("users").select("id, first_name, last_name, email").get();
```

### Filtering Results

```typescript
// Single condition
const response = await saintcentral.from("products").where("category", "electronics").get();

// Multiple conditions
const response = await saintcentral
  .from("products")
  .where({
    category: "electronics",
    price_range: "premium",
  })
  .get();
```

### Ordering Results

```typescript
// Order by a column (ascending by default)
const response = await saintcentral.from("products").order("price").get();

// Order descending
const response = await saintcentral.from("products").order("price", { ascending: false }).get();
```

### Pagination

```typescript
// Limit the number of results
const response = await saintcentral.from("products").limit(10).get();

// Use offset for pagination
const page2Response = await saintcentral.from("products").limit(10).offset(10).get();
```

### Single Result

```typescript
// Get a single result (throws if not found)
const response = await saintcentral.from("users").where("id", "user-123").single().get();
```

## Advanced Features

### Table Joins

```typescript
// Join with another table
const response = await saintcentral
  .from("orders")
  .select(["id", "total", "created_at"])
  .join("users", {
    foreignKey: "user_id",
    primaryKey: "id",
    columns: ["first_name", "last_name", "email"],
  })
  .get();
```

### POST vs GET Requests

The SDK provides two methods for executing queries:

```typescript
// Using GET (with URL parameters)
const getResponse = await saintcentral.from("products").where("category", "electronics").get();

// Using POST (with request body)
const postResponse = await saintcentral.from("products").where("category", "electronics").execute();
```

- Use `get()` for simple queries where URL length is not a concern
- Use `execute()` for complex queries or when you need to send a lot of data in the request

## API Reference

### Constructor

```typescript
new SaintCentral(baseUrl: string = "")
```

Creates a new instance of the SaintCentral client.

- `baseUrl`: The base URL for the SaintCentral API. Default: "https://saint-central-api.colinmcherney.workers.dev"

### Authentication Methods

#### `auth(token: string): SaintCentral`

Sets the authentication token for the current instance.

- `token`: JWT token to use for authentication
- Returns: The same instance (for method chaining)

#### `withAuth(token: string): SaintCentral`

Creates a new instance with the specified authentication token.

- `token`: JWT token to use for authentication
- Returns: A new SaintCentral instance

#### `withoutAuth(): SaintCentral`

Creates a new instance without any authentication token.

- Returns: A new SaintCentral instance

### Query Building Methods

#### `from(table: string): SaintCentral`

Sets the table to query and resets any previous query settings.

- `table`: The name of the table to query
- Returns: The same instance (for method chaining)

#### `select(columnsOrTable: string | string[] = "*"): SaintCentral`

Specifies which columns to select.

- `columnsOrTable`: Column names as an array, comma-separated string, or "\*" for all columns
- Returns: The same instance (for method chaining)

#### `where(columnOrConditions: string | Record<string, any>, value?: any): SaintCentral`

Adds WHERE conditions to the query.

- `columnOrConditions`: Either a column name or an object with multiple conditions
- `value`: Value to match (when using column name)
- Returns: The same instance (for method chaining)

#### `order(column: string, options: { ascending?: boolean } = {}): SaintCentral`

Sets the ORDER BY clause.

- `column`: Column to order by
- `options`: Configuration object
  - `ascending`: Whether to sort in ascending order (default: true)
- Returns: The same instance (for method chaining)

#### `limit(value: number): SaintCentral`

Sets the LIMIT clause.

- `value`: Maximum number of records to return
- Returns: The same instance (for method chaining)

#### `offset(value: number): SaintCentral`

Sets the OFFSET clause.

- `value`: Number of records to skip
- Returns: The same instance (for method chaining)

#### `join(table: string, config: { foreignKey: string; primaryKey: string; columns?: string[] }): SaintCentral`

Adds a JOIN clause.

- `table`: The table to join with
- `config`: Join configuration
  - `foreignKey`: The foreign key column
  - `primaryKey`: The primary key column
  - `columns`: Columns to select from the joined table
- Returns: The same instance (for method chaining)

#### `single(): SaintCentral`

Indicates that the query should return a single result.

- Returns: The same instance (for method chaining)

### Data Operation Methods

#### `get<T = any>(): Promise<SaintCentralResponse<T>>`

Executes a SELECT query using GET method.

- Returns: Promise resolving to a SaintCentralResponse

#### `execute<T = any>(): Promise<SaintCentralResponse<T>>`

Executes a SELECT query using POST method.

- Returns: Promise resolving to a SaintCentralResponse

#### `insert<T = any>(table: string, data: Record<string, any> | Record<string, any>[]): Promise<SaintCentralResponse<T>>`

Inserts one or more records.

- `table`: Table to insert into
- `data`: Data to insert (object or array of objects)
- Returns: Promise resolving to a SaintCentralResponse

#### `update<T = any>(table: string, data: Record<string, any>, conditions: Record<string, any>): Promise<SaintCentralResponse<T>>`

Updates records matching the conditions.

- `table`: Table to update
- `data`: Data to update
- `conditions`: WHERE conditions
- Returns: Promise resolving to a SaintCentralResponse

#### `delete<T = any>(table: string, conditions: Record<string, any>): Promise<SaintCentralResponse<T>>`

Deletes records matching the conditions.

- `table`: Table to delete from
- `conditions`: WHERE conditions
- Returns: Promise resolving to a SaintCentralResponse

### Response Interface

```typescript
interface SaintCentralResponse<T = any> {
  data: T;
  count?: number;
  params?: any;
  error?: string;
  message?: string;
  details?: any;
}
```

## Table Permissions

The SaintCentral API implements a permission system that controls access to tables and operations. Here's a summary of the current permissions:

### Users Table

```typescript
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
  operations: ["select", "update"], // Only select and update operations are allowed
  description: "User accounts and profile information",
}
```

### Understanding Table Permissions

Each table can define several permission attributes:

| Attribute         | Description                                                                |
| ----------------- | -------------------------------------------------------------------------- |
| `ownerOnly`       | When `true`, users can only access their own data                          |
| `selfTable`       | When `true`, the user's identity is in the `id` field instead of `user_id` |
| `ownerIdColumn`   | Specifies which column contains the user ID (defaults to `user_id`)        |
| `allowedColumns`  | Array of columns that can be accessed through the API                      |
| `forceConditions` | Required conditions that are always applied to queries on this table       |
| `requiredRole`    | Role required to access this table (e.g., `admin`)                         |
| `operations`      | Array of allowed operations: `select`, `insert`, `update`, `delete`        |

Special cases:

- For friend tables with bidirectional relationships, `ownerIdColumn` can be set to `"special_friendship"`, which will check both `user_id_1` and `user_id_2` columns
- When `selfTable` is true, the system will automatically filter by the user's ID in the table's `id` column

````

This configuration means:

- Users can only access their own data (`ownerOnly: true`)
- The user's identity is stored in the `id` field instead of a separate `user_id` field (`selfTable: true`)
- Only the listed columns are accessible
- Only select and update operations are allowed (no insert or delete)

## Error Handling

The SDK has two different levels of error handling:

1. **Network and SDK Errors**: These are thrown as exceptions and should be caught with try/catch
2. **API-Level Errors**: These are returned in the response object and should be checked with `response.error`

### Example Error Handling Pattern

```typescript
try {
  // Attempt to execute the query
  const response = await saintcentral
    .withAuth(token)
    .from('users')
    .select('id,email,first_name,last_name')
    .get();

  // Check for API-level errors returned in the response
  if (response.error) {
    console.error('API error:', response.error);
    console.error('Details:', response.details);

    // Handle specific error types if needed
    if (response.error.includes('unauthorized')) {
      // Handle authentication errors
    } else if (response.error.includes('not found')) {
      // Handle not found errors
    } else {
      // Handle other API errors
    }

    return null;
  }

  // Process successful response
  console.log('Success!', response.data);
  return response.data;
} catch (error) {
  // Handle network or SDK errors (not API errors)
  console.error('Network or SDK error:', error);

  // Provide more user-friendly error messages
  let errorMessage = 'An unexpected error occurred';

  if (error instanceof Error) {
    errorMessage = error.message;

    // Check for specific error types
    if (error.message.includes('Failed to fetch')) {
      errorMessage = 'Network connection error. Please check your internet connection.';
    }
  }

  console.error(errorMessage);
  return null;
}
````

## Examples

### React Native Profile Screen Example

This example demonstrates how to use the SaintCentral SDK in a React Native application to fetch and update user profile information:

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { Session } from '@supabase/supabase-js';
import saintcentral from '../api/src/sdk';

interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at?: string;
  updated_at?: string;
  profile_image?: string;
  denomination?: string;
}

export default function ProfileScreen({ session }: { session: Session | null }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    profile_image: '',
    denomination: '',
  });

  useEffect(() => {
    if (session) {
      fetchUserProfile();
    }
  }, [session]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError('');

      if (!session?.user) {
        return;
      }

      console.log('Fetching profile with SDK...');

      const response = await saintcentral
        .withAuth(session.access_token)
        .from('users')
        .select('id,email,first_name,last_name,created_at,updated_at,profile_image,denomination')
        .single()
        .get();

      console.log('SDK Response:', response);

      if (response.error) {
        setError(response.error || 'Failed to fetch profile');
      } else if (response.data) {
        const userData = response.data;
        setUserProfile(userData);
        setEditForm({
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          profile_image: userData.profile_image || '',
          denomination: userData.denomination || '',
        });
      } else {
        setError('Profile data not found');
      }
    } catch (err) {
      console.error('SDK Error:', err);
      if (err instanceof Error) {
        setError(err.message || 'Something went wrong');
      } else {
        setError('Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      if (!session?.user) return;

      console.log('Updating profile with SDK...');

      const response = await saintcentral
        .withAuth(session.access_token)
        .update(
          'users',
          {
            first_name: editForm.first_name,
            last_name: editForm.last_name,
            profile_image: editForm.profile_image,
            denomination: editForm.denomination,
            updated_at: new Date().toISOString(),
          },
          { id: session.user.id }
        );

      console.log('Update response:', response);

      if (response.error) {
        throw new Error(response.error || 'Failed to update profile');
      }

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        const updatedProfile = response.data[0];
        setUserProfile(updatedProfile);
        Alert.alert('Success', 'Profile updated successfully');
      }
    } catch (err) {
      console.error('Update error:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update profile');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Render your UI with userProfile data and edit form
  return (
    <View style={styles.container}>
      {/* Your JSX implementation */}
    </View>
  );
}

const styles = StyleSheet.create({
  // Your styles here
});
```

### Web Application User Management Example

This example shows how to use the SDK in a web application context:

```typescript
import { useState, useEffect } from "react";
import saintcentral from "sdk";

export const useUserProfile = (token) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const client = saintcentral.withAuth(token);
        const response = await client
          .from("users")
          .select("id,email,first_name,last_name,created_at,profile_image,denomination")
          .single()
          .get();

        if (response.error) {
          setError(response.error);
        } else {
          setProfile(response.data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  const updateProfile = async (updates) => {
    if (!profile || !token) return { success: false, error: "No profile or token available" };

    try {
      const client = saintcentral.withAuth(token);
      const response = await client.update(
        "users",
        {
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { id: profile.id },
      );

      if (response.error) {
        return { success: false, error: response.error };
      }

      // Update local state with new data
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        setProfile(response.data[0]);
        return { success: true, data: response.data[0] };
      }

      return { success: false, error: "No data returned" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
  };
};

export default UserProfile;
```
