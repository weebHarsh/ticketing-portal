# Coding Conventions

**Analysis Date:** 2026-01-19

## Naming Patterns

**Files:**
- Components: kebab-case (e.g., `create-ticket-form.tsx`, `tickets-table.tsx`, `dashboard-layout.tsx`)
- Server Actions: kebab-case (e.g., `master-data.ts`, `auth.ts`, `tickets.ts`)
- Pages: Next.js App Router convention - `page.tsx`, `layout.tsx`, `loading.tsx`
- UI components: kebab-case matching shadcn/ui style (e.g., `button.tsx`, `form.tsx`, `dialog.tsx`)

**Functions:**
- Server Actions: camelCase starting with verb (e.g., `getTickets`, `createTicket`, `updateTicketStatus`)
- Components: PascalCase (e.g., `CreateTicketForm`, `TicketsTable`, `DashboardLayout`)
- Utilities: camelCase (e.g., `cn`, `isValidEmail`, `sanitizeString`)
- Event handlers: camelCase with `handle` prefix (e.g., `handleLogout`, `handleSubmit`, `handleClickOutside`)

**Variables:**
- State variables: camelCase (e.g., `formData`, `isLoading`, `currentUser`)
- Constants: camelCase or SCREAMING_SNAKE_CASE for true constants (e.g., `MAX_FILE_SIZE`, `EMAIL_REGEX`)
- Props interfaces: PascalCase with descriptive suffix (e.g., `FormData`, `TicketsTableProps`, `SidebarProps`)

**Types:**
- Interfaces: PascalCase (e.g., `User`, `Ticket`, `Comment`, `Attachment`)
- Type aliases: PascalCase (e.g., `ClassValue`)
- Database types: Exported types in `lib/db.ts` (e.g., `User`, `Ticket`, `Comment`)

## Code Style

**Formatting:**
- Tool: None explicitly configured (no .prettierrc or .eslintrc detected)
- Indentation: 2 spaces (observed in all files)
- Quotes: Double quotes for strings, backticks for template literals
- Semicolons: Not enforced consistently (some files use, some don't)
- Line length: No hard limit, but generally kept readable

**Linting:**
- Tool: ESLint (script: `npm run lint` runs `eslint .`)
- Configuration: Default Next.js ESLint setup (no custom .eslintrc found)
- TypeScript: `strict: true` in tsconfig.json but `ignoreBuildErrors: true` in next.config.mjs

## Import Organization

**Order:**
1. React core imports (`import React from "react"`, `import { useState } from "react"`)
2. Next.js framework imports (`next/navigation`, `next/cache`, `next/font/google`)
3. Third-party library imports (e.g., `date-fns`, `zod`, `bcryptjs`, `lucide-react`)
4. Internal imports - absolute path with `@/` alias:
   - `@/lib/db` - Database connection
   - `@/lib/actions/*` - Server Actions
   - `@/lib/utils` - Utilities
   - `@/components/*` - Components

**Path Aliases:**
- `@/*` maps to project root (configured in tsconfig.json `paths`)
- All internal imports use `@/` prefix (e.g., `@/lib/db`, `@/components/ui/button`)

## Error Handling

**Patterns:**

Server Actions always return structured response:
```typescript
try {
  const result = await sql`...`
  revalidatePath('/path')
  return { success: true, data: result }
} catch (error) {
  console.error("Error description:", error)
  return { success: false, error: "User-friendly message" }
}
```

**Duplicate key detection:**
```typescript
catch (error: any) {
  if (error.message?.includes("duplicate key") || error.detail?.includes("already exists")) {
    return { success: false, error: "Specific duplicate message", isDuplicate: true }
  }
  return { success: false, error: "Generic error message" }
}
```

**Client-side error display:**
- Server Actions return `{ success: boolean, data?, error? }`
- Components check `result.success` and display errors via state
- No toast library used - errors shown inline or in alerts

**Input validation:**
- OWASP-style validation helpers in `lib/actions/auth.ts`:
  - `isValidEmail()` - RFC 5321 email validation (max 254 chars)
  - `isValidPassword()` - 8-128 character range
  - `sanitizeString()` - Trim and limit to 255 chars
- Zod schemas for form validation (react-hook-form + zod)
- Type guards for ID validation: `isNaN(id) || !Number.isInteger(id) || id <= 0`

## Logging

**Framework:** console (native)

**Patterns:**
- Prefix with context: `console.error("[v0] Error description:", error)` or `console.error("Error description:", error)`
- Log location: Server Actions only (no client-side logging except development)
- Log level: Only `console.error()` in production code, `console.log()` for development debugging
- Sensitive data: Generic error messages returned to client, full error logged server-side

**Examples from codebase:**
- `console.error("[v0] Error fetching tickets:", error)` in `lib/actions/tickets.ts`
- `console.error("Error getting current user:", error)` in `lib/actions/auth.ts`
- `console.error("[Email] Failed to send SPOC notification:", emailError)` in `lib/actions/tickets.ts`

## Comments

**When to Comment:**
- Complex business logic (auto-fill mapping, SPOC assignment)
- Security considerations (OWASP validation, timing attack prevention)
- Non-obvious behavior (Neon query results vs. node-postgres)
- Disabled features or technical debt markers

**JSDoc/TSDoc:**
- Not consistently used across codebase
- Type information provided through TypeScript types rather than JSDoc
- No function-level documentation blocks

**Examples:**
- `// OWASP: Email validation regex` in `lib/actions/auth.ts`
- `// Fetch all non-deleted tickets - filtering done client-side for flexibility` in `lib/actions/tickets.ts`
- `// Apply filters in JavaScript` in `lib/actions/tickets.ts`

## Function Design

**Size:**
- Server Actions: 20-80 lines typical
- Components: 50-300 lines (complex forms can be longer)
- Utilities: 5-30 lines

**Parameters:**
- Server Actions: Single data object parameter for multiple fields
  ```typescript
  export async function createTicket(data: {
    ticketType: string
    businessUnitGroupId: number
    categoryId: number
    subcategoryId: number | null  // Allow null for optional fields
    // ...
  })
  ```
- Components: Props interface with explicit types
  ```typescript
  interface SidebarProps {
    isOpen: boolean
    setIsOpen: (open: boolean) => void
  }
  ```

**Return Values:**
- Server Actions: `{ success: boolean, data?, error?, isDuplicate? }`
- Components: JSX.Element or null
- Utilities: Specific return type (e.g., `string`, `boolean`)

## Module Design

**Exports:**
- Named exports preferred over default exports for utilities and types
- Default exports used for page components (Next.js App Router requirement)
- Server Actions: Multiple named exports from single file (e.g., `lib/actions/tickets.ts` exports 10+ functions)

**Barrel Files:**
- Not used - direct imports from specific files
- Example: `@/components/ui/button` not `@/components/ui`

**File Organization:**
- One primary component per file
- Related interfaces/types co-located in same file
- Shared types in `lib/db.ts`

## Type Safety

**TypeScript Strictness:**
- `strict: true` in tsconfig.json
- `target: ES6` for compilation
- `skipLibCheck: true` to avoid dependency type errors
- Build errors ignored in production (`ignoreBuildErrors: true` in next.config.mjs)

**Type Patterns:**
- Explicit interfaces for complex objects (e.g., `FormData`, `Ticket`, `User`)
- `any` used sparingly (mostly for error objects and external library types)
- Nullable types: `number | null` for optional database foreign keys
- Union types for enums: `status: "open" | "closed" | "hold"`

## Client/Server Boundaries

**Directives:**
- `"use server"` at top of Server Actions files (`lib/actions/*.ts`)
- `"use client"` at top of interactive components
- No directive: Server components by default (Next.js App Router)

**Data Flow:**
- Server Actions called directly from client components
- No API routes for data operations (only `/api/auth` for NextAuth)
- Client → Server: Function call with JSON-serializable data
- Server → Client: `{ success, data, error }` response

**State Management:**
- No global state library (Redux, Zustand, etc.)
- React `useState` and `useEffect` for client state
- localStorage for persisting user session (`user` object)
- Server Actions + `revalidatePath()` for cache invalidation

## shadcn/ui Component Usage

**Pattern:**
- UI primitives from `@/components/ui/*` (60+ components)
- Components use `cn()` utility for className merging:
  ```typescript
  import { cn } from '@/lib/utils'
  className={cn(buttonVariants({ variant, size }), className)}
  ```
- Radix UI primitives wrapped with custom styling
- class-variance-authority (cva) for variant-based styling

**Customization:**
- CSS variables in `app/globals.css` for theming
- Tailwind utility classes for layout and spacing
- Custom color scheme (Deep Purple #530093, Medium Purple #A21094)

---

*Convention analysis: 2026-01-19*
