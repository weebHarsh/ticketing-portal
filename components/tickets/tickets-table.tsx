"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Copy, MoreVertical, Download, Eye, Trash2 } from "lucide-react"
import { getTickets, getTicketById, softDeleteTicket } from "@/lib/actions/tickets"

interface Ticket {
  id: number
  ticket_id: string
  title: string
  category: string
  ticket_type: "support" | "requirement"
  status: "open" | "closed" | "hold"
  created_at: string
  assignee_name: string | null
  estimated_duration: string
  is_deleted: boolean
  business_unit_group_id: number
  project_name: string
  category_id: number
  subcategory_id: number
  description: string
  assigned_to: number
  product_release_name: string
}

interface TicketsTableProps {
  filters?: {
    status?: string
    assignee?: string
    type?: string
    search?: string
    dateFrom?: string
    dateTo?: string
  }
}

export default function TicketsTable({ filters }: TicketsTableProps) {
  const router = useRouter()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadTickets()
  }, [filters])

  const loadTickets = async () => {
    setIsLoading(true)
    const result = await getTickets(filters)
    if (result.success) {
      setTickets(result.data)
    }
    setIsLoading(false)
  }

  const handleDuplicate = async (ticketId: number) => {
    console.log("[v0] Duplicating ticket:", ticketId)
    const result = await getTicketById(ticketId)
    if (result.success && result.data.ticket) {
      const ticket = result.data.ticket
      // Navigate to create page with ticket data as URL params
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
    if (!confirm("Are you sure you want to delete this ticket? It will be marked as deleted but can be restored.")) {
      return
    }
    console.log("[v0] Deleting ticket:", ticketId)
    const result = await softDeleteTicket(ticketId)
    if (result.success) {
      loadTickets()
    } else {
      alert("Failed to delete ticket: " + (result.error || "Unknown error"))
    }
  }

  const statusColor = {
    open: "status-open",
    closed: "status-closed",
    hold: "status-hold",
  }

  const typeLabel = {
    support: "Support",
    requirement: "Requirement",
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
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Ticket ID</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Title</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Type</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Assignee</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Duration</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Created</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tickets.map((ticket) => (
              <tr
                key={ticket.id}
                className={`hover:bg-surface transition-colors ${ticket.is_deleted ? "opacity-50 bg-gray-100" : ""}`}
              >
                <td
                  className="px-6 py-4 text-sm font-medium text-primary hover:underline cursor-pointer"
                  onClick={() => router.push(`/tickets/${ticket.id}`)}
                >
                  {ticket.ticket_id}
                  {ticket.is_deleted && <span className="ml-2 text-xs text-red-600">(Deleted)</span>}
                </td>
                <td className="px-6 py-4 text-sm text-foreground max-w-xs truncate">{ticket.title}</td>
                <td className="px-6 py-4 text-sm">
                  <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    {typeLabel[ticket.ticket_type]}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`status-badge ${statusColor[ticket.status]}`}>
                    {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-foreground">{ticket.assignee_name || "Unassigned"}</td>
                <td className="px-6 py-4 text-sm text-foreground-secondary">{ticket.estimated_duration || "N/A"}</td>
                <td className="px-6 py-4 text-sm text-foreground-secondary">
                  {format(new Date(ticket.created_at), "MMM dd, yyyy")}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      className="p-1.5 hover:bg-surface rounded transition-colors"
                      title="View"
                      onClick={() => router.push(`/tickets/${ticket.id}`)}
                    >
                      <Eye className="w-4 h-4 text-foreground-secondary" />
                    </button>
                    <button
                      className="p-1.5 hover:bg-surface rounded transition-colors"
                      title="Duplicate"
                      onClick={() => handleDuplicate(ticket.id)}
                    >
                      <Copy className="w-4 h-4 text-foreground-secondary" />
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

      <div className="px-6 py-4 border-t border-border flex items-center justify-between">
        <p className="text-sm text-foreground-secondary">
          Showing {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  )
}
