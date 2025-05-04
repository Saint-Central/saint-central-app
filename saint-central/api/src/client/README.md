# SaintCentral Client SDK

This is the client SDK for SaintCentral, providing a simplified interface to interact with the SaintCentral API.

## Key Features

- **Single Import** - All SDK functionality is available through a single import
- **Unified API** - Consistent interface across authentication, data operations, file storage, and realtime subscriptions
- **Type Safety** - Full TypeScript support
- **Enhanced Security** - Built-in security features to protect your data

## Usage

The SDK is designed to be used with a single import:

```javascript
// Import the entire SDK
import saintcentral from "saintcentral";

// Now you can access all components:
// - Authentication
const { user, session } = await saintcentral.auth.signIn({
  email: "user@example.com",
  password: "password",
});

// - Data operations
const { data: users } = await saintcentral.client.from("users").select("id, name, email").get();

// - File storage
const { data: file } = await saintcentral.storage.bucket("documents").download("report.pdf");

// - Realtime subscriptions
const channel = saintcentral.realtime
  .channel("changes")
  .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, (payload) =>
    console.log("Change:", payload),
  )
  .subscribe();
```

## SDK Structure

The SDK consists of several modules, all accessible through the main import:

- **auth** - Authentication methods for sign-in, sign-up, and session management
- **client** - Data operations for querying, inserting, updating, and deleting data
- **storage** - File storage operations for uploading, downloading, and managing files
- **realtime** - Realtime subscriptions to database changes

## Documentation

For complete documentation, please see:

- [SDK Documentation](/api/src/documentation/sdk.md)
- [Authentication](/api/src/documentation/security.md)
- [Table Configuration](/api/src/documentation/tableConfig.md)

## Development

This SDK is organized to provide a seamless developer experience:

- `index.ts` - Main entry point that exports all SDK functionality
- `auth.ts` - Authentication module
- `sdk.ts` - Core client functionality for data operations
- `storage.ts` - File storage operations
- `realtime.ts` - Realtime subscriptions
- `sdkSecurity.ts` - Security utilities

All components are exported through `index.ts`, so users only need to import from the package root.
