# SaintCentral Security

This document outlines the security features, considerations, and best practices for using the SaintCentral SDK and API.

## Table of Contents

- [Security Architecture](#security-architecture)
- [Authentication](#authentication)
- [Authorization](#authorization)
- [Token Management](#token-management)
- [CSRF Protection](#csrf-protection)
- [Input Validation](#input-validation)
- [SQL Injection Prevention](#sql-injection-prevention)
- [API Security](#api-security)
- [Storage Security](#storage-security)
- [Security Best Practices](#security-best-practices)
- [Security Audit Checklist](#security-audit-checklist)

## Security Architecture

SaintCentral employs a multi-layered security architecture designed to protect your data at every level:

1. **Client-Side SDK**: Provides secure access patterns and token handling
2. **API Layer**: Validates all requests, enforces authentication and authorization
3. **Supabase Layer**: Applies Row Level Security (RLS) policies at the database level

This defense-in-depth approach ensures that even if one layer is compromised, other layers continue to protect your data.

```
┌───────────────────┐       ┌───────────────────┐       ┌───────────────────┐
│  Client-Side SDK  │       │      API Layer    │       │   Supabase Layer  │
├───────────────────┤       ├───────────────────┤       ├───────────────────┤
│ - Token handling  │ ──►   │ - Auth validation │ ──►   │ - Row Level       │
│ - Input validation│       │ - CSRF protection │       │   Security (RLS)  │
│ - Secure patterns │       │ - Rate limiting   │       │ - Role-based      │
└───────────────────┘       └───────────────────┘       │   permissions     │
                                                        └───────────────────┘
```

## Authentication

SaintCentral uses token-based authentication to secure all API requests.

### Authentication Flow

1. **User Login**: Users authenticate through the API auth endpoints
2. **Token Generation**: Upon successful authentication, access and refresh tokens are issued
3. **Token Usage**: The SDK uses these tokens for all subsequent requests
4. **Token Refresh**: Tokens are refreshed automatically when they expire
5. **Token Revocation**: Tokens can be blacklisted when users log out

### Using Authentication in the SDK

```javascript
// Authenticate with an access token
const client = saintcentral.withAuth(session.access_token);

// Make authenticated requests
const response = await client.from("users").select("*").get();
```

## Authorization

SaintCentral implements robust authorization controls:

### Multi-Level Authorization

1. **SDK-Level Checks**: The SDK validates that you're using appropriate methods and have necessary tokens
2. **API-Level Security**: The API validates tokens and permissions before processing requests
3. **Database-Level RLS**: Row Level Security policies in Supabase ensure data isolation

### Permission Models

SaintCentral supports several authorization models:

- **Owner-Based**: Users can only access their own data
- **Role-Based**: Different user roles have different permissions
- **Column-Based**: Access can be restricted to specific columns
- **Operation-Based**: Permissions can be granted for specific operations (read, write, update, delete)

## Token Management

Tokens are securely managed to prevent unauthorized access.

### Token Types

- **Access Tokens**: Short-lived tokens used for API access
- **Refresh Tokens**: Longer-lived tokens used to obtain new access tokens
- **CSRF Tokens**: Used to prevent cross-site request forgery attacks

### Token Blacklisting

When users log out, their tokens are added to a blacklist to prevent reuse:

```javascript
// Example of logging out and blacklisting tokens
const logout = async () => {
  await saintcentral.auth.signOut(); // Blacklists current token
};
```

## CSRF Protection

Cross-Site Request Forgery (CSRF) protection is implemented for all state-changing operations.

### CSRF Implementation

1. A unique CSRF token is generated for each user session
2. This token must be included in the headers of all mutation requests
3. The API validates this token against the stored value for the user

### Headers for Mutation Requests

```javascript
// Example headers for a mutation request
const headers = {
  Authorization: `Bearer ${accessToken}`,
  "X-CSRF-Token": csrfToken,
};
```

## Input Validation

All user inputs are validated before they are processed.

### Validation Functions

The SDK provides robust input validation:

```javascript
// Example of input validation
const validateEmail = (email) => {
  // Email must match pattern and be under max length
  const result = saintcentral.validation.validateInput(email, "email", {
    required: true,
    maxLength: 255,
  });

  return result.isValid;
};
```

### Validation Types

SaintCentral supports validation for common types:

- Email addresses
- Passwords (with strength requirements)
- Names
- Phone numbers
- URLs
- Dates
- Custom patterns via RegExp

## SQL Injection Prevention

SaintCentral is designed to prevent SQL injection attacks.

### Protection Mechanisms

1. **Parameterized Queries**: All SQL queries use parameterized statements
2. **Query Building**: The SDK builds queries using safe patterns
3. **Raw Query Restrictions**: Potentially dangerous raw SQL operations are blocked
4. **Input Sanitization**: All inputs are sanitized before use in queries

### Raw Query Protection

```javascript
// Dangerous patterns are blocked in raw queries
const dangerousPatterns = [
  /DROP\s+TABLE/i,
  /DELETE\s+FROM\s+(?!.*WHERE)/i, // DELETE without WHERE clause
  /UPDATE\s+(?!.*WHERE)/i, // UPDATE without WHERE clause
  /TRUNCATE/i,
  /ALTER\s+TABLE/i,
  /CREATE\s+TABLE/i,
  /EXECUTE/i,
  /GRANT\s+/i,
  /REVOKE\s+/i,
];
```

## API Security

The API layer provides additional security mechanisms.

### Security Features

1. **Rate Limiting**: Prevents brute force and DoS attacks
2. **IP Restrictions**: Can limit access to specific IP ranges
3. **Secure Headers**: All responses include security headers
4. **Error Handling**: Errors are handled securely without leaking details

### Security Headers

```javascript
// Security headers added to all responses
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": "...",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};
```

## Storage Security

File storage operations have specific security considerations.

### Storage Security Features

1. **Bucket Isolation**: Files are stored in isolated buckets
2. **Path Validation**: File paths are validated to prevent path traversal
3. **Permission Checks**: Access is controlled by user permissions
4. **Content Type Validation**: Uploaded files are checked for valid types

### Secure Upload Example

```javascript
// Secure file upload
const uploadProfileImage = async (userId, file) => {
  // Generate secure path with user isolation
  const filePath = `${userId}/${Date.now()}-${file.name}`;

  // Upload with content type validation
  const { data, error } = await saintcentral
    .withAuth(token)
    .storage.from("profile-images")
    .upload(filePath, file, {
      contentType: file.type,
      upsert: true,
    });

  return data;
};
```

## Security Best Practices

When using the SaintCentral SDK, follow these security best practices:

### Authentication

- ✅ Always use HTTPS for all communications
- ✅ Implement proper logout to invalidate tokens
- ✅ Store tokens securely (no localStorage in web applications)
- ✅ Implement token refresh logic
- ❌ Never expose tokens in URLs or log files
- ❌ Never hardcode tokens in your application code

### Data Access

- ✅ Always use the most restrictive permissions needed
- ✅ Validate all user inputs before using them
- ✅ Apply proper error handling to prevent information leakage
- ❌ Never use raw SQL queries where parameterized queries will work
- ❌ Never bypass the SDK's security mechanisms

### File Storage

- ✅ Always generate randomized file names
- ✅ Validate files before upload (type, size, content)
- ✅ Use proper bucket permissions
- ❌ Never allow unrestricted file downloads
- ❌ Never use user-provided paths without validation

## Security Audit Checklist

Use this checklist to ensure your SaintCentral implementation follows security best practices:

- [ ] All API requests use authentication tokens
- [ ] CSRF protection is implemented for mutation operations
- [ ] All user inputs are validated before use
- [ ] Row Level Security policies are configured in Supabase
- [ ] Token refresh logic is implemented
- [ ] Proper logout invalidates tokens
- [ ] Secure headers are configured
- [ ] Rate limiting is enabled
- [ ] Error handling is secure and doesn't leak information
- [ ] File paths use user isolation
- [ ] Content types are validated for uploads
- [ ] Security monitoring and logging are configured
