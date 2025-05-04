# SaintCentral SDK Documentation

## Table of Contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Authentication](#authentication)
- [Data Operations](#data-operations)
  - [Select](#select)
  - [Insert](#insert)
  - [Update](#update)
  - [Delete](#delete)
  - [Filtering Data](#filtering-data)
- [Storage Operations](#storage-operations)
  - [Getting Public URLs](#getting-public-urls)
  - [Uploading Files](#uploading-files)
  - [Downloading Files](#downloading-files)
  - [Managing Files](#managing-files)
- [Error Handling](#error-handling)
- [Advanced Usage](#advanced-usage)
- [TypeScript Support](#typescript-support)

## Introduction

The SaintCentral SDK provides a secure client-side interface to interact with your SaintCentral backend services. It's designed to be simple to use while providing robust security features to protect your data.

The SDK acts as a secure intermediary between your client applications and your Supabase database, ensuring that all database operations go through your controlled API endpoints with proper authentication and authorization.

### Key Features

- **Enhanced Security**: Prevents direct access to your database
- **Simplified API**: Clean, intuitive interface for common operations
- **Authentication Management**: Built-in token handling
- **Data Operations**: CRUD operations with filtering
- **Storage Operations**: Upload, download, and manage files
- **Type Safety**: Full TypeScript support

## Installation

Install the SaintCentral SDK using npm or yarn:

```bash
# Using npm
npm install saintcentral

# Using yarn
yarn add saintcentral
```

Then import it in your project:

```javascript
// ESM import - single import for all SDK functionality
import saintcentral from "saintcentral";

// Now you can access all components through this single import:
// - saintcentral.auth - Authentication methods
// - saintcentral.realtime - Realtime subscriptions
// - saintcentral.storage - File storage operations
// - saintcentral.createClient() - Create a custom client
// - saintcentral.client - Default authenticated client

// CommonJS require
const saintcentral = require("saintcentral");
```

If you need individual components (not recommended), they are also exported:

```javascript
// All functionality is also available through a single import
import { auth, realtime, storage, createClient } from "saintcentral";
```

## Authentication

The SaintCentral SDK requires authentication for most operations. All authentication methods are accessible through the main `saintcentral` import:

```javascript
// Import the SDK
import saintcentral from "saintcentral";

// Use authentication methods directly
const { user, session, error } = await saintcentral.auth.signIn({
  email: "user@example.com",
  password: "securepassword",
});

// After authentication, you can use the client for authenticated operations
if (session) {
  const response = await saintcentral.client
    .from("users")
    .select("id, email, first_name, last_name")
    .get();

  console.log(response.data);
}
```

### Authentication with Custom Client

You can also create a custom authenticated client:

```javascript
// Import the SDK
import saintcentral from "saintcentral";

// Get the session from your auth flow
const { session } = await saintcentral.auth.signIn({
  email: "user@example.com",
  password: "securepassword",
});

// Use the access token with a custom client
if (session) {
  const customClient = saintcentral.createClient().withAuth(session.access_token);

  const response = await customClient
    .from("users")
    .select("id, email, first_name, last_name")
    .get();

  console.log(response.data);
}
```

## Data Operations

The SDK provides a fluent interface for data operations, making it easy to build and execute queries.

### Select

Retrieve data from your database with the `select` method:

```javascript
// Import the SDK
import saintcentral from "saintcentral";

// Basic select - get all records from a table
const response = await saintcentral.client.from("users").select("*").get();

// Select specific columns
const response = await saintcentral.client
  .from("posts")
  .select("id, title, content, created_at")
  .get();

// Get a single record
const response = await saintcentral.client
  .from("users")
  .select("id, email, first_name, last_name")
  .single()
  .get();
```

### Insert

Create new records with the `insert` method:

```javascript
// Import the SDK (if not already imported)
import saintcentral from "saintcentral";

// Insert a single record
const response = await saintcentral.client.insert("posts", {
  title: "My First Post",
  content: "Hello, world!",
  user_id: "123",
});

// Insert multiple records
const response = await saintcentral.client.insert("comments", [
  { post_id: 1, user_id: "123", text: "Great post!" },
  { post_id: 1, user_id: "456", text: "Thanks for sharing!" },
]);
```

### Update

Modify existing records with the `update` method:

```javascript
// Update a record
const response = await saintcentral.client.update(
  "users",
  {
    first_name: "John",
    last_name: "Doe",
    updated_at: new Date().toISOString(),
  },
  { id: userId },
);

// Update multiple records that match a condition
const response = await saintcentral.client.update(
  "posts",
  { status: "archived" },
  { user_id: userId, status: "draft" },
);
```

### Delete

Remove records with the `delete` method:

```javascript
// Delete a specific record
const response = await saintcentral.client.delete("posts", { id: postId });

// Delete multiple records that match a condition
const response = await saintcentral.client.delete("comments", { post_id: postId });
```

### Filtering Data

The SDK supports various filtering methods to narrow down your queries:

```javascript
// Filter with equality
const response = await saintcentral.client
  .from("posts")
  .select("*")
  .eq("status", "published")
  .get();

// Combine multiple filters
const response = await saintcentral.client
  .from("posts")
  .select("*")
  .eq("status", "published")
  .gt("created_at", "2023-01-01")
  .get();

// Order results
const response = await saintcentral.client
  .from("posts")
  .select("*")
  .order("created_at", { ascending: false })
  .get();
```

## Storage Operations

The SDK provides a convenient interface for file storage operations.

```javascript
// Import the SDK
import saintcentral from "saintcentral";

// Access the storage module
const { storage } = saintcentral;

// List all buckets
const { data: buckets, error } = await storage.listBuckets();

// Work with a specific bucket
const avatarBucket = storage.bucket("avatars");
```

### Getting Public URLs

```javascript
// Get a public URL for a file
const publicUrl = saintcentral.storage.bucket("public").getPublicUrl("path/to/file.jpg");

// Generate a signed URL that expires after a set time
const { data: signedUrl } = await saintcentral.storage
  .bucket("private")
  .createSignedUrl("sensitive-file.pdf", 60); // Expires in 60 seconds
```

### Uploading Files

```javascript
// Upload a file
const { data, error } = await saintcentral.storage
  .bucket("avatars")
  .upload("user-profile.jpg", fileBlob, {
    contentType: "image/jpeg",
    upsert: true,
  });

// Upload from a form input
const fileInput = document.getElementById("file-input");
const file = fileInput.files[0];

const { data, error } = await saintcentral.storage
  .bucket("documents")
  .upload(`${Date.now()}-${file.name}`, file);
```

### Downloading Files

```javascript
// Download a file
const { data, error } = await saintcentral.storage.bucket("documents").download("report.pdf");

// Create an object URL for browser viewing
const { data, error } = await saintcentral.storage.bucket("images").download("photo.jpg");

if (data) {
  const objectUrl = URL.createObjectURL(data);
  image.src = objectUrl;
}
```

### Managing Files

```javascript
// List files in a bucket
const { data, error } = await saintcentral.storage.bucket("documents").list("reports/", {
  limit: 100,
  offset: 0,
  sortBy: { column: "name", order: "asc" },
});

// Delete a file
const { error } = await saintcentral.storage
  .bucket("temp")
  .remove(["old-file1.txt", "old-file2.txt"]);

// Copy a file
const { data, error } = await saintcentral.storage
  .bucket("backups")
  .copy("file-v1.txt", "file-v2.txt");
```

## Realtime Subscriptions

Subscribe to realtime changes in your database:

```javascript
// Import the SDK
import saintcentral from "saintcentral";

// Access the realtime module
const { realtime } = saintcentral;

// Subscribe to all changes in a table
const channel = realtime
  .channel("public:posts")
  .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, (payload) => {
    console.log("Change received!", payload);
  })
  .subscribe();

// Subscribe to specific changes
const channel = realtime
  .channel("posts_channel")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "posts", filter: "status=eq.published" },
    (payload) => {
      console.log("New published post!", payload);
    },
  )
  .subscribe();

// Later, unsubscribe from the channel
channel.unsubscribe();
```

## Error Handling

All SDK methods return a standardized response object that includes data and error properties, making it easy to handle errors:

```javascript
// Basic error handling
const response = await saintcentral.withAuth(token).from("users").select("*").get();

if (response.error) {
  console.error("Error fetching users:", response.error.message);
  // Handle the error appropriately
} else {
  // Process the data
  const users = response.data;
}

// Using try/catch for more comprehensive error handling
try {
  const response = await saintcentral.withAuth(token).from("users").select("*").get();

  if (response.error) {
    throw new Error(response.error.message);
  }

  // Process the successful response
  const users = response.data;
} catch (err) {
  console.error("Error in API call:", err);
  // Show user-friendly error message
  Alert.alert("Error", "Failed to load users. Please try again later.");
}
```

## Advanced Usage

### Transactions

For operations that need to be performed as a unit:

```javascript
// Start a transaction
const transaction = saintcentral.withAuth(token).transaction();

try {
  // Add operations to the transaction
  transaction.insert("orders", { user_id: userId, total: 100 });
  transaction.update("inventory", { quantity: 5 }, { product_id: 123 });

  // Commit the transaction
  const { data, error } = await transaction.commit();

  if (error) {
    throw new Error(error.message);
  }

  console.log("Transaction successful:", data);
} catch (err) {
  console.error("Transaction failed:", err);
}
```

### Custom Queries

For more complex database operations:

```javascript
// Execute a custom query
const { data, error } = await saintcentral
  .withAuth(token)
  .rpc("calculate_user_stats", { user_id: userId });

// Execute a raw SQL query (if supported by your API)
const { data, error } = await saintcentral.withAuth(token).query(`
    SELECT users.id, COUNT(posts.id) as post_count
    FROM users
    LEFT JOIN posts ON users.id = posts.user_id
    GROUP BY users.id
  `);
```

### Realtime Subscriptions

Subscribe to realtime changes if supported by your API:

```javascript
// Subscribe to changes on a table
const subscription = saintcentral
  .withAuth(token)
  .from("messages")
  .on("INSERT", (payload) => {
    console.log("New message:", payload.new);
    // Update UI with new message
  })
  .subscribe();

// Later, unsubscribe when no longer needed
subscription.unsubscribe();
```

## TypeScript Support

The SDK includes TypeScript declarations to provide type safety:

```typescript
// Define types for your data models
interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at?: string;
  updated_at?: string;
  profile_image?: string;
  denomination?: string;
}

// Use with TypeScript
const fetchUsers = async (token: string): Promise<User[]> => {
  const response = await saintcentral.withAuth(token).from<User>("users").select("*").get();

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data || [];
};

// Type-safe usage with specific fields
const fetchUserProfiles = async (token: string) => {
  const response = await saintcentral
    .withAuth(token)
    .from<User>("users")
    .select("id, first_name, last_name, profile_image")
    .get();

  return response;
};
```

## Complete Examples

### User Profile Management

```javascript
// Fetch user profile
const fetchUserProfile = async (session) => {
  try {
    if (!session?.access_token) {
      throw new Error("No authentication token available");
    }

    const response = await saintcentral
      .withAuth(session.access_token)
      .from("users")
      .select("id, email, first_name, last_name, profile_image, denomination")
      .single()
      .get();

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data;
  } catch (err) {
    console.error("Error fetching profile:", err);
    throw err;
  }
};

// Update user profile
const updateUserProfile = async (session, profileData) => {
  try {
    if (!session?.access_token) {
      throw new Error("No authentication token available");
    }

    const response = await saintcentral.withAuth(session.access_token).update(
      "users",
      {
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        denomination: profileData.denomination,
        updated_at: new Date().toISOString(),
      },
      { id: session.user.id },
    );

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data[0]; // First updated record
  } catch (err) {
    console.error("Error updating profile:", err);
    throw err;
  }
};

// Upload a profile image
const uploadProfileImage = async (session, imageUri) => {
  try {
    if (!session?.access_token) {
      throw new Error("No authentication token available");
    }

    // Get file extension
    const fileExt = imageUri.split(".").pop()?.toLowerCase() || "jpeg";
    const fileName = `profile-${Date.now()}.${fileExt}`;
    const filePath = `${session.user.id}/${fileName}`;

    // Convert image to base64 (this part depends on your platform)
    const base64Data = await convertImageToBase64(imageUri);

    // Upload the image
    const { error: uploadError } = await saintcentral
      .withAuth(session.access_token)
      .storage.from("profile-images")
      .upload(filePath, base64Data, {
        contentType: `image/${fileExt}`,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get the public URL
    const publicUrl = saintcentral.storage.from("profile-images").getPublicUrl(filePath);

    // Update user profile with the new image URL
    const response = await saintcentral.withAuth(session.access_token).update(
      "users",
      {
        profile_image: publicUrl,
        updated_at: new Date().toISOString(),
      },
      { id: session.user.id },
    );

    if (response.error) {
      throw new Error(response.error.message);
    }

    return {
      imageUrl: publicUrl,
      profile: response.data[0],
    };
  } catch (err) {
    console.error("Error uploading profile image:", err);
    throw err;
  }
};
```

### Blog Post Management

```javascript
// Fetch posts with pagination
const fetchPosts = async (token, page = 1, pageSize = 10) => {
  try {
    const offset = (page - 1) * pageSize;

    const response = await saintcentral
      .withAuth(token)
      .from("posts")
      .select("id, title, content, created_at, user_id")
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1)
      .get();

    if (response.error) {
      throw new Error(response.error.message);
    }

    // Also get the total count
    const countResponse = await saintcentral
      .withAuth(token)
      .from("posts")
      .select("id")
      .count()
      .get();

    return {
      posts: response.data,
      totalCount: countResponse.count,
      page,
      pageSize,
      totalPages: Math.ceil(countResponse.count / pageSize),
    };
  } catch (err) {
    console.error("Error fetching posts:", err);
    throw err;
  }
};

// Create a new post
const createPost = async (token, postData) => {
  try {
    const response = await saintcentral.withAuth(token).insert("posts", {
      title: postData.title,
      content: postData.content,
      user_id: postData.userId,
      created_at: new Date().toISOString(),
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data[0];
  } catch (err) {
    console.error("Error creating post:", err);
    throw err;
  }
};

// Upload an image for a post
const uploadPostImage = async (token, postId, imageUri) => {
  try {
    // Get file extension
    const fileExt = imageUri.split(".").pop()?.toLowerCase() || "jpeg";
    const fileName = `post-${postId}-${Date.now()}.${fileExt}`;
    const filePath = `posts/${postId}/${fileName}`;

    // Convert image to base64 (this part depends on your platform)
    const base64Data = await convertImageToBase64(imageUri);

    // Upload the image
    const { error: uploadError } = await saintcentral
      .withAuth(token)
      .storage.from("post-images")
      .upload(filePath, base64Data, {
        contentType: `image/${fileExt}`,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get the public URL
    const publicUrl = saintcentral.storage.from("post-images").getPublicUrl(filePath);

    // Update the post with the image URL
    const response = await saintcentral.withAuth(token).update(
      "posts",
      {
        image_url: publicUrl,
        updated_at: new Date().toISOString(),
      },
      { id: postId },
    );

    if (response.error) {
      throw new Error(response.error.message);
    }

    return {
      imageUrl: publicUrl,
      post: response.data[0],
    };
  } catch (err) {
    console.error("Error uploading post image:", err);
    throw err;
  }
};
```

### React Component Example

```jsx
import React, { useState, useEffect } from "react";
import { View, Text, Image, ActivityIndicator, FlatList, StyleSheet } from "react-native";
import saintcentral from "saintcentral";
import { useAuth } from "./AuthContext"; // Your auth context

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { session } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      if (!session) return;

      try {
        setLoading(true);
        setError(null);

        const response = await saintcentral
          .withAuth(session.access_token)
          .from("users")
          .select("id, first_name, last_name, profile_image")
          .get();

        if (response.error) {
          throw new Error(response.error.message);
        }

        setUsers(response.data || []);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [session]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3A86FF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={users}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.userCard}>
          {item.profile_image ? (
            <Image source={{ uri: item.profile_image }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {`${item.first_name?.[0] || ""}${item.last_name?.[0] || ""}`}
              </Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {item.first_name} {item.last_name}
            </Text>
            <Text style={styles.userId}>ID: {item.id}</Text>
          </View>
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  error: {
    color: "red",
    fontSize: 16,
  },
  userCard: {
    flexDirection: "row",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#3A86FF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  userInfo: {
    marginLeft: 15,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  userId: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
});

export default UserList;
```
