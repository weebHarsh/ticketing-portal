"use server"

import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"

const sql = neon(process.env.DATABASE_URL!)

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get("user")

    if (!userCookie) {
      return null
    }

    const user = JSON.parse(userCookie.value)
    return user
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}

export async function getBusinessUnitGroups() {
  try {
    const result = await sql`SELECT id, name FROM business_unit_groups ORDER BY name`
    return { success: true, data: result }
  } catch (error) {
    console.error("Error fetching business unit groups:", error)
    return { success: false, error: "Failed to fetch groups" }
  }
}

export async function signupUser(
  email: string,
  fullName: string,
  password: string,
  businessUnitGroupId: number
) {
  try {
    const existingUser = await sql`SELECT * FROM users WHERE email = ${email}`

    if (existingUser && existingUser.length > 0) {
      return { success: false, error: "User already exists" }
    }

    const passwordHash = await bcrypt.hash(password, 10)

    // Default role is 'user', business_unit_group_id links to their group
    const result = await sql`
      INSERT INTO users (email, full_name, password_hash, role, business_unit_group_id)
      VALUES (${email}, ${fullName}, ${passwordHash}, 'user', ${businessUnitGroupId})
      RETURNING id, email, full_name, role, business_unit_group_id
    `

    // Get the group name for the response
    const groupResult = await sql`
      SELECT name FROM business_unit_groups WHERE id = ${businessUnitGroupId}
    `
    const groupName = groupResult[0]?.name || ''

    return {
      success: true,
      user: {
        ...result[0],
        group_name: groupName,
      },
    }
  } catch (error) {
    console.error("Signup error:", error)
    return { success: false, error: "Failed to create user" }
  }
}

export async function loginUser(email: string, password: string) {
  try {
    const result = await sql`
      SELECT u.*, bug.name as group_name
      FROM users u
      LEFT JOIN business_unit_groups bug ON u.business_unit_group_id = bug.id
      WHERE u.email = ${email}
    `

    if (!result || result.length === 0) {
      return { success: false, error: "Invalid email or password" }
    }

    const user = result[0]

    const isPasswordValid = await bcrypt.compare(password, user.password_hash)

    if (!isPasswordValid) {
      return { success: false, error: "Invalid email or password" }
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        business_unit_group_id: user.business_unit_group_id,
        group_name: user.group_name,
      },
    }
  } catch (error) {
    console.error("[v0] Login error:", error)
    return { success: false, error: "Failed to login" }
  }
}
