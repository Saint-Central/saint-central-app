# Universal Select API Documentation

This API provides a flexible way to query your database tables with proper security controls and permissions. It eliminates the need for creating multiple specific API endpoints.

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [Query Parameters](#query-parameters)
3. [Security Features](#security-features)
4. [Supported Tables](#supported-tables)
5. [Special Cases](#special-cases)
6. [Example Requests](#example-requests)
7. [Response Format](#response-format)
8. [Error Handling](#error-handling)
9. [Extending the API](#extending-the-api)

## Basic Usage

The API can be accessed via either GET or POST requests:

**GET Request:**

```
GET /select?table=users&columns=id,first_name,last_name&single=true
```

**POST Request:**

```json
POST /select

{
  "table": "users",
  "columns": ["id", "first_name", "last_name"],
  "single": true
}
```

## Query Parameters

| Parameter | Type               | Description                                                           |
| --------- | ------------------ | --------------------------------------------------------------------- |
| `table`   | string             | **Required**. The table to query. Must be in the allowed tables list. |
| `columns` | string or string[] | Columns to select. Comma-separated in GET requests, array in POST.    |
| `where`   | object             | Conditions for filtering rows in key-value format.                    |
| `order`   | object             | Sorting with `{ column: string, ascending: boolean }` format.         |
| `limit`   | number             | Maximum number of rows to return.                                     |
| `offset`  | number             | Number of rows to skip.                                               |
| `join`    | object             | Configuration for joining related tables.                             |
| `single`  | boolean            | If true, returns a single object instead of an array.                 |

## Security Features

The API implements several security mechanisms:

1. **Authentication**: Some tables require authentication based on their configuration.
2. **Authorization**: Ensures users can only access their own data for protected tables.
3. **Rate Limiting**: Prevents abuse with configurable limits per table.
4. **Column Restrictions**: Tables can have restricted columns that can't be accessed.
5. **Role-Based Access**: Some tables require specific roles (e.g., admin).

## Supported Tables

The API supports the following tables with their respective security settings:

| Table                   | Security         | Description                                        |
| ----------------------- | ---------------- | -------------------------------------------------- |
| `users`                 | Self access only | User accounts and profile information              |
| `profiles`              | Owner only       | Extended user profile information                  |
| `friends`               | Special access   | User friendships and connections                   |
| `culture_posts`         | Public read      | Public posts related to cultural topics            |
| `faith_posts`           | Public read      | Public posts related to faith topics               |
| `news_posts`            | Public read      | Public news and announcements                      |
| `womens_ministry_posts` | Public read      | Public posts related to women's ministry           |
| `comments`              | Owner only       | User comments on posts                             |
| `likes`                 | Owner only       | User likes for posts and comments                  |
| `intentions`            | Owner only       | Prayer intentions created by users                 |
| `lent_tasks`            | Owner only       | Lent-related tasks and progress tracking           |
| `products`              | Public read      | Product catalog accessible to all users            |
| `orders`                | Owner only       | User orders with order details                     |
| `admin_logs`            | Admin only       | Administrative logs accessible only to admin users |

## Special Cases

### Users Table

For the `users` table, the API automatically filters to only show the currently authenticated user's data. It uses the `id` field for this filtering (rather than `user_id`).

### Friends Table

The `friends` table has special handling for relationships. It will automatically filter to show only friendships where the authenticated user is either `user_id_1` or `user_id_2`.

## Example Requests

### Get Current User Profile

```
GET /select?table=users&columns=id,email,first_name,last_name,profile_image&single=true
```

### Get User's Prayer Intentions

```
GET /select?table=intentions&columns=id,title,description,created_at&order={"column":"created_at","ascending":false}
```

### Get Public Faith Posts with Pagination

```
GET /select?table=faith_posts&columns=id,title,content,user_id,created_at&limit=10&offset=0&order={"column":"created_at","ascending":false}
```

## Response Format

The API returns responses in the following format:

```json
{
  "data": [...],  // The requested data or single object
  "count": 42,    // Total count if available
  "params": {...} // The parsed query parameters (for debugging)
}
```

## Error Handling

The API returns appropriate error codes with descriptive messages:

- `400 Bad Request`: Invalid parameters or JSON format
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions for the requested action
- `404 Not Found`: Table not found or not allowed
- `405 Method Not Allowed`: Unsupported HTTP method
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side errors

## Extending the API

To add new tables to the API:

1. Update the `tableConfig.ts` file:

   - Add the table name to the `ALLOWED_TABLES` array
   - Add configuration in the `TABLE_PERMISSIONS` object

2. Configuration options:

   - `ownerOnly`: If true, users can only access their own data
   - `selfTable`: For tables where the user's ID is in the "id" field
   - `ownerIdColumn`: Specify a custom column for owner identification
   - `allowedColumns`: Restrict which columns can be queried
   - `requiredRole`: Require a specific role for access
   - `forceConditions`: Force certain query conditions
   - `description`: Document the table's purpose

3. Deploy your changes. No code modifications are needed in the main handler.
