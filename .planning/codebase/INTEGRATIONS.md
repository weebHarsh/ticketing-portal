# External Integrations

**Analysis Date:** 2026-01-19

## APIs & External Services

**Storage:**
- Cloudflare R2 - S3-compatible object storage for ticket attachments
  - SDK/Client: @aws-sdk/client-s3, @aws-sdk/s3-request-presigner
  - Config: R2_ENDPOINT, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
  - Public URL: R2_PUBLIC_URL
  - Implementation: `lib/r2.ts`, `app/api/attachments/route.ts`
  - Usage: File uploads for ticket attachments (5MB limit, whitelist validation)

**Email:**
- Gmail SMTP - Email notifications for ticket events
  - SDK/Client: nodemailer
  - Auth: GMAIL_USER, GMAIL_APP_PASSWORD (app-specific password)
  - From: FROM_EMAIL
  - Implementation: `lib/email.ts`
  - Templates: Assignment emails, SPOC notifications, status change emails
  - Triggers: Ticket assignment, new ticket creation, status updates

**Analytics:**
- Vercel Analytics - Usage tracking
  - SDK/Client: @vercel/analytics
  - Auth: None required (Vercel platform integration)
  - Implementation: Integrated via dependency

## Data Storage

**Databases:**
- Neon PostgreSQL
  - Connection: DATABASE_URL (postgresql://neondb_owner:***@ep-shiny-hall-a4xsbbt3-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require)
  - Client: @neondatabase/serverless (WebSocket-based, serverless-optimized)
  - ORM: None - Raw SQL via neon() function
  - Implementation: `lib/db.ts`
  - Schema: 15+ tables (users, tickets, comments, attachments, business_unit_groups, categories, subcategories, teams, team_members, notifications, ticket_classification_mapping)

**File Storage:**
- Cloudflare R2 (see above)
  - Bucket: ticketing-portal-attachments
  - Structure: tickets/{ticketId}/{timestamp}-{random}-{filename}
  - Public access: Via R2 public URL

**Caching:**
- None - No Redis or caching layer implemented

## Authentication & Identity

**Auth Provider:**
- Custom implementation using Next.js cookies
  - Implementation: `lib/actions/auth.ts`, `proxy.ts` (middleware)
  - Password hashing: bcryptjs (10 salt rounds)
  - Session: Cookie-based (user object stored in "user" cookie)
  - Protected routes: /dashboard, /tickets, /analytics, /teams, /masters, /settings, /master-data, /admin
  - Current user: getCurrentUser() server action

## Monitoring & Observability

**Error Tracking:**
- None - No Sentry or error tracking service configured

**Logs:**
- Console logging only
  - Email operations: [Email] prefix
  - Security warnings: [Security] prefix
  - Database operations: Error messages logged to console
  - No structured logging or log aggregation service

## CI/CD & Deployment

**Hosting:**
- Not explicitly configured (likely Vercel based on @vercel/analytics)

**CI Pipeline:**
- None detected - No GitHub Actions, CircleCI, or other CI configuration files

## Environment Configuration

**Required env vars:**
- DATABASE_URL - Neon PostgreSQL connection string
- R2_ENDPOINT - Cloudflare R2 endpoint URL
- R2_BUCKET_NAME - R2 bucket name
- R2_ACCESS_KEY_ID - R2 access key
- R2_SECRET_ACCESS_KEY - R2 secret key
- R2_PUBLIC_URL - R2 public URL for file access
- GMAIL_USER - Gmail account for SMTP
- GMAIL_APP_PASSWORD - Gmail app-specific password
- FROM_EMAIL - Email sender address
- NEXT_PUBLIC_APP_URL - Application URL for email links (default: http://localhost:4000)

**Secrets location:**
- `.env.local` (not committed to git)
- `.env.local.example` available as template

## Webhooks & Callbacks

**Incoming:**
- None - No webhook endpoints for external services

**Outgoing:**
- None - No webhooks sent to external services
- Email notifications sent via SMTP (not webhooks)

## Security Measures

**Headers:**
- Security headers configured in `proxy.ts`:
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: strict-origin-when-cross-origin
  - Content-Security-Policy: Restrictive policy allowing only specific domains
  - Permissions-Policy: Restricts camera, microphone, geolocation

**File Upload Security:**
- File type whitelist (ALLOWED_EXTENSIONS)
- File type blocklist (BLOCKED_EXTENSIONS - executables, scripts)
- MIME type validation (ALLOWED_MIME_TYPES)
- Filename sanitization (path traversal protection)
- File size limit: 5MB
- Implementation: `app/api/attachments/route.ts`

**Input Validation:**
- Email validation with RFC 5321 compliance
- Password requirements: 8-128 characters
- Input sanitization for user-provided strings
- SQL injection prevention via parameterized queries
- Implementation: OWASP guidelines followed in `lib/actions/auth.ts`, `app/api/attachments/route.ts`

## Database Management

**Schema Management:**
- SQL migration files in `scripts/` directory
- Executed via Node.js scripts (not an ORM migration system)
- Main setup: `scripts/setup-database-pg.js`
- Individual scripts: `scripts/run-sql-file.js`
- Schema files: 001-create-tables.sql, 003-master-data-tables.sql, FINAL-seed-all-data.sql
- Excel import: `scripts/import-excel-data.js` (imports categories from Ticket-portal.xlsx)

**Query Pattern:**
- Server Actions in `lib/actions/`
- Raw SQL via @neondatabase/serverless
- Results returned as arrays (NOT result.rows like node-postgres)
- Revalidation via Next.js revalidatePath()

---

*Integration audit: 2026-01-19*
