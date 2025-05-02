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
