"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { getRecentTickets } from "@/lib/actions/stats"

interface Ticket {
  id: number
  ticket_id: string
  title: string
  category: string
  status: "Open" | "In Progress" | "Resolved" | "open" | "in progress" | "resolved"
  created_at: string
  assignee_name: string | null
}

export default function RecentTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadTickets()
    // Refresh tickets every 30 seconds for real-time updates
    const interval = setInterval(loadTickets, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadTickets = async () => {
    const result = await getRecentTickets(5)
    if (result.success) {
      setTickets(Array.isArray(result.data) ? result.data : [])
    }
    setIsLoading(false)
  }

  const getStatusColor = (status: string) => {
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, "-")
    return (
      {
        open: "bg-red-50 text-red-700 border border-red-200",
        "in-progress": "bg-yellow-50 text-yellow-700 border border-yellow-200",
        resolved: "bg-green-50 text-green-700 border border-green-200",
        hold: "bg-gray-50 text-gray-700 border border-gray-200",
        closed: "bg-green-50 text-green-700 border border-green-200",
      }[normalizedStatus] || "bg-gray-50 text-gray-700 border border-gray-200"
    )
  }

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent Tickets</h2>
        </div>
        <div className="p-8 text-center text-muted-foreground">Loading tickets...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Recent Tickets</h2>
        <Link href="/tickets" className="text-primary text-sm font-medium hover:text-secondary flex items-center gap-1">
          View All
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">No tickets yet. Create your first ticket!</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Ticket ID</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Title</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Category</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Assignee</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-muted transition-colors cursor-pointer">
                  <td className="px-6 py-4 text-sm font-medium text-primary">{ticket.ticket_id}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{ticket.title}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{ticket.category || "N/A"}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}
                    >
                      {formatStatus(ticket.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">{ticket.assignee_name || "Unassigned"}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {format(new Date(ticket.created_at), "MMM dd, yyyy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
