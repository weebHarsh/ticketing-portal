# Codebase Concerns

**Analysis Date:** 2026-01-19

## Tech Debt

**TypeScript Build Errors Suppressed:**
- Issue: `ignoreBuildErrors: true` configured in `next.config.mjs` to bypass type checking during production builds
- Files: `next.config.mjs`
- Impact: Type safety violations go undetected until runtime, potentially causing production bugs
- Fix approach: Gradually resolve type errors across codebase, remove suppression flag, enforce strict type checking in CI/CD

**Extensive `any` Type Usage:**
- Issue: Multiple components and actions use `any` type instead of proper type definitions
- Files:
  - `lib/actions/my-team.ts` (lines 26, 75)
  - `lib/actions/master-data.ts` (lines 31, 53, 98, 120, 197)
  - `lib/actions/teams.ts` (lines 36, 58)
  - `lib/actions/users.ts` (line 138)
  - `lib/email.ts` (lines 245, 287, 329)
  - `app/settings/page.tsx` (lines 26-28, 31, 87, 234, 342, 348)
  - `components/tickets/tickets-table.tsx` (lines 65, 73, 119)
  - `components/tickets/create-ticket-form.tsx` (line 52+)
  - `components/analytics/analytics-charts.tsx` (lines 24, 60, 123, 148)
- Impact: Loss of type safety, increased risk of runtime errors, poor IDE support
- Fix approach: Define proper interfaces for User, Ticket, Team, Category entities; replace `any` with typed interfaces incrementally

**No Database Migration Strategy:**
- Issue: Multiple ad-hoc SQL scripts without version control or rollback capability
- Files: `scripts/*.sql` (15+ files like `008-WORKING-FIX.sql`, `010-refactor-migration.sql`)
- Impact: Schema changes are difficult to track, no way to rollback failed migrations, risky production deployments
- Fix approach: Implement migration tool (e.g., Drizzle ORM, Prisma, or node-pg-migrate) with versioned migrations and rollback support

**Inconsistent Error Handling:**
- Issue: Server Actions catch errors but only log generic messages with `console.error`; no structured logging or error tracking
- Files: All files in `lib/actions/` (tickets.ts, auth.ts, users.ts, teams.ts, master-data.ts, notifications.ts, stats.ts, my-team.ts)
- Impact: Difficult to debug production issues, no visibility into error patterns, poor monitoring capability
- Fix approach: Implement structured logging library (e.g., pino, winston), integrate error tracking service (e.g., Sentry), add contextual error information

**Client-Side Filtering Instead of Database Queries:**
- Issue: `getTickets()` fetches all tickets from database then filters in JavaScript
- Files: `lib/actions/tickets.ts` (lines 42-78), `components/tickets/tickets-table.tsx` (lines 104-145)
- Impact: Poor performance with large datasets, unnecessary data transfer, scalability concerns
- Fix approach: Move filtering logic to SQL WHERE clauses, implement pagination at database level

**Email Failures Silent by Design:**
- Issue: Email notification failures are caught and logged but don't fail the primary operation
- Files: `lib/actions/tickets.ts` (lines 218-221, 464-467), `lib/email.ts` (lines 220-223, 262-265, 304-307)
- Impact: Users may not be notified about critical ticket events without any indication of failure
- Fix approach: Implement email queue with retry mechanism, track notification delivery status in database, surface failures to admins

## Known Bugs

**Authentication Cookie Not Cleared on Logout:**
- Symptoms: Logout clears localStorage and sets cookie expiry, but middleware may cache user state
- Files: `components/layout/sidebar.tsx` (lines 27-38), `proxy.ts` (lines 20-49)
- Trigger: User logs out, then immediately presses back button
- Workaround: Use `router.refresh()` after logout, but race conditions may still occur

**"My Team" Filter May Show Stale Data:**
- Symptoms: Team member changes don't immediately reflect in ticket filters without page refresh
- Files: `components/tickets/tickets-table.tsx` (lines 114-131)
- Trigger: Admin adds/removes team member, then user filters by "My Team"
- Workaround: Manual page refresh

**Subcategory Optional But UI Unclear:**
- Symptoms: Users uncertain whether subcategory is required when category has no subcategories
- Files: `components/tickets/create-ticket-form.tsx`
- Trigger: Select category with no subcategories
- Workaround: Allow form submission with null subcategory, but UX should clarify this is intentional

## Security Considerations

**Credentials Committed to .env.local:**
- Risk: Production database credentials, R2 storage keys, and Gmail app password exposed in `.env.local` file
- Files: `.env.local` (lines 2-3, 5-9, 12-13)
- Current mitigation: File is in `.gitignore`, but visible in this codebase analysis
- Recommendations:
  - Rotate all exposed credentials immediately
  - Use environment-specific secrets management (e.g., Vercel Env Vars, AWS Secrets Manager)
  - Implement `.env.example` with placeholder values
  - Add pre-commit hook to prevent credential commits

**CSP Allows `unsafe-inline` and `unsafe-eval`:**
- Risk: Content Security Policy permits inline scripts and eval, reducing XSS protection
- Files: `proxy.ts` (lines 10-17)
- Current mitigation: Security headers applied to all routes
- Recommendations: Remove `unsafe-inline` and `unsafe-eval` by extracting inline scripts, using nonces, or migrating to strict CSP

**No Rate Limiting on Authentication:**
- Risk: Login and signup endpoints vulnerable to brute force attacks
- Files: `lib/actions/auth.ts` (lines 120-169), `app/api/auth/login/route.ts`, `app/api/auth/signup/route.ts`
- Current mitigation: Bcrypt provides some protection via slow hashing, generic error messages prevent user enumeration
- Recommendations: Implement rate limiting middleware (e.g., upstash/ratelimit), add account lockout after failed attempts, consider CAPTCHA for repeated failures

**Password Reset Without Email Verification:**
- Risk: Password reset functionality exists but may lack token-based verification
- Files: `lib/actions/users.ts` (lines 195-217)
- Current mitigation: Requires old password for user-initiated changes
- Recommendations: Implement time-limited reset tokens, send verification emails, expire tokens after use

**localStorage Used for Auth State:**
- Risk: Client-side authentication state in localStorage can be manipulated, creating sync issues with server-side cookies
- Files:
  - `components/layout/sidebar.tsx` (lines 28-30)
  - `components/tickets/tickets-table.tsx` (lines 88-96)
  - `components/tickets/create-ticket-form.tsx` (lines 63-74)
  - `app/settings/page.tsx`, `app/analytics/page.tsx`, `app/dashboard/page.tsx`
- Current mitigation: Middleware validates cookie on protected routes
- Recommendations: Remove localStorage auth state, rely solely on server-side session/cookie validation via middleware and Server Actions

**SQL Injection Protection Relies on Parameterization:**
- Risk: All queries use template literals with Neon's parameterized queries, but any raw SQL concatenation would be vulnerable
- Files: All files using `sql` tagged templates in `lib/actions/`
- Current mitigation: Neon's `sql` tagged template automatically parameterizes values
- Recommendations: Add SQL injection testing, enforce code review for any raw query concatenation, consider using ORM for additional safety layer

## Performance Bottlenecks

**Fetch All Tickets Then Filter Client-Side:**
- Problem: `getTickets()` retrieves entire ticket table, then filters in memory
- Files: `lib/actions/tickets.ts` (lines 21-79)
- Cause: Server Action fetches all rows with `ORDER BY t.created_at DESC` then applies JavaScript filters
- Improvement path:
  - Add WHERE clauses to SQL query for status, type, assignee filters
  - Implement pagination with LIMIT/OFFSET
  - Add database indexes on filtered columns (already has index on status)
  - Cache results for common filter combinations

**No Pagination on Tickets List:**
- Problem: All tickets loaded at once regardless of count
- Files: `components/tickets/tickets-table.tsx`, `lib/actions/tickets.ts`
- Cause: Initial implementation assumes small dataset (20-50 tickets)
- Improvement path: Implement cursor-based or offset pagination, add infinite scroll or "Load More" button, set default page size to 50

**Multiple Database Queries for Ticket Details:**
- Problem: `getTicketById()` makes 3 separate queries (ticket, comments, attachments)
- Files: `lib/actions/tickets.ts` (lines 87-140)
- Cause: Sequential queries instead of JOIN
- Improvement path: Use single query with JOINs to fetch ticket with related data, or implement GraphQL-style query batching

**Email Sends Block Request:**
- Problem: Email notifications are sent synchronously within Server Actions
- Files: `lib/actions/tickets.ts` (lines 196-222, 259-291, 440-469)
- Cause: `await sendEmail()` blocks ticket creation/update response
- Improvement path: Implement background job queue (e.g., BullMQ with Redis), send emails asynchronously, return response immediately

**Excel Export Loads All Tickets Into Memory:**
- Problem: XLSX export in tickets table loads entire dataset for export
- Files: `components/tickets/tickets-table.tsx` (XLSX export functionality)
- Cause: Client-side export processes all ticket rows
- Improvement path: Implement server-side export with streaming, add pagination to export, provide CSV as lighter alternative

## Fragile Areas

**Authentication State Sync Between Cookie and localStorage:**
- Files:
  - `proxy.ts` (middleware checks cookie)
  - Multiple client components check `localStorage.getItem("user")`
- Why fragile: Cookie and localStorage can become out of sync, leading to auth state mismatches
- Safe modification: Always update both cookie and localStorage atomically, or remove localStorage dependency entirely
- Test coverage: No automated tests for auth state consistency

**Subcategory Optional Logic:**
- Files: `lib/actions/tickets.ts` (lines 142-229), `lib/actions/master-data.ts` (auto-fill functions)
- Why fragile: Multiple code paths handle null vs. non-null subcategory, fallback logic may fail silently
- Safe modification: Test both paths (with and without subcategory) before changes, validate auto-fill returns expected results
- Test coverage: Manual testing only

**Email Configuration Conditional Initialization:**
- Files: `lib/email.ts` (lines 4-12, 220-223)
- Why fragile: Email transporter is `null` if env vars missing, all email functions must check for `null`
- Safe modification: Always check `if (!transporter)` before using, or fail fast at startup if emails are required
- Test coverage: No tests for email-disabled mode

**My Team Filter with Complex Membership Logic:**
- Files: `components/tickets/tickets-table.tsx` (lines 114-140)
- Why fragile: Nested filters check multiple relationships (SPOC, creator, assignee, team members)
- Safe modification: Document the business logic clearly, add unit tests for filter combinations
- Test coverage: None

**Attachment Dropdown State Management:**
- Files: `components/tickets/tickets-table.tsx` (lines 72-86, attachments dropdown logic)
- Why fragile: Manual click-outside detection with refs, state can get stuck if event listeners fail
- Safe modification: Use established libraries like Radix UI Dropdown instead of manual implementation
- Test coverage: None

## Scaling Limits

**Neon PostgreSQL Connection Pooling:**
- Current capacity: Neon serverless uses connection pooling, but limits depend on plan
- Limit: Free tier has 100 concurrent connections; app creates connection per request
- Scaling path: Implement connection pooling middleware, upgrade Neon plan, or migrate to dedicated Postgres with pgBouncer

**File Upload to Cloudflare R2:**
- Current capacity: Direct upload from client to R2 via presigned URLs
- Limit: No file size limits enforced beyond client-side `MAX_FILE_SIZE = 5MB`
- Scaling path: Implement chunked uploads for large files, add virus scanning, set storage quotas per user/organization

**In-Memory Filtering for Large Result Sets:**
- Current capacity: Works for <1000 tickets, starts degrading above that
- Limit: Browser memory limits for rendering large lists, slow JavaScript array filtering
- Scaling path: Move filtering to database, implement virtual scrolling, add server-side pagination

**Gmail SMTP for Notifications:**
- Current capacity: Gmail SMTP has sending limits (500 emails/day for free accounts, 2000/day for Google Workspace)
- Limit: Not suitable for high-volume notification systems
- Scaling path: Migrate to transactional email service (SendGrid, AWS SES, Postmark), implement email batching

## Dependencies at Risk

**Next.js 16 Early Adoption:**
- Risk: Next.js 16 may have breaking changes from stable versions, limited community solutions for issues
- Impact: Potential bugs, migration overhead when patterns change
- Migration plan: Monitor Next.js release notes, test upgrades in staging, consider stabilizing on LTS version

**@neondatabase/serverless 1.0.2:**
- Risk: Specific to Neon's serverless driver; not interchangeable with standard PostgreSQL clients
- Impact: Vendor lock-in, migration requires rewriting database layer
- Migration plan: Abstract database access behind repository pattern, test with alternative Postgres drivers (e.g., `pg`, `postgres.js`)

**React 19.2.0 (Canary/RC):**
- Risk: Using release candidate version; may have stability issues
- Impact: Potential bugs, unclear upgrade path when stable releases
- Migration plan: Test with React 18 compatibility mode, monitor React 19 stable release timeline

**Resend + Nodemailer Dual Email Setup:**
- Risk: Code imports `resend` package but uses `nodemailer` for Gmail SMTP (lines in package.json show both)
- Impact: Unused dependency increases bundle size, confusion about which email service is active
- Migration plan: Remove unused `resend` package, or migrate fully to Resend API and remove nodemailer

## Missing Critical Features

**No Backup/Recovery for Tickets:**
- Problem: No automated database backups or point-in-time recovery mechanism visible in code
- Blocks: Disaster recovery, accidental deletion recovery
- Priority: High

**No Audit Trail for Ticket Changes:**
- Problem: No history tracking for ticket field changes (status changes logged via comments, but not field-level history)
- Blocks: Compliance requirements, debugging "who changed what"
- Priority: Medium

**No Duplicate Detection:**
- Problem: BRD specifies duplicate ticket function, but not implemented
- Blocks: Users creating similar tickets repeatedly
- Priority: Medium (per BRD requirement)

**No Customer Portal Integration:**
- Problem: BRD specifies linking tickets to customer portal via `customer_log_id`, not implemented
- Blocks: External customer ticket tracking
- Priority: Low (future feature per BRD)

**No Role-Based Access Control (RBAC):**
- Problem: Roles exist in database (admin/agent/user) but not enforced in UI or Server Actions
- Blocks: Multi-tenant use cases, permission-based feature access
- Priority: High

**No Bulk Operations:**
- Problem: Cannot assign multiple tickets at once, change status in bulk, or export filtered subset
- Blocks: Efficient ticket management for admins
- Priority: Medium

## Test Coverage Gaps

**Zero Automated Tests:**
- What's not tested: All application code
- Files: No test files exist outside of `node_modules`
- Risk: Regressions go undetected, refactoring is risky
- Priority: Critical

**Authentication Flow:**
- What's not tested: Login, logout, session persistence, cookie validation
- Files: `lib/actions/auth.ts`, `proxy.ts`, `components/auth/*.tsx`
- Risk: Security vulnerabilities, broken auth after changes
- Priority: Critical

**Ticket CRUD Operations:**
- What's not tested: Create, update, delete, status changes, assignment
- Files: `lib/actions/tickets.ts`
- Risk: Data corruption, business logic bugs
- Priority: High

**Auto-fill Logic:**
- What's not tested: Category/subcategory selection triggers, SPOC auto-assignment
- Files: `lib/actions/master-data.ts`, `components/tickets/create-ticket-form.tsx`
- Risk: Incorrect ticket metadata, manual data entry required
- Priority: High

**Email Notifications:**
- What's not tested: Email template rendering, delivery, error handling
- Files: `lib/email.ts`
- Risk: Users not receiving critical notifications
- Priority: Medium

**Server Actions Error Handling:**
- What's not tested: Database constraint violations, network failures, invalid input
- Files: All `lib/actions/*.ts`
- Risk: Unhandled exceptions crash requests, poor user experience
- Priority: High

**My Team Filter Logic:**
- What's not tested: Complex ticket filtering based on team membership
- Files: `components/tickets/tickets-table.tsx` (lines 114-140)
- Risk: Users seeing wrong tickets, privacy concerns
- Priority: High

---

*Concerns audit: 2026-01-19*
