// Ticket Status Constants and Permissions

export const TICKET_STATUSES = {
  OPEN: 'open',
  ON_HOLD: 'on-hold',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  RETURNED: 'returned',
  DELETED: 'deleted',
} as const

export type TicketStatus = typeof TICKET_STATUSES[keyof typeof TICKET_STATUSES]

// Define who can change to each status
// Roles: 'initiator' (creator), 'assignee', 'spoc', 'admin'
export const STATUS_PERMISSIONS: Record<TicketStatus, string[]> = {
  [TICKET_STATUSES.OPEN]: ['spoc', 'assignee', 'admin'],
  [TICKET_STATUSES.ON_HOLD]: ['assignee', 'admin'],
  [TICKET_STATUSES.RESOLVED]: ['assignee', 'admin'],
  [TICKET_STATUSES.CLOSED]: ['initiator', 'admin'],
  [TICKET_STATUSES.RETURNED]: ['assignee', 'spoc', 'admin'],
  [TICKET_STATUSES.DELETED]: ['initiator', 'admin'],
}

// Status display configuration
export const STATUS_CONFIG: Record<TicketStatus, {
  label: string
  color: string
  bgColor: string
  borderColor: string
  description: string
}> = {
  [TICKET_STATUSES.OPEN]: {
    label: 'Open',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200',
    description: 'Ticket is open and awaiting action',
  },
  [TICKET_STATUSES.ON_HOLD]: {
    label: 'On Hold',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-200',
    description: 'Ticket is on hold by assignee',
  },
  [TICKET_STATUSES.RESOLVED]: {
    label: 'Resolved',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-200',
    description: 'Ticket has been resolved by assignee',
  },
  [TICKET_STATUSES.CLOSED]: {
    label: 'Closed',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200',
    description: 'Ticket has been closed by initiator',
  },
  [TICKET_STATUSES.RETURNED]: {
    label: 'Returned',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-200',
    description: 'Ticket has been returned for more information',
  },
  [TICKET_STATUSES.DELETED]: {
    label: 'Deleted',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    description: 'Ticket has been soft-deleted',
  },
}

// Valid status transitions
export const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TICKET_STATUSES.OPEN]: [
    TICKET_STATUSES.ON_HOLD,
    TICKET_STATUSES.RESOLVED,
    TICKET_STATUSES.RETURNED,
    TICKET_STATUSES.DELETED,
  ],
  [TICKET_STATUSES.ON_HOLD]: [
    TICKET_STATUSES.OPEN,
    TICKET_STATUSES.RESOLVED,
    TICKET_STATUSES.RETURNED,
    TICKET_STATUSES.DELETED,
  ],
  [TICKET_STATUSES.RESOLVED]: [
    TICKET_STATUSES.OPEN,
    TICKET_STATUSES.CLOSED,
    TICKET_STATUSES.RETURNED,
  ],
  [TICKET_STATUSES.CLOSED]: [
    TICKET_STATUSES.OPEN, // Reopen
  ],
  [TICKET_STATUSES.RETURNED]: [
    TICKET_STATUSES.OPEN,
    TICKET_STATUSES.ON_HOLD,
    TICKET_STATUSES.RESOLVED,
    TICKET_STATUSES.DELETED,
  ],
  [TICKET_STATUSES.DELETED]: [], // Cannot transition from deleted
}

// Helper function to check if a user can change to a status
export function canChangeToStatus(
  currentUserRole: 'admin' | 'user' | 'agent',
  currentUserId: number,
  ticket: {
    created_by: number
    assigned_to: number | null
    spoc_user_id: number | null
  },
  targetStatus: TicketStatus
): boolean {
  // Admin can always change status
  if (currentUserRole === 'admin') {
    return true
  }

  const allowedRoles = STATUS_PERMISSIONS[targetStatus]

  // Check if user is the initiator
  if (allowedRoles.includes('initiator') && ticket.created_by === currentUserId) {
    return true
  }

  // Check if user is the assignee
  if (allowedRoles.includes('assignee') && ticket.assigned_to === currentUserId) {
    return true
  }

  // Check if user is the SPOC
  if (allowedRoles.includes('spoc') && ticket.spoc_user_id === currentUserId) {
    return true
  }

  return false
}

// Helper function to check if a status transition is valid
export function isValidTransition(
  currentStatus: TicketStatus,
  targetStatus: TicketStatus
): boolean {
  const validTransitions = STATUS_TRANSITIONS[currentStatus]
  return validTransitions?.includes(targetStatus) ?? false
}

// Get all status options for a dropdown
export function getStatusOptions(): Array<{ value: TicketStatus; label: string }> {
  return Object.values(TICKET_STATUSES)
    .filter(status => status !== TICKET_STATUSES.DELETED) // Don't show deleted in dropdown
    .map(status => ({
      value: status,
      label: STATUS_CONFIG[status].label,
    }))
}

// Get available status options for a specific ticket and user
export function getAvailableStatusOptions(
  currentStatus: TicketStatus,
  currentUserRole: 'admin' | 'user' | 'agent',
  currentUserId: number,
  ticket: {
    created_by: number
    assigned_to: number | null
    spoc_user_id: number | null
  }
): Array<{ value: TicketStatus; label: string; description: string }> {
  const validTransitions = STATUS_TRANSITIONS[currentStatus] || []

  return validTransitions
    .filter(status => canChangeToStatus(currentUserRole, currentUserId, ticket, status))
    .map(status => ({
      value: status,
      label: STATUS_CONFIG[status].label,
      description: STATUS_CONFIG[status].description,
    }))
}
