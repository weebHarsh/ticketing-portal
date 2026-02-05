"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "./auth"
import { sendSpocNotificationEmail, sendAssignmentEmail, sendStatusChangeEmail } from "@/lib/email"

// Helper function to add audit log entry
async function addAuditLog(params: {
  ticketId: number
  actionType: string
  oldValue: string | null
  newValue: string | null
  performedBy: number | null
  performedByName: string | null
  notes?: string
}) {
  await sql`
    INSERT INTO ticket_audit_log (ticket_id, action_type, old_value, new_value, performed_by, performed_by_name, notes)
    VALUES (${params.ticketId}, ${params.actionType}, ${params.oldValue}, ${params.newValue}, ${params.performedBy}, ${params.performedByName}, ${params.notes || null})
  `
}

// Get audit log for a ticket
export async function getTicketAuditLog(ticketId: number) {
  try {
    const result = await sql`
      SELECT *
      FROM ticket_audit_log
      WHERE ticket_id = ${ticketId}
      ORDER BY created_at DESC
    `
    return { success: true, data: result }
  } catch (error) {
    console.error("[v0] Error fetching ticket audit log:", error)
    return { success: false, error: "Failed to fetch audit log", data: [] }
  }
}

export async function getTickets(filters?: {
  status?: string
  assignee?: string
  type?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  includeDeleted?: boolean
  myTeam?: boolean
  userId?: number
}) {
  try {
    // Fetch all non-deleted tickets - filtering done client-side for flexibility
    const tickets = await sql`
      SELECT
        t.*,
        u.full_name as creator_name,
        a.full_name as assignee_name,
        spoc.full_name as spoc_name,
        c.name as category_name,
        sc.name as subcategory_name,
        bug.name as group_name,
        p.name as project_name,
        closer.full_name as closed_by_name,
        holder.full_name as hold_by_name,
        spoc_bug.name as spoc_group_name,
        assignee_bug.name as assignee_group_name,
        parent_t.ticket_number as parent_ticket_number,
        (SELECT COUNT(*) FROM attachments att WHERE att.ticket_id = t.id) as attachment_count
      FROM tickets t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN users a ON t.assigned_to = a.id
      LEFT JOIN users spoc ON t.spoc_user_id = spoc.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN subcategories sc ON t.subcategory_id = sc.id
      LEFT JOIN business_unit_groups bug ON t.business_unit_group_id = bug.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users closer ON t.closed_by = closer.id
      LEFT JOIN users holder ON t.hold_by = holder.id
      LEFT JOIN business_unit_groups spoc_bug ON spoc.business_unit_group_id = spoc_bug.id
      LEFT JOIN business_unit_groups assignee_bug ON a.business_unit_group_id = assignee_bug.id
      LEFT JOIN tickets parent_t ON t.parent_ticket_id = parent_t.id
      WHERE (t.is_deleted IS NULL OR t.is_deleted = FALSE)
      ORDER BY t.created_at DESC
    `

    // Apply filters in JavaScript
    let filteredTickets = [...tickets]

    if (filters?.status && filters.status !== "all") {
      filteredTickets = filteredTickets.filter(t => t.status === filters.status)
    }

    if (filters?.type && filters.type !== "all") {
      filteredTickets = filteredTickets.filter(t => t.ticket_type === filters.type)
    }

    if (filters?.assignee) {
      const assigneeId = parseInt(filters.assignee)
      filteredTickets = filteredTickets.filter(t => t.assigned_to === assigneeId)
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      filteredTickets = filteredTickets.filter(t =>
        t.title?.toLowerCase().includes(searchLower) ||
        t.ticket_id?.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower) ||
        t.creator_name?.toLowerCase().includes(searchLower) ||
        t.assignee_name?.toLowerCase().includes(searchLower) ||
        t.category_name?.toLowerCase().includes(searchLower)
      )
    }

    if (filters?.dateFrom) {
      const fromDate = new Date(filters.dateFrom)
      filteredTickets = filteredTickets.filter(t => new Date(t.created_at) >= fromDate)
    }

    if (filters?.dateTo) {
      const toDate = new Date(filters.dateTo)
      filteredTickets = filteredTickets.filter(t => new Date(t.created_at) <= toDate)
    }

    return { success: true, data: filteredTickets }
  } catch (error) {
    console.error("[v0] Error fetching tickets:", error)
    return { success: false, error: "Failed to fetch tickets" }
  }
}

export async function getTicketById(id: number) {
  try {
    if (isNaN(id) || !Number.isInteger(id) || id <= 0) {
      return { success: false, error: "Invalid ticket ID" }
    }

    const ticketResult = await sql`
      SELECT
        t.*,
        u.full_name as creator_name,
        u.email as creator_email,
        a.full_name as assignee_name,
        a.email as assignee_email,
        c.full_name as closed_by_name
      FROM tickets t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN users a ON t.assigned_to = a.id
      LEFT JOIN users c ON t.closed_by = c.id
      WHERE t.id = ${id}
    `

    if (ticketResult.length === 0) {
      return { success: false, error: "Ticket not found" }
    }

    const ticket = ticketResult[0]

    const commentsResult = await sql`
      SELECT c.*, u.full_name as user_name, u.avatar_url
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.ticket_id = ${id}
      ORDER BY c.created_at ASC
    `

    const attachmentsResult = await sql`
      SELECT a.*, u.full_name as uploader_name
      FROM attachments a
      LEFT JOIN users u ON a.uploaded_by = u.id
      WHERE a.ticket_id = ${id}
      ORDER BY a.created_at DESC
    `

    return {
      success: true,
      data: {
        ...ticket,
        comments: commentsResult,
        attachments: attachmentsResult,
      },
    }
  } catch (error) {
    console.error("[v0] Error fetching ticket:", error)
    return { success: false, error: "Failed to fetch ticket" }
  }
}

export async function createTicket(data: {
  ticketType: string
  businessUnitGroupId: number
  projectName?: string
  projectId?: number | null
  categoryId: number | null
  subcategoryId: number | null
  title: string
  description: string
  estimatedDuration: string
  spocId: number
  productReleaseName?: string
  estimatedReleaseDate?: string | null
}) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !currentUser.id) {
      return { success: false, error: "User not authenticated" }
    }

    // Get next sequential ticket number
    const maxResult = await sql`SELECT COALESCE(MAX(ticket_number), 0) as max_num FROM tickets`
    const nextTicketNumber = (maxResult[0]?.max_num || 0) + 1

    const dateStr = new Date().toISOString().slice(0, 7).replace("-", "")
    const randomNum = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, "0")
    const ticketId = `TKT-${dateStr}-${randomNum}`

    const result = await sql`
      INSERT INTO tickets (
        ticket_id, ticket_number, title, description, ticket_type, priority,
        status, created_by, assigned_to, spoc_user_id,
        business_unit_group_id, project_name, project_id, category_id, subcategory_id,
        estimated_duration, product_release_name, estimated_release_date
      )
      VALUES (
        ${ticketId},
        ${nextTicketNumber},
        ${data.title},
        ${data.description},
        ${data.ticketType},
        ${"medium"},
        ${"open"},
        ${currentUser.id},
        ${null},
        ${data.spocId},
        ${data.businessUnitGroupId},
        ${data.projectName || null},
        ${data.projectId || null},
        ${data.categoryId || null},
        ${data.subcategoryId || null},
        ${data.estimatedDuration || null},
        ${data.productReleaseName || null},
        ${data.estimatedReleaseDate || null}
      )
      RETURNING *
    `

    revalidatePath("/dashboard")
    revalidatePath("/tickets")

    // Log ticket creation to audit trail
    await addAuditLog({
      ticketId: result[0].id,
      actionType: 'created',
      oldValue: null,
      newValue: `Ticket #${result[0].ticket_number} created`,
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email,
    })

    // Send email notification to SPOC
    if (data.spocId) {
      try {
        const spocResult = await sql`
          SELECT u.email, u.full_name, bug.name as group_name
          FROM users u
          LEFT JOIN business_unit_groups bug ON u.business_unit_group_id = bug.id
          WHERE u.id = ${data.spocId}
        `
        if (spocResult.length > 0) {
          const spoc = spocResult[0]
          await sendSpocNotificationEmail({
            spocEmail: spoc.email,
            spocName: spoc.full_name,
            ticketId: `#${result[0].ticket_number}`,
            ticketDbId: result[0].id,
            ticketTitle: data.title,
            description: data.description,
            creatorName: currentUser.full_name || currentUser.email,
            creatorGroup: currentUser.group_name || 'Unknown Group',
          })
        }
      } catch (emailError) {
        console.error("[Email] Failed to send SPOC notification:", emailError)
        // Don't fail ticket creation if email fails
      }
    }

    return { success: true, data: result[0] }
  } catch (error) {
    console.error("[v0] Error creating ticket:", error)
    return { success: false, error: "Failed to create ticket" }
  }
}

export async function updateTicketStatus(ticketId: number, status: string, remarks?: string) {
  try {
    const currentUser = await getCurrentUser()

    // Get ticket info before update
    const ticketBefore = await sql`
      SELECT t.*, u.full_name as creator_name, u.email as creator_email,
             a.full_name as assignee_name, a.email as assignee_email,
             s.full_name as spoc_name, s.email as spoc_email
      FROM tickets t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN users a ON t.assigned_to = a.id
      LEFT JOIN users s ON t.spoc_user_id = s.id
      WHERE t.id = ${ticketId}
    `
    const oldStatus = ticketBefore[0]?.status

    await sql`
      UPDATE tickets
      SET status = ${status},
          updated_at = CURRENT_TIMESTAMP,
          status_remarks = ${remarks || null},
          resolved_at = CASE WHEN ${status} IN ('closed', 'resolved') THEN CURRENT_TIMESTAMP ELSE resolved_at END,
          resolved_by = CASE WHEN ${status} = 'resolved' THEN ${currentUser?.id || null} ELSE resolved_by END,
          closed_by = CASE WHEN ${status} = 'closed' THEN ${currentUser?.id || null} ELSE closed_by END,
          closed_at = CASE WHEN ${status} = 'closed' THEN CURRENT_TIMESTAMP ELSE closed_at END,
          hold_by = CASE WHEN ${status} IN ('hold', 'on-hold') THEN ${currentUser?.id || null} ELSE hold_by END,
          hold_at = CASE WHEN ${status} IN ('hold', 'on-hold') THEN CURRENT_TIMESTAMP ELSE hold_at END,
          returned_by = CASE WHEN ${status} = 'returned' THEN ${currentUser?.id || null} ELSE returned_by END,
          returned_at = CASE WHEN ${status} = 'returned' THEN CURRENT_TIMESTAMP ELSE returned_at END
      WHERE id = ${ticketId}
    `

    revalidatePath("/dashboard")
    revalidatePath("/tickets")

    // Log the status change to audit trail with remarks
    if (oldStatus !== status) {
      await addAuditLog({
        ticketId,
        actionType: `status_change_${status}`,
        oldValue: oldStatus,
        newValue: status,
        performedBy: currentUser?.id || null,
        performedByName: currentUser?.full_name || 'System',
        notes: remarks,
      })
    }

    // Send email notifications for status change
    if (ticketBefore.length > 0 && oldStatus !== status) {
      const ticket = ticketBefore[0]
      const changedByName = currentUser?.full_name || 'System'

      // Notify creator if they didn't make the change
      if (ticket.creator_email && ticket.created_by !== currentUser?.id) {
        sendStatusChangeEmail({
          recipientEmail: ticket.creator_email,
          recipientName: ticket.creator_name,
          ticketId: `#${ticket.ticket_number}`,
          ticketDbId: ticketId,
          ticketTitle: ticket.title,
          oldStatus,
          newStatus: status,
          changedByName,
          remarks,
        }).catch(err => console.error('[Email] Status change email failed:', err))
      }

      // Notify assignee if different from creator and they didn't make the change
      if (ticket.assignee_email && ticket.assigned_to !== ticket.created_by && ticket.assigned_to !== currentUser?.id) {
        sendStatusChangeEmail({
          recipientEmail: ticket.assignee_email,
          recipientName: ticket.assignee_name,
          ticketId: `#${ticket.ticket_number}`,
          ticketDbId: ticketId,
          ticketTitle: ticket.title,
          oldStatus,
          newStatus: status,
          changedByName,
          remarks,
        }).catch(err => console.error('[Email] Status change email failed:', err))
      }
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Error updating ticket status:", error)
    return { success: false, error: "Failed to update ticket status" }
  }
}

// New function for status change with mandatory remarks
export async function updateTicketStatusWithRemarks(
  ticketId: number,
  status: string,
  remarks: string
) {
  // Validate remarks
  if (!remarks || remarks.trim().length === 0) {
    return { success: false, error: "Remarks are required for status changes" }
  }

  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return { success: false, error: "User not authenticated" }
  }

  // Get ticket to validate permissions
  const ticketResult = await sql`
    SELECT id, created_by, assigned_to, spoc_user_id, status
    FROM tickets
    WHERE id = ${ticketId}
  `

  if (ticketResult.length === 0) {
    return { success: false, error: "Ticket not found" }
  }

  const ticket = ticketResult[0]
  const userId = currentUser.id
  const userRole = currentUser.role as 'admin' | 'user' | 'agent'

  // Import status permissions dynamically to avoid circular imports
  const { canChangeToStatus, isValidTransition, TICKET_STATUSES } = await import('@/lib/constants/ticket-statuses')

  // Check if the status transition is valid
  if (!isValidTransition(ticket.status, status as any)) {
    return { success: false, error: `Cannot change status from ${ticket.status} to ${status}` }
  }

  // Check if user has permission to change to this status
  if (!canChangeToStatus(userRole, userId, ticket, status as any)) {
    return { success: false, error: "You don't have permission to change to this status" }
  }

  // Proceed with the status update
  return updateTicketStatus(ticketId, status, remarks.trim())
}

export async function addComment(ticketId: number, content: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !currentUser.id) {
      return { success: false, error: "User not authenticated" }
    }

    const result = await sql`
      INSERT INTO comments (ticket_id, user_id, content)
      VALUES (${ticketId}, ${currentUser.id}, ${content})
      RETURNING *
    `

    await sql`
      UPDATE tickets
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = ${ticketId}
    `

    revalidatePath("/tickets")

    return { success: true, data: result[0] }
  } catch (error) {
    console.error("[v0] Error adding comment:", error)
    return { success: false, error: "Failed to add comment" }
  }
}

export async function updateTicket(
  ticketId: number,
  data: {
    title: string
    description: string
    status: string
    priority: string
    businessUnitGroupId: number
    categoryId: number
    subcategoryId: number | null
    assigneeId: number
    estimatedDuration: string
  },
) {
  try {
    const result = await sql`
      UPDATE tickets 
      SET 
        title = ${data.title},
        description = ${data.description},
        status = ${data.status},
        priority = ${data.priority},
        business_unit_group_id = ${data.businessUnitGroupId},
        category_id = ${data.categoryId},
        subcategory_id = ${data.subcategoryId},
        assigned_to = ${data.assigneeId},
        estimated_duration = ${data.estimatedDuration},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${ticketId}
      RETURNING *
    `

    revalidatePath("/tickets")
    revalidatePath(`/tickets/${ticketId}`)

    return { success: true, data: result[0] }
  } catch (error) {
    console.error("[v0] Error updating ticket:", error)
    return { success: false, error: "Failed to update ticket" }
  }
}

export async function softDeleteTicket(ticketId: number) {
  try {
    await sql`
      UPDATE tickets
      SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP
      WHERE id = ${ticketId}
    `

    revalidatePath("/tickets")
    revalidatePath("/dashboard")

    return { success: true }
  } catch (error) {
    console.error("[v0] Error soft deleting ticket:", error)
    return { success: false, error: "Failed to delete ticket" }
  }
}

export async function restoreTicket(ticketId: number) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "User not authenticated" }
    }

    // Only admin can restore tickets
    if (currentUser.role !== 'admin') {
      return { success: false, error: "Only admins can restore deleted tickets" }
    }

    // Restore ticket - set is_deleted to false and status to open
    await sql`
      UPDATE tickets
      SET
        is_deleted = FALSE,
        status = 'open',
        deleted_at = NULL,
        deleted_by = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${ticketId}
    `

    // Add audit log entry
    await sql`
      INSERT INTO ticket_audit_log (
        ticket_id, action_type, old_value, new_value,
        performed_by, performed_by_name, notes
      ) VALUES (
        ${ticketId},
        'ticket_restored',
        'deleted',
        'open',
        ${currentUser.id},
        ${currentUser.full_name},
        'Ticket restored by admin'
      )
    `

    revalidatePath("/tickets")
    revalidatePath("/admin/tickets")
    revalidatePath("/dashboard")

    return { success: true }
  } catch (error) {
    console.error("[v0] Error restoring ticket:", error)
    return { success: false, error: "Failed to restore ticket" }
  }
}

export async function getUsers() {
  try {
    const result = await sql`
      SELECT id, full_name, email, role
      FROM users
      ORDER BY full_name
    `
    return { success: true, data: result }
  } catch (error) {
    console.error("[v0] Error fetching users:", error)
    return { success: false, error: "Failed to fetch users", data: [] }
  }
}

export async function updateTicketAssignee(ticketId: number, assigneeId: number) {
  try {
    const currentUser = await getCurrentUser()

    // Get ticket info before update including old assignee name
    const ticketBefore = await sql`
      SELECT t.ticket_id, t.ticket_number, t.title, t.description, t.priority, t.assigned_to,
             a.full_name as old_assignee_name
      FROM tickets t
      LEFT JOIN users a ON t.assigned_to = a.id
      WHERE t.id = ${ticketId}
    `

    await sql`
      UPDATE tickets
      SET assigned_to = ${assigneeId}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${ticketId}
    `

    revalidatePath("/tickets")
    revalidatePath(`/tickets/${ticketId}`)

    // Send email notification to new assignee and log audit
    if (ticketBefore.length > 0) {
      const ticket = ticketBefore[0]
      const oldAssigneeId = ticket.assigned_to

      // Only process if assignee actually changed
      if (oldAssigneeId !== assigneeId) {
        // Get new assignee name for audit log
        const newAssigneeResult = await sql`
          SELECT email, full_name FROM users WHERE id = ${assigneeId}
        `
        const newAssigneeName = newAssigneeResult.length > 0 ? newAssigneeResult[0].full_name : null

        // Log to audit trail
        await addAuditLog({
          ticketId,
          actionType: 'assignment_change',
          oldValue: ticket.old_assignee_name || 'Unassigned',
          newValue: newAssigneeName || 'Unassigned',
          performedBy: currentUser?.id || null,
          performedByName: currentUser?.full_name || 'System',
        })

        // Send email notification
        if (newAssigneeResult.length > 0) {
          const assignee = newAssigneeResult[0]
          try {
            await sendAssignmentEmail({
              assigneeEmail: assignee.email,
              assigneeName: assignee.full_name,
              ticketId: `#${ticket.ticket_number}`,
              ticketDbId: ticketId,
              ticketTitle: ticket.title,
              description: ticket.description || '',
              priority: ticket.priority,
              assignedByName: currentUser?.full_name || 'System',
            })
          } catch (emailError) {
            console.error("[Email] Failed to send assignment email:", emailError)
            // Don't fail the update if email fails
          }
        }
      }
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Error updating ticket assignee:", error)
    return { success: false, error: "Failed to update assignee" }
  }
}

export async function updateTicketProject(ticketId: number, projectId: number | null) {
  try {
    const currentUser = await getCurrentUser()

    // Get old project name
    const ticketBefore = await sql`
      SELECT t.project_id, p.name as old_project_name
      FROM tickets t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = ${ticketId}
    `

    await sql`
      UPDATE tickets
      SET project_id = ${projectId}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${ticketId}
    `

    // Get new project name and log to audit
    if (ticketBefore.length > 0) {
      const oldProjectId = ticketBefore[0].project_id
      if (oldProjectId !== projectId) {
        let newProjectName = null
        if (projectId) {
          const projectResult = await sql`SELECT name FROM projects WHERE id = ${projectId}`
          newProjectName = projectResult.length > 0 ? projectResult[0].name : null
        }

        await addAuditLog({
          ticketId,
          actionType: 'project_change',
          oldValue: ticketBefore[0].old_project_name || 'None',
          newValue: newProjectName || 'None',
          performedBy: currentUser?.id || null,
          performedByName: currentUser?.full_name || 'System',
        })
      }
    }

    revalidatePath("/tickets")
    revalidatePath(`/tickets/${ticketId}`)

    return { success: true }
  } catch (error) {
    console.error("[v0] Error updating ticket project:", error)
    return { success: false, error: "Failed to update project" }
  }
}

export async function getTeamMembers(userId: number) {
  try {
    const result = await sql`
      SELECT DISTINCT u.id, u.full_name, u.email
      FROM users u
      JOIN team_members tm ON u.id = tm.user_id
      WHERE tm.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = ${userId}
      )
      ORDER BY u.full_name
    `
    return { success: true, data: result }
  } catch (error) {
    console.error("[v0] Error fetching team members:", error)
    return { success: false, error: "Failed to fetch team members", data: [] }
  }
}

// ============================================================================
// Redirect Functionality
// ============================================================================

export async function redirectTicket(params: {
  ticketId: number
  toBusinessGroupId: number
  toSpocId: number
  remarks: string
}) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "User not authenticated" }
    }

    // Validate remarks
    if (!params.remarks || params.remarks.trim().length === 0) {
      return { success: false, error: "Remarks are required for redirecting tickets" }
    }

    // Get ticket details
    const ticketResult = await sql`
      SELECT t.*, bug.name as current_bu_name, spoc.full_name as current_spoc_name
      FROM tickets t
      LEFT JOIN business_unit_groups bug ON t.business_unit_group_id = bug.id
      LEFT JOIN users spoc ON t.spoc_user_id = spoc.id
      WHERE t.id = ${params.ticketId}
    `

    if (ticketResult.length === 0) {
      return { success: false, error: "Ticket not found" }
    }

    const ticket = ticketResult[0]

    // Check permission - only SPOC or admin can redirect
    if (ticket.spoc_user_id !== currentUser.id && currentUser.role !== 'admin') {
      return { success: false, error: "Only SPOC or Admin can redirect tickets" }
    }

    // Get new business group and SPOC names
    const newBuResult = await sql`SELECT name FROM business_unit_groups WHERE id = ${params.toBusinessGroupId}`
    const newSpocResult = await sql`SELECT full_name FROM users WHERE id = ${params.toSpocId}`

    const newBuName = newBuResult.length > 0 ? newBuResult[0].name : 'Unknown'
    const newSpocName = newSpocResult.length > 0 ? newSpocResult[0].full_name : 'Unknown'

    // Insert redirect record
    await sql`
      INSERT INTO ticket_redirects (
        ticket_id, from_business_group_id, to_business_group_id,
        from_spoc_id, to_spoc_id,
        from_business_group_name, to_business_group_name,
        from_spoc_name, to_spoc_name,
        remarks, redirected_by, redirected_by_name
      ) VALUES (
        ${params.ticketId}, ${ticket.business_unit_group_id}, ${params.toBusinessGroupId},
        ${ticket.spoc_user_id}, ${params.toSpocId},
        ${ticket.current_bu_name}, ${newBuName},
        ${ticket.current_spoc_name}, ${newSpocName},
        ${params.remarks.trim()}, ${currentUser.id}, ${currentUser.full_name}
      )
    `

    // Update ticket
    await sql`
      UPDATE tickets
      SET business_unit_group_id = ${params.toBusinessGroupId},
          spoc_user_id = ${params.toSpocId},
          redirect_count = COALESCE(redirect_count, 0) + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${params.ticketId}
    `

    // Add audit log entry
    await addAuditLog({
      ticketId: params.ticketId,
      actionType: 'ticket_redirect',
      oldValue: `BU: ${ticket.current_bu_name || 'None'}, SPOC: ${ticket.current_spoc_name || 'None'}`,
      newValue: `BU: ${newBuName}, SPOC: ${newSpocName}`,
      performedBy: currentUser.id,
      performedByName: currentUser.full_name,
      notes: params.remarks.trim(),
    })

    revalidatePath("/tickets")
    revalidatePath(`/tickets/${params.ticketId}`)

    return { success: true }
  } catch (error) {
    console.error("[v0] Error redirecting ticket:", error)
    return { success: false, error: "Failed to redirect ticket" }
  }
}

export async function getTicketRedirectHistory(ticketId: number) {
  try {
    const result = await sql`
      SELECT *
      FROM ticket_redirects
      WHERE ticket_id = ${ticketId}
      ORDER BY created_at DESC
    `
    return { success: true, data: result }
  } catch (error) {
    console.error("[v0] Error fetching redirect history:", error)
    return { success: false, error: "Failed to fetch redirect history", data: [] }
  }
}

// ============================================================================
// Sub-Ticket Functionality
// ============================================================================

export async function createSubTicket(parentTicketId: number, data: {
  ticketType: string
  businessUnitGroupId: number
  categoryId: number | null
  subcategoryId: number | null
  title: string
  description: string
  estimatedDuration: string
  spocId: number
  assigneeId?: number | null
}) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "User not authenticated" }
    }

    // Get parent ticket to validate permissions
    const parentResult = await sql`
      SELECT t.*, bug.name as bu_name
      FROM tickets t
      LEFT JOIN business_unit_groups bug ON t.business_unit_group_id = bug.id
      WHERE t.id = ${parentTicketId}
    `

    if (parentResult.length === 0) {
      return { success: false, error: "Parent ticket not found" }
    }

    const parentTicket = parentResult[0]

    // Check permission - only SPOC or admin can create sub-tickets
    if (parentTicket.spoc_user_id !== currentUser.id && currentUser.role !== 'admin') {
      return { success: false, error: "Only SPOC or Admin can create sub-tickets" }
    }

    // Generate ticket ID
    const maxResult = await sql`SELECT COALESCE(MAX(ticket_number), 0) as max_num FROM tickets`
    const nextTicketNumber = (maxResult[0]?.max_num || 0) + 1

    const dateStr = new Date().toISOString().slice(0, 7).replace("-", "")
    const randomNum = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, "0")
    const ticketId = `TKT-${dateStr}-${randomNum}`

    // Create sub-ticket with current user (SPOC) as initiator
    const result = await sql`
      INSERT INTO tickets (
        ticket_id, ticket_number, title, description, ticket_type, priority,
        status, created_by, assigned_to, spoc_user_id,
        business_unit_group_id, category_id, subcategory_id,
        estimated_duration, parent_ticket_id
      )
      VALUES (
        ${ticketId},
        ${nextTicketNumber},
        ${data.title},
        ${data.description},
        ${data.ticketType},
        ${"medium"},
        ${"open"},
        ${currentUser.id},
        ${data.assigneeId || null},
        ${data.spocId},
        ${data.businessUnitGroupId},
        ${data.categoryId || null},
        ${data.subcategoryId || null},
        ${data.estimatedDuration || null},
        ${parentTicketId}
      )
      RETURNING *
    `

    revalidatePath("/dashboard")
    revalidatePath("/tickets")
    revalidatePath(`/tickets/${parentTicketId}`)

    // Log sub-ticket creation to audit trail
    await addAuditLog({
      ticketId: result[0].id,
      actionType: 'created',
      oldValue: null,
      newValue: `Sub-ticket #${result[0].ticket_number} created under parent #${parentTicket.ticket_number}`,
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email,
    })

    // Log to parent ticket audit trail
    await addAuditLog({
      ticketId: parentTicketId,
      actionType: 'sub_ticket_created',
      oldValue: null,
      newValue: `Sub-ticket #${result[0].ticket_number} created`,
      performedBy: currentUser.id,
      performedByName: currentUser.full_name || currentUser.email,
    })

    return { success: true, data: result[0] }
  } catch (error) {
    console.error("[v0] Error creating sub-ticket:", error)
    return { success: false, error: "Failed to create sub-ticket" }
  }
}

export async function getChildTickets(parentTicketId: number) {
  try {
    const result = await sql`
      SELECT
        t.*,
        u.full_name as creator_name,
        a.full_name as assignee_name,
        spoc.full_name as spoc_name,
        c.name as category_name,
        sc.name as subcategory_name,
        bug.name as group_name
      FROM tickets t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN users a ON t.assigned_to = a.id
      LEFT JOIN users spoc ON t.spoc_user_id = spoc.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN subcategories sc ON t.subcategory_id = sc.id
      LEFT JOIN business_unit_groups bug ON t.business_unit_group_id = bug.id
      WHERE t.parent_ticket_id = ${parentTicketId}
      AND (t.is_deleted IS NULL OR t.is_deleted = FALSE)
      ORDER BY t.created_at ASC
    `
    return { success: true, data: result }
  } catch (error) {
    console.error("[v0] Error fetching child tickets:", error)
    return { success: false, error: "Failed to fetch child tickets", data: [] }
  }
}

// ============================================================================
// Delete Functionality
// ============================================================================

export async function deleteTicketWithRemarks(ticketId: number, remarks: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "User not authenticated" }
    }

    // Validate remarks
    if (!remarks || remarks.trim().length === 0) {
      return { success: false, error: "Remarks are required for deleting tickets" }
    }

    // Get ticket to validate permissions
    const ticketResult = await sql`
      SELECT id, created_by, status, ticket_number
      FROM tickets
      WHERE id = ${ticketId}
    `

    if (ticketResult.length === 0) {
      return { success: false, error: "Ticket not found" }
    }

    const ticket = ticketResult[0]

    // Only initiator or admin can delete
    if (ticket.created_by !== currentUser.id && currentUser.role !== 'admin') {
      return { success: false, error: "Only the ticket creator or admin can delete this ticket" }
    }

    // Set status to 'deleted' and is_deleted = TRUE
    await sql`
      UPDATE tickets
      SET status = 'deleted',
          is_deleted = TRUE,
          deleted_at = CURRENT_TIMESTAMP,
          status_remarks = ${remarks.trim()},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${ticketId}
    `

    // Add audit log entry
    await addAuditLog({
      ticketId,
      actionType: 'status_change_deleted',
      oldValue: ticket.status,
      newValue: 'deleted',
      performedBy: currentUser.id,
      performedByName: currentUser.full_name,
      notes: remarks.trim(),
    })

    revalidatePath("/tickets")
    revalidatePath("/dashboard")

    return { success: true }
  } catch (error) {
    console.error("[v0] Error deleting ticket:", error)
    return { success: false, error: "Failed to delete ticket" }
  }
}

export async function hardDeleteTicket(ticketId: number) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "User not authenticated" }
    }

    // Only admin can hard delete
    if (currentUser.role !== 'admin') {
      return { success: false, error: "Only admins can permanently delete tickets" }
    }

    // Delete ticket and all related data (cascade)
    await sql`DELETE FROM tickets WHERE id = ${ticketId}`

    revalidatePath("/tickets")
    revalidatePath("/dashboard")

    return { success: true }
  } catch (error) {
    console.error("[v0] Error hard deleting ticket:", error)
    return { success: false, error: "Failed to permanently delete ticket" }
  }
}

// ============================================================================
// Edit Restrictions Check
// ============================================================================

export async function canEditTicket(ticketId: number): Promise<{
  canEdit: boolean
  restrictedToDescription: boolean
  reason?: string
}> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { canEdit: false, restrictedToDescription: false, reason: "User not authenticated" }
    }

    const ticketResult = await sql`
      SELECT id, created_by, assigned_to, spoc_user_id, status
      FROM tickets
      WHERE id = ${ticketId}
    `

    if (ticketResult.length === 0) {
      return { canEdit: false, restrictedToDescription: false, reason: "Ticket not found" }
    }

    const ticket = ticketResult[0]

    // Admin can always edit all fields
    if (currentUser.role === 'admin') {
      return { canEdit: true, restrictedToDescription: false }
    }

    // Check if user is related to the ticket
    const isCreator = ticket.created_by === currentUser.id
    const isAssignee = ticket.assigned_to === currentUser.id
    const isSpoc = ticket.spoc_user_id === currentUser.id

    if (!isCreator && !isAssignee && !isSpoc) {
      return { canEdit: false, restrictedToDescription: false, reason: "You are not authorized to edit this ticket" }
    }

    // If ticket has been assigned, only description can be edited (except by admin)
    if (ticket.assigned_to !== null) {
      return {
        canEdit: true,
        restrictedToDescription: true,
        reason: "Ticket has been assigned. Only description can be edited."
      }
    }

    return { canEdit: true, restrictedToDescription: false }
  } catch (error) {
    console.error("[v0] Error checking edit permissions:", error)
    return { canEdit: false, restrictedToDescription: false, reason: "Failed to check permissions" }
  }
}

// ============================================================================
// Admin Ticket Management
// ============================================================================

export async function getDeletedTickets() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "User not authenticated" }
    }

    // Only admin can view deleted tickets
    if (currentUser.role !== 'admin') {
      return { success: false, error: "Only admins can view deleted tickets" }
    }

    const result = await sql`
      SELECT
        t.id,
        t.ticket_number,
        t.title,
        t.status,
        t.created_at,
        t.deleted_at,
        creator.full_name as creator_name,
        deleter.full_name as deleted_by_name,
        bug.name as business_group
      FROM tickets t
      LEFT JOIN users creator ON t.created_by = creator.id
      LEFT JOIN users deleter ON t.deleted_by = deleter.id
      LEFT JOIN business_unit_groups bug ON t.business_unit_group_id = bug.id
      WHERE t.is_deleted = TRUE OR t.status = 'deleted'
      ORDER BY t.deleted_at DESC NULLS LAST, t.updated_at DESC
    `

    return { success: true, data: result }
  } catch (error) {
    console.error("[v0] Error fetching deleted tickets:", error)
    return { success: false, error: "Failed to fetch deleted tickets" }
  }
}
