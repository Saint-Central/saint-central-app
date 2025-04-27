# SaintCentral API

This API provides a secure interface for accessing the SaintCentral database through a REST API with Supabase-like SDK.

## SDK Usage

The SaintCentral SDK provides a Supabase-like interface with added security features.

### Basic Setup

```typescript
import saintcentral, { createClient } from "./sdk";

// Use the default client
const client = saintcentral;

// Or create a custom client
const customClient = createClient("https://your-api-url.com", {
  headers: {
    "Custom-Header": "value",
  },
  autoRefreshToken: true,
});

// Add authentication
const authenticatedClient = client.auth("your-jwt-token");
```

### Basic Queries

```typescript
// Select all users
const { data, error } = await saintcentral.from("users").select("*");

// Select specific columns
const { data, error } = await saintcentral.from("users").select("id, first_name, last_name");

// Filter with where
const { data, error } = await saintcentral.from("users").select("*").eq("id", "123");

// Or using where method
const { data, error } = await saintcentral.from("users").select("*").where({ id: "123" });
```

### Advanced Filters

```typescript
// Multiple conditions
const { data, error } = await saintcentral
  .from("users")
  .select("*")
  .eq("active", true)
  .gt("points", 100);

// Range filtering
const { data, error } = await saintcentral
  .from("users")
  .select("*")
  .gte("created_at", "2023-01-01")
  .lte("created_at", "2023-12-31");

// Text search
const { data, error } = await saintcentral.from("users").select("*").ilike("email", "%example.com");

// Array operations
const { data, error } = await saintcentral
  .from("users")
  .select("*")
  .contains("tags", ["premium", "verified"]);
```

### Ordering & Pagination

```typescript
// Order results
const { data, error } = await saintcentral
  .from("users")
  .select("*")
  .order("created_at", { ascending: false });

// Alternative syntax
const { data, error } = await saintcentral.from("users").select("*").orderByDesc("created_at");

// Pagination with limit/offset
const { data, error } = await saintcentral.from("users").select("*").limit(10).offset(20);

// Pagination with range
const { data, error } = await saintcentral.from("users").select("*").range(0, 9); // First 10 items
```

### Single Results

```typescript
// Get a single row
const { data, error } = await saintcentral.from("users").select("*").eq("id", "123").single();

// Maybe single (doesn't throw if no match)
const { data, error } = await saintcentral.from("users").select("*").eq("id", "123").maybeSingle();
```

### Insert, Update, Delete

```typescript
// Insert data
const { data, error } = await saintcentral.from("users").insert({
  first_name: "Jane",
  last_name: "Doe",
  email: "jane@example.com",
});

// Upsert data
const { data, error } = await saintcentral.from("users").upsert(
  {
    id: "123",
    first_name: "Jane",
    last_name: "Smith", // Updated last name
  },
  { onConflict: "id" },
);

// Update data
const { data, error } = await saintcentral.from("users").update({ active: false }).eq("id", "123");

// Delete data
const { data, error } = await saintcentral.from("users").delete().eq("id", "123");
```

### Transactions

```typescript
// Method 1: Using transaction API
const trx = await saintcentral.begin();
try {
  const { data: user } = await trx.from("users").insert({ name: "New User" }).single();

  await trx.from("profiles").insert({ user_id: user.id, bio: "Hello world" });

  await trx.commit();
} catch (error) {
  await trx.rollback();
  console.error("Transaction failed:", error);
}

// Method 2: Using transaction callback
await saintcentral.transaction(async (trx) => {
  const { data: user } = await trx.from("users").insert({ name: "New User" }).single();

  await trx.from("profiles").insert({ user_id: user.id, bio: "Hello world" });
});
```

### Error Handling

```typescript
const { data, error, status } = await saintcentral.from("users").select("*");

if (error) {
  console.error(`Error ${status}: ${error.message}`);
  if (error.details) {
    console.error("Details:", error.details);
  }
} else {
  console.log("Success!", data);
}
```

## Security Features

The SaintCentral SDK includes built-in security features:

1. Table permission restrictions
2. Rate limiting
3. Owner-based row level security
4. Column access restrictions
5. Role-based access control
