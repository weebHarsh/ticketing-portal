"use server"

import { sql } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function getAllUsers(filters?: {
  role?: string
  search?: string
  includeInactive?: boolean
}) {
  try {
    const values: any[] = []

    let query = `
      SELECT
        u.id,
        u.email,
        u.full_name,
        u.role,
        u.avatar_url,
        u.created_at,
        u.updated_at,
        u.is_active,
        COUNT(DISTINCT t.id) as ticket_count,
        COUNT(DISTINCT tm.team_id) as team_count
      FROM users u
      LEFT JOIN tickets t ON u.id = t.assigned_to
      LEFT JOIN team_members tm ON u.id = tm.user_id
      WHERE 1=1
    `

    // Exclude inactive users by default
    if (!filters?.includeInactive) {
      query += ` AND (u.is_active IS NULL OR u.is_active = TRUE)`
    }

    if (filters?.role && filters.role !== "all") {
      values.push(filters.role)
      query += ` AND u.role = $${values.length}`
    }

    if (filters?.search) {
      const searchValue = `%${filters.search}%`
      values.push(searchValue, searchValue)
      query += ` AND (u.full_name ILIKE $${values.length - 1} OR u.email ILIKE $${values.length})`
    }

    query += `
      GROUP BY u.id, u.email, u.full_name, u.role, u.avatar_url, u.created_at, u.updated_at, u.is_active
      ORDER BY u.created_at DESC
    `

    const users = await sql.query(query, values)
    return { success: true, data: users }
  } catch (error) {
    console.error("Error fetching users:", error)
    return { success: false, error: "Failed to fetch users", data: [] }
  }
}

export async function getUserById(id: number) {
  try {
    if (isNaN(id) || !Number.isInteger(id) || id <= 0) {
      return { success: false, error: "Invalid user ID" }
    }

    const result = await sql`
      SELECT
        u.id,
        u.email,
        u.full_name,
        u.role,
        u.avatar_url,
        u.created_at,
        u.updated_at,
        u.is_active
      FROM users u
      WHERE u.id = ${id}
    `

    if (result.length === 0) {
      return { success: false, error: "User not found" }
    }

    // Get user's teams
    const teams = await sql`
      SELECT t.id, t.name, tm.role as team_role
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = ${id}
    `

    // Get user's assigned tickets
    const tickets = await sql`
      SELECT id, ticket_id, title, status
      FROM tickets
      WHERE assigned_to = ${id}
      ORDER BY created_at DESC
      LIMIT 10
    `

    return {
      success: true,
      data: {
        ...result[0],
        teams: teams,
        recent_tickets: tickets,
      },
    }
  } catch (error) {
    console.error("Error fetching user:", error)
    return { success: false, error: "Failed to fetch user" }
  }
}

export async function updateUser(
  id: number,
  data: {
    fullName?: string
    email?: string
    role?: string
    avatarUrl?: string
  }
) {
  try {
    const updates: string[] = []
    const values: any[] = []

    if (data.fullName !== undefined) {
      values.push(data.fullName)
      updates.push(`full_name = $${values.length}`)
    }

    if (data.email !== undefined) {
      values.push(data.email)
      updates.push(`email = $${values.length}`)
    }

    if (data.role !== undefined) {
      values.push(data.role)
      updates.push(`role = $${values.length}`)
    }

    if (data.avatarUrl !== undefined) {
      values.push(data.avatarUrl || null)
      updates.push(`avatar_url = $${values.length}`)
    }

    if (updates.length === 0) {
      return { success: false, error: "No fields to update" }
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    const query = `
      UPDATE users
      SET ${updates.join(", ")}
      WHERE id = $${values.length}
      RETURNING id, email, full_name, role, avatar_url, created_at, updated_at
    `

    const result = await sql.query(query, values)

    if (!result || result.length === 0) {
      return { success: false, error: "Failed to update user" }
    }

    return { success: true, data: result[0] }
  } catch (error: any) {
    if (error.message?.includes("duplicate key") || error.detail?.includes("already exists")) {
      return { success: false, error: "Email already exists" }
    }
    console.error("Error updating user:", error)
    return { success: false, error: "Failed to update user" }
  }
}

export async function deactivateUser(id: number) {
  try {
    // Add is_active column if it doesn't exist
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`

    const result = await sql`
      UPDATE users
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING id, email, full_name
    `

    if (result.length === 0) {
      return { success: false, error: "User not found" }
    }

    return { success: true, data: result[0] }
  } catch (error) {
    console.error("Error deactivating user:", error)
    return { success: false, error: "Failed to deactivate user" }
  }
}

export async function activateUser(id: number) {
  try {
    const result = await sql`
      UPDATE users
      SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING id, email, full_name
    `

    if (result.length === 0) {
      return { success: false, error: "User not found" }
    }

    return { success: true, data: result[0] }
  } catch (error) {
    console.error("Error activating user:", error)
    return { success: false, error: "Failed to activate user" }
  }
}

export async function resetUserPassword(id: number) {
  try {
    // Generate temporary password
    const randomPart = Math.random().toString(36).substring(2, 10)
    const tempPassword = `${randomPart}Temp1!`

    const passwordHash = await bcrypt.hash(tempPassword, 10)

    const result = await sql`
      UPDATE users
      SET password_hash = ${passwordHash}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING id, email, full_name
    `

    if (result.length === 0) {
      return { success: false, error: "User not found" }
    }

    return {
      success: true,
      data: {
        ...result[0],
        temporary_password: tempPassword,
      },
    }
  } catch (error) {
    console.error("Error resetting password:", error)
    return { success: false, error: "Failed to reset password" }
  }
}

export async function deleteUser(id: number) {
  try {
    // Check if user has assigned tickets
    const ticketCheck = await sql`
      SELECT COUNT(*) as count FROM tickets WHERE assigned_to = ${id}
    `

    const ticketCount = ticketCheck[0]?.count || 0

    if (ticketCount > 0) {
      return {
        success: false,
        error: `Cannot delete user: ${ticketCount} ticket(s) are assigned to this user. Please reassign tickets first or deactivate the user instead.`,
      }
    }

    // Check if user created tickets
    const createdTicketCheck = await sql`
      SELECT COUNT(*) as count FROM tickets WHERE created_by = ${id}
    `

    const createdCount = createdTicketCheck[0]?.count || 0

    if (createdCount > 0) {
      return {
        success: false,
        error: `Cannot delete user: ${createdCount} ticket(s) were created by this user. Deactivate the user instead.`,
      }
    }

    // Delete user (cascade will handle team_members)
    await sql`DELETE FROM users WHERE id = ${id}`

    return { success: true }
  } catch (error) {
    console.error("Error deleting user:", error)
    return { success: false, error: "Failed to delete user" }
  }
}

export async function getUserRoles() {
  return {
    success: true,
    data: [
      { value: "admin", label: "Admin" },
      { value: "manager", label: "Manager" },
      { value: "team_lead", label: "Team Lead" },
      { value: "support_agent", label: "Support Agent" },
      { value: "developer", label: "Developer" },
      { value: "qa_engineer", label: "QA Engineer" },
      { value: "designer", label: "Designer" },
      { value: "analyst", label: "Analyst" },
    ],
  }
}
