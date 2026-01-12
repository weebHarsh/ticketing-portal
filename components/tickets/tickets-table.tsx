"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Eye, Edit, Trash2, Download, Paperclip } from "lucide-react"
import {
  getTickets,
  getTicketById,
  softDeleteTicket,
  updateTicketAssignee,
  getUsers,
} from "@/lib/actions/tickets"

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
  assignee_name: string | null
  assigned_to: number | null
  spoc_name: string | null
  spoc_user_id: number | null
  estimated_duration: string
  is_deleted: boolean
  attachment_count: number
  business_unit_group_id: number
  group_name: string | null
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
}

export default function TicketsTable({ filters }: TicketsTableProps) {
  const router = useRouter()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingAssignee, setEditingAssignee] = useState<number | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

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
  }, [filters])

  const loadTickets = async () => {
    setIsLoading(true)
    const result = await getTickets(filters)
    if (result.success) {
      setTickets(result.data)
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

  const handleAssigneeChange = async (ticketId: number, newAssigneeId: number) => {
    const result = await updateTicketAssignee(ticketId, newAssigneeId)
    if (result.success) {
      loadTickets()
      setEditingAssignee(null)
    } else {
      alert("Failed to update assignee")
    }
  }

  const canEditAssignee = (ticket: Ticket) => {
    if (!currentUser) return false
    return (
      currentUser.id === ticket.spoc_user_id ||
      currentUser.role === "admin" ||
      currentUser.role === "Admin"
    )
  }

  const statusColor = {
    open: "bg-blue-100 text-blue-700",
    closed: "bg-green-100 text-green-700",
    hold: "bg-yellow-100 text-yellow-700",
    "in-progress": "bg-purple-100 text-purple-700",
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider w-12">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                Date/Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider max-w-xs">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                SPOC
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                Assignee
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider w-20">
                Files
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider w-28">
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
                <td className="px-4 py-3 text-sm text-foreground-secondary">{index + 1}</td>

                {/* Date/Time Stacked */}
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {format(new Date(ticket.created_at), "MMM dd, yyyy")}
                    </span>
                    <span className="text-xs text-foreground-secondary">
                      {format(new Date(ticket.created_at), "hh:mm a")}
                    </span>
                  </div>
                </td>

                {/* Category/Subcategory Stacked */}
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {ticket.category_name || "N/A"}
                    </span>
                    {ticket.subcategory_name && (
                      <span className="text-xs text-foreground-secondary">
                        {ticket.subcategory_name}
                      </span>
                    )}
                  </div>
                </td>

                {/* Description Truncated */}
                <td className="px-4 py-3">
                  <p
                    className="text-sm text-foreground max-w-xs truncate cursor-pointer hover:text-primary"
                    onClick={() => router.push(`/tickets/${ticket.id}`)}
                    title={ticket.description || ticket.title}
                  >
                    {ticket.description || ticket.title}
                  </p>
                  {ticket.is_deleted && (
                    <span className="text-xs text-red-600">(Deleted)</span>
                  )}
                </td>

                {/* SPOC */}
                <td className="px-4 py-3 text-sm text-foreground">
                  {ticket.spoc_name || "-"}
                </td>

                {/* Assignee with inline edit */}
                <td className="px-4 py-3">
                  {editingAssignee === ticket.id ? (
                    <select
                      className="text-sm border border-border rounded px-2 py-1 w-full max-w-[140px]"
                      value={ticket.assigned_to || ""}
                      onChange={(e) =>
                        handleAssigneeChange(ticket.id, parseInt(e.target.value))
                      }
                      onBlur={() => setEditingAssignee(null)}
                      autoFocus
                    >
                      <option value="">Unassigned</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`text-sm ${
                        canEditAssignee(ticket)
                          ? "cursor-pointer hover:text-primary hover:underline"
                          : ""
                      }`}
                      onClick={() =>
                        canEditAssignee(ticket) && setEditingAssignee(ticket.id)
                      }
                    >
                      {ticket.assignee_name || "Unassigned"}
                    </span>
                  )}
                </td>

                {/* Status Badge */}
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                      statusColor[ticket.status] || statusColor["open"]
                    }`}
                  >
                    {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                  </span>
                </td>

                {/* Attachments */}
                <td className="px-4 py-3 text-center">
                  {ticket.attachment_count > 0 ? (
                    <button
                      className="inline-flex items-center gap-1 text-primary hover:text-primary/80"
                      onClick={() => router.push(`/tickets/${ticket.id}`)}
                      title={`${ticket.attachment_count} attachment(s)`}
                    >
                      <Paperclip className="w-4 h-4" />
                      <span className="text-xs font-medium">{ticket.attachment_count}</span>
                    </button>
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
    </div>
  )
}
