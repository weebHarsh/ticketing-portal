"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "./auth"

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
    const values: any[] = []

    let query = `
      SELECT
        t.*,
        u.full_name as creator_name,
        a.full_name as assignee_name,
        spoc.full_name as spoc_name,
        c.name as category_name,
        sc.name as subcategory_name,
        bug.name as group_name,
        (SELECT COUNT(*) FROM attachments att WHERE att.ticket_id = t.id) as attachment_count
      FROM tickets t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN users a ON t.assigned_to = a.id
      LEFT JOIN users spoc ON t.spoc_user_id = spoc.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN subcategories sc ON t.subcategory_id = sc.id
      LEFT JOIN business_unit_groups bug ON t.business_unit_group_id = bug.id
      WHERE 1=1
    `

    // Exclude soft-deleted tickets by default
    if (!filters?.includeDeleted) {
      query += ` AND (t.is_deleted IS NULL OR t.is_deleted = FALSE)`
    }

    if (filters?.status && filters.status !== "all") {
      values.push(filters.status)
      query += ` AND t.status = $${values.length}`
    }

    if (filters?.type && filters.type !== "all") {
      values.push(filters.type)
      query += ` AND t.ticket_type = $${values.length}`
    }

    if (filters?.assignee) {
      values.push(filters.assignee)
      query += ` AND t.assigned_to = $${values.length}`
    }

    // Universal search across multiple fields
    if (filters?.search) {
      const searchValue = `%${filters.search}%`
      values.push(searchValue, searchValue, searchValue, searchValue, searchValue, searchValue)
      query += ` AND (
        t.title ILIKE $${values.length - 5} OR
        t.ticket_id ILIKE $${values.length - 4} OR
        t.description ILIKE $${values.length - 3} OR
        u.full_name ILIKE $${values.length - 2} OR
        a.full_name ILIKE $${values.length - 1} OR
        c.name ILIKE $${values.length}
      )`
    }

    if (filters?.dateFrom) {
      values.push(filters.dateFrom)
      query += ` AND t.created_at >= $${values.length}`
    }

    if (filters?.dateTo) {
      values.push(filters.dateTo)
      query += ` AND t.created_at <= $${values.length}`
    }

    // My Team filter - show tickets where team members are creator OR assignee
    if (filters?.myTeam && filters?.userId) {
      values.push(filters.userId)
      query += ` AND (
        t.created_by IN (
          SELECT tm2.user_id FROM team_members tm1
          JOIN team_members tm2 ON tm1.team_id = tm2.team_id
          WHERE tm1.user_id = $${values.length}
        )
        OR t.assigned_to IN (
          SELECT tm2.user_id FROM team_members tm1
          JOIN team_members tm2 ON tm1.team_id = tm2.team_id
          WHERE tm1.user_id = $${values.length}
        )
      )`
    }

    query += ` ORDER BY t.created_at DESC`

    const tickets = await sql.query(query, values)
    return { success: true, data: tickets.rows || tickets }
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
        a.email as assignee_email
      FROM tickets t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN users a ON t.assigned_to = a.id
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
  projectName: string
  categoryId: number
  subcategoryId: number | null
  title: string
  description: string
  estimatedDuration: string
  assigneeId: number
  productReleaseName: string
}) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !currentUser.id) {
      return { success: false, error: "User not authenticated" }
    }

    const dateStr = new Date().toISOString().slice(0, 7).replace("-", "")
    const randomNum = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, "0")
    const ticketId = `TKT-${dateStr}-${randomNum}`

    const result = await sql`
      INSERT INTO tickets (
        ticket_id, title, description, ticket_type, priority,
        status, created_by, assigned_to,
        business_unit_group_id, project_name, category_id, subcategory_id,
        estimated_duration, product_release_name
      )
      VALUES (
        ${ticketId},
        ${data.title},
        ${data.description},
        ${data.ticketType},
        ${"medium"},
        ${"open"},
        ${currentUser.id},
        ${data.assigneeId},
        ${data.businessUnitGroupId},
        ${data.projectName || null},
        ${data.categoryId},
        ${data.subcategoryId},
        ${data.estimatedDuration},
        ${data.productReleaseName || null}
      )
      RETURNING *
    `

    revalidatePath("/dashboard")
    revalidatePath("/tickets")

    return { success: true, data: result[0] }
  } catch (error) {
    console.error("[v0] Error creating ticket:", error)
    return { success: false, error: "Failed to create ticket" }
  }
}

export async function updateTicketStatus(ticketId: number, status: string) {
  try {
    await sql`
      UPDATE tickets 
      SET status = ${status}, 
          updated_at = CURRENT_TIMESTAMP,
          resolved_at = CASE WHEN ${status} = 'closed' THEN CURRENT_TIMESTAMP ELSE resolved_at END
      WHERE id = ${ticketId}
    `

    revalidatePath("/dashboard")
    revalidatePath("/tickets")

    return { success: true }
  } catch (error) {
    console.error("[v0] Error updating ticket status:", error)
    return { success: false, error: "Failed to update ticket status" }
  }
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
    await sql`
      UPDATE tickets
      SET is_deleted = FALSE, deleted_at = NULL
      WHERE id = ${ticketId}
    `

    revalidatePath("/tickets")
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
    await sql`
      UPDATE tickets
      SET assigned_to = ${assigneeId}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${ticketId}
    `

    revalidatePath("/tickets")
    revalidatePath(`/tickets/${ticketId}`)

    return { success: true }
  } catch (error) {
    console.error("[v0] Error updating ticket assignee:", error)
    return { success: false, error: "Failed to update assignee" }
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
