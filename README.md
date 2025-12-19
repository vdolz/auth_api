# Authentication API

A secure RESTful authentication API built with NestJS and Redis.

## Getting Started

### Installation

```bash
pnpm install
```

### Configuration

Create a `.env` file:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=1h
PORT=3000
```

### Running

```bash
pnpm start:dev
```

Swagger documentation available at: `http://localhost:3000/api`

### Testing

```bash
pnpm test:e2e
```

## Security Considerations & Future Development

The following security aspects are not yet implemented but should be considered for future development:

1. **Rate Limiting**: Not implemented
   - Should add rate limiting middleware to prevent brute force attacks
   - Consider using @nestjs/throttler package

2. **Account Lockout**: Not implemented
   - Should track failed login attempts per username/IP
   - Lock account after N failed attempts (e.g., 5 attempts)
   - Implement exponential backoff or temporary lockout period

3. **Password Reset**: Not implemented
   - Should provide password reset functionality via email/token
   - Implement secure token generation and expiration

4. **Token Refresh**: Not implemented
   - Should implement refresh token mechanism
   - Store refresh tokens securely (Redis with expiration)

5. **Session Management**: Not implemented
   - Should track active sessions per user
   - Allow users to view/revoke active sessions

6. **Password History**: Not implemented
   - Should prevent password reuse (store password history)
   - Check against last N passwords

7. **IP Whitelisting**: Not implemented
   - For internal services, consider IP-based restrictions
   - Validate request origin

8. **HTTPS Enforcement**: Not enforced in code
   - Should be enforced at infrastructure level (reverse proxy/load balancer)
   - Ensure all sensitive data transmitted over HTTPS only

9. **CORS Configuration**: Not configured
    - Should configure CORS based on frontend requirements
    - Use environment-specific CORS settings
