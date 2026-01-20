"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Eye, Edit, Trash2, Download, Paperclip, FileDown, UserPlus, FileText, X } from "lucide-react"
import {
  getTickets,
  getTicketById,
  softDeleteTicket,
  updateTicketAssignee,
  getUsers,
} from "@/lib/actions/tickets"
import { getMyTeamMembers } from "@/lib/actions/my-team"
import * as XLSX from "xlsx"
import AssigneeModal from "./assignee-modal"

interface Ticket {
  id: number
  ticket_id: string
  title: string
  description: string
  category_name: string | null
  subcategory_name: string | null
  ticket_type: "support" | "requirement"
  status: "open" | "closed" | "hold"
  created_at: string
  created_by: number
  creator_name: string | null
  assignee_name: string | null
  assigned_to: number | null
  spoc_name: string | null
  spoc_user_id: number | null
  estimated_duration: string
  is_deleted: boolean
  attachment_count: number
  business_unit_group_id: number
  group_name: string | null
  project_id: number | null
  project_name: string | null
  estimated_release_date: string | null
}

interface User {
  id: number
  full_name: string
  email: string
}

interface TicketsTableProps {
  filters?: {
    status?: string
    assignee?: string
    type?: string
    search?: string
    dateFrom?: string
    dateTo?: string
    myTeam?: boolean
    userId?: number
  }
  onExportReady?: (exportFn: () => void) => void
}

export default function TicketsTable({ filters, onExportReady }: TicketsTableProps) {
  const router = useRouter()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Modal state for assignee selection
  const [isAssigneeModalOpen, setIsAssigneeModalOpen] = useState(false)
  const [selectedTicketForAssignment, setSelectedTicketForAssignment] = useState<Ticket | null>(null)

  // Attachments dropdown state
  const [attachmentsDropdownOpen, setAttachmentsDropdownOpen] = useState<number | null>(null)
  const [attachmentsList, setAttachmentsList] = useState<any[]>([])
  const [loadingAttachments, setLoadingAttachments] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAttachmentsDropdownOpen(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    try {
      const userData = localStorage.getItem("user")
      if (userData) {
        setCurrentUser(JSON.parse(userData))
      }
    } catch (e) {
      console.error("Failed to parse user data:", e)
    }
  }, [])

  useEffect(() => {
    loadTickets()
    loadUsers()
  }, [filters, currentUser])

  // Expose export function to parent
  useEffect(() => {
    if (onExportReady) {
      onExportReady(handleExport)
    }
  }, [tickets])

  const loadTickets = async () => {
    setIsLoading(true)
    const result = await getTickets(filters)
    if (result.success) {
      let ticketsData = result.data

      // Filter tickets based on user role and team settings
      if (currentUser && currentUser.role?.toLowerCase() !== "admin") {
        const userId = Number(currentUser.id)

        // If "My Team" filter is active, include team members' tickets
        if (filters?.myTeam) {
          // Fetch team members
          const teamResult = await getMyTeamMembers(userId)
          const teamMemberIds = teamResult.success && teamResult.data
            ? teamResult.data.map((m: any) => Number(m.id))
            : []

          // Include tickets where:
          // - User is SPOC, creator, or assignee
          // - OR team members are creator or assignee
          ticketsData = ticketsData.filter((ticket: Ticket) =>
            ticket.spoc_user_id === userId ||
            ticket.created_by === userId ||
            ticket.assigned_to === userId ||
            teamMemberIds.includes(ticket.created_by) ||
            teamMemberIds.includes(ticket.assigned_to || 0)
          )
        } else {
          // Default: show only user's own tickets
          ticketsData = ticketsData.filter((ticket: Ticket) =>
            ticket.spoc_user_id === userId ||
            ticket.created_by === userId ||
            ticket.assigned_to === userId
          )
        }
      }

      setTickets(ticketsData)
    }
    setIsLoading(false)
  }

  const loadUsers = async () => {
    const result = await getUsers()
    if (result.success && result.data) {
      setUsers(result.data as User[])
    }
  }

  const handleDuplicate = async (ticketId: number) => {
    const result = await getTicketById(ticketId)
    if (result.success && result.data) {
      const ticket = result.data
      const params = new URLSearchParams({
        duplicate: "true",
        ticketType: ticket.ticket_type || "support",
        businessUnitGroupId: ticket.business_unit_group_id?.toString() || "",
        projectName: ticket.project_name || "",
        categoryId: ticket.category_id?.toString() || "",
        subcategoryId: ticket.subcategory_id?.toString() || "",
        title: ticket.title || "",
        description: ticket.description || "",
        estimatedDuration: ticket.estimated_duration || "",
        assigneeId: ticket.assigned_to?.toString() || "",
        productReleaseName: ticket.product_release_name || "",
      })
      router.push(`/tickets/create?${params.toString()}`)
    }
  }

  const handleDelete = async (ticketId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this ticket? It will be marked as deleted but can be restored."
      )
    ) {
      return
    }
    const result = await softDeleteTicket(ticketId)
    if (result.success) {
      loadTickets()
    } else {
      alert("Failed to delete ticket: " + (result.error || "Unknown error"))
    }
  }

  const handleAssigneeChange = async (ticketId: number, newAssigneeId: number | null) => {
    const result = await updateTicketAssignee(ticketId, newAssigneeId || 0)
    if (result.success) {
      loadTickets()
    } else {
      alert("Failed to update assignee")
    }
  }

  const openAssigneeModal = (ticket: Ticket) => {
    setSelectedTicketForAssignment(ticket)
    setIsAssigneeModalOpen(true)
  }

  const handleAssigneeSelect = (userId: number | null) => {
    if (selectedTicketForAssignment) {
      handleAssigneeChange(selectedTicketForAssignment.id, userId)
    }
  }

  const canEditAssignee = (ticket: Ticket) => {
    if (!currentUser) return false
    const userId = Number(currentUser.id) // Ensure ID is a number for comparison
    return (
      userId === ticket.spoc_user_id ||
      currentUser.role?.toLowerCase() === "admin"
    )
  }

  const toggleAttachmentsDropdown = async (ticketId: number) => {
    if (attachmentsDropdownOpen === ticketId) {
      setAttachmentsDropdownOpen(null)
      return
    }

    setAttachmentsDropdownOpen(ticketId)
    setLoadingAttachments(true)

    const result = await getTicketById(ticketId)
    if (result.success && result.data?.attachments) {
      setAttachmentsList(result.data.attachments)
    } else {
      setAttachmentsList([])
    }
    setLoadingAttachments(false)
  }

  const statusColor = {
    open: "bg-blue-100 text-blue-700",
    closed: "bg-green-100 text-green-700",
    hold: "bg-yellow-100 text-yellow-700",
  }

  const handleExport = () => {
    // Prepare data for export
    const exportData = tickets.map((ticket, index) => ({
      "#": index + 1,
      "Initiator": ticket.creator_name || "Unknown",
      "Group": ticket.group_name || "No Group",
      "Date": format(new Date(ticket.created_at), "MMM dd, yyyy"),
      "Time": format(new Date(ticket.created_at), "hh:mm a"),
      "Type": ticket.ticket_type,
      "Ticket ID": ticket.ticket_id,
      "Category": ticket.category_name || "N/A",
      "Subcategory": ticket.subcategory_name || "-",
      "Project": ticket.project_name || "-",
      "Release Date": ticket.estimated_release_date
        ? format(new Date(ticket.estimated_release_date), "MMM dd, yyyy")
        : "-",
      "Description": ticket.description || ticket.title,
      "Assignee": ticket.assignee_name || "Unassigned",
      "SPOC": ticket.spoc_name || "-",
      "Status": ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1),
      "Files": ticket.attachment_count || 0,
    }))

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)

    // Set column widths
    ws["!cols"] = [
      { wch: 5 },  // #
      { wch: 20 }, // Initiator
      { wch: 15 }, // Group
      { wch: 15 }, // Date
      { wch: 10 }, // Time
      { wch: 12 }, // Type
      { wch: 15 }, // Ticket ID
      { wch: 20 }, // Category
      { wch: 20 }, // Subcategory
      { wch: 20 }, // Project
      { wch: 15 }, // Release Date
      { wch: 40 }, // Description
      { wch: 20 }, // Assignee
      { wch: 15 }, // SPOC
      { wch: 12 }, // Status
      { wch: 8 },  // Files
    ]

    XLSX.utils.book_append_sheet(wb, ws, "Tickets")

    // Generate filename with timestamp
    const filename = `tickets_${format(new Date(), "yyyy-MM-dd_HHmmss")}.xlsx`

    // Download file
    XLSX.writeFile(wb, filename)
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="p-8 text-center text-foreground-secondary">Loading tickets...</div>
      </div>
    )
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="p-8 text-center text-foreground-secondary">
          No tickets found. Try adjusting your filters or create a new ticket.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground tracking-wider w-12">
                #
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground tracking-wider">
                Initiator
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground tracking-wider">
                Tkt ID
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground tracking-wider">
                Category
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground tracking-wider">
                Project / Release
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground tracking-wider max-w-xs">
                Description
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground tracking-wider">
                SPOC
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground tracking-wider w-[200px]">
                Assignee
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-foreground tracking-wider w-20">
                Files
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-foreground tracking-wider w-28">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tickets.map((ticket, index) => (
              <tr
                key={ticket.id}
                className={`hover:bg-surface transition-colors ${
                  ticket.is_deleted ? "opacity-50 bg-gray-50" : ""
                }`}
              >
                {/* Row Number */}
                <td className="px-4 py-3 text-base text-foreground-secondary">{index + 1}</td>

                {/* Initiator Name and Group Stacked */}
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-base font-medium text-foreground">
                      {ticket.creator_name || "Unknown"}
                    </span>
                    <span className="text-sm text-foreground-secondary">
                      {ticket.group_name || "No Group"}
                    </span>
                  </div>
                </td>

                {/* Date Stacked */}
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-base font-medium text-foreground">
                      {format(new Date(ticket.created_at), "MMM dd, yyyy")}
                    </span>
                    <span className="text-sm text-foreground-secondary">
                      {format(new Date(ticket.created_at), "hh:mm a")}
                    </span>
                  </div>
                </td>

                {/* Ticket ID and Type Stacked */}
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-base font-medium text-primary">
                      {ticket.ticket_id}
                    </span>
                    <span className="text-sm text-foreground-secondary capitalize">
                      {ticket.ticket_type}
                    </span>
                  </div>
                </td>

                {/* Category/Subcategory Stacked */}
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-base font-medium text-foreground">
                      {ticket.category_name || "N/A"}
                    </span>
                    {ticket.subcategory_name && (
                      <span className="text-sm text-foreground-secondary">
                        {ticket.subcategory_name}
                      </span>
                    )}
                  </div>
                </td>

                {/* Project/Release Stacked */}
                <td className="px-4 py-3">
                  {ticket.project_name || ticket.estimated_release_date ? (
                    <div className="flex flex-col">
                      {ticket.project_name && (
                        <span className="text-base font-medium text-foreground">
                          {ticket.project_name}
                        </span>
                      )}
                      {ticket.estimated_release_date && (
                        <span className="text-sm text-foreground-secondary">
                          {format(new Date(ticket.estimated_release_date), "MMM dd, yyyy")}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-base text-muted-foreground">-</span>
                  )}
                </td>

                {/* Description Truncated with Tooltip */}
                <td className="px-4 py-3">
                  <p
                    className="text-base text-foreground max-w-xs truncate cursor-pointer hover:text-primary"
                    onClick={() => router.push(`/tickets/${ticket.id}`)}
                    title={ticket.description || ticket.title}
                  >
                    {ticket.description || ticket.title}
                  </p>
                  {ticket.is_deleted && (
                    <span className="text-sm text-red-600">(Deleted)</span>
                  )}
                </td>

                {/* SPOC Column */}
                <td className="px-4 py-3">
                  <span className="text-base text-foreground">
                    {ticket.spoc_name || "-"}
                  </span>
                </td>

                {/* Assignee Column */}
                <td className="px-4 py-3 w-[200px]">
                  {ticket.assignee_name ? (
                    <span
                      className={`text-base font-medium text-foreground ${
                        canEditAssignee(ticket)
                          ? "cursor-pointer hover:text-primary"
                          : ""
                      }`}
                      onClick={() => canEditAssignee(ticket) && openAssigneeModal(ticket)}
                    >
                      {ticket.assignee_name}
                      {canEditAssignee(ticket) && (
                        <Edit className="w-4 h-4 inline ml-1 opacity-50" />
                      )}
                    </span>
                  ) : canEditAssignee(ticket) ? (
                    <button
                      onClick={() => openAssigneeModal(ticket)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-md text-base font-medium hover:bg-amber-200 transition-colors w-fit"
                    >
                      <UserPlus className="w-4 h-4" />
                      Assign
                    </button>
                  ) : (
                    <span className="text-base text-muted-foreground">Unassigned</span>
                  )}
                </td>

                {/* Status Badge */}
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-3 py-1.5 rounded-full text-sm font-medium ${
                      statusColor[ticket.status] || statusColor["open"]
                    }`}
                  >
                    {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                  </span>
                </td>

                {/* Attachments */}
                <td className="px-4 py-3 text-center relative">
                  {ticket.attachment_count > 0 ? (
                    <div className="relative inline-block" ref={attachmentsDropdownOpen === ticket.id ? dropdownRef : null}>
                      <button
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                        onClick={() => toggleAttachmentsDropdown(ticket.id)}
                        title={`Download ${ticket.attachment_count} attachment(s)`}
                      >
                        <Download className="w-4 h-4" />
                        <span className="text-sm font-medium">{ticket.attachment_count}</span>
                      </button>

                      {/* Attachments Dropdown */}
                      {attachmentsDropdownOpen === ticket.id && (
                        <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-border rounded-lg shadow-lg z-50">
                          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface/50">
                            <span className="text-xs font-semibold text-foreground">Attachments</span>
                            <button
                              onClick={() => setAttachmentsDropdownOpen(null)}
                              className="p-0.5 hover:bg-surface rounded"
                            >
                              <X className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {loadingAttachments ? (
                              <div className="p-3 text-center text-sm text-muted-foreground">
                                Loading...
                              </div>
                            ) : attachmentsList.length > 0 ? (
                              attachmentsList.map((attachment: any) => (
                                <a
                                  key={attachment.id}
                                  href={attachment.file_url}
                                  download={attachment.file_name}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 hover:bg-surface transition-colors border-b border-border last:border-b-0"
                                >
                                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-foreground truncate">{attachment.file_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {attachment.file_size ? `${(attachment.file_size / 1024).toFixed(1)} KB` : ""}
                                    </p>
                                  </div>
                                  <Download className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                </a>
                              ))
                            ) : (
                              <div className="p-3 text-center text-sm text-muted-foreground">
                                No attachments found
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-foreground-secondary">-</span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      className="p-1.5 hover:bg-surface rounded transition-colors"
                      title="View"
                      onClick={() => router.push(`/tickets/${ticket.id}`)}
                    >
                      <Eye className="w-4 h-4 text-foreground-secondary" />
                    </button>
                    <button
                      className="p-1.5 hover:bg-surface rounded transition-colors"
                      title="Edit"
                      onClick={() => router.push(`/tickets/${ticket.id}/edit`)}
                    >
                      <Edit className="w-4 h-4 text-foreground-secondary" />
                    </button>
                    {!ticket.is_deleted && (
                      <button
                        className="p-1.5 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                        onClick={() => handleDelete(ticket.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-surface/50">
        <p className="text-sm text-foreground-secondary">
          Showing {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Assignee Modal */}
      <AssigneeModal
        isOpen={isAssigneeModalOpen}
        onClose={() => {
          setIsAssigneeModalOpen(false)
          setSelectedTicketForAssignment(null)
        }}
        onSelect={handleAssigneeSelect}
        currentAssigneeId={selectedTicketForAssignment?.assigned_to || null}
        ticketTitle={selectedTicketForAssignment?.title || ""}
      />
    </div>
  )
}
