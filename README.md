# Authentication Gateway
A standalone identity & token-issuance service built with **NestJS (Express adapter)**, **TypeScript**, **PostgreSQL**, **Prisma**, **JWT**, and **bcrypt**.

> Developed by **Ahmed Medhat**

**Project type:** Web Application
**License:** Proprietary — All rights reserved

---
## Table of Contents
1. [Getting Started](#getting-started)
2. [Recent Progress](#recent-progress)
3. [Project Structure](#project-structure)
4. [Tech Stack](#tech-stack)
5. [API Endpoints](#api-endpoints)
6. [Security Model](#security-model)
7. [System Context](#system-context)
8. [Component Architecture](#component-architecture)
9. [Request Lifecycle](#request-lifecycle)
10. [Workflows](#workflows)
    - [User Registration](#1-user-registration)
    - [Email Verification](#2-email-verification)
    - [Login](#3-login)
    - [Access Token Usage — Authenticating a Protected Request](#4-access-token-usage--authenticating-a-protected-request)
    - [Authorization (RBAC)](#5-authorization-rbac)
    - [Refresh Token Flow](#6-refresh-token-flow)
    - [Logout Sequence](#7-logout-sequence)
    - [Password Change](#8-password-change)
    - [Forgot Password / Reset](#9-forgot-password--reset)
    - [Rate Limiting](#10-rate-limiting)
    - [Audit Logging](#11-audit-logging)
    - [Health Check](#12-health-check)
11. [Database Design](#database-design)
12. [Security Boundaries](#security-boundaries)
    - [Trust Boundaries](#trust-boundaries)
13. [License](#license)

---
## Getting Started
### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+ running locally or accessible via connection string
- Nest CLI (installed via `npx` below, no global install required)

### 1. Project Scaffolding
```bash
npx @nestjs/cli new auth-gateway
cd auth-gateway
```

### 2. Core Dependencies
```bash
# Configuration (validated environment variables)
npm install @nestjs/config joi

# JWT (official NestJS package)
npm install @nestjs/jwt

# Rate limiting (official NestJS package)
npm install @nestjs/throttler

# Password hashing
npm install bcrypt
npm install -D @types/bcrypt

# Request validation (DTOs, whitelisting)
npm install class-validator class-transformer

# Security headers
npm install helmet

# Mailer (verification & password-reset emails)
npm install nodemailer
```

### 3. Prisma + PostgreSQL
```bash
# Prisma CLI (dev dependency) and Client (runtime)
npm install -D prisma
npm install @prisma/client

# Initialize Prisma with a PostgreSQL datasource
npx prisma init --datasource-provider postgresql
```

### 4. Testing Dependencies
```bash
npm install -D jest supertest @types/supertest ts-jest
```

### 5. Environment Configuration
Create `.env` for local development:
```bash
cat > .env <<'EOF'
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://auth_gateway:local_dev_password@localhost:5432/auth_gateway_dev?schema=public
JWT_SECRET=CHANGE_ME_GENERATE_RANDOM
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_COST=12
CORS_ORIGINS=http://localhost:3001
MAIL_DRIVER=fake
MAIL_FROM="Auth Gateway <no-reply@auth-gateway.local>"
EOF
```

Create `.env.example` for version control (no secrets committed):
```bash
cat > .env.example <<'EOF'
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/auth_gateway_dev?schema=public
JWT_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_COST=12
CORS_ORIGINS=http://localhost:3001
MAIL_DRIVER=fake
MAIL_FROM=
EOF
```

Generate a real JWT secret and set it as `JWT_SECRET` in `.env`:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 6. Run the Project
```bash
npm run start:dev
```

The API is available at `http://localhost:3000`.

### Environment Variables
| Variable | Required | Description |
|---|---|---|
| NODE_ENV | no | development, production, or test. Defaults to development. |
| PORT | no | HTTP port. Defaults to 3000. |
| DATABASE_URL | yes | PostgreSQL connection string. |
| JWT_SECRET | yes | Minimum 32 characters. Signs and verifies JWTs (HS256). |
| JWT_ACCESS_EXPIRES_IN | no | Access token lifetime. Defaults to 15m. |
| JWT_REFRESH_EXPIRES_IN | no | Refresh token lifetime. Defaults to 7d. |
| BCRYPT_COST | no | bcrypt cost factor between 10 and 15. Defaults to 12. |
| CORS_ORIGINS | no | Comma-separated allowed origins. |
| MAIL_DRIVER | no | fake or smtp. Defaults to fake. |
| MAIL_FROM | no | Sender address for outgoing email. |

---
## Recent Progress
### Status
| Component | Status |
|---|---|
| Config module (Joi env validation) | Done |
| Hasher module (bcrypt wrapper) | Done |
| Prisma module (PrismaService) | Done |
| User module (UserService) | Done |
| Token module (issue, verify, rotate, revoke) | Done |
| Audit module (security event logging) | Done |
| Role module (RBAC roles & permissions) | Done |
| Auth module (register, login, refresh, logout, change-password, verify-email) | Done |
| JWT auth guard | Done |
| Permissions guard (RBAC) | Done |
| Health module | Done |
| Security headers (helmet) | Done |
| CORS allowlist | Done |
| Mailer module (fake + SMTP adapters) | Done |
| `GET /users/me` | Not started |
| Admin role endpoints | Not started |
| Rate limiting | Not started |
| Forgot password / reset password | Not started |
| Global exception filter (standard error envelope) | Not started |
| Full `docs/` folder with ADRs | Not started |

### What was built
The authentication module is in place: register, login, refresh with rotation and reuse detection, logout, change-password, and verify-email. On top of it: a JWT auth guard and RBAC permissions guard, a Role module, a Token module, an Audit module, a Mailer module with fake and SMTP adapters, a Health module, security headers via helmet, and a CORS allowlist.

The Prisma schema now includes `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `RefreshToken`, `EmailVerificationToken`, `PasswordResetToken`, and `AuditLog`.

### Test Status
Unit tests: 4 suites, 19 tests, all passing (Config, Hasher, User). Lint clean.
End-to-end tests: every auth endpoint (register, login, refresh, logout, change-password, verify-email) is covered and passing, alongside a dedicated security spec.

### Problems Fixed
- `@nestjs/config` ESM/peer-dep issues → upgraded to v4
- Prisma 7 breaking changes → downgraded to v6
- Postgres auth failure → used `postgres` superuser in `.env`
- ESLint `no-floating-promises`, `no-unsafe-*`, Jest mock typing → fixed

### SDLC Framework
**Iterative & incremental with vertical slices, risk-aware.** Each module is designed, built, tested, security-reviewed, and documented before the next begins. Quality gates are enforced at each step: design gate before code, implementation gate per step, security gate on anything touching auth or tokens, and test gate requiring at least one meaningful test per behavior.

### Git State
Completed features:
- `feat/config-module`
- `feat/hasher-module`
- `feat/prisma-module`
- `feat/user-module`

---
## Project Structure
```bash
src/
  auth/
    decorators/
      current-user.decorator.ts
      public.decorator.ts
      require-permission.decorator.ts
    dto/
      change-password.dto.ts
      login.dto.ts
      logout.dto.ts
      refresh.dto.ts
      register.dto.ts
      verify-email.dto.ts
    guards/
      jwt-auth.guard.ts
      permissions.guard.ts
    strategies/
      jwt.strategy.ts
    types/
      authenticated-user.ts
    auth.controller.ts
    auth.module.ts
    auth.service.ts
  audit/
    audit-event.enum.ts
    audit.module.ts
    audit.service.ts
  common/
    config/
      cors.config.ts
    middleware/
      security-headers.middleware.ts
    types/
      request-context.ts
  config/
    validation.schema.ts
    validation.schema.spec.ts
  hasher/
    hasher.module.ts
    hasher.service.ts
    hasher.service.spec.ts
  health/
    health.controller.ts
    health.module.ts
    health.service.ts
  mailer/
    fake-mailer.adapter.ts
    mailer.module.ts
    mailer.port.ts
    smtp-mailer.adapter.ts
  prisma/
    prisma.module.ts
    prisma.service.ts
  role/
    role.module.ts
    role.service.ts
  token/
    token.module.ts
    token.service.ts
  users/
    user.module.ts
    user.service.ts
    user.service.spec.ts
  app.module.ts
  main.ts
prisma/
  schema.prisma
  seed.ts
  migrations/
test/
  auth-change-password.e2e-spec.ts
  auth-login.e2e-spec.ts
  auth-logout.e2e-spec.ts
  auth-refresh.e2e-spec.ts
  auth-verify-email.e2e-spec.ts
  auth.e2e-spec.ts
  security.e2e-spec.ts
```

---
## Tech Stack
- NestJS (Express adapter)
- TypeScript
- PostgreSQL
- Prisma 6
- JWT, signed with HS256, verified via Passport 10 (JWT strategy)
- bcrypt
- Joi (environment validation)
- helmet (security headers)
- Nodemailer (SMTP adapter)
- Jest + Supertest

---
## API Endpoints
| Method | Path | Auth required | Status | Description |
|---|---|---|---|---|
| POST | /auth/register | no | Done | Register a new user. |
| POST | /auth/login | no | Done | Authenticate and issue an access/refresh token pair. |
| POST | /auth/refresh | no (valid refresh token required) | Done | Rotate the refresh token and issue a new access token. Reuse of a revoked token revokes the whole token family. |
| POST | /auth/logout | yes | Done | Revoke the current refresh token. |
| PATCH | /auth/change-password | yes | Done | Change the authenticated user's password and revoke existing refresh tokens. |
| GET | /auth/verify-email | no (verification token required) | Done | Verify email ownership via a single-use token. |
| GET | /health/live | no | Done | Liveness probe. |
| GET | /health/ready | no | Done | Readiness probe, includes database connectivity check. |
| GET | /users/me | yes | Not started | Return the authenticated user's profile. |
| Admin role/permission endpoints | yes (admin) | Not started | Manage roles and permissions. |

Paths reflect the controllers listed under "Project Structure." Confirm exact route strings in `auth.controller.ts` and `health.controller.ts` if the source has diverged.

---
## Security Model
- Passwords are hashed with bcrypt; cost factor is configurable and validated at startup.
- Access tokens are JWTs signed with HS256, verified through a Passport JWT strategy — no database round-trip on the hot path.
- Refresh tokens are stored hashed, never in plain text, and rotated on every use.
- Reuse of an already-revoked refresh token revokes the entire token family for that user, forcing re-authentication.
- A global JWT auth guard protects routes by default; routes are opted out explicitly, not opted in.
- Authorization is enforced by a permissions guard (RBAC) that runs after authentication and before the route handler.
- Security-relevant events (login, logout, password change, email verification, refresh failures) are written to an audit log.
- HTTP responses include security headers via helmet.
- Cross-origin requests are restricted to an explicit allowlist (`CORS_ORIGINS`).

---
## System Context
![System Context](./public/designs/system-context.png)

### Module Map
Modules are organized by domain responsibility, not by technical layer. Each module owns its data and exposes a narrow public API.

![Module Map](./public/designs/module-map.png)

---
## Component Architecture
![Component Architecture](./public/designs/component-architecture.png)

**Module responsibilities:**
| Module | Responsibility |
|---|---|
| Auth Module | Orchestrates registration, login, refresh, logout use cases |
| User Module | Profile read, password change |
| Token Module | Signs/verifies JWTs, manages refresh-token records, rotation & revocation |
| Mail Module | Sends verification & password-reset emails (delegates to provider) |
| Audit Module | Persists security-relevant events (login success/failure, password change, etc.) |
| Health Module | Liveness/readiness checks, DB connectivity probe |
| Guards | `JwtAuthGuard` (authentication), `RolesGuard` (authorization) |
| Pipes | Request validation via DTOs (`class-validator`) |

---
## Request Lifecycle
NestJS's **actual** execution order (Express adapter) for an incoming request:

![Request Lifecycle](./public/designs/request-lifecycle.png)

**Note on order:** Guards run *before* Interceptors and Pipes in NestJS — a common misconception is that Pipes run first. The real order is: **Middleware → Guards → Interceptors (pre-controller) → Pipes → Route Handler → Interceptors (post-controller) → Exception Filters** (filters short-circuit the pipeline whenever an exception is thrown, from any stage).

---
## Workflows
### 1. User Registration
```mermaid
sequenceDiagram
    participant C as Client
    participant G as Gateway
    participant DB as PostgreSQL
    participant M as Mail Service

    C->>G: POST /auth/register {email, password}
    G->>G: Validate DTO (pipe)
    G->>DB: Check email uniqueness
    alt Email already exists
        G-->>C: 409 Conflict
    else Email available
        G->>G: Hash password (bcrypt)
        G->>DB: Create User (isVerified=false)
        G->>DB: Create EmailVerificationToken
        G->>M: Send verification email
        G->>DB: Write AuditLog (REGISTER)
        G-->>C: 201 Created
    end
```

### 2. Email Verification
```mermaid
sequenceDiagram
    participant C as Client
    participant G as Gateway
    participant DB as PostgreSQL

    C->>G: GET /auth/verify-email?token=...
    G->>DB: Look up token (unexpired, unused)
    alt Invalid or expired token
        G-->>C: 400 Bad Request
    else Valid token
        G->>DB: Set User.isVerified = true
        G->>DB: Invalidate token (single-use)
        G->>DB: Write AuditLog (EMAIL_VERIFIED)
        G-->>C: 200 OK
    end
```

### 3. Login
```mermaid
sequenceDiagram
    participant C as Client
    participant G as Gateway
    participant DB as PostgreSQL

    C->>G: POST /auth/login {email, password}
    G->>DB: Find user by email
    alt User not found or not verified
        G->>DB: Write AuditLog (LOGIN_FAILED)
        G-->>C: 401 Unauthorized
    else User found
        G->>G: bcrypt.compare(password, hash)
        alt Password mismatch
            G->>DB: Write AuditLog (LOGIN_FAILED)
            G-->>C: 401 Unauthorized
        else Password valid
            G->>G: Sign Access Token (JWT, short TTL)
            G->>G: Generate Refresh Token (opaque or JWT)
            G->>DB: Persist Refresh Token (hashed) + metadata
            G->>DB: Write AuditLog (LOGIN_SUCCESS)
            G-->>C: 200 OK {accessToken, refreshToken}
        end
    end
```

### 4. Access Token Usage — Authenticating a Protected Request
```mermaid
sequenceDiagram
    participant C as Client
    participant G as Gateway
    participant DB as PostgreSQL

    C->>G: GET /protected (Authorization: Bearer <accessToken>)
    G->>G: JwtAuthGuard extracts token
    G->>G: Verify signature (JWKS public key) + expiry
    alt Invalid/expired signature
        G-->>C: 401 Unauthorized
    else Valid signature
        G->>G: Attach decoded claims to request (req.user)
        G->>G: Proceed to RolesGuard (see RBAC flow)
        G->>DB: (Controller/Service) fetch requested resource
        G-->>C: 200 OK
    end
```

> Access tokens are validated **without a DB round-trip** (stateless) — this keeps the hot path fast. Revocation only affects refresh tokens; a compromised access token remains valid until its short TTL expires (mitigation: keep TTL ≤ 15 min).

### 5. Authorization (RBAC)
![Authorization Flow (RBAC)](./public/designs/auth/authorization-flow%20(rbac).png.png)

### 6. Refresh Token Flow
```mermaid
sequenceDiagram
    participant C as Client
    participant G as Gateway
    participant DB as PostgreSQL

    C->>G: POST /auth/refresh {refreshToken}
    G->>DB: Find matching hashed refresh token
    alt Not found / revoked / expired
        G->>DB: Write AuditLog (REFRESH_FAILED)
        G-->>C: 401 Unauthorized
    else Valid
        G->>DB: Revoke old refresh token (rotation)
        G->>G: Sign new Access Token
        G->>G: Generate new Refresh Token
        G->>DB: Persist new Refresh Token (hashed)
        G->>DB: Write AuditLog (TOKEN_REFRESHED)
        G-->>C: 200 OK {accessToken, refreshToken}
    end
```

> **Rotation with reuse detection**: if a *revoked* refresh token is presented again, treat it as a stolen-token signal — revoke the entire token family for that user and force re-login.

### 7. Logout Sequence
![Logout Sequence](./public/designs/auth/logout-sequence.png)

### 8. Password Change
```mermaid
sequenceDiagram
    participant C as Client
    participant G as Gateway
    participant DB as PostgreSQL

    C->>G: PATCH /users/me/password (auth required)<br/>{currentPassword, newPassword}
    G->>DB: Fetch user's current hash
    G->>G: bcrypt.compare(currentPassword, hash)
    alt Mismatch
        G-->>C: 401 Unauthorized
    else Match
        G->>G: Hash newPassword
        G->>DB: Update password hash
        G->>DB: Revoke ALL refresh tokens for user
        G->>DB: Write AuditLog (PASSWORD_CHANGED)
        G-->>C: 200 OK
    end
```

### 9. Forgot Password / Reset
```mermaid
sequenceDiagram
    participant C as Client
    participant G as Gateway
    participant DB as PostgreSQL
    participant M as Mail Service

    C->>G: POST /auth/forgot-password {email}
    G->>DB: Find user (always respond 200 regardless — no email enumeration)
    opt User exists
        G->>DB: Create PasswordResetToken (short TTL)
        G->>M: Send reset email with token link
    end
    G-->>C: 200 OK (generic message)

    C->>G: POST /auth/reset-password {token, newPassword}
    G->>DB: Look up token (unexpired, unused)
    alt Invalid/expired
        G-->>C: 400 Bad Request
    else Valid
        G->>G: Hash newPassword
        G->>DB: Update password hash
        G->>DB: Invalidate reset token (single-use)
        G->>DB: Revoke ALL refresh tokens for user
        G->>DB: Write AuditLog (PASSWORD_RESET)
        G-->>C: 200 OK
    end
```

### 10. Rate Limiting
```mermaid
flowchart LR
    Req[Incoming Request]:::io --> Key[Derive key<br/>IP + route, or userId if authed]:::step
    Key --> Store[(Rate Limit Store<br/>Redis)]:::store
    Store --> Check{Under limit?}:::step
    Check -->|Yes| Allow[Proceed to Guards/Handler]:::ok
    Check -->|No| Reject[429 Too Many Requests]:::err

    classDef io fill:#F1EFE8,stroke:#5F5E5A,color:#2C2C2A;
    classDef step fill:#E1F5EE,stroke:#0F6E56,color:#04342C;
    classDef store fill:#FAECE7,stroke:#993C1D,color:#4A1B0C;
    classDef ok fill:#EAF3DE,stroke:#3B6D11,color:#173404;
    classDef err fill:#FCEBEB,stroke:#A32D2D,color:#501313;
```

> Applied per-route with different thresholds: strict on `/auth/login`, `/auth/register`, `/auth/forgot-password`; relaxed elsewhere. Requires a **shared store (Redis)**, not in-memory, to work correctly across horizontally scaled instances.

### 11. Audit Logging
```mermaid
flowchart LR
    Event[Security Event<br/>login, logout, password change, etc.]:::step --> Interceptor[Audit Interceptor / Service call]:::step
    Interceptor --> Enrich[Enrich: userId, IP, userAgent, timestamp, outcome]:::step
    Enrich --> DB[(AuditLog table)]:::store

    classDef step fill:#E1F5EE,stroke:#0F6E56,color:#04342C;
    classDef store fill:#FAECE7,stroke:#993C1D,color:#4A1B0C;
```

> Audit writes should be **fire-and-forget but reliable** — failures to write an audit log must never block the primary auth flow, but should be logged/alerted separately (e.g., via a queue) if this matters for compliance.

### 12. Health Check
```mermaid
flowchart LR
    Probe[Load Balancer / Orchestrator Probe]:::io --> Live[GET /health/live<br/>process is up]:::step
    Probe --> Ready[GET /health/ready<br/>DB connection check]:::step
    Ready --> DB[(PostgreSQL)]:::store

    classDef io fill:#F1EFE8,stroke:#5F5E5A,color:#2C2C2A;
    classDef step fill:#E1F5EE,stroke:#0F6E56,color:#04342C;
    classDef store fill:#FAECE7,stroke:#993C1D,color:#4A1B0C;
```

---
## Database Design
![Authentication Flow](./db/erd.png)

The Prisma schema currently defines: `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `RefreshToken`, `EmailVerificationToken`, `PasswordResetToken`, and `AuditLog`.

**Cardinality notes:**
1. User ↔ Role is many-to-many, through `UserRole` (a user can have multiple roles; a role can belong to many users).
2. Role ↔ Permission is many-to-many, through `RolePermission`.
3. User → RefreshToken is one-to-many.
4. User → EmailVerificationToken and User → PasswordResetToken are one-to-many.
5. User → AuditLog is one-to-many (nullable for anonymous events, e.g. a failed login on an unknown email).

---
## Security Boundaries
![Security Boundaries](./public/designs/security/security-boundaries.png)

### Trust Boundaries
![Trust Boundaries](./public/designs/security/trust-boundaries.png)

**Controls at each boundary:**
1. **Client → Edge:** TLS (production), security headers, CORS allowlist, body size limit.
2. **Edge → Guards:** token verification with pinned algorithm; rate limiting before any expensive work.
3. **Guards → Services:** authorization enforced before business logic runs.
4. **Pipes → Services:** whitelist DTOs, reject unknown fields (mass-assignment defense).
5. **Services → DB:** Prisma parameterization; least-privilege DB user.
6. **App → Secrets:** environment variables via Config module; never logged.
7. **App → Logs:** structured, sanitized; never tokens or passwords.

---
## License
**PROPRIETARY LICENSE**
© 2026 Authentication Gateway. All Rights Reserved.

This project is a university capstone project. This software and associated documentation are proprietary and confidential. No part may be reproduced, distributed, or transmitted in any form without prior written permission from the author.