# SaintCentral API Security Architecture

## Folder Structure

The codebase is organized to clearly separate server-side and client-side code:

```
saint-central/api/src/
├── README.md
├── index.ts                  # Main entry point for the Worker
├── server/                   # Server-side code only
│   ├── security.ts           # Server-side security implementation
│   ├── dataHandler.ts        # Data handling logic
│   └── middleware/           # Server middleware
│       └── auth.ts           # Authentication middleware
├── client/                   # Client-side code only
│   ├── sdk.ts                # Main SDK implementation
│   └── sdkSecurity.ts        # Client-side security features
├── shared/                   # Shared code (used by both client and server)
│   ├── securityUtils.ts      # Shared security utilities
│   └── tableConfig.ts        # Shared table configuration
└── documentation/            # Documentation files
    └── SECURITY.md           # Security documentation
```

## Security Module Organization

The security system is split into three main modules:

1. **server/security.ts** - Server-side security implementation

   - Contains server-specific code (Cloudflare Workers, etc.)
   - Handles authentication with Supabase
   - Implements rate limiting and token blacklisting
   - Should NOT be imported by client-side code

2. **shared/securityUtils.ts** - Client-safe security utilities

   - Contains browser-compatible security functions
   - Provides input validation, sanitization, and encoding
   - Safe to import in client-side code
   - Uses Web Crypto API for client-safe cryptographic operations

3. **client/sdkSecurity.ts** - Advanced client-side security features
   - Built on top of securityUtils.ts
   - Implements secure token storage
   - Provides attack detection
   - Includes secure logging and data masking

## Architecture Design

```
┌─────────────────────┐     ┌─────────────────┐
│    Server Side      │     │   Client Side   │
│                     │     │                 │
│  server/security.ts │     │ client/sdk.ts   │
│  ┌─────────────┐    │     │  ┌──────────┐   │
│  │ Middleware  │    │     │  │  Client  │   │
│  │ Auth & Rate │    │     │  │ Builder  │   │
│  │  Limiting   │    │     │  │ Pattern  │   │
│  └─────────────┘    │     │  └──────────┘   │
│                     │     │        ▲        │
└─────────────────────┘     │        │        │
                           │        │        │
┌─────────────────────┐     │        │        │
│    Shared Utils     │     │        │        │
│                     │ ◄───┼────────┘        │
│shared/securityUtils.ts│   │                 │
│  ┌─────────────┐    │     │  ┌──────────┐   │
│  │   Input     │    │     │  │ Advanced │   │
│  │ Validation  │    │     │  │ Security │   │
│  │ Sanitization│    │     │  │ Features │   │
│  └─────────────┘    │     │  └──────────┘   │
│                     │     │        ▲        │
└─────────────────────┘     │        │        │
                           │        │        │
                           │        │        │
                           │ ┌──────────────┐ │
                           │ │client/sdkSecurity.ts│
                           │ └──────────────┘ │
                           │                 │
                           └─────────────────┘
```

## Proper Usage

When developing:

1. **Client-side code** should only import from:

   - shared/securityUtils.ts
   - client/sdkSecurity.ts

2. **Server-side code** can import from any module:

   - server/security.ts
   - shared/securityUtils.ts
   - client/sdkSecurity.ts (if needed)

3. **Never import server-side modules in client code**:
   - Don't import server/security.ts in the SDK
   - Don't expose server-side configuration in client code

## Security Features by Module

### server/security.ts (Server-side)

- Authentication middleware
- Rate limiting
- Token blacklisting
- CSRF protection
- Request validation
- API key rotation
- Service role key handling (Supabase)

### shared/securityUtils.ts (Client-safe)

- Input validation and sanitization
- XSS prevention (HTML/JS/URL escaping)
- Client-side hashing and cryptography
- Request signing
- Sensitive data masking

### client/sdkSecurity.ts (Advanced client)

- Secure token storage with encryption
- Attack pattern detection
- Browser security detection
- Secure fetch wrapper
- Permission validation
- Secure logging

## Best Practices

1. Keep server secrets out of client-side code
2. Use securityUtils.ts for shared functionality
3. Use proper Web Crypto API for client-side crypto
4. Always sanitize and validate inputs
5. Always use HTTPS
6. Follow the principle of least privilege

This separation ensures that sensitive server-side security code and secrets are not exposed to client-side applications while maintaining strong security across both environments.

# SaintCentral API Source Code Documentation

This document provides detailed information about the implementation of the SaintCentral API.

## Code Architecture

The API is organized into the following main components:

```
src/
├── index.ts           # Entry point and request routing
├── server/            # Server-side implementations
│   ├── dataHandler.ts # Data operations implementation
│   ├── security.ts    # Authentication and security functions
│   └── ...
├── shared/            # Shared code between server and client
│   ├── securityUtils.ts # Shared security utilities
│   ├── tableConfig.ts  # Table configuration and permissions
│   └── ...
└── client/            # Client-side SDK implementations
    ├── sdk.ts         # Client SDK for API consumption
    └── ...
```

## Key Components

### dataHandler.ts

This module implements all data operations (select, insert, update, delete, upsert, count) using Supabase as the database backend.

#### Key Functions

- `handleDataRequest` - Main entry point for all data-related API requests
- `handleSelect` - Retrieves data with filtering, sorting, and pagination
- `handleInsert` - Inserts new records
- `handleUpdate` - Updates existing records
- `handleDelete` - Deletes records
- `handleUpsert` - Inserts or updates records
- `handleCount` - Counts records
- `handleRawQuery` - Executes raw SQL queries with security checks
- `applyFilter` - Helper function to apply filter conditions safely
- `applyFilters` - Helper function to apply multiple filters

#### Type Definitions

The module defines several TypeScript interfaces for type safety:

- `OperationType` - Type of data operation (select, insert, update, delete, upsert)
- `FilterOperator` - Available filter operators (eq, neq, gt, gte, lt, lte, etc.)
- `Filter` - Structure of a filter condition
- `SelectParams`, `InsertParams`, `UpdateParams`, etc. - Parameter structures for each operation

#### Example Implementation

```typescript
// Example of the handleSelect function
async function handleSelect(request: Request, env: Env): Promise<Response> {
  // Validate input and extract parameters
  const params = await request.json();
  const tableValidation = validateInput(params.table || "", "string", { required: true });

  // Initialize Supabase client
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // Build and execute query
  let query = supabase.from(tableValidation.value).select(params.select || "*");

  // Apply filters, ordering, pagination
  if (params.filter) {
    const filters = Array.isArray(params.filter) ? params.filter : [params.filter];
    query = applyFilters(query, filters);
  }

  // Return results
  const { data, error, count } = await query;
  return createResponse({ data, count }, 200);
}
```

### security.ts

This module implements authentication, authorization, and security features for the API.

#### Key Functions

- `securityMiddleware` - Validates authentication and CSRF protection
- `createResponse` - Creates standardized API responses
- `validateInput` - Validates and sanitizes user input
- `timingSafeEqual` - Performs timing-safe comparison for security-sensitive data

#### Security Constants

```typescript
export const SECURITY_CONSTANTS = {
  COOKIE: {
    NAME: "saint_session",
    OPTIONS: {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    },
  },
  TOKEN_EXPIRY: 1000 * 60 * 60 * 24 * 7, // 7 days
};
```

#### Example Implementation

```typescript
// Example of the validateInput function
export function validateInput(
  value: any,
  type: string,
  options: { required?: boolean; maxLength?: number } = {},
): { isValid: boolean; value: any; error?: string } {
  if (options.required && (value === undefined || value === null || value === "")) {
    return { isValid: false, value: null, error: "Value is required" };
  }

  if (value === undefined || value === null) {
    return { isValid: true, value: null };
  }

  // Validate based on type
  if (type === "string") {
    if (typeof value !== "string") {
      return { isValid: false, value, error: "Value must be a string" };
    }

    if (options.maxLength && value.length > options.maxLength) {
      return {
        isValid: false,
        value,
        error: `Value exceeds maximum length of ${options.maxLength} characters`,
      };
    }
  }

  // Additional type validations...

  return { isValid: true, value };
}
```

### tableConfig.ts

This module defines allowed tables and their permission settings.

```typescript
// Example table configuration
export const ALLOWED_TABLES = ["users", "tasks", "projects", "comments"];

export const TABLE_PERMISSIONS = {
  users: {
    select: { public: ["id", "name"] },
    insert: { roles: ["admin"] },
    update: { roles: ["admin"], owner: true },
    delete: { roles: ["admin"] },
  },
  tasks: {
    select: { roles: ["user", "admin"], owner: true },
    insert: { roles: ["user", "admin"] },
    update: { roles: ["user", "admin"], owner: true },
    delete: { roles: ["admin"], owner: true },
  },
  // Additional table permissions...
};
```

## Helper Functions

### Filter Operations

The API uses helper functions to safely apply filters to database queries:

```typescript
// Apply a single filter condition
function applyFilter(query: any, filter: Filter): any {
  if (!filter.column || !filter.operator || filter.value === undefined) {
    return query;
  }

  try {
    const op = filter.operator;

    // Apply the appropriate filter method
    if (op === "eq") return query.eq(filter.column, filter.value);
    if (op === "neq") return query.neq(filter.column, filter.value);
    if (op === "gt") return query.gt(filter.column, filter.value);
    if (op === "gte") return query.gte(filter.column, filter.value);
    if (op === "lt") return query.lt(filter.column, filter.value);
    if (op === "lte") return query.lte(filter.column, filter.value);

    // Special handling for array values
    if (op === "in") {
      const value = Array.isArray(filter.value) ? filter.value : [filter.value];
      return query.in(filter.column, value);
    }

    return query;
  } catch (e) {
    console.warn(`Error applying filter: ${e}`);
    return query;
  }
}

// Apply multiple filter conditions
function applyFilters(query: any, filters: any[]): any {
  for (const filter of filters) {
    query = applyFilter(query, filter);
  }
  return query;
}
```

## API Request Flow

1. Request comes into the API
2. `index.ts` routes to appropriate handler
3. `securityMiddleware` checks authentication and CSRF protection
4. Handler validates input parameters
5. Operation is performed on the database
6. Response is formatted and returned

## Error Handling

The API uses a consistent error handling approach:

```typescript
try {
  // Operation code
} catch (error) {
  console.error("Operation error:", error);
  return createResponse(
    {
      error: "Internal server error",
      message: error instanceof Error ? error.message : "An unexpected error occurred",
    },
    500,
  );
}
```

## TypeScript Tips

The codebase uses several TypeScript techniques to ensure type safety:

1. **Interface Definitions** - Clearly defined interfaces for all data structures
2. **Type Guards** - Runtime type checking to ensure type safety
3. **Generic Types** - Used for reusable components
4. **Helper Functions** - Type-safe wrappers for potentially unsafe operations

## Security Best Practices

1. **Input Validation** - All user input is validated before use
2. **CSRF Protection** - All mutation operations are protected against CSRF attacks
3. **Authentication** - All API requests require proper authentication
4. **Error Handling** - Errors are logged but don't expose sensitive information
5. **SQL Injection Prevention** - Raw queries are restricted and filtered

## Common Troubleshooting

### Type Errors

If you encounter TypeScript errors like "Type instantiation is excessively deep and possibly infinite", use the helper functions like `applyFilter` and `applyFilters` rather than direct method calls.

### Database Connection Issues

Ensure environment variables are properly set:

- `SUPABASE_URL` - URL of the Supabase instance
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for Supabase

### Authentication Problems

Check the following:

- Cookie configuration is correct
- CSRF token is being generated and validated properly
- Authentication middleware is properly applied to all routes
