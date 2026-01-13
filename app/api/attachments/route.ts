import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/r2"

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

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const fileName = `tickets/${ticketId}/${timestamp}-${sanitizedName}`

    // Upload to R2
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
        ContentLength: file.size,
      })
    )

    // Generate public URL
    const fileUrl = `${R2_PUBLIC_URL}/${fileName}`

    // Save to database
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
    const fileUrl = attachment[0].file_url

    // Extract filename from URL
    const fileName = fileUrl.replace(`${R2_PUBLIC_URL}/`, "")

    // Delete from R2
    try {
      await r2Client.send(
        new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: fileName,
        })
      )
    } catch (r2Error) {
      console.error("Error deleting from R2:", r2Error)
      // Continue even if R2 delete fails
    }

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
