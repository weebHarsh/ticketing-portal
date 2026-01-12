import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const ticketId = formData.get("ticketId") as string
    const uploadedBy = formData.get("uploadedBy") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!ticketId) {
      return NextResponse.json({ error: "No ticket ID provided" }, { status: 400 })
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit" },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "public", "uploads")
    await mkdir(uploadsDir, { recursive: true })

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const fileName = `${timestamp}-${sanitizedName}`
    const filePath = path.join(uploadsDir, fileName)

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Save to database
    const fileUrl = `/uploads/${fileName}`
    const result = await sql`
      INSERT INTO attachments (ticket_id, file_name, file_url, file_size, uploaded_by)
      VALUES (${Number(ticketId)}, ${file.name}, ${fileUrl}, ${file.size}, ${uploadedBy ? Number(uploadedBy) : null})
      RETURNING *
    `

    // Update has_attachments flag on ticket
    await sql`
      UPDATE tickets SET has_attachments = TRUE WHERE id = ${Number(ticketId)}
    `

    return NextResponse.json({
      success: true,
      data: result[0],
    })
  } catch (error) {
    console.error("Error uploading attachment:", error)
    return NextResponse.json(
      { error: "Failed to upload attachment" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const attachmentId = searchParams.get("id")

    if (!attachmentId) {
      return NextResponse.json({ error: "No attachment ID provided" }, { status: 400 })
    }

    // Get attachment info
    const attachment = await sql`
      SELECT * FROM attachments WHERE id = ${Number(attachmentId)}
    `

    if (attachment.length === 0) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 })
    }

    const ticketId = attachment[0].ticket_id

    // Delete from database
    await sql`DELETE FROM attachments WHERE id = ${Number(attachmentId)}`

    // Check if ticket has any remaining attachments
    const remainingAttachments = await sql`
      SELECT COUNT(*) as count FROM attachments WHERE ticket_id = ${ticketId}
    `

    if (Number(remainingAttachments[0].count) === 0) {
      await sql`UPDATE tickets SET has_attachments = FALSE WHERE id = ${ticketId}`
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting attachment:", error)
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    )
  }
}
