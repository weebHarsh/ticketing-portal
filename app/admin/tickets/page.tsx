"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Trash2, AlertTriangle, RefreshCcw, Eye, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getDeletedTickets, hardDeleteTicket, restoreTicket } from "@/lib/actions/tickets"
import Link from "next/link"

interface DeletedTicket {
  id: number
  ticket_number: string
  title: string
  status: string
  created_at: string
  deleted_at: string
  creator_name: string
  deleted_by_name: string
  business_group: string
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<DeletedTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showHardDeleteModal, setShowHardDeleteModal] = useState(false)
  const [ticketToDelete, setTicketToDelete] = useState<DeletedTicket | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadDeletedTickets = async () => {
    setLoading(true)
    const result = await getDeletedTickets()
    if (result.success && result.data) {
      setTickets(result.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadDeletedTickets()
  }, [])

  const handleHardDelete = async () => {
    if (!ticketToDelete) return

    setDeleting(true)
    const result = await hardDeleteTicket(ticketToDelete.id)
    if (result.success) {
      await loadDeletedTickets()
      setShowHardDeleteModal(false)
      setTicketToDelete(null)
    } else {
      alert(result.error || "Failed to permanently delete ticket")
    }
    setDeleting(false)
  }

  const handleRestore = async (ticket: DeletedTicket) => {
    if (!confirm(`Are you sure you want to restore ticket "${ticket.ticket_number}"?`)) return

    const result = await restoreTicket(ticket.id)
    if (result.success) {
      await loadDeletedTickets()
    } else {
      alert(result.error || "Failed to restore ticket")
    }
  }

  const filteredTickets = tickets.filter(
    (t) =>
      t.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.creator_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-sans font-bold text-foreground flex items-center gap-3">
            <Trash2 className="w-8 h-8" />
            Deleted Tickets Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage soft-deleted tickets. Restore or permanently delete tickets.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800">Warning</h3>
              <p className="text-sm text-amber-700">
                Permanently deleting tickets cannot be undone. All related data including comments,
                attachments, and audit history will be removed.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl shadow-sm">
          {/* Search */}
          <div className="p-4 border-b border-border">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by ticket number, title, or creator..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading deleted tickets...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <Trash2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground font-medium">No deleted tickets found</p>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? "Try a different search term" : "Deleted tickets will appear here"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
                      Ticket
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
                      Created By
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
                      Deleted By
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
                      Deleted At
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-mono text-sm text-primary">{ticket.ticket_number}</span>
                          <p className="text-sm text-foreground mt-0.5">{ticket.title}</p>
                          <span className="text-xs text-muted-foreground">{ticket.business_group}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{ticket.creator_name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{ticket.deleted_by_name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {ticket.deleted_at
                          ? new Date(ticket.deleted_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link href={`/tickets/${ticket.id}`}>
                            <Button variant="ghost" size="sm" title="View Ticket">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestore(ticket)}
                            title="Restore Ticket"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <RefreshCcw className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTicketToDelete(ticket)
                              setShowHardDeleteModal(true)
                            }}
                            title="Permanently Delete"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Hard Delete Confirmation Modal */}
      {showHardDeleteModal && ticketToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-xl text-foreground">Permanently Delete?</h3>
                <p className="text-sm text-muted-foreground">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-foreground">
                <span className="font-semibold">Ticket:</span> {ticketToDelete.ticket_number}
              </p>
              <p className="text-sm text-foreground mt-1">
                <span className="font-semibold">Title:</span> {ticketToDelete.title}
              </p>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              This will permanently delete the ticket and all associated data including:
            </p>
            <ul className="text-sm text-muted-foreground mb-6 list-disc list-inside space-y-1">
              <li>All comments</li>
              <li>All attachments</li>
              <li>Audit history</li>
              <li>Sub-tickets (if any)</li>
              <li>Redirect history</li>
            </ul>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowHardDeleteModal(false)
                  setTicketToDelete(null)
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleHardDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Permanently Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
