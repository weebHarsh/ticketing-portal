# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js 16 ticketing portal for internal work activity tracking and ticket management, built for Customer Success teams. Uses Neon PostgreSQL for database, shadcn/ui components, and Server Actions for data operations.

### Business Purpose
The application enables Customer Success teams to log all tickets for work tracking and completion to the Tech Delivery team. Tickets can also be logged by the Tech Delivery team for recording work activities that need to be tracked.

**Key Stakeholders:**
- **Customer Success Teams**: Initiate tickets for support issues and requirements
- **Tech Delivery Teams**: Resolve tickets and record work activities
- **SPOC (Single Point of Contact)**: Assign tickets and manage resolution workflow
- **Super Users/Leads**: View and manage all team tickets

## Development Commands

### Running the Application
```bash
npm run dev       # Start development server (http://localhost:4000)
npm run build     # Build for production
npm start         # Start production server
npm run lint      # Run ESLint
```

**Note**: The dev server runs on port 4000 (configured in package.json).

### Database Setup
Use Node.js scripts to run SQL files against the Neon PostgreSQL database:

```bash
# Run all setup scripts in order
node scripts/setup-database-pg.js

# Run a specific SQL file
node scripts/run-sql-file.js scripts/add-notifications.sql
node scripts/run-sql-file.js scripts/add-analytics-data.sql

# Import categories and subcategories from Excel
node scripts/import-excel-data.js

# Verify database state
node scripts/verify-database.js
```

Key SQL scripts in `scripts/`:
- `001-create-tables.sql` - Base schema (users, tickets, comments, attachments)
- `003-master-data-tables.sql` - Master data tables (business units, categories, teams)
- `FINAL-seed-all-data.sql` - Seed data (15 users, 20+ tickets, 8 teams)
- `add-notifications.sql` - Notifications table and sample data
- `add-analytics-data.sql` - Additional tickets for analytics (adds 50 more tickets)
- `import-excel-data.js` - Import categories/subcategories from Ticket-portal.xlsx with auto-fill templates

## Architecture

### Tech Stack
- **Framework**: Next.js 16 with App Router
- **Database**: Neon PostgreSQL via `@neondatabase/serverless`
- **Styling**: Tailwind CSS 4.x with shadcn/ui components
- **State Management**: Server Actions (no client-side state library)
- **Forms**: react-hook-form + zod validation
- **Charts**: Recharts for analytics
- **Auth**: NextAuth v4.24.13

### Directory Structure

```
app/
├── api/          # API routes (NextAuth handlers)
├── dashboard/    # Main dashboard with stats
├── tickets/      # Ticket CRUD pages
│   ├── page.tsx           # List view
│   ├── [id]/page.tsx      # View details
│   ├── [id]/edit/page.tsx # Edit ticket
│   └── create/page.tsx    # Create new
├── teams/        # Team management
├── master-data/  # Business units, categories, subcategories
├── analytics/    # Charts and reporting
├── settings/     # Application settings
├── login/        # Authentication
└── layout.tsx    # Root layout with fonts (Poppins, Open Sans)

components/
├── ui/           # shadcn/ui base components (60+ components)
├── dashboard/    # Dashboard-specific components
├── tickets/      # Ticket-related components
├── teams/        # Team management components
├── master-data/  # Master data management components
├── analytics/    # Chart components
└── layout/       # Navigation, header, sidebar

lib/
├── db.ts         # Database connection (exports `sql` from Neon)
├── actions/      # Server Actions for data operations
│   ├── tickets.ts       # Ticket CRUD
│   ├── master-data.ts   # Business units, categories, subcategories
│   ├── teams.ts         # Team management
│   ├── stats.ts         # Dashboard statistics
│   ├── notifications.ts # Notification CRUD (getNotifications, getUnreadCount, markAsRead, markAllAsRead)
│   └── auth.ts          # Authentication helpers (getCurrentUser)
└── utils.ts      # Utility functions (cn helper)
```

### Business Requirements

#### Ticket Fields (per BRD)
Required fields for each ticket:
- **Auto-filled on creation**: ticket_id, date/time, initiator name, initiator group name, ticket type (default: support), status (default: open)
- **User-entered**: project name, ticket category, sub-category, description, attachments, estimated duration
- **SPOC-filled**: resolution assignee name, status updates (hold), product release name (for new requirements)
- **Auto-filled based on selections**:
  - Project name (based on initiator group name)
  - Category (based on initiator group name)
  - Sub-category (based on category)
  - Ticket inputs/template (based on sub-category)
  - Estimated duration (based on sub-category)
  - Resolution SPOC (based on initiator project group name)
  - Completion date/time (when status = closed)

#### Ticket Types
- **Support Issue**: Regular support tickets with completion date/time
- **New Requirement**: Feature requests with product release name

#### Ticket Status Flow
- **Open** → **In Progress** → **Resolved** → **Closed**
- **Hold**: Tickets on hold by SPOC

#### User Permissions
- **Regular User**: View own tickets, create tickets
- **Team Lead**: View all team tickets (use "all" in initiator name filter)
- **SPOC**: Assign tickets, update status, set to hold
- **Super User**: View entire organization's tickets with grouping by initiator

#### Filtering Requirements (per BRD)
- Default view: User's own tickets in descending order by log id
- Super users typing "all" see entire list grouped by initiator name with expand/collapse
- Filter options:
  - Status (default: All)
  - Date ranges (greater than, less than, between)
  - Resolution assignee name
  - New requirements only

### Database Schema

Key tables (all have `created_at`, `updated_at` timestamps):

- **users**: `id`, `email`, `password_hash`, `full_name`, `role` (admin/agent/user), `avatar_url`
  - Test credentials: `john.doe@company.com` / `password`
- **tickets**: `id`, `ticket_id` (auto-generated), `title`, `description`, `status` (open/in-progress/resolved/closed), `priority` (low/medium/high/urgent), `ticket_type`, `business_unit_group_id`, `category_id`, `subcategory_id` (nullable), `assigned_to`, `created_by`, `estimated_duration`, `resolved_at`
- **business_unit_groups**: `id`, `name`, `description`
  - Current groups: Sales, CS Apps, CS Web, CS Brand, CS BM (Brand monitoring), TD North (Tech Delivery), TD South, TD Others
- **categories**: `id`, `name`, `description`
- **subcategories**: `id`, `name`, `category_id`, `description`
- **ticket_classification_mapping**: Auto-fill configuration for tickets based on BU/category/subcategory
- **teams**: `id`, `name`, `description`
- **team_members**: `id`, `team_id`, `user_id`, `role`
- **comments**: `id`, `ticket_id`, `user_id`, `content`
- **attachments**: `id`, `ticket_id`, `file_name`, `file_url`, `file_size`, `uploaded_by`
- **notifications**: `id`, `user_id`, `title`, `message`, `type` (info/success/warning/error), `is_read`, `related_ticket_id`, `created_at`

#### Master Data Tables (per BRD)

The BRD specifies several master data tables that drive the auto-fill behavior:

1. **"MyTeam" (team_members)**: Dynamic table linking team leads to team members
   - Constructed through user utility to add/delete relationships
   - Enables team-based ticket views

2. **"Ticket Sub-category" (categories + subcategories)**:
   - Links category to sub-category
   - Each combo has attached input template and estimated duration
   - Managed through master data utility (add/modify/delete)
   - Currently: 26 categories, 96 subcategories (imported from Excel)

3. **"Initiator Group Category" (ticket_classification_mapping)**:
   - Links initiator group name → ticket category → resolution SPOC
   - Drives auto-assignment of tickets to SPOC
   - Maps Business Unit + Category + Subcategory → auto-fill data

4. **"Product Release Plan" (future feature)**:
   - Product name + release number + release date
   - Used for "New Requirement" ticket types
   - Not yet implemented in current version

#### Master Data Relationships
```
Business Unit Group
    ↓
  Category (filtered by Business Unit)
    ↓
  Subcategory (filtered by Category)
    ↓
  Auto-fill: Title Template + Estimated Duration + SPOC
```

### Data Flow Pattern

1. **Server Actions** (`lib/actions/*.ts`) handle all data mutations and queries
2. **Components** import and call Server Actions directly (no API routes for data)
3. **Forms** use react-hook-form with zod schemas for validation
4. **Revalidation** uses Next.js `revalidatePath()` after mutations

### Key Features

#### Ticket Workflow Features (per BRD)

**Auto-Generation:**
- Ticket ID: Auto-incremented on creation (format: TKT-YYYYMM-XXXXX)
- Date/Time: Automatically captured on submit
- Initiator details: Pre-filled from logged-in user

**Duplicate Ticket Function:**
- Users can click "duplicate" on existing ticket to pre-fill data entry
- Enables quick creation of similar tickets with editing capability

**Soft Delete:**
- Tickets can be marked as "deleted" (not permanently removed)
- Deleted tickets are greyed out but remain visible in the list
- Maintains audit trail and data integrity

**Customer Portal Integration** (future feature):
- Launch ticket creation directly from customer portal with customer log id
- Link table: customer_log_id ↔ ticket_id
- Query tickets from customer portal using customer log id

#### Notifications System
Real-time notification system integrated into the top navigation:
- **Location**: `components/layout/notifications-dropdown.tsx`
- **Features**:
  - Bell icon with unread count badge
  - Dropdown showing recent notifications
  - Real-time updates every 30 seconds
  - Mark individual or all as read
  - Type-based color coding (info/success/warning/error)
  - Links to related tickets
- **Server Actions**: `lib/actions/notifications.ts`
  - `getNotifications()` - Fetch user's notifications
  - `getUnreadCount()` - Get unread count for badge
  - `markAsRead(id)` - Mark single notification as read
  - `markAllAsRead()` - Mark all as read

#### Authentication
Cookie-based authentication with middleware protection:
- **Login**: `app/login/page.tsx` + `lib/actions/auth.ts`
- **Logout**: `components/layout/sidebar.tsx` - Clears localStorage, cookies, and redirects to `/login`
- **Middleware**: `proxy.ts` protects routes: `/dashboard`, `/tickets`, `/analytics`, `/teams`, `/masters`, `/settings`, `/master-data`, `/admin`
- **Current User**: Use `getCurrentUser()` from `lib/actions/auth.ts` to get authenticated user in Server Actions
- **Password Hashing**: bcryptjs with 10 salt rounds
- **Test Credentials**:
  - Email: `john.doe@company.com` or `admin@company.com`
  - Password: `password`

#### Auto-fill System
The ticket creation flow includes intelligent auto-fill based on `ticket_classification_mapping`:
- User selects Business Unit → Category → Subcategory (optional)
- System automatically populates: ticket title template, estimated duration, assigned SPOC
- **Subcategory is optional**: Users can create tickets with just Business Unit + Category
- Auto-fill behavior:
  - With subcategory: Uses exact mapping (BU + category + subcategory)
  - Without subcategory: Uses fallback (BU + category, first match)
- Implementation: `components/tickets/create-ticket-form.tsx` + `lib/actions/master-data.ts`
- Data source: `ticket_classification_mapping` table or imported from Excel via `scripts/import-excel-data.js`

#### Server Actions Pattern
All Server Actions follow this structure:
```typescript
"use server"

export async function actionName(params) {
  try {
    const result = await sql`...`
    revalidatePath('/path')  // If mutation
    return { success: true, data: result }  // Note: Neon returns array directly, not result.rows
  } catch (error) {
    console.error("Error:", error)
    return { success: false, error: "Error message" }
  }
}
```

**Important**: When using `@neondatabase/serverless`, the query result is the array directly, NOT `result.rows` like node-postgres.

#### Component Organization
- All components use TypeScript
- UI components from shadcn/ui in `components/ui/`
- Feature components in domain folders (tickets/, teams/, etc.)
- Server components by default; client components marked with `"use client"`

## Configuration Notes

### TypeScript
- `ignoreBuildErrors: true` in next.config.mjs (fix types before production)
- Path alias: `@/*` maps to project root
- Target: ES6

### Environment Variables
Required in `.env.local`:
```bash
DATABASE_URL="postgresql://neondb_owner:password@ep-xxx.aws.neon.tech/neondb?sslmode=require"
```

The application uses Neon PostgreSQL as the database. Connection string is configured in `.env.local` (not committed to git).

### Styling
- Tailwind 4.x with custom config
- CSS variables for theming in `app/globals.css`
- Custom fonts: Poppins (headings), Open Sans (body)

## Important Patterns

### Forms
Use react-hook-form + zod:
```typescript
const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
})

async function onSubmit(values: z.infer<typeof schema>) {
  const result = await serverAction(values)
  if (result.success) { /* handle success */ }
}
```

### Error Handling
- Server Actions return `{ success: boolean, data?, error? }`
- Duplicate key errors checked explicitly (e.g., unique name constraints)
- Display user-friendly errors via toast notifications

### Filtering & Search
Many list views support URL search params for filtering:
- Status, priority, type dropdowns
- Search text input
- Date range pickers
- Assignee selection

## BRD Implementation Status

### Implemented Features ✅
- Ticket creation with auto-filled fields (ticket_id, date/time, initiator details)
- Business Unit Groups (8 units: Sales, CS Apps, CS Web, CS Brand, CS BM, TD North, TD South, TD Others)
- Category and Subcategory management (26 categories, 96 subcategories)
- Auto-fill based on BU + Category + Subcategory selection
- Ticket type support (support/requirement)
- Status management (open/in-progress/resolved/closed)
- Team management and team member relationships
- Notifications system
- Filtering by status, assignee, date ranges
- User authentication and role-based access
- Comments and attachments on tickets
- Master data management utilities

### Partially Implemented 🚧
- Filtering: Basic filtering works, but "all" keyword for super users not implemented
- Grouping: No expand/collapse grouping by initiator name yet
- SPOC auto-assignment: Works via ticket_classification_mapping but may need refinement

### Not Yet Implemented ❌
- **Duplicate Ticket Function**: Clone existing ticket for quick re-creation
- **Soft Delete**: Mark tickets as deleted without removing from database
- **Product Release Plan**: Master table for linking requirements to product releases
- **Customer Portal Integration**: External portal links with customer_log_id
- **Project Name Dropdown**: Based on initiator group name
- **Hold Status**: Separate hold status for SPOC workflow
- **Auto-collapse for Super Users**: Grouping with expand/collapse by initiator name

### Future Enhancements
Consider implementing from BRD:
1. Master search in team member selection (search by letters to shorten list)
2. Report line item operations (duplicate, soft delete)
3. Customer portal integration with link table
4. Product release planning for new requirements
5. Enhanced filtering with "all" keyword for super users

## Important Notes

### Neon Database Query Results
**Critical**: Neon's `@neondatabase/serverless` returns query results as arrays directly, NOT as `result.rows` like node-postgres:
```typescript
// CORRECT (Neon)
const result = await sql`SELECT * FROM tickets`
return { success: true, data: result }

// WRONG (this is for node-postgres, not Neon)
return { success: true, data: result.rows }  // ❌ result.rows is undefined in Neon
```

### Subcategory Optional Pattern
**Important**: Subcategories are optional in ticket creation/editing to handle categories without subcategories:

```typescript
// In Server Actions
export async function createTicket(data: {
  subcategoryId: number | null  // ✅ Must allow null
  // ...
})

// In components
subcategoryId: formData.subcategoryId ? Number(formData.subcategoryId) : null

// In auto-fill logic
export async function getAutoTitleTemplate(
  businessUnitGroupId: number,
  categoryId: number,
  subcategoryId: number | null  // ✅ Query with or without subcategory
)
```

This pattern ensures:
- Users can proceed even if a category has no subcategories
- Auto-fill still works (falls back to category-level mapping)
- No validation errors for missing subcategories
- Database allows NULL for `tickets.subcategory_id`

### Hydration Errors
If you encounter React hydration errors, ensure:
- Viewport configuration is in a separate `export const viewport` (not in metadata)
- No server/client mismatch in localStorage usage
- Client components are marked with `"use client"`

### Route Protection
All protected routes are defined in `proxy.ts`. When adding new authenticated pages, add the route pattern to the middleware check.

### Business Unit Groups
The system uses 8 specific business units (defined in database):
- Sales
- CS Apps
- CS Web
- CS Brand
- CS BM (Brand monitoring)
- TD North (Tech Delivery)
- TD South
- TD Others

### Password Updates
When updating user passwords, always use bcrypt hashing:
```typescript
const bcrypt = require('bcryptjs')
const hash = await bcrypt.hash('password', 10)
await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${userId}`
```

## Testing

No formal test suite configured. To test manually:
1. Run database setup: `node scripts/setup-database-pg.js`
2. Verify data: `node scripts/verify-database.js`
3. Start server: `npm run dev` (opens on port 4000)
4. Test critical flows: login → create ticket → assign → resolve → analytics → notifications

## Common Tasks

### Adding a New Feature Page
1. Create route in `app/[feature]/page.tsx`
2. Create Server Actions in `lib/actions/[feature].ts`
3. Add components in `components/[feature]/`
4. Update navigation in `components/layout/`

### Adding Master Data Entity
1. Add table to database schema
2. Create CRUD Server Actions in `lib/actions/master-data.ts`
3. Add tab/page in Master Data Management
4. Follow existing pattern (Business Unit Groups, Categories, etc.)

### Modifying Ticket Flow
- Ticket creation: `components/tickets/create-ticket-form.tsx`
- Auto-fill logic: `lib/actions/master-data.ts` → `getTicketClassificationMapping()`
- Status updates: `lib/actions/tickets.ts` → `updateTicket()`

### Running Database Scripts
The project includes Node.js scripts for database management:

**Setup Scripts** (in `scripts/`):
- `setup-database-pg.js` - Main setup script, runs all SQL files in order
- `run-sql-file.js` - Run a specific SQL file against the database
- `verify-database.js` - Check database state and counts
- `import-excel-data.js` - Import categories and subcategories from Excel file

**Usage**:
```bash
# Full setup (runs all SQL scripts)
node scripts/setup-database-pg.js

# Run specific script
node scripts/run-sql-file.js scripts/add-notifications.sql

# Import master data from Excel (Ticket-portal.xlsx)
node scripts/import-excel-data.js
# This imports 26 categories, 96 subcategories with auto-fill templates

# Check database
node scripts/verify-database.js
```

**Excel Import Details** (`import-excel-data.js`):
- Reads `Ticket-portal.xlsx` from project root
- Parses Category, Sub Category, Input (title template), Estimated Time columns
- Creates categories and subcategories in the database
- Populates `ticket_classification_mapping` with auto-fill data
- Clears existing data before import (destructive operation)

These scripts use the `pg` (node-postgres) client for executing SQL files, while the application uses `@neondatabase/serverless` for runtime queries.
