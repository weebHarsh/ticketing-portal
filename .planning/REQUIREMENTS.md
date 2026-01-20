# Requirements: Ticketing Portal Enhancements

**Defined:** 2026-01-19
**Core Value:** SPOC and Assignees can quickly update ticket status and track release planning without navigating away from the My Tickets screen.

## v1 Requirements

### Release Planning

- [ ] **REL-01**: Admin can manage project names and estimated release dates in Master Data
- [ ] **REL-02**: New Requirements ticket creation form displays Project Name dropdown
- [ ] **REL-03**: Project Name dropdown includes all projects from Master Data plus "Others" option
- [ ] **REL-04**: Estimated Release Date auto-fills based on selected Project Name
- [ ] **REL-05**: Estimated Release Date remains blank when "Others" is selected
- [ ] **REL-06**: My Tickets table displays Project Name and Release Date column (2-line mode)

### Table Display

- [ ] **TBL-01**: All table column headers display with first letter capital, rest lowercase
- [ ] **TBL-02**: Table row text uses larger, more readable font size
- [ ] **TBL-03**: Combined Tkt ID column displays Ticket ID (line 1) and Type (line 2)
- [ ] **TBL-04**: Tkt ID column positioned before Status column in table
- [ ] **TBL-05**: SPOC displayed as separate column positioned before Assignee column
- [ ] **TBL-06**: Description field shows tooltip with complete text on mouse hover
- [ ] **TBL-07**: Export button positioned on same line as My Team filter
- [ ] **TBL-08**: "+ New Ticket" button removed from My Tickets screen

### Inline Editing

- [ ] **EDIT-01**: SPOC can update ticket status via dropdown directly in table row
- [ ] **EDIT-02**: Assignee can update ticket status via dropdown directly in table row
- [ ] **EDIT-03**: Status dropdown offers Open, Closed, On-Hold options
- [ ] **EDIT-04**: Status change saves immediately without opening ticket detail

### Ticket Type Fields

- [ ] **TYPE-01**: New Requirements tickets hide Category field (not required)
- [ ] **TYPE-02**: New Requirements tickets hide Subcategory field (not required)
- [ ] **TYPE-03**: New Requirements tickets hide Estimated Duration field (not required)
- [ ] **TYPE-04**: New Requirements tickets display Description field blank and editable
- [ ] **TYPE-05**: New Requirements reports display Title column instead of Category/Subcategory
- [ ] **TYPE-06**: Support tickets continue to display all existing fields unchanged

### Master Data

- [ ] **MAST-01**: Business Unit Group management includes SPOC name field
- [ ] **MAST-02**: SPOC name field is editable in Business Unit Group form
- [ ] **MAST-03**: Add Subcategory dialog uses consistent styling with other dialogs
- [ ] **MAST-04**: Master Data includes Project Names tab
- [ ] **MAST-05**: Project Names tab displays list of projects with release dates
- [ ] **MAST-06**: Admin can add new project with name and estimated release date
- [ ] **MAST-07**: Admin can edit existing project name and release date
- [ ] **MAST-08**: Admin can delete projects from Project Names list

### Audit Trail

- [ ] **AUD-01**: System records user ID when ticket status changes to Closed
- [ ] **AUD-02**: System records timestamp when ticket status changes to Closed
- [ ] **AUD-03**: Closure information (who, when) displayed in ticket audit log
- [ ] **AUD-04**: Audit log accessible from ticket detail view

### Dashboard

- [ ] **DASH-01**: SPOC name auto-populates when Business Unit Group is selected on dashboard
- [ ] **DASH-02**: Auto-populated SPOC name remains editable by user
- [ ] **DASH-03**: SPOC auto-population applies to Support ticket type on dashboard

## v2 Requirements

Deferred to future releases:

### Testing & Quality
- **TEST-01**: Add automated test coverage for Server Actions
- **TEST-02**: Add E2E tests for critical user workflows
- **TEST-03**: Fix TypeScript build errors and remove ignoreBuildErrors flag

### Performance
- **PERF-01**: Implement database-level filtering instead of client-side filtering
- **PERF-02**: Add pagination to My Tickets table
- **PERF-03**: Implement virtual scrolling for large ticket lists

### BRD Features
- **BRD-01**: Duplicate ticket function for quick ticket creation
- **BRD-02**: Soft delete functionality with visual indication
- **BRD-03**: Customer portal integration with customer_log_id linking

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile app | Web-first strategy, mobile not current priority |
| Real-time collaboration | Added complexity, current async workflow sufficient |
| Advanced release planning (sprints, roadmaps) | Basic project/release tracking meets current needs |
| Bulk ticket operations | Not requested, single-ticket workflow adequate |
| Custom ticket fields | Fixed schema meets business requirements |
| API for external integrations | No external system integration needs identified |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (To be filled by roadmapper) | | |

**Coverage:**
- v1 requirements: 33 total
- Mapped to phases: 0
- Unmapped: 33 ⚠️

---
*Requirements defined: 2026-01-19*
*Last updated: 2026-01-19 after initial definition*
