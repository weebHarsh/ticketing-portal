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

export async function signupUser(email: string, fullName: string, password: string, role: string) {
  try {
    const existingUser = await sql`SELECT * FROM users WHERE email = ${email}`

    if (existingUser && existingUser.length > 0) {
      return { success: false, error: "User already exists" }
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const result =
      await sql`INSERT INTO users (email, full_name, password_hash, role) VALUES (${email}, ${fullName}, ${passwordHash}, ${role}) RETURNING id, email, full_name, role`

    return {
      success: true,
      user: result[0],
    }
  } catch (error) {
    console.error("Signup error:", error)
    return { success: false, error: "Failed to create user" }
  }
}

export async function loginUser(email: string, password: string) {
  try {
    const result = await sql`SELECT * FROM users WHERE email = ${email}`

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
      },
    }
  } catch (error) {
    console.error("[v0] Login error:", error)
    return { success: false, error: "Failed to login" }
  }
}
