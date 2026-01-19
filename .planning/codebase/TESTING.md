# Testing Patterns

**Analysis Date:** 2026-01-19

## Test Framework

**Runner:**
- Not configured
- Config: No jest.config.js, vitest.config.js, or other test runner config detected

**Assertion Library:**
- Not configured

**Run Commands:**
```bash
# No test commands configured in package.json
# Scripts available: build, dev, lint, start
```

## Test File Organization

**Location:**
- No test files detected in the codebase (excluding node_modules)

**Naming:**
- Pattern not established (no existing tests)

**Structure:**
- Test structure not defined

## Test Structure

**Suite Organization:**
Not applicable - no test framework configured

**Patterns:**
Not applicable - no existing tests

## Mocking

**Framework:** Not configured

**Patterns:**
Not applicable - no existing tests

**What to Mock:**
Based on architecture analysis, the following would need mocking if tests were added:
- Database queries (`@neondatabase/serverless` SQL client)
- Next.js framework functions (`revalidatePath()`, `cookies()`, `redirect()`)
- External email service (Gmail SMTP via nodemailer)
- File storage operations (AWS S3/R2 client)
- localStorage and document.cookie for client-side auth

**What NOT to Mock:**
- Utility functions (`cn()` from `lib/utils.ts`)
- Type definitions
- Constants

## Fixtures and Factories

**Test Data:**
Not applicable - no test fixtures configured

**Location:**
Test data currently exists only in SQL seed scripts:
- `scripts/FINAL-seed-all-data.sql` - 15 users, 20+ tickets, 8 teams
- `scripts/add-analytics-data.sql` - Additional 50 tickets for analytics

## Coverage

**Requirements:** None enforced

**View Coverage:**
No coverage tooling configured

## Test Types

**Unit Tests:**
Not implemented

**Integration Tests:**
Not implemented

**E2E Tests:**
Not implemented

## Common Patterns

No testing patterns established in this codebase.

## Testing Gaps and Recommendations

**Current State:**
This codebase has **no automated testing** configured. All testing appears to be manual:
1. Database setup via scripts (`node scripts/setup-database-pg.js`)
2. Verification script (`node scripts/verify-database.js`)
3. Manual testing through dev server (`npm run dev`)

**Critical Areas Needing Tests:**

**Server Actions** (`lib/actions/*.ts`):
- Ticket CRUD operations (`lib/actions/tickets.ts`)
- Authentication flows (`lib/actions/auth.ts`)
- Master data management (`lib/actions/master-data.ts`)
- Team management (`lib/actions/teams.ts`)

**Form Validation:**
- Create ticket form (`components/tickets/create-ticket-form.tsx`)
- Login/signup forms (`components/auth/*.tsx`)
- Input validation helpers in `lib/actions/auth.ts` (isValidEmail, isValidPassword, sanitizeString)

**Business Logic:**
- Auto-fill system for ticket classification
- SPOC assignment logic
- Ticket ID generation (format: TKT-YYYYMM-XXXXX)
- Email notification triggers

**Recommended Test Framework Setup:**

For Server Actions and business logic:
```bash
npm install -D vitest @vitest/ui
npm install -D @testing-library/react @testing-library/jest-dom
```

For E2E testing:
```bash
npm install -D playwright
```

**Testing Strategy:**

1. **Start with Server Actions** (highest risk, pure functions):
   - Test success/error response structure
   - Test input validation (OWASP patterns)
   - Test duplicate key handling
   - Mock database queries

2. **Add Form Validation Tests**:
   - Test Zod schemas
   - Test client-side validation
   - Test error message display

3. **Integration Tests for Critical Flows**:
   - Ticket creation → auto-fill → SPOC notification
   - User authentication → session management
   - Status change → email notification

4. **E2E Tests for User Journeys**:
   - Login → Create ticket → View ticket → Update status
   - SPOC assignment workflow
   - Team member management

**Example Test Pattern (if implemented):**

```typescript
// lib/actions/__tests__/tickets.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTicket, getTickets } from '../tickets'
import { sql } from '@/lib/db'

// Mock database
vi.mock('@/lib/db', () => ({
  sql: vi.fn()
}))

describe('Ticket Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create ticket with valid data', async () => {
    const mockResult = [{ id: 1, ticket_id: 'TKT-202601-00001' }]
    vi.mocked(sql).mockResolvedValueOnce(mockResult)

    const result = await createTicket({
      ticketType: 'support',
      businessUnitGroupId: 1,
      projectName: 'Test Project',
      categoryId: 1,
      subcategoryId: null,
      title: 'Test Ticket',
      description: 'Test Description',
      estimatedDuration: '2 hours',
      spocId: 1,
      productReleaseName: ''
    })

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })

  it('should return error for missing required fields', async () => {
    // Test validation logic
  })
})
```

---

*Testing analysis: 2026-01-19*
