# Ticketing Portal - Project Context

## 1. Project Overview
**Ticketing Portal** is a Next.js 16 application designed for Customer Success teams to log, track, and manage work activities with Tech Delivery teams. It features intelligent auto-fill, role-based access, and comprehensive analytics.

*   **Primary Users:** Customer Success Teams (Initiators), Tech Delivery Teams (Resolvers), SPOCs (Managers).
*   **Core Value:** Streamlines ticket creation via auto-fill templates based on Business Unit > Category > Subcategory selection.

## 2. Tech Stack
*   **Framework:** Next.js 16 (App Router, Turbopack).
*   **Language:** TypeScript 5.
*   **Database:** Neon PostgreSQL (Serverless).
*   **ORM/Driver:** `@neondatabase/serverless` (Raw SQL queries).
*   **Styling:** Tailwind CSS 4.x, shadcn/ui (Radix UI based).
*   **State Management:** Server Actions (No client-side global state like Redux).
*   **Forms:** `react-hook-form` + `zod`.
*   **Authentication:** Custom cookie-based auth with `bcryptjs`. `next-auth` is listed but custom implementation is primary.

## 3. Architecture & Patterns

### Data Flow (Server Actions)
*   **Pattern:** Components call Server Actions directly. No intermediate API layer for data operations.
*   **Location:** `lib/actions/*.ts`.
*   **Validation:** All inputs validated via Zod schemas in the action.
*   **Revalidation:** `revalidatePath()` used to refresh data after mutations.

### Database Interaction (Crucial Nuance)
*   **Driver:** `@neondatabase/serverless`.
*   **Return Format:** **ARRAYS**, not objects.
    *   ✅ **Correct:** `const result = await sql`SELECT * FROM users`` -> `return result`
    *   ❌ **Incorrect:** `return result.rows` (Common mistake coming from `pg` node driver).

### Directory Structure
*   `app/`: Routes. `dashboard`, `tickets`, `teams`, `master-data` are protected.
*   `components/`:
    *   `ui/`: shadcn/ui primitives.
    *   Feature folders (`tickets/`, `teams/`) for domain-specific UI.
*   `lib/`:
    *   `db.ts`: Database connection export.
    *   `actions/`: Server actions (business logic).
*   `scripts/`: Database setup and migration SQL files.

## 4. Database Schema
**Core Tables:**
*   `tickets`: Main entity. Links to users, categories, business units.
*   `users`: RBAC (`admin`, `agent`, `user`).
*   `business_unit_groups`: 8 fixed units (Sales, CS Apps, etc.).
*   `ticket_classification_mapping`: Rules for auto-filling ticket details.
*   `notifications`: Real-time alerts.

**Setup:**
*   **Connection:** `.env.local` (`DATABASE_URL`).
*   **Scripts:**
    *   `node scripts/setup-database-pg.js`: Full setup (Tables + Seed).
    *   `node scripts/import-excel-data.js`: Imports master data from `Ticket-portal.xlsx`.

## 5. Development Workflow

### Key Commands
*   **Start Dev Server:** `npm run dev` (Runs on **Port 4000**).
*   **Database Setup:** `node scripts/setup-database-pg.js`.
*   **Lint:** `npm run lint`.

### Conventions
*   **Forms:** Use `useForm` with `zodResolver`.
*   **Subcategories:** Optional. Code must handle `null` subcategoryId.
*   **Hydration:** Ensure client/server markup matches. Use `"use client"` for interactive components.
*   **Types:** TypeScript `ignoreBuildErrors: true` is set in config (legacy). Aim to fix types where possible.

## 6. Key Features Implementation
*   **Auto-Fill:**
    *   User selects BU -> Category -> [Subcategory].
    *   System queries `ticket_classification_mapping`.
    *   Returns: Title template, Estimated duration, Assigned SPOC.
*   **Notifications:**
    *   Polled every 30s (via `notifications-dropdown.tsx`).
    *   Visual indicator for unread count.

## 7. Operational Status
*   **Implemented:** Ticket CRUD, Auto-fill, Analytics, Team Management, Auth.
*   **Pending:** Soft Delete, Duplicate Ticket, "Hold" status, Advanced Super User grouping.
