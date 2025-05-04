# SaintCentral API Documentation

This document provides comprehensive documentation for the SaintCentral API, focusing on data operations and security features.

## Table of Contents

1. [Authentication](#authentication)
2. [Data Operations](#data-operations)
   - [Select](#select)
   - [Insert](#insert)
   - [Update](#update)
   - [Delete](#delete)
   - [Upsert](#upsert)
   - [Count](#count)
   - [Raw Query](#raw-query)
3. [Filtering](#filtering)
4. [Error Handling](#error-handling)
5. [Security Considerations](#security-considerations)

## Authentication

All API requests require authentication. The API uses cookie-based authentication with CSRF protection for mutation operations.

Authentication is handled by the `securityMiddleware` function which validates the request and ensures proper authorization.

## Data Operations

The API supports the following data operations:

### Select

Retrieves data from a specified table with optional filtering, ordering, and pagination.

**Endpoint:** `GET /api/select` or `POST /api/select`

**Parameters:**

| Parameter | Type            | Description                                |
| --------- | --------------- | ------------------------------------------ |
| table     | string          | _Required_. The name of the table to query |
| select    | string          | Columns to select (default: "\*")          |
| filter    | object or array | Filter conditions                          |
| order     | object          | Ordering configuration                     |
| limit     | number          | Maximum number of results to return        |
| offset    | number          | Number of records to skip                  |

**Example GET Request:**

```
GET /api/select?table=users&limit=10&offset=0
```

**Example POST Request:**

```json
POST /api/select
{
  "table": "users",
  "select": "id, name, email",
  "filter": [
    {
      "column": "active",
      "operator": "eq",
      "value": true
    },
    {
      "column": "age",
      "operator": "gte",
      "value": 18
    }
  ],
  "order": {
    "column": "created_at",
    "ascending": false
  },
  "limit": 10
}
```

**Response:**

```json
{
  "data": [
    { "id": 1, "name": "John Doe", "email": "john@example.com" },
    { "id": 2, "name": "Jane Smith", "email": "jane@example.com" }
  ],
  "count": 2
}
```

### Insert

Inserts one or more records into a specified table.

**Endpoint:** `POST /api/insert`

**Parameters:**

| Parameter | Type            | Description                                      |
| --------- | --------------- | ------------------------------------------------ |
| table     | string          | _Required_. The name of the table to insert into |
| values    | object or array | _Required_. Data to insert                       |
| count     | string          | Count option ("exact" or "planned")              |

**Example Request:**

```json
{
  "table": "tasks",
  "values": [
    {
      "title": "Complete documentation",
      "description": "Write comprehensive API docs",
      "due_date": "2023-12-31",
      "user_id": 1
    },
    {
      "title": "Review code",
      "description": "Review latest pull requests",
      "due_date": "2023-12-15",
      "user_id": 2
    }
  ]
}
```

**Response:**

```json
{
  "data": [
    {
      "id": 101,
      "title": "Complete documentation",
      "description": "Write comprehensive API docs",
      "due_date": "2023-12-31",
      "user_id": 1,
      "created_at": "2023-12-01T12:00:00Z"
    },
    {
      "id": 102,
      "title": "Review code",
      "description": "Review latest pull requests",
      "due_date": "2023-12-15",
      "user_id": 2,
      "created_at": "2023-12-01T12:00:00Z"
    }
  ],
  "count": 2
}
```

### Update

Updates records in a specified table based on filter conditions.

**Endpoint:** `POST /api/update`, `PUT /api/update`, or `PATCH /api/update`

**Parameters:**

| Parameter | Type            | Description                                                 |
| --------- | --------------- | ----------------------------------------------------------- |
| table     | string          | _Required_. The name of the table to update                 |
| values    | object          | _Required_. Data to update                                  |
| filter    | object or array | _Required_. Filter conditions to identify records to update |
| count     | string          | Count option ("exact" or "planned")                         |

**Example Request:**

```json
{
  "table": "tasks",
  "values": {
    "status": "completed",
    "completed_at": "2023-12-05T15:30:00Z"
  },
  "filter": {
    "column": "id",
    "operator": "eq",
    "value": 101
  }
}
```

**Response:**

```json
{
  "data": {
    "id": 101,
    "title": "Complete documentation",
    "description": "Write comprehensive API docs",
    "due_date": "2023-12-31",
    "user_id": 1,
    "status": "completed",
    "completed_at": "2023-12-05T15:30:00Z",
    "created_at": "2023-12-01T12:00:00Z"
  },
  "count": 1
}
```

### Delete

Deletes records from a specified table based on filter conditions.

**Endpoint:** `DELETE /api/delete` or `POST /api/delete`

**Parameters:**

| Parameter | Type            | Description                                                 |
| --------- | --------------- | ----------------------------------------------------------- |
| table     | string          | _Required_. The name of the table to delete from            |
| filter    | object or array | _Required_. Filter conditions to identify records to delete |
| count     | string          | Count option ("exact" or "planned")                         |

**Example DELETE Request:**

```
DELETE /api/delete?table=tasks&filter[column]=id&filter[operator]=eq&filter[value]=101
```

**Example POST Request:**

```json
{
  "table": "tasks",
  "filter": {
    "column": "status",
    "operator": "eq",
    "value": "completed"
  }
}
```

**Response:**

```json
{
  "data": [
    {
      "id": 101,
      "title": "Complete documentation",
      "description": "Write comprehensive API docs",
      "due_date": "2023-12-31",
      "user_id": 1,
      "status": "completed",
      "completed_at": "2023-12-05T15:30:00Z",
      "created_at": "2023-12-01T12:00:00Z"
    }
  ],
  "count": 1
}
```

### Upsert

Inserts or updates records in a specified table.

**Endpoint:** `POST /api/upsert`

**Parameters:**

| Parameter        | Type            | Description                                      |
| ---------------- | --------------- | ------------------------------------------------ |
| table            | string          | _Required_. The name of the table to upsert into |
| values           | object or array | _Required_. Data to upsert                       |
| onConflict       | string          | Column(s) to check for conflicts                 |
| ignoreDuplicates | boolean         | Whether to ignore duplicate records              |
| count            | string          | Count option ("exact" or "planned")              |

**Example Request:**

```json
{
  "table": "users",
  "values": {
    "id": 3,
    "name": "Alex Johnson",
    "email": "alex@example.com",
    "updated_at": "2023-12-05T16:45:00Z"
  },
  "onConflict": "id"
}
```

**Response:**

```json
{
  "data": {
    "id": 3,
    "name": "Alex Johnson",
    "email": "alex@example.com",
    "updated_at": "2023-12-05T16:45:00Z"
  },
  "count": 1
}
```

### Count

Returns the count of records in a specified table, optionally filtered.

**Endpoint:** `GET /api/count` or `POST /api/count`

**Parameters:**

| Parameter | Type            | Description                                             |
| --------- | --------------- | ------------------------------------------------------- |
| table     | string          | _Required_. The name of the table to count records from |
| filter    | object or array | Filter conditions                                       |

**Example GET Request:**

```
GET /api/count?table=tasks&filter[column]=status&filter[operator]=eq&filter[value]=pending
```

**Example POST Request:**

```json
{
  "table": "tasks",
  "filter": {
    "column": "due_date",
    "operator": "lt",
    "value": "2023-12-31"
  }
}
```

**Response:**

```json
{
  "count": 15
}
```

### Raw Query

Executes a raw SQL query with security restrictions.

**Endpoint:** `POST /api/query`

**Parameters:**

| Parameter | Type   | Description                      |
| --------- | ------ | -------------------------------- |
| query     | string | _Required_. SQL query to execute |
| params    | array  | Parameters for the SQL query     |

**Example Request:**

```json
{
  "query": "SELECT * FROM users WHERE role = $1 AND active = $2",
  "params": ["admin", true]
}
```

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "admin",
      "active": true
    }
  ]
}
```

## Filtering

The API supports a flexible filtering system that allows you to build complex queries.

### Filter Objects

A filter object consists of:

| Property | Description                    |
| -------- | ------------------------------ |
| column   | The column to filter on        |
| operator | The comparison operator to use |
| value    | The value to compare against   |

### Available Operators

| Operator    | Description                         |
| ----------- | ----------------------------------- |
| eq          | Equal to                            |
| neq         | Not equal to                        |
| gt          | Greater than                        |
| gte         | Greater than or equal to            |
| lt          | Less than                           |
| lte         | Less than or equal to               |
| like        | SQL LIKE pattern match              |
| ilike       | Case-insensitive LIKE pattern match |
| is          | Test for NULL or boolean values     |
| in          | Value exists in array               |
| contains    | JSON array contains value           |
| containedBy | JSON array is contained by value    |
| overlaps    | JSON arrays have elements in common |
| textSearch  | Full-text search                    |
| match       | Case-sensitive pattern match        |
| or          | Logical OR combining filters        |
| and         | Logical AND combining filters       |
| not         | Logical NOT to negate a filter      |

### Example with Multiple Filters

```json
{
  "table": "products",
  "filter": [
    {
      "column": "price",
      "operator": "gte",
      "value": 100
    },
    {
      "column": "category",
      "operator": "in",
      "value": ["electronics", "gadgets"]
    },
    {
      "column": "name",
      "operator": "ilike",
      "value": "%wireless%"
    }
  ],
  "order": {
    "column": "price",
    "ascending": false
  }
}
```

## Error Handling

The API returns consistent error responses with appropriate HTTP status codes:

```json
{
  "error": "Error message describing what went wrong",
  "message": "Additional details about the error if available"
}
```

Common error status codes:

| Status Code | Description                                             |
| ----------- | ------------------------------------------------------- |
| 400         | Bad Request - Missing or invalid parameters             |
| 401         | Unauthorized - Authentication required                  |
| 403         | Forbidden - CSRF token invalid or operation not allowed |
| 404         | Not Found - Resource not found                          |
| 405         | Method Not Allowed - Invalid HTTP method for endpoint   |
| 500         | Internal Server Error - Unexpected server error         |

## Security Considerations

The API implements several security features:

1. **Authentication** - All requests require proper authentication.
2. **CSRF Protection** - Mutation operations (insert, update, delete, upsert) require a valid CSRF token.
3. **Input Validation** - All user input is validated and sanitized.
4. **SQL Injection Protection** - Raw queries are restricted and potentially dangerous operations are blocked.
5. **Rate Limiting** - API requests are rate-limited to prevent abuse.

### Input Validation

The API uses the `validateInput` function to ensure all inputs are valid before processing:

```typescript
// Example of using validateInput
const tableValidation = validateInput(params.table || "", "string", { required: true });
if (!tableValidation.isValid) {
  return createResponse({ error: tableValidation.error }, 400);
}
```

Input validation is applied to all request parameters to ensure data integrity and security.
