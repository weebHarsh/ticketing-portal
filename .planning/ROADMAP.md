# Roadmap: Ticketing Portal Enhancements

## Overview

This roadmap enhances the existing ticketing portal to support release planning for New Requirements tickets and improve SPOC/Assignee workflow efficiency through better table UX and inline status updates. The journey starts with master data foundation, adds release planning capabilities, optimizes the My Tickets table for quick scanning, enables inline status editing, differentiates ticket type behaviors, and adds closure audit trails.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Master Data Foundation** - Business Unit SPOC and Project Names management
- [ ] **Phase 2: Release Planning Integration** - Connect projects to ticket creation and display
- [ ] **Phase 3: Table Display Enhancements** - My Tickets UX improvements (columns, fonts, layout)
- [ ] **Phase 4: Inline Status Updates** - Quick status editing without navigation
- [ ] **Phase 5: Ticket Type Differentiation** - Different fields for Support vs New Requirements
- [ ] **Phase 6: Audit Trail** - Track and display ticket closure information

## Phase Details

### Phase 1: Master Data Foundation
**Goal**: Admin can manage Business Unit SPOCs and Project Names with release dates
**Depends on**: Nothing (first phase)
**Requirements**: MAST-01, MAST-02, MAST-04, MAST-05, MAST-06, MAST-07, MAST-08
**Success Criteria** (what must be TRUE):
  1. Admin can add SPOC name to each Business Unit Group
  2. Admin can view list of projects with estimated release dates
  3. Admin can create new project with name and release date
  4. Admin can edit existing project's name and release date
  5. Admin can delete projects from the list
**Plans**: TBD

Plans:
- [ ] 01-01: [To be planned]

### Phase 2: Release Planning Integration
**Goal**: New Requirements tickets link to projects and display release information
**Depends on**: Phase 1 (needs Project Names master data)
**Requirements**: REL-02, REL-03, REL-04, REL-05, REL-06, DASH-01, DASH-02, DASH-03
**Success Criteria** (what must be TRUE):
  1. User creating New Requirements ticket sees Project Name dropdown with all projects plus "Others"
  2. Estimated Release Date auto-fills when project selected (blank for "Others")
  3. My Tickets table displays Project Name and Release Date for New Requirements (2-line mode)
  4. Dashboard auto-populates SPOC name based on Business Unit selection (remains editable)
  5. Support ticket workflow unchanged
**Plans**: TBD

Plans:
- [ ] 02-01: [To be planned]

### Phase 3: Table Display Enhancements
**Goal**: My Tickets table is easier to scan with better typography and column organization
**Depends on**: Nothing (independent UX improvements)
**Requirements**: TBL-01, TBL-02, TBL-03, TBL-04, TBL-05, TBL-06, TBL-07, TBL-08
**Success Criteria** (what must be TRUE):
  1. All column headers display with proper capitalization (first letter capital, rest lowercase)
  2. Table row text uses larger, more readable font
  3. Tkt ID column shows Ticket ID (line 1) and Type (line 2) before Status column
  4. SPOC displayed as separate column positioned before Assignee column
  5. Description shows full text in tooltip on mouse hover
  6. Export button and My Team filter on same line
  7. "+ New Ticket" button removed from My Tickets screen
**Plans**: TBD

Plans:
- [ ] 03-01: [To be planned]

### Phase 4: Inline Status Updates
**Goal**: SPOC and Assignees can update ticket status directly from table without opening ticket
**Depends on**: Phase 3 (builds on table display changes)
**Requirements**: EDIT-01, EDIT-02, EDIT-03, EDIT-04
**Success Criteria** (what must be TRUE):
  1. SPOC sees status dropdown in each ticket row
  2. Assignee sees status dropdown in each ticket row
  3. Status dropdown offers Open, Closed, On-Hold options
  4. Status change saves immediately without page refresh or navigation
**Plans**: TBD

Plans:
- [ ] 04-01: [To be planned]

### Phase 5: Ticket Type Differentiation
**Goal**: New Requirements and Support tickets show appropriate fields for their workflow
**Depends on**: Phase 2 (needs release planning)
**Requirements**: TYPE-01, TYPE-02, TYPE-03, TYPE-04, TYPE-05, TYPE-06, MAST-03
**Success Criteria** (what must be TRUE):
  1. New Requirements ticket form hides Category, Subcategory, Estimated Duration fields
  2. New Requirements ticket form displays Description field blank and editable
  3. New Requirements reports show Title column instead of Category/Subcategory
  4. Support tickets display all existing fields unchanged
  5. Add Subcategory dialog uses consistent styling with other dialogs
**Plans**: TBD

Plans:
- [ ] 05-01: [To be planned]

### Phase 6: Audit Trail
**Goal**: Users can see who closed each ticket and when
**Depends on**: Nothing (independent enhancement)
**Requirements**: AUD-01, AUD-02, AUD-03, AUD-04, REL-01
**Success Criteria** (what must be TRUE):
  1. System automatically records user ID when ticket status changes to Closed
  2. System automatically records timestamp when ticket status changes to Closed
  3. Ticket detail view shows audit log with closure information (who, when)
  4. Audit log accessible from ticket detail page
**Plans**: TBD

Plans:
- [ ] 06-01: [To be planned]

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Master Data Foundation | 0/TBD | Not started | - |
| 2. Release Planning Integration | 0/TBD | Not started | - |
| 3. Table Display Enhancements | 0/TBD | Not started | - |
| 4. Inline Status Updates | 0/TBD | Not started | - |
| 5. Ticket Type Differentiation | 0/TBD | Not started | - |
| 6. Audit Trail | 0/TBD | Not started | - |

---
*Roadmap created: 2026-01-20*
*Last updated: 2026-01-20*
