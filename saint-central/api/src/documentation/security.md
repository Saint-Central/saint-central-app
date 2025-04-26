# API Security Middleware

This security middleware provides a centralized solution for implementing authentication, validation, and rate limiting across your API endpoints.

## Features

- **Authentication validation** - Verifies JWT tokens against Supabase Auth
- **User ID validation** - Ensures access is restricted to authenticated users
- **Rate limiting** - Implements configurable rate limits based on:
  - IP address
  - Authentication token
- **Customizable configurations** - Each endpoint can have its own security settings
- **CORS handling** - Automatically handles CORS preflight requests

## Usage

### Basic Usage

```typescript
import { securityMiddleware, createResponse } from "./security";

export async function handleMyEndpoint(request: Request, env: Env): Promise<Response> {
  try {
    // Apply default security settings (auth required + default rate limits)
    const { isAuthorized, userId, error } = await securityMiddleware(request, env);

    // Return error from security middleware if any
    if (!isAuthorized || error) {
      return error || createResponse({ error: "Unauthorized" }, 401);
    }

    // Your endpoint logic here, using the validated userId
    // ...
  } catch (error) {
    return createResponse({ error: "Internal server error", message: String(error) }, 500);
  }
}
```

### Configuration Options

The security middleware accepts the following configuration options:

```typescript
{
  // Whether authentication is required (default: true)
  requireAuth?: boolean,

  // Whether to apply rate limiting by IP address (default: true)
  rateLimitByIp?: boolean,

  // Whether to apply rate limiting by token (default: true)
  rateLimitByToken?: boolean,

  // Custom rate limit settings (overrides defaults)
  customRateLimit?: {
    maxRequests: number,  // Maximum number of requests allowed
    windowMs: number      // Time window in milliseconds
  }
}
```

### Public Endpoint Example

```typescript
// Apply IP-based rate limiting but no authentication
const { isAuthorized, error } = await securityMiddleware(request, env, {
  requireAuth: false,
  rateLimitByIp: true,
  rateLimitByToken: false,
  customRateLimit: {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
  },
});
```

### Sensitive Endpoint Example

```typescript
// Apply strict rate limiting for sensitive operations
const { isAuthorized, userId, error } = await securityMiddleware(request, env, {
  requireAuth: true,
  rateLimitByIp: true,
  rateLimitByToken: true,
  customRateLimit: {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
  },
});
```

## Default Rate Limits

The default rate limits (if not overridden) are:

- 60 requests per minute
- 5-minute blocking period after exceeding the limit

The configuration structure for rate limits is:

```typescript
{
  maxRequests: number, // Maximum requests allowed in the time window
  windowMs: number,    // Time window in milliseconds
  blockDuration: number // How long to block after exceeding limit (optional)
}
```

## Security Considerations

1. **Memory-based rate limiting**: The current implementation uses an in-memory cache for rate limiting. In a distributed environment, consider using a shared cache like Redis.

2. **Token hashing**: Tokens are hashed before being used as keys in the rate limiting cache to avoid storing sensitive data.

3. **Headers**: The middleware uses Cloudflare-specific headers (`CF-Connecting-IP`) for IP detection. Adjust as needed for your environment.
