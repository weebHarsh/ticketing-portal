"use server"

import { sql } from "@/lib/db"
import { getCurrentUser } from "./auth"

// Get delayed tickets report
export async function getDelayedTicketsReport() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "admin") {
      return { success: false, error: "Admin access required" }
    }

    const result = await sql`
      SELECT
        t.id,
        t.ticket_number,
        t.title,
        t.status,
        t.created_at,
        t.estimated_duration,
        bug.name as business_group,
        u.full_name as creator_name,
        a.full_name as assignee_name,
        spoc.full_name as spoc_name,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.created_at))/3600 as hours_elapsed,
        CASE
          WHEN t.status IN ('closed', 'resolved') THEN
            EXTRACT(EPOCH FROM (COALESCE(t.resolved_at, t.updated_at) - t.created_at))/3600
          ELSE
            EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.created_at))/3600
        END as actual_duration_hours
      FROM tickets t
      LEFT JOIN business_unit_groups bug ON t.business_unit_group_id = bug.id
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN users a ON t.assigned_to = a.id
      LEFT JOIN users spoc ON t.spoc_user_id = spoc.id
      WHERE t.status NOT IN ('closed', 'deleted')
        AND t.estimated_duration IS NOT NULL
        AND (t.is_deleted IS NULL OR t.is_deleted = FALSE)
      ORDER BY hours_elapsed DESC
    `

    // Filter delayed tickets in JavaScript since parsing duration is complex
    const delayedTickets = result.filter((ticket: any) => {
      // Parse estimated_duration (e.g., "48 hr", "2 days", "24 hours")
      const duration = ticket.estimated_duration?.toLowerCase() || ""
      let estimatedHours = 0

      // Try to parse hours
      const hourMatch = duration.match(/(\d+)\s*(hr|hour|hours|h)/i)
      if (hourMatch) {
        estimatedHours = parseInt(hourMatch[1])
      }

      // Try to parse days
      const dayMatch = duration.match(/(\d+)\s*(day|days|d)/i)
      if (dayMatch) {
        estimatedHours = parseInt(dayMatch[1]) * 24
      }

      // Try to parse minutes
      const minMatch = duration.match(/(\d+)\s*(min|minute|minutes|m)/i)
      if (minMatch) {
        estimatedHours = parseInt(minMatch[1]) / 60
      }

      return estimatedHours > 0 && ticket.hours_elapsed > estimatedHours
    })

    return { success: true, data: delayedTickets }
  } catch (error) {
    console.error("[Admin Reports] Error fetching delayed tickets:", error)
    return { success: false, error: "Failed to fetch delayed tickets" }
  }
}

// Get group-level analytics
export async function getGroupLevelAnalytics() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "admin") {
      return { success: false, error: "Admin access required" }
    }

    const result = await sql`
      SELECT
        bug.id as group_id,
        bug.name as business_group,
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN t.status = 'open' THEN 1 END) as open_tickets,
        COUNT(CASE WHEN t.status = 'closed' THEN 1 END) as closed_tickets,
        COUNT(CASE WHEN t.status IN ('on-hold', 'hold') THEN 1 END) as on_hold_tickets,
        COUNT(CASE WHEN t.status = 'resolved' THEN 1 END) as resolved_tickets,
        COUNT(CASE WHEN t.status = 'returned' THEN 1 END) as returned_tickets,
        COUNT(CASE WHEN t.status = 'deleted' OR t.is_deleted = TRUE THEN 1 END) as deleted_tickets,
        AVG(CASE
          WHEN t.status = 'closed' AND t.resolved_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))/3600
        END) as avg_resolution_hours
      FROM tickets t
      LEFT JOIN business_unit_groups bug ON t.business_unit_group_id = bug.id
      WHERE bug.id IS NOT NULL
      GROUP BY bug.id, bug.name
      ORDER BY total_tickets DESC
    `

    return { success: true, data: result }
  } catch (error) {
    console.error("[Admin Reports] Error fetching group analytics:", error)
    return { success: false, error: "Failed to fetch group analytics" }
  }
}

// Get ticket status distribution
export async function getTicketStatusDistribution() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "admin") {
      return { success: false, error: "Admin access required" }
    }

    const result = await sql`
      SELECT
        status,
        COUNT(*) as count
      FROM tickets
      WHERE (is_deleted IS NULL OR is_deleted = FALSE)
      GROUP BY status
      ORDER BY count DESC
    `

    return { success: true, data: result }
  } catch (error) {
    console.error("[Admin Reports] Error fetching status distribution:", error)
    return { success: false, error: "Failed to fetch status distribution" }
  }
}

// Get ticket trend data (tickets created per day for last 30 days)
export async function getTicketTrendData(days: number = 30) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "admin") {
      return { success: false, error: "Admin access required" }
    }

    const result = await sql`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as total_created,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as total_closed
      FROM tickets
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        AND (is_deleted IS NULL OR is_deleted = FALSE)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    return { success: true, data: result }
  } catch (error) {
    console.error("[Admin Reports] Error fetching ticket trend:", error)
    return { success: false, error: "Failed to fetch ticket trend" }
  }
}

// Get user performance metrics
export async function getUserPerformanceMetrics() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "admin") {
      return { success: false, error: "Admin access required" }
    }

    const result = await sql`
      SELECT
        u.id,
        u.full_name,
        u.email,
        bug.name as business_group,
        COUNT(DISTINCT t_assigned.id) as total_assigned,
        COUNT(DISTINCT t_closed.id) as total_closed,
        COUNT(DISTINCT t_spoc.id) as total_as_spoc,
        AVG(CASE
          WHEN t_assigned.status = 'closed' AND t_assigned.resolved_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (t_assigned.resolved_at - t_assigned.created_at))/3600
        END) as avg_resolution_hours
      FROM users u
      LEFT JOIN business_unit_groups bug ON u.business_unit_group_id = bug.id
      LEFT JOIN tickets t_assigned ON t_assigned.assigned_to = u.id AND (t_assigned.is_deleted IS NULL OR t_assigned.is_deleted = FALSE)
      LEFT JOIN tickets t_closed ON t_closed.assigned_to = u.id AND t_closed.status = 'closed' AND (t_closed.is_deleted IS NULL OR t_closed.is_deleted = FALSE)
      LEFT JOIN tickets t_spoc ON t_spoc.spoc_user_id = u.id AND (t_spoc.is_deleted IS NULL OR t_spoc.is_deleted = FALSE)
      GROUP BY u.id, u.full_name, u.email, bug.name
      HAVING COUNT(DISTINCT t_assigned.id) > 0 OR COUNT(DISTINCT t_spoc.id) > 0
      ORDER BY total_closed DESC
    `

    return { success: true, data: result }
  } catch (error) {
    console.error("[Admin Reports] Error fetching user performance:", error)
    return { success: false, error: "Failed to fetch user performance" }
  }
}

// Get redirect statistics
export async function getRedirectStatistics() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "admin") {
      return { success: false, error: "Admin access required" }
    }

    const result = await sql`
      SELECT
        tr.from_business_group_name,
        tr.to_business_group_name,
        COUNT(*) as redirect_count
      FROM ticket_redirects tr
      GROUP BY tr.from_business_group_name, tr.to_business_group_name
      ORDER BY redirect_count DESC
      LIMIT 20
    `

    return { success: true, data: result }
  } catch (error) {
    console.error("[Admin Reports] Error fetching redirect statistics:", error)
    return { success: false, error: "Failed to fetch redirect statistics" }
  }
}

// Get summary statistics
export async function getSummaryStatistics() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role?.toLowerCase() !== "admin") {
      return { success: false, error: "Admin access required" }
    }

    const result = await sql`
      SELECT
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_tickets,
        COUNT(CASE WHEN status IN ('on-hold', 'hold') THEN 1 END) as on_hold_tickets,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_tickets,
        COUNT(CASE WHEN is_parent = TRUE THEN 1 END) as parent_tickets,
        COUNT(CASE WHEN parent_ticket_id IS NOT NULL THEN 1 END) as sub_tickets,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_created,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as week_created,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as month_created
      FROM tickets
      WHERE (is_deleted IS NULL OR is_deleted = FALSE)
    `

    return { success: true, data: result[0] }
  } catch (error) {
    console.error("[Admin Reports] Error fetching summary statistics:", error)
    return { success: false, error: "Failed to fetch summary statistics" }
  }
}
