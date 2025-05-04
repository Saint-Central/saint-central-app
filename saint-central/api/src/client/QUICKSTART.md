# SaintCentral SDK Quickstart Guide

Get up and running with the SaintCentral SDK in minutes.

## Installation

```bash
npm install @saint-central/sdk
```

## Basic Setup

```javascript
import { SaintCentralClient } from "@saint-central/sdk";

const client = new SaintCentralClient({
  apiUrl: "https://your-api-endpoint.com",
});
```

## Authentication

```javascript
// Login
await client.auth.login({
  email: "user@example.com",
  password: "yourpassword",
});

// Logout
await client.auth.logout();
```

## Common Operations

### Fetch Data

```javascript
// Get all users
const users = await client.select({
  table: "users",
});

// Get a specific user
const user = await client.select({
  table: "users",
  filter: {
    column: "id",
    operator: "eq",
    value: 123,
  },
  single: true,
});
```

### Create Data

```javascript
const newUser = await client.insert({
  table: "users",
  values: {
    name: "John Doe",
    email: "john@example.com",
    role: "user",
  },
});
```

### Update Data

```javascript
await client.update({
  table: "users",
  values: {
    name: "John Smith",
  },
  filter: {
    column: "id",
    operator: "eq",
    value: 123,
  },
});
```

### Delete Data

```javascript
await client.delete({
  table: "users",
  filter: {
    column: "id",
    operator: "eq",
    value: 123,
  },
});
```

## Filtering

```javascript
// Get active admin users
const admins = await client.select({
  table: "users",
  filter: [
    { column: "role", operator: "eq", value: "admin" },
    { column: "active", operator: "eq", value: true },
  ],
});
```

## Error Handling

```javascript
try {
  const result = await client.select({
    table: "users",
  });
} catch (error) {
  console.error(`Error ${error.status}: ${error.message}`);
}
```

## Typescript Support

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const user = await client.select<User>({
  table: "users",
  filter: {
    column: "id",
    operator: "eq",
    value: 123,
  },
  single: true,
});

// user is now typed as User
console.log(user.name);
```

For more detailed documentation, see the [SDK Documentation](./SDK.md).
