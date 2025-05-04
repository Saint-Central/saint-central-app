# SaintCentral API Security Documentation

This document provides detailed information about the security features implemented in the SaintCentral API.

## Overview

The security module (`security.ts`) provides authentication, authorization, CSRF protection, and input validation functionality for the SaintCentral API. It's designed to ensure that only authorized users can access the API endpoints and all user input is properly validated and sanitized.

## Authentication

The API uses cookie-based authentication with JWT tokens.

### Security Middleware

The `securityMiddleware` function is the main entry point for security checks and is used by all API endpoints:

```typescript
export async function securityMiddleware(
  request: Request,
  env: Env,
  options: {
    requireAuth?: boolean;
    validateCsrf?: boolean;
  } = {},
): Promise<{ userId?: string; error?: Response }> {
  // Check if authentication is required
  if (options.requireAuth) {
    // Extract and validate authentication token from cookies
    const cookies = request.headers.get("Cookie") || "";
    const sessionCookie = cookies
      .split(";")
      .find((c) => c.trim().startsWith(`${SECURITY_CONSTANTS.COOKIE.NAME}=`));

    if (!sessionCookie) {
      return { error: createResponse({ error: "Authentication required" }, 401) };
    }

    try {
      // Validate JWT token
      const token = sessionCookie.split("=")[1].trim();
      const payload = validateToken(token, env.JWT_SECRET);

      // Check if CSRF validation is required
      if (options.validateCsrf) {
        const csrfToken = request.headers.get("X-CSRF-Token");
        if (!csrfToken || !payload.csrfToken || !timingSafeEqual(csrfToken, payload.csrfToken)) {
          return { error: createResponse({ error: "Invalid CSRF token" }, 403) };
        }
      }

      return { userId: payload.userId };
    } catch (error) {
      return { error: createResponse({ error: "Invalid authentication" }, 401) };
    }
  }

  return {};
}
```

### JWT Token Validation

```typescript
function validateToken(token: string, secret: string): { userId: string; csrfToken: string } {
  try {
    // Decode and verify JWT token
    const decoded = jwt.verify(token, secret);

    // Check token expiration
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      throw new Error("Token expired");
    }

    return {
      userId: decoded.sub,
      csrfToken: decoded.csrf,
    };
  } catch (error) {
    throw new Error("Invalid token");
  }
}
```

## CSRF Protection

The API uses the Double Submit Cookie pattern for CSRF protection:

1. A CSRF token is generated and included in the JWT token when the user logs in
2. The same token is returned to the client during authentication
3. The client must include this token in the `X-CSRF-Token` header for all mutation requests
4. The server validates that the token in the header matches the one in the JWT token

### Timing-Safe Comparison

To prevent timing attacks, the API uses a timing-safe comparison function for CSRF token validation:

```typescript
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
```

## Input Validation

The API uses a comprehensive input validation system to ensure all user input is properly validated and sanitized.

### Validation Function

The `validateInput` function is used to validate all user input:

```typescript
export function validateInput(
  value: any,
  type: string,
  options: {
    required?: boolean;
    maxLength?: number;
    minLength?: number;
    pattern?: RegExp;
    enum?: string[];
    min?: number;
    max?: number;
  } = {},
): { isValid: boolean; value: any; error?: string } {
  // Check if value is required
  if (options.required && (value === undefined || value === null || value === "")) {
    return { isValid: false, value: null, error: "Value is required" };
  }

  // Return early if value is null/undefined and not required
  if (value === undefined || value === null) {
    return { isValid: true, value: null };
  }

  // Validate based on type
  switch (type) {
    case "string":
      if (typeof value !== "string") {
        return { isValid: false, value, error: "Value must be a string" };
      }

      // Check string length
      if (options.maxLength && value.length > options.maxLength) {
        return {
          isValid: false,
          value,
          error: `Value exceeds maximum length of ${options.maxLength} characters`,
        };
      }

      if (options.minLength && value.length < options.minLength) {
        return {
          isValid: false,
          value,
          error: `Value must be at least ${options.minLength} characters`,
        };
      }

      // Check pattern
      if (options.pattern && !options.pattern.test(value)) {
        return { isValid: false, value, error: "Value does not match required pattern" };
      }

      // Check enum values
      if (options.enum && !options.enum.includes(value)) {
        return {
          isValid: false,
          value,
          error: `Value must be one of: ${options.enum.join(", ")}`,
        };
      }

      return { isValid: true, value };

    case "number":
      // Convert string to number if needed
      const numValue = typeof value === "string" ? parseFloat(value) : value;

      if (typeof numValue !== "number" || isNaN(numValue)) {
        return { isValid: false, value, error: "Value must be a number" };
      }

      // Check range
      if (options.min !== undefined && numValue < options.min) {
        return {
          isValid: false,
          value: numValue,
          error: `Value must be at least ${options.min}`,
        };
      }

      if (options.max !== undefined && numValue > options.max) {
        return {
          isValid: false,
          value: numValue,
          error: `Value must be at most ${options.max}`,
        };
      }

      return { isValid: true, value: numValue };

    case "boolean":
      // Convert string to boolean if needed
      if (typeof value === "string") {
        const lowerValue = value.toLowerCase();
        if (lowerValue === "true" || lowerValue === "1" || lowerValue === "yes") {
          return { isValid: true, value: true };
        }
        if (lowerValue === "false" || lowerValue === "0" || lowerValue === "no") {
          return { isValid: true, value: false };
        }
        return { isValid: false, value, error: "Invalid boolean value" };
      }

      if (typeof value !== "boolean") {
        return { isValid: false, value, error: "Value must be a boolean" };
      }

      return { isValid: true, value };

    case "date":
      try {
        const dateValue = value instanceof Date ? value : new Date(value);
        if (isNaN(dateValue.getTime())) {
          throw new Error("Invalid date");
        }
        return { isValid: true, value: dateValue };
      } catch (error) {
        return { isValid: false, value, error: "Invalid date format" };
      }

    case "email":
      if (typeof value !== "string") {
        return { isValid: false, value, error: "Email must be a string" };
      }

      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailPattern.test(value)) {
        return { isValid: false, value, error: "Invalid email format" };
      }

      return { isValid: true, value };

    case "uuid":
      if (typeof value !== "string") {
        return { isValid: false, value, error: "UUID must be a string" };
      }

      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(value)) {
        return { isValid: false, value, error: "Invalid UUID format" };
      }

      return { isValid: true, value };

    // Add more types as needed

    default:
      return { isValid: false, value, error: `Unsupported validation type: ${type}` };
  }
}
```

### Usage Examples

```typescript
// Validate a required string with maximum length
const nameValidation = validateInput(params.name, "string", { required: true, maxLength: 50 });
if (!nameValidation.isValid) {
  return createResponse({ error: nameValidation.error }, 400);
}

// Validate a number within a range
const ageValidation = validateInput(params.age, "number", { min: 18, max: 120 });
if (!ageValidation.isValid) {
  return createResponse({ error: ageValidation.error }, 400);
}

// Validate an email
const emailValidation = validateInput(params.email, "email", { required: true });
if (!emailValidation.isValid) {
  return createResponse({ error: emailValidation.error }, 400);
}
```

## Response Creation

The API uses a standardized response format:

```typescript
export function createResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
```

## Security Best Practices

The security module implements several best practices:

1. **JWT-based authentication** - Secure token-based authentication
2. **CSRF protection** - Protection against cross-site request forgery attacks
3. **Secure cookies** - HTTP-only, secure, and SameSite cookies
4. **Timing-safe comparison** - Protection against timing attacks
5. **Comprehensive input validation** - Protection against injection attacks
6. **Secure response headers** - Protection against caching and other browser-based attacks

## Integration with API Endpoints

All API endpoints use the security middleware and validation functions:

```typescript
export async function handleDataRequest(request: Request, env: Env): Promise<Response> {
  try {
    // Validate request authentication and CSRF protection
    const security = await securityMiddleware(request, env, {
      requireAuth: true,
      // Only validate CSRF for mutations
      validateCsrf: ["insert", "update", "delete", "upsert"].includes(action),
    });

    if (security.error) {
      return security.error;
    }

    // Validate input parameters
    const tableValidation = validateInput(params.table || "", "string", { required: true });
    if (!tableValidation.isValid) {
      return createResponse({ error: tableValidation.error }, 400);
    }

    // Process the request...
  } catch (error) {
    // Handle errors...
  }
}
```
