# Universal Update API Documentation

This API provides a secure way to update records in your database tables with proper permission controls. It works alongside the existing Select API to provide complete data management capabilities.

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [Request Parameters](#request-parameters)
3. [Security Features](#security-features)
4. [Supported Tables](#supported-tables)
5. [Special Cases](#special-cases)
6. [Example Requests](#example-requests)
7. [Response Format](#response-format)
8. [Error Handling](#error-handling)

## Basic Usage

The Update API can only be accessed via POST requests:

```json
POST /update

{
  "table": "profiles",
  "data": {
    "bio": "Updated bio information",
    "interests": ["reading", "hiking"]
  },
  "where": {
    "id": "123e4567-e89b-12d3-a456-426614174000"
  },
  "returning": ["id", "bio", "interests", "updated_at"],
  "single": true
}
```

## Request Parameters

| Parameter   | Type               | Description                                                            |
| ----------- | ------------------ | ---------------------------------------------------------------------- |
| `table`     | string             | **Required**. The table to update. Must be in the allowed tables list. |
| `data`      | object             | **Required**. The data to update in key-value format.                  |
| `where`     | object             | Conditions for filtering which rows to update.                         |
| `returning` | string or string[] | Columns to return after the update is complete.                        |
| `single`    | boolean            | If true, updates and returns a single record only.                     |

## Security Features

The Update API implements several security mechanisms:

1. **Authentication**: Authentication is required for all update operations.
2. **Authorization**: Ensures users can only update their own data for protected tables.
3. **Rate Limiting**: Prevents abuse with limits of 20 update requests per minute.
4. **Column Restrictions**: Tables can have restricted columns that can't be updated.
5. **Role-Based Access**: Some tables require specific roles (e.g., admin).
6. **Update Permissions**: Tables can be configured to allow or disallow updates entirely.

## Supported Tables

The API supports updating the same tables as the Select API, with identical security settings:

| Table   | Security         | Update Allowed | Description                           |
| ------- | ---------------- | -------------- | ------------------------------------- |
| `users` | Self access only | Yes            | User accounts and profile information |

## Special Cases

### Users Table

For the `users` table, the API automatically adds a condition to only update the currently authenticated user's data. It uses the `id` field for this filtering (rather than `user_id`).

### Friends Table

The `friends` table has special handling for relationships. It will automatically filter to update only friendships where the authenticated user is either `user_id_1` or `user_id_2`.

## Example Requests

### Update User Profile

```json
POST /update

{
  "table": "profiles",
  "data": {
    "bio": "Software developer with 5 years of experience",
    "interests": ["coding", "hiking", "photography"]
  },
  "returning": ["id", "bio", "interests", "updated_at"],
  "single": true
}
```

### Update a Post

```json
POST /update

{
  "table": "faith_posts",
  "data": {
    "title": "Updated Post Title",
    "content": "This is the updated content of my post."
  },
  "where": {
    "id": 42
  },
  "returning": ["id", "title", "content", "updated_at"]
}
```

## Response Format

The API returns responses in the following format:

```json
{
  "success": true,
  "data": [...],  // The updated data if returning was specified
  "count": 1,     // Number of records updated
  "updatedAt": "2025-04-25T12:34:56.789Z", // Timestamp of the update
  "params": {     // The parsed query parameters (for debugging)
    "table": "profiles",
    "where": { /* conditions */ },
    "returning": ["id", "bio", "interests", "updated_at"],
    "single": true
  }
}
```

## Error Handling

The API returns appropriate error codes with descriptive messages:

- `400 Bad Request`: Invalid parameters or JSON format
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions for the requested action or updates not allowed for this table
- `404 Not Found`: Table not found or not allowed
- `405 Method Not Allowed`: Only POST is supported for updates
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side errors
