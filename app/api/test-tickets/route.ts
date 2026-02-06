import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

// Simple test endpoint to verify tickets are being fetched
export async function GET() {
  try {
    const tickets = await sql`
      SELECT id, ticket_number, title, created_by, spoc_user_id, assigned_to
      FROM tickets
      WHERE (is_deleted IS NULL OR is_deleted = FALSE)
      ORDER BY created_at DESC
      LIMIT 5
    `

    return NextResponse.json({
      success: true,
      count: tickets.length,
      tickets: tickets,
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}
