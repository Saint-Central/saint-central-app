# SaintCentral SDK Documentation

This guide explains how to use the SaintCentral SDK to interact with the SaintCentral API from client applications.

## Table of Contents

1. [Installation](#installation)
2. [Setup](#setup)
3. [Authentication](#authentication)
4. [Data Operations](#data-operations)
   - [Select](#select-data)
   - [Insert](#insert-data)
   - [Update](#update-data)
   - [Delete](#delete-data)
   - [Upsert](#upsert-data)
   - [Count](#count-records)
5. [Filtering](#filtering)
6. [Error Handling](#error-handling)
7. [Advanced Usage](#advanced-usage)
8. [TypeScript Support](#typescript-support)

## Installation

```bash
npm install @saint-central/sdk
```

## Setup

Initialize the SDK by creating a client instance:

```javascript
import { SaintCentralClient } from "@saint-central/sdk";

const client = new SaintCentralClient({
  apiUrl: "https://your-api-endpoint.com",
  debug: false, // Set to true for verbose logging
});
```

## Authentication

Before making API calls, authenticate with the SaintCentral API:

```javascript
// Login with email and password
await client.auth.login({
  email: "user@example.com",
  password: "securepassword",
});

// Or use an existing session token
client.auth.setSession(existingToken);

// Check authentication status
const isAuthenticated = client.auth.isAuthenticated();

// Logout
await client.auth.logout();
```

The SDK automatically handles:

- Secure token storage
- Token refresh
- CSRF protection
- Session expiration

## Data Operations

### Select Data

Retrieve data from tables with optional filtering, sorting, and pagination:

```javascript
// Basic select
const users = await client.select({
  table: "users",
  columns: ["id", "name", "email"], // Optional, defaults to '*'
});

// With pagination
const paginatedUsers = await client.select({
  table: "users",
  limit: 10,
  offset: 20,
});

// With sorting
const sortedUsers = await client.select({
  table: "users",
  order: {
    column: "created_at",
    ascending: false,
  },
});

// With filtering
const activeUsers = await client.select({
  table: "users",
  filter: {
    column: "active",
    operator: "eq",
    value: true,
  },
});

// Multiple filters
const filteredUsers = await client.select({
  table: "users",
  filter: [
    {
      column: "role",
      operator: "eq",
      value: "admin",
    },
    {
      column: "created_at",
      operator: "gte",
      value: "2023-01-01",
    },
  ],
});

// Get a single record
const user = await client.select({
  table: "users",
  filter: {
    column: "id",
    operator: "eq",
    value: 123,
  },
  single: true, // Returns first match instead of an array
});
```

### Insert Data

Add new records to tables:

```javascript
// Insert a single record
const newUser = await client.insert({
  table: "users",
  values: {
    name: "John Doe",
    email: "john@example.com",
    role: "user",
  },
});

// Insert multiple records
const newUsers = await client.insert({
  table: "users",
  values: [
    {
      name: "Jane Smith",
      email: "jane@example.com",
      role: "user",
    },
    {
      name: "Bob Johnson",
      email: "bob@example.com",
      role: "admin",
    },
  ],
});
```

### Update Data

Modify existing records:

```javascript
// Update a record by ID
const updatedUser = await client.update({
  table: "users",
  values: {
    name: "John Smith",
    updated_at: new Date().toISOString(),
  },
  filter: {
    column: "id",
    operator: "eq",
    value: 123,
  },
});

// Update multiple records
const updatedUsers = await client.update({
  table: "users",
  values: {
    status: "inactive",
    updated_at: new Date().toISOString(),
  },
  filter: {
    column: "last_login",
    operator: "lt",
    value: "2023-01-01",
  },
});
```

### Delete Data

Remove records from tables:

```javascript
// Delete a record by ID
await client.delete({
  table: "users",
  filter: {
    column: "id",
    operator: "eq",
    value: 123,
  },
});

// Delete multiple records
await client.delete({
  table: "tasks",
  filter: {
    column: "status",
    operator: "eq",
    value: "completed",
  },
});
```

### Upsert Data

Insert or update records:

```javascript
// Upsert a single record
const user = await client.upsert({
  table: "users",
  values: {
    id: 123,
    name: "John Doe",
    email: "john@example.com",
    updated_at: new Date().toISOString(),
  },
  onConflict: "id", // Column(s) to check for conflicts
});

// Upsert multiple records
const users = await client.upsert({
  table: "users",
  values: [
    {
      id: 123,
      name: "John Doe",
      updated_at: new Date().toISOString(),
    },
    {
      id: 124,
      name: "Jane Smith",
      updated_at: new Date().toISOString(),
    },
  ],
  onConflict: "id",
});
```

### Count Records

Count records in a table:

```javascript
// Count all records
const totalUsers = await client.count({
  table: "users",
});

// Count with filters
const activeUserCount = await client.count({
  table: "users",
  filter: {
    column: "active",
    operator: "eq",
    value: true,
  },
});
```

## Filtering

The SDK supports a flexible filtering system:

### Available Operators

| Operator | Description                         | Example                                                              |
| -------- | ----------------------------------- | -------------------------------------------------------------------- |
| eq       | Equal to                            | `{ column: 'status', operator: 'eq', value: 'active' }`              |
| neq      | Not equal to                        | `{ column: 'status', operator: 'neq', value: 'deleted' }`            |
| gt       | Greater than                        | `{ column: 'age', operator: 'gt', value: 18 }`                       |
| gte      | Greater than or equal to            | `{ column: 'age', operator: 'gte', value: 21 }`                      |
| lt       | Less than                           | `{ column: 'price', operator: 'lt', value: 100 }`                    |
| lte      | Less than or equal to               | `{ column: 'price', operator: 'lte', value: 99.99 }`                 |
| like     | SQL LIKE pattern match              | `{ column: 'name', operator: 'like', value: 'John%' }`               |
| ilike    | Case-insensitive LIKE pattern match | `{ column: 'name', operator: 'ilike', value: '%smith%' }`            |
| is       | Test for NULL or boolean values     | `{ column: 'deleted_at', operator: 'is', value: null }`              |
| in       | Value exists in array               | `{ column: 'status', operator: 'in', value: ['active', 'pending'] }` |
| contains | JSON array contains value           | `{ column: 'tags', operator: 'contains', value: ['important'] }`     |

### Combining Multiple Filters

Use an array of filter objects to apply multiple conditions:

```javascript
// Users who are admins AND created after 2023-01-01
const users = await client.select({
  table: "users",
  filter: [
    {
      column: "role",
      operator: "eq",
      value: "admin",
    },
    {
      column: "created_at",
      operator: "gte",
      value: "2023-01-01",
    },
  ],
});
```

## Error Handling

The SDK uses a consistent error handling pattern:

```javascript
try {
  const result = await client.select({
    table: "users",
  });
  // Process result
} catch (error) {
  if (error.status === 401) {
    // Handle authentication error
    console.error("Authentication failed:", error.message);
  } else if (error.status === 403) {
    // Handle permission error
    console.error("Permission denied:", error.message);
  } else {
    // Handle other errors
    console.error("API error:", error.message);
  }
}
```

Error objects include:

- `status`: HTTP status code
- `message`: Error description
- `details`: Additional error information (when available)

## Advanced Usage

### Transactions

For complex operations that require multiple changes to be atomic:

```javascript
// Start a transaction
const transaction = await client.transaction.start();

try {
  // Perform operations within the transaction
  const newUser = await transaction.insert({
    table: "users",
    values: {
      name: "John Doe",
      email: "john@example.com",
    },
  });

  await transaction.insert({
    table: "user_settings",
    values: {
      user_id: newUser.id,
      theme: "dark",
      notifications: true,
    },
  });

  // Commit the transaction if all operations succeed
  await transaction.commit();
} catch (error) {
  // Rollback the transaction if any operation fails
  await transaction.rollback();
  throw error;
}
```

### Real-time Subscriptions

Subscribe to real-time updates on specific tables:

```javascript
// Subscribe to all changes on the 'tasks' table
const subscription = client.subscribe("tasks", (payload) => {
  console.log("Task changed:", payload);
});

// Subscribe to filtered changes
const filteredSubscription = client.subscribe(
  "tasks",
  (payload) => {
    console.log("High priority task changed:", payload);
  },
  {
    filter: {
      column: "priority",
      operator: "eq",
      value: "high",
    },
  },
);

// Unsubscribe when no longer needed
subscription.unsubscribe();
```

### Secure Data Validation

The SDK provides client-side validation to ensure data integrity before sending to the API:

```javascript
import { validateInput } from "@saint-central/sdk";

// Validate a required string with maximum length
const nameValidation = validateInput(formData.name, "string", {
  required: true,
  maxLength: 50,
});

if (!nameValidation.isValid) {
  showError(nameValidation.error);
  return;
}

// Validate an email address
const emailValidation = validateInput(formData.email, "email", {
  required: true,
});

if (!emailValidation.isValid) {
  showError(emailValidation.error);
  return;
}

// If all validations pass, send to the API
await client.insert({
  table: "users",
  values: {
    name: nameValidation.value,
    email: emailValidation.value,
  },
});
```

## TypeScript Support

The SDK includes comprehensive TypeScript definitions:

```typescript
import { SaintCentralClient, SelectParams, InsertParams } from "@saint-central/sdk";

// Define your data models
interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
  created_at: string;
}

// Type-safe select
const selectParams: SelectParams = {
  table: "users",
  columns: ["id", "name", "email", "role"],
  filter: {
    column: "role",
    operator: "eq",
    value: "admin",
  },
};

const adminUsers = await client.select<User>(selectParams);

// Type-safe insert
const insertParams: InsertParams = {
  table: "users",
  values: {
    name: "New User",
    email: "new@example.com",
    role: "user",
  },
};

const newUser = await client.insert<User>(insertParams);
```

This provides:

- Auto-completion for API methods
- Type checking for parameters
- Properly typed responses
- Compile-time validation of filter operators
