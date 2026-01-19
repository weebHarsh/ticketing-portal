# Architecture

**Analysis Date:** 2026-01-19

## Pattern Overview

**Overall:** Next.js 16 App Router with Server Actions

**Key Characteristics:**
- File-based routing with Next.js App Router
- Server-first architecture with Server Actions for all data operations
- No client-side state management library (React state only)
- Database queries executed directly in Server Actions via Neon serverless
- Cookie-based authentication with middleware protection

## Layers

**Presentation Layer:**
- Purpose: UI components and page routing
- Location: `app/` and `components/`
- Contains: React Server Components (default), Client Components (marked with "use client"), pages, forms
- Depends on: Server Actions (`lib/actions/`), UI components (`components/ui/`)
- Used by: End users via browser

**Server Actions Layer:**
- Purpose: Backend business logic and data access
- Location: `lib/actions/`
- Contains: CRUD operations, authentication, authorization, data validation
- Depends on: Database connection (`lib/db.ts`), email service (`lib/email.ts`)
- Used by: Client Components and Server Components

**Data Layer:**
- Purpose: Database connectivity and type definitions
- Location: `lib/db.ts`
- Contains: Neon serverless connection, TypeScript type definitions
- Depends on: Environment variables (DATABASE_URL)
- Used by: Server Actions

**API Routes Layer (Minimal):**
- Purpose: File uploads, webhooks, legacy endpoints
- Location: `app/api/`
- Contains: Auth routes (`/api/auth/login`, `/api/auth/signup`), attachments (`/api/attachments`), cleanup
- Depends on: Database, Server Actions
- Used by: Client-side fetch calls, external services

**Middleware Layer:**
- Purpose: Request interception for authentication and security
- Location: `proxy.ts` (root level)
- Contains: Cookie validation, route protection, security headers
- Depends on: Next.js middleware
- Used by: All incoming requests

## Data Flow

**Ticket Creation Flow:**

1. User fills form in `app/tickets/create/page.tsx` (Client Component)
2. Form component (`components/tickets/create-ticket-form.tsx`) validates with zod
3. Component calls `createTicket()` Server Action from `lib/actions/tickets.ts`
4. Server Action gets current user from cookie via `getCurrentUser()`
5. Server Action executes INSERT query via `sql` from `lib/db.ts`
6. Server Action calls `sendSpocNotificationEmail()` from `lib/email.ts`
7. Server Action revalidates paths (`/dashboard`, `/tickets`)
8. Server Action returns `{ success: true, data: ticket }`
9. Component redirects to `/tickets` with success message

**State Management:**
- Form state: React `useState` in Client Components
- Server state: No client-side cache; always fetch fresh via Server Actions
- Auth state: Stored in both cookies (server) and localStorage (client)

## Key Abstractions

**Server Actions:**
- Purpose: Unified pattern for all server-side operations
- Examples: `lib/actions/tickets.ts`, `lib/actions/auth.ts`, `lib/actions/master-data.ts`
- Pattern: All marked with `"use server"`, return `{ success: boolean, data?, error? }`

**Database Types:**
- Purpose: TypeScript type safety for database entities
- Examples: `User`, `Ticket`, `Comment`, `Attachment` in `lib/db.ts`
- Pattern: Match PostgreSQL table schemas

**UI Components (shadcn/ui):**
- Purpose: Reusable, composable UI primitives
- Examples: `components/ui/button.tsx`, `components/ui/dialog.tsx`, `components/ui/form.tsx`
- Pattern: Radix UI primitives wrapped with Tailwind styling

**Feature Components:**
- Purpose: Domain-specific, composed components
- Examples: `components/tickets/create-ticket-form.tsx`, `components/analytics/ticket-status-chart.tsx`
- Pattern: Import UI components, call Server Actions, handle loading/error states

## Entry Points

**Root Landing Page:**
- Location: `app/page.tsx`
- Triggers: User navigates to `/`
- Responsibilities: Shows login form, redirects authenticated users to `/dashboard`

**Dashboard (Main App Entry):**
- Location: `app/dashboard/page.tsx`
- Triggers: User logs in, middleware allows access
- Responsibilities: Displays ticket creation form, layout with navigation

**Middleware:**
- Location: `proxy.ts`
- Triggers: Every request matching config patterns
- Responsibilities: Validate user cookie, redirect unauthenticated users to `/login`, apply security headers

**Root Layout:**
- Location: `app/layout.tsx`
- Triggers: Every page render
- Responsibilities: Load fonts (Poppins, Open Sans), inject global styles, wrap with ErrorBoundary, add Vercel Analytics

## Error Handling

**Strategy:** Optimistic return pattern with explicit error objects

**Patterns:**
- Server Actions return `{ success: false, error: "message" }` instead of throwing
- Client components check `result.success` and display errors in UI
- Try-catch blocks log to console, return user-friendly messages
- Database constraint violations detected via error message parsing
- Form validation uses zod schemas before submission
- Middleware silently redirects on auth failure (no error thrown)

## Cross-Cutting Concerns

**Logging:**
- Console logging in Server Actions with `[v0]` prefix
- No structured logging framework
- Email failures logged but don't block operations

**Validation:**
- Client-side: zod schemas in forms (react-hook-form integration)
- Server-side: Input validation in auth Server Actions (OWASP patterns)
- Database: PostgreSQL constraints (unique, foreign key, not null)

**Authentication:**
- Cookie-based sessions (no JWT)
- User object stored in cookie and localStorage
- Password hashing via bcryptjs (10 salt rounds)
- `getCurrentUser()` helper in `lib/actions/auth.ts`
- Middleware in `proxy.ts` protects routes

**Authorization:**
- Role-based (admin/agent/user stored in users table)
- Currently minimal enforcement (primarily for UI display)
- Team-based filtering for ticket visibility

**Email Notifications:**
- Gmail SMTP via nodemailer
- HTML email templates in `lib/email.ts`
- Notifications for: ticket assignment, SPOC assignment, status changes
- Non-blocking (failures logged, don't stop ticket operations)

**File Uploads:**
- Cloudflare R2 via AWS SDK
- API route at `/api/attachments`
- Max file size: 5MB per file
- Metadata stored in `attachments` table

**Data Revalidation:**
- Next.js `revalidatePath()` after mutations
- No incremental static regeneration
- Always fresh data on navigation

---

*Architecture analysis: 2026-01-19*
