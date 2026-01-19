# Codebase Structure

**Analysis Date:** 2026-01-19

## Directory Layout

```
ticketing/
├── app/                      # Next.js 16 App Router pages
│   ├── api/                  # API routes (minimal, mostly file uploads)
│   ├── dashboard/            # Main dashboard page
│   ├── tickets/              # Ticket CRUD pages
│   ├── analytics/            # Charts and reporting
│   ├── teams/                # Team management
│   ├── master-data/          # Master data management
│   ├── users/                # User management
│   ├── settings/             # Application settings
│   ├── login/                # Login page
│   ├── signup/               # Signup page
│   ├── layout.tsx            # Root layout (fonts, error boundary)
│   ├── page.tsx              # Landing page (login form)
│   └── globals.css           # Global styles and CSS variables
├── components/               # React components
│   ├── ui/                   # shadcn/ui base components (60+ files)
│   ├── tickets/              # Ticket-related components
│   ├── analytics/            # Chart components
│   ├── teams/                # Team management components
│   ├── master-data/          # Master data components
│   ├── layout/               # Navigation and layout components
│   ├── auth/                 # Login/signup forms
│   ├── dashboard/            # Dashboard-specific components
│   ├── users/                # User management components
│   ├── settings/             # Settings components
│   └── error-boundary.tsx    # Global error boundary
├── lib/                      # Core utilities and backend logic
│   ├── actions/              # Server Actions (all data operations)
│   │   ├── tickets.ts        # Ticket CRUD operations
│   │   ├── auth.ts           # Authentication (login, signup, getCurrentUser)
│   │   ├── master-data.ts    # Business units, categories, subcategories
│   │   ├── teams.ts          # Team management
│   │   ├── my-team.ts        # Team member relationships
│   │   ├── users.ts          # User management
│   │   ├── stats.ts          # Dashboard statistics
│   │   └── notifications.ts  # Notification CRUD
│   ├── db.ts                 # Neon database connection and types
│   ├── email.ts              # Email service (nodemailer with Gmail SMTP)
│   └── utils.ts              # Utility functions (cn helper)
├── scripts/                  # Database management scripts
│   ├── setup-database-pg.js  # Run all SQL scripts in order
│   ├── run-sql-file.js       # Execute single SQL file
│   ├── import-excel-data.js  # Import categories from Excel
│   ├── verify-database.js    # Check database state
│   └── *.sql                 # SQL schema and seed files
├── public/                   # Static assets (icons, images)
├── hooks/                    # Custom React hooks
├── styles/                   # Additional stylesheets
├── proxy.ts                  # Middleware (auth, security headers)
├── next.config.mjs           # Next.js configuration
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── CLAUDE.md                 # Project documentation
```

## Directory Purposes

**app/**
- Purpose: Next.js App Router pages and layouts
- Contains: Route segments, page components, API routes
- Key files: `layout.tsx`, `page.tsx`, `globals.css`

**app/api/**
- Purpose: REST API endpoints (minimal usage)
- Contains: File upload handler, auth endpoints, cleanup utilities
- Key files: `api/attachments/route.ts`, `api/auth/login/route.ts`, `api/auth/signup/route.ts`

**app/dashboard/**
- Purpose: Main application dashboard
- Contains: Dashboard page with ticket creation form
- Key files: `dashboard/page.tsx`

**app/tickets/**
- Purpose: Ticket list, detail, create, and edit pages
- Contains: CRUD pages for tickets
- Key files: `tickets/page.tsx`, `tickets/[id]/page.tsx`, `tickets/[id]/edit/page.tsx`, `tickets/create/page.tsx`

**components/ui/**
- Purpose: Reusable UI primitives from shadcn/ui
- Contains: 60+ components (button, dialog, form, input, select, etc.)
- Key files: `ui/button.tsx`, `ui/form.tsx`, `ui/dialog.tsx`, `ui/combobox.tsx`, `ui/chart.tsx`

**components/tickets/**
- Purpose: Ticket-specific composed components
- Contains: Forms, tables, filters, headers
- Key files: `tickets/create-ticket-form.tsx`, `tickets/tickets-table.tsx`, `tickets/tickets-filter.tsx`

**components/layout/**
- Purpose: Application layout and navigation
- Contains: Headers, sidebars, navigation components
- Key files: `layout/dashboard-layout.tsx`, `layout/horizontal-nav.tsx`, `layout/notifications-dropdown.tsx`, `layout/sidebar.tsx`

**lib/actions/**
- Purpose: Server Actions (backend data operations)
- Contains: All CRUD operations, business logic, database queries
- Key files: `actions/tickets.ts`, `actions/auth.ts`, `actions/master-data.ts`, `actions/teams.ts`

**scripts/**
- Purpose: Database setup and management
- Contains: Node.js scripts to run SQL files, import data from Excel
- Key files: `setup-database-pg.js`, `import-excel-data.js`, `*.sql`

## Key File Locations

**Entry Points:**
- `app/page.tsx`: Landing page with login form
- `app/dashboard/page.tsx`: Main dashboard after login
- `app/layout.tsx`: Root layout with fonts and global setup
- `proxy.ts`: Middleware for auth and security

**Configuration:**
- `next.config.mjs`: Next.js configuration (TypeScript errors ignored)
- `tsconfig.json`: TypeScript settings with path aliases (@/*)
- `package.json`: Dependencies and npm scripts
- `.env.local`: Environment variables (not committed)

**Core Logic:**
- `lib/db.ts`: Database connection and type definitions
- `lib/actions/*.ts`: All backend operations
- `lib/email.ts`: Email notification service

**Testing:**
- No test files present (no formal test suite)

## Naming Conventions

**Files:**
- Pages: `page.tsx` (Next.js convention)
- Layouts: `layout.tsx` (Next.js convention)
- Components: kebab-case (e.g., `create-ticket-form.tsx`, `horizontal-nav.tsx`)
- Server Actions: domain name (e.g., `tickets.ts`, `auth.ts`, `master-data.ts`)
- Route segments: kebab-case for static, `[id]` for dynamic

**Directories:**
- Route segments: kebab-case (e.g., `master-data`, `tickets`)
- Component folders: kebab-case matching domain (e.g., `components/tickets/`, `components/master-data/`)
- Dynamic routes: bracket notation (e.g., `tickets/[id]/`)

**Functions:**
- Server Actions: camelCase verbs (e.g., `createTicket`, `getTickets`, `updateTicketStatus`)
- React components: PascalCase (e.g., `CreateTicketForm`, `HorizontalNav`)
- Utilities: camelCase (e.g., `cn`, `getCurrentUser`)

**Variables:**
- Component props: camelCase
- State variables: camelCase
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`, `EMAIL_REGEX`)

**Types:**
- Interface/Type names: PascalCase (e.g., `User`, `Ticket`, `FormData`)
- Database types exported from `lib/db.ts`

## Where to Add New Code

**New Feature Page:**
- Primary code: `app/[feature]/page.tsx` (Server Component by default)
- Client interactivity: Add `"use client"` directive if needed
- Tests: No test infrastructure currently

**New Component:**
- Domain component: `components/[domain]/[component-name].tsx`
- Shared UI: `components/ui/[component-name].tsx` (follow shadcn/ui pattern)
- Layout component: `components/layout/[component-name].tsx`

**New Server Action:**
- Implementation: `lib/actions/[domain].ts` (add to existing file or create new)
- Pattern: Mark with `"use server"`, return `{ success, data?, error? }`
- Revalidation: Call `revalidatePath()` after mutations

**New API Route:**
- Implementation: `app/api/[route]/route.ts`
- Use only for: File uploads, webhooks, external integrations
- Prefer Server Actions for data operations

**Utilities:**
- Shared helpers: `lib/utils.ts`
- Domain-specific: `lib/[domain].ts` (e.g., `lib/email.ts`)

**Database Changes:**
- Schema: `scripts/*.sql` (create new numbered SQL file)
- Run: `node scripts/run-sql-file.js scripts/your-file.sql`
- Seed data: Add to `scripts/FINAL-seed-all-data.sql` or create separate file

**Master Data:**
- UI: `app/master-data/page.tsx` or `components/master-data/`
- Server Actions: `lib/actions/master-data.ts`
- Follow pattern: CRUD operations for entity, tab-based UI

## Special Directories

**.next/**
- Purpose: Next.js build output
- Generated: Yes (on `npm run build` or `npm run dev`)
- Committed: No (in .gitignore)

**node_modules/**
- Purpose: npm dependencies
- Generated: Yes (on `npm install`)
- Committed: No (in .gitignore)

**public/**
- Purpose: Static assets served from root URL
- Generated: No (manually added)
- Committed: Yes
- Contents: Icons (light/dark mode), apple-icon.png, favicon files

**.planning/**
- Purpose: Project planning and codebase documentation
- Generated: Yes (by GSD commands)
- Committed: Optional
- Contents: Codebase analysis documents (this file)

**.claude/**
- Purpose: Claude Code session data
- Generated: Yes (by Claude Code)
- Committed: No

**scripts/**
- Purpose: Database management and data import
- Generated: No (manually created)
- Committed: Yes
- Note: Uses `pg` client (not @neondatabase/serverless)

## Import Path Aliases

**@/ alias:**
- Maps to: Project root
- Example: `import { sql } from "@/lib/db"`
- Configured in: `tsconfig.json`

**Common imports:**
```typescript
// Server Actions
import { createTicket } from "@/lib/actions/tickets"
import { getCurrentUser } from "@/lib/actions/auth"

// Components
import { Button } from "@/components/ui/button"
import CreateTicketForm from "@/components/tickets/create-ticket-form"

// Database
import { sql } from "@/lib/db"

// Utils
import { cn } from "@/lib/utils"
```

## Route Structure

**Public routes:**
- `/` - Landing page with login form
- `/login` - Login page
- `/signup` - Signup page

**Protected routes (require authentication):**
- `/dashboard` - Main dashboard with ticket creation
- `/tickets` - Ticket list
- `/tickets/[id]` - Ticket detail view
- `/tickets/[id]/edit` - Edit ticket
- `/tickets/create` - Create new ticket
- `/analytics` - Charts and reporting
- `/teams` - Team management
- `/master-data` - Master data management (categories, subcategories, etc.)
- `/users` - User management
- `/settings` - Application settings
- `/admin` - Admin panel

**API routes:**
- `/api/auth/login` - POST login
- `/api/auth/signup` - POST signup
- `/api/attachments` - POST file upload
- `/api/cleanup` - Utility endpoint
- `/api/users/create` - POST create user

## File Counts

**Total TypeScript files:** ~8,789 (including node_modules)
**App route files:** 22
**Component files:** 98
**Server Action files:** 9

---

*Structure analysis: 2026-01-19*
