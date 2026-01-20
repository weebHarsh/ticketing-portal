# Ticketing Portal Enhancements

## What This Is

Enhancement of an existing Next.js ticketing portal used by Customer Success and Tech Delivery teams. This project adds release planning capabilities for "New Requirements" tickets, improves table UX for faster ticket management, and adds audit trail functionality.

## Core Value

SPOC and Assignees can quickly update ticket status and track release planning without navigating away from the My Tickets screen.

## Requirements

### Validated

These capabilities already exist in the codebase:

- ✓ User authentication with cookie-based sessions — existing
- ✓ Ticket creation for support issues and new requirements — existing
- ✓ Ticket assignment workflow (SPOC assignment, assignee assignment) — existing
- ✓ Team management with team member relationships — existing
- ✓ Master data management (business units, categories, subcategories) — existing
- ✓ Email notifications for ticket events (assignment, status changes) — existing
- ✓ File attachments on tickets via Cloudflare R2 — existing
- ✓ Comments on tickets — existing
- ✓ Analytics dashboard with charts — existing
- ✓ Notifications system with unread count — existing
- ✓ Auto-fill system for ticket classification based on business unit — existing

### Active

New functionality to be built:

#### Release Planning
- [ ] Project Names master data (project name + estimated release date)
- [ ] New Requirements tickets use Project Name dropdown
- [ ] Estimated Release Date auto-fills based on Project Name selection
- [ ] Reports show Project Name and Release Date column for New Requirements tickets

#### My Tickets UX Improvements
- [ ] Table column headers use proper capitalization (first letter capital, rest lowercase)
- [ ] Larger, more readable fonts in table rows
- [ ] Combined Tkt ID column displays Ticket ID and Type in 2-line mode
- [ ] Move Tkt ID column before Status column
- [ ] Separate SPOC column positioned before Assignee column
- [ ] Description tooltip shows full text on mouse hover
- [ ] Inline status dropdown allows SPOC/Assignee to update status without opening ticket
- [ ] Export button positioned on same line as My Team filter
- [ ] Remove "+ New Ticket" button from My Tickets screen

#### New Requirements Ticket Type Changes
- [ ] Hide Category and Subcategory fields (not required for New Requirements)
- [ ] Hide Estimated Duration field (not required for New Requirements)
- [ ] Description field displayed blank and editable
- [ ] Reports display Title column instead of Category/Subcategory column

#### Dashboard Improvements
- [ ] SPOC name auto-populates based on Business Unit Group selection (remains editable)

#### Master Data Enhancements
- [ ] Business Unit Groups include SPOC name field
- [ ] Add Subcategory dialog styling consistency with other dialogs
- [ ] Project Names tab for managing projects and release dates

#### Audit Trail
- [ ] Track who closed each ticket and when
- [ ] Display closure tracking in audit log/history view

### Out of Scope

Features explicitly excluded from this enhancement:

- Duplicate ticket function — Deferred to future milestone (BRD requirement not implemented yet)
- Soft delete functionality — Deferred to future milestone (BRD requirement not implemented yet)
- Customer portal integration with customer_log_id — Future feature, not current priority
- Product Release Plan table beyond Project Names — Only basic project/release date tracking needed
- Test suite implementation — Quality improvement deferred to separate effort
- TypeScript build error fixes — Technical debt deferred to separate effort
- Performance optimizations (client-side filtering, pagination) — Works fine for current scale

## Context

**Business Background:**
- Customer Success teams log tickets for Tech Delivery teams to track work activities
- Tickets come in two types: Support Issues (existing process) and New Requirements (new release planning process)
- SPOC (Single Point of Contact) assigns tickets to Tech Delivery team members
- Teams need to track which requirements go into which product release

**Technical Environment:**
- Next.js 16 with App Router and Server Actions architecture
- Neon PostgreSQL database with 15+ tables
- Tailwind CSS 4.x with shadcn/ui components
- No test coverage (manual testing only)
- TypeScript with build errors currently suppressed

**User Feedback:**
- My Tickets screen difficult to scan quickly (too much navigation between views)
- Status updates require opening ticket detail page (slow workflow)
- No way to track release planning for New Requirements tickets
- Table columns not optimized for information density

**Known Issues from Codebase Analysis:**
- Zero automated test coverage
- Client-side filtering (performance concern at scale)
- localStorage auth state sync issues
- TypeScript errors suppressed in build config

## Constraints

- **Existing Data**: Must not break existing tickets, users, or master data
- **Tech Stack**: Next.js 16, React 19, Neon PostgreSQL, Tailwind CSS (no framework changes)
- **Timeline**: Flexible — quality and usability over speed
- **Backward Compatibility**: Support ticket type workflow must continue to work unchanged

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Project list managed in Master Data tab | Users requested centralized management; consistent with existing master data pattern | — Pending |
| Closure tracking in audit log (not table column) | Keeps My Tickets table clean; detail available when needed | — Pending |
| Category/Subcategory hidden for New Requirements | Different workflow than Support tickets; release planning doesn't need categorization | — Pending |
| Inline status updates via dropdown | Eliminates navigation to ticket detail; SPOC/Assignee primary workflow improvement | — Pending |
| Font sizes use "good UX judgment" | No specific pixel values provided; optimize for readability and information density | — Pending |
| Add Subcategory dialog styling only | Functional requirements met; consistency with design system | — Pending |

---
*Last updated: 2026-01-19 after initialization*
