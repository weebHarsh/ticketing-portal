"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import {
  ArrowLeft, Edit, MessageSquare, Paperclip, Clock, User, Calendar, Tag, Download, FileText,
  ListChecks, CheckCircle2, History, RefreshCw, UserPlus, FolderKanban, PauseCircle, PlayCircle,
  XCircle, PlusCircle, ChevronDown, ChevronRight, GitBranch, ArrowRightLeft, Building2, RotateCcw, Trash2
} from "lucide-react"
import {
  getTicketById, updateTicketStatusWithRemarks, addComment, getTicketAuditLog,
  getChildTickets, getTicketRedirectHistory, redirectTicket, getUsers, deleteTicketWithRemarks
} from "@/lib/actions/tickets"
import { getSubcategoryDetails, getBusinessUnitGroups } from "@/lib/actions/master-data"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import StatusChangeModal from "@/components/tickets/status-change-modal"
import RedirectTicketModal from "@/components/tickets/redirect-ticket-modal"
import CreateSubTicketModal from "@/components/tickets/create-sub-ticket-modal"

export default function TicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ticketId = params.id as string
  const [ticket, setTicket] = useState<any>(null)
  const [closureSteps, setClosureSteps] = useState<string | null>(null)
  const [auditLog, setAuditLog] = useState<any[]>([])
  const [childTickets, setChildTickets] = useState<any[]>([])
  const [redirectHistory, setRedirectHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [addingComment, setAddingComment] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])

  // Modal states
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showRedirectModal, setShowRedirectModal] = useState(false)
  const [showSubTicketModal, setShowSubTicketModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteRemarks, setDeleteRemarks] = useState("")

  // Expand/collapse states
  const [showChildren, setShowChildren] = useState(true)
  const [showRedirects, setShowRedirects] = useState(false)

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
    if (ticketId && !isNaN(Number(ticketId))) {
      loadTicket()
      loadUsers()
    } else {
      setLoading(false)
    }
  }, [ticketId])

  const loadTicket = async () => {
    setLoading(true)
    const result = await getTicketById(Number(ticketId))
    if (result.success) {
      setTicket(result.data)
      // Fetch closure steps if ticket has a subcategory
      if (result.data?.subcategory_id) {
        const subcatResult = await getSubcategoryDetails(result.data.subcategory_id)
        if (subcatResult.success && subcatResult.data?.closure_steps) {
          setClosureSteps(subcatResult.data.closure_steps)
        }
      }
      // Fetch audit log
      const auditResult = await getTicketAuditLog(Number(ticketId))
      if (auditResult.success) {
        setAuditLog(auditResult.data || [])
      }
      // Fetch child tickets if this is a parent
      if (result.data?.is_parent || result.data?.child_count > 0) {
        const childResult = await getChildTickets(Number(ticketId))
        if (childResult.success) {
          setChildTickets(childResult.data || [])
        }
      }
      // Fetch redirect history
      if (result.data?.redirect_count > 0) {
        const redirectResult = await getTicketRedirectHistory(Number(ticketId))
        if (redirectResult.success) {
          setRedirectHistory(redirectResult.data || [])
        }
      }
    }
    setLoading(false)
  }

  const loadUsers = async () => {
    const result = await getUsers()
    if (result.success && result.data) {
      setUsers(result.data)
    }
  }

  const handleStatusChangeConfirm = async (newStatus: string, remarks: string) => {
    const result = await updateTicketStatusWithRemarks(Number(ticketId), newStatus, remarks)
    if (result.success) {
      await loadTicket()
    } else {
      throw new Error(result.error || "Failed to update status")
    }
  }

  const handleRedirectConfirm = async (toBusinessGroupId: number, toSpocId: number, remarks: string) => {
    const result = await redirectTicket({
      ticketId: Number(ticketId),
      toBusinessGroupId,
      toSpocId,
      remarks,
    })
    if (result.success) {
      await loadTicket()
    } else {
      throw new Error(result.error || "Failed to redirect ticket")
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteRemarks.trim()) {
      alert("Remarks are required for deletion")
      return
    }
    const result = await deleteTicketWithRemarks(Number(ticketId), deleteRemarks)
    if (result.success) {
      router.push("/tickets")
    } else {
      alert(result.error || "Failed to delete ticket")
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    setAddingComment(true)
    const result = await addComment(Number(ticketId), newComment)
    if (result.success) {
      setNewComment("")
      await loadTicket()
    }
    setAddingComment(false)
  }

  const canPerformActions = () => {
    if (!currentUser) return false
    const userId = Number(currentUser.id)
    return (
      userId === ticket?.spoc_user_id ||
      userId === ticket?.assigned_to ||
      userId === ticket?.created_by ||
      currentUser.role?.toLowerCase() === "admin"
    )
  }

  const canRedirect = () => {
    if (!currentUser) return false
    const userId = Number(currentUser.id)
    return userId === ticket?.spoc_user_id || currentUser.role?.toLowerCase() === "admin"
  }

  const canCreateSubTicket = () => {
    if (!currentUser) return false
    const userId = Number(currentUser.id)
    return userId === ticket?.spoc_user_id || currentUser.role?.toLowerCase() === "admin"
  }

  const canDelete = () => {
    if (!currentUser) return false
    const userId = Number(currentUser.id)
    return userId === ticket?.created_by || currentUser.role?.toLowerCase() === "admin"
  }

  const statusColors: Record<string, string> = {
    open: "bg-blue-100 text-blue-700",
    closed: "bg-green-100 text-green-700",
    hold: "bg-yellow-100 text-yellow-700",
    "on-hold": "bg-yellow-100 text-yellow-700",
    resolved: "bg-emerald-100 text-emerald-700",
    returned: "bg-orange-100 text-orange-700",
    deleted: "bg-gray-100 text-gray-500",
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-foreground-secondary">Loading ticket...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!ticket) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-foreground-secondary">Ticket not found</p>
          <Button onClick={() => router.push("/tickets")} className="mt-4">
            Back to Tickets
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/tickets")} className="p-2 hover:bg-surface rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-poppins font-bold text-foreground">#{ticket.ticket_number}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[ticket.status] || statusColors["open"]}`}>
                {ticket.status === "on-hold" ? "ON-HOLD" : ticket.status.toUpperCase()}
              </span>
              {ticket.parent_ticket_id && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                  Sub-ticket
                </span>
              )}
              {ticket.is_parent && (
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
                  Parent ({ticket.child_count} sub-ticket{ticket.child_count !== 1 ? "s" : ""})
                </span>
              )}
            </div>
            <p className="text-foreground-secondary mt-1">{ticket.title}</p>
          </div>
          {ticket.status !== "deleted" && (
            <Button
              onClick={() => router.push(`/tickets/${ticketId}/edit`)}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Ticket
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Details Card */}
            <div className="bg-white border border-border rounded-xl p-6">
              <h2 className="font-poppins font-bold text-foreground mb-4">Details</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground-secondary">Description</label>
                  <p className="text-foreground mt-1">{ticket.description || "No description provided"}</p>
                </div>
              </div>
            </div>

            {/* Sub-Tickets Section */}
            {(ticket.is_parent || childTickets.length > 0) && (
              <div className="bg-white border border-border rounded-xl p-6">
                <button
                  onClick={() => setShowChildren(!showChildren)}
                  className="flex items-center gap-2 w-full text-left"
                >
                  {showChildren ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  <GitBranch className="w-5 h-5 text-purple-600" />
                  <h2 className="font-poppins font-bold text-foreground">
                    Sub-Tickets ({childTickets.length})
                  </h2>
                </button>

                {showChildren && (
                  <div className="mt-4 space-y-2">
                    {childTickets.length > 0 ? (
                      childTickets.map((child: any) => (
                        <div
                          key={child.id}
                          onClick={() => router.push(`/tickets/${child.id}`)}
                          className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-surface cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-foreground">#{child.ticket_number}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[child.status] || statusColors["open"]}`}>
                              {child.status}
                            </span>
                          </div>
                          <div className="flex-1 mx-4">
                            <p className="text-sm text-foreground truncate">{child.title}</p>
                            <p className="text-xs text-muted-foreground">{child.assignee_name || "Unassigned"}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No sub-tickets yet.</p>
                    )}

                    {canCreateSubTicket() && ticket.status !== "deleted" && (
                      <Button
                        onClick={() => setShowSubTicketModal(true)}
                        variant="outline"
                        className="w-full mt-3"
                      >
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Create Sub-Ticket
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Comments Section */}
            <div className="bg-white border border-border rounded-xl p-6">
              <h2 className="font-poppins font-bold text-foreground mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Comments ({ticket.comments?.length || 0})
              </h2>

              <div className="space-y-4 mb-6">
                {ticket.comments?.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-medium text-sm">
                      {comment.user_name?.charAt(0) || "U"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{comment.user_name}</span>
                        <span className="text-xs text-foreground-secondary">
                          {format(new Date(comment.created_at), "MMM dd, yyyy HH:mm")}
                        </span>
                      </div>
                      <p className="text-foreground-secondary mt-1">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {ticket.status !== "deleted" && (
                <div className="space-y-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm resize-none"
                    rows={3}
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || addingComment}
                    className="bg-gradient-to-r from-primary to-secondary"
                  >
                    {addingComment ? "Adding..." : "Add Comment"}
                  </Button>
                </div>
              )}
            </div>

            {/* Attachments */}
            <div className="bg-white border border-border rounded-xl p-6">
              <h2 className="font-poppins font-bold text-foreground mb-4 flex items-center gap-2">
                <Paperclip className="w-5 h-5" />
                Attachments ({ticket.attachments?.length || 0})
              </h2>
              {ticket.attachments?.length > 0 ? (
                <div className="space-y-2">
                  {ticket.attachments.map((attachment: any) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-surface transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{attachment.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {attachment.file_size ? `${(attachment.file_size / 1024).toFixed(1)} KB` : "Unknown size"}
                            {attachment.uploader_name && ` - Uploaded by ${attachment.uploader_name}`}
                          </p>
                        </div>
                      </div>
                      {attachment.file_url ? (
                        <a
                          href={attachment.file_url}
                          download={attachment.file_name}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">No file URL</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No attachments yet. Add attachments when editing this ticket.
                </p>
              )}
            </div>

            {/* Closure Steps */}
            {closureSteps && (
              <div className="bg-white border border-border rounded-xl p-6">
                <h2 className="font-poppins font-bold text-foreground mb-4 flex items-center gap-2">
                  <ListChecks className="w-5 h-5" />
                  Closure Steps
                </h2>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{closureSteps}</p>
                </div>
              </div>
            )}

            {/* Redirect History */}
            {redirectHistory.length > 0 && (
              <div className="bg-white border border-border rounded-xl p-6">
                <button
                  onClick={() => setShowRedirects(!showRedirects)}
                  className="flex items-center gap-2 w-full text-left"
                >
                  {showRedirects ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  <ArrowRightLeft className="w-5 h-5 text-orange-600" />
                  <h2 className="font-poppins font-bold text-foreground">
                    Redirect History ({redirectHistory.length})
                  </h2>
                </button>

                {showRedirects && (
                  <div className="mt-4 space-y-3">
                    {redirectHistory.map((redirect: any) => (
                      <div key={redirect.id} className="p-3 border border-border rounded-lg bg-surface/50">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">From:</span>
                          <span className="font-medium">{redirect.from_business_group_name}</span>
                          <span className="text-muted-foreground">({redirect.from_spoc_name})</span>
                          <ArrowRightLeft className="w-4 h-4 text-muted-foreground mx-2" />
                          <span className="text-muted-foreground">To:</span>
                          <span className="font-medium">{redirect.to_business_group_name}</span>
                          <span className="text-muted-foreground">({redirect.to_spoc_name})</span>
                        </div>
                        <p className="text-sm text-foreground mt-2">"{redirect.remarks}"</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          By {redirect.redirected_by_name} on {format(new Date(redirect.created_at), "MMM dd, yyyy HH:mm")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            {ticket.status !== "deleted" && canPerformActions() && (
              <div className="bg-white border border-border rounded-xl p-6">
                <h3 className="font-poppins font-semibold text-foreground mb-4">Actions</h3>
                <div className="space-y-2">
                  <Button
                    onClick={() => setShowStatusModal(true)}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Change Status
                  </Button>

                  {canRedirect() && (
                    <Button
                      onClick={() => setShowRedirectModal(true)}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <ArrowRightLeft className="w-4 h-4 mr-2" />
                      Redirect Ticket
                    </Button>
                  )}

                  {canCreateSubTicket() && !ticket.parent_ticket_id && (
                    <Button
                      onClick={() => setShowSubTicketModal(true)}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <GitBranch className="w-4 h-4 mr-2" />
                      Create Sub-Ticket
                    </Button>
                  )}

                  {canDelete() && (
                    <Button
                      onClick={() => setShowDeleteModal(true)}
                      variant="outline"
                      className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Ticket
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Ticket Info */}
            <div className="bg-white border border-border rounded-xl p-6">
              <h3 className="font-poppins font-semibold text-foreground mb-4">Information</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-foreground-secondary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-foreground-secondary">SPOC</p>
                    <p className="text-sm font-medium text-foreground">{ticket.spoc_name || "-"}</p>
                    {ticket.spoc_group_name && (
                      <p className="text-xs text-muted-foreground">{ticket.spoc_group_name}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-foreground-secondary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-foreground-secondary">Assignee</p>
                    <p className="text-sm font-medium text-foreground">{ticket.assignee_name || "Unassigned"}</p>
                    {ticket.assignee_group_name && (
                      <p className="text-xs text-muted-foreground">{ticket.assignee_group_name}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-foreground-secondary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-foreground-secondary">Creator</p>
                    <p className="text-sm font-medium text-foreground">{ticket.creator_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-foreground-secondary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-foreground-secondary">Business Group</p>
                    <p className="text-sm font-medium text-foreground">{ticket.group_name || "-"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-foreground-secondary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-foreground-secondary">Created</p>
                    <p className="text-sm font-medium text-foreground">
                      {format(new Date(ticket.created_at), "MMM dd, yyyy HH:mm")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-foreground-secondary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-foreground-secondary">Estimated Duration</p>
                    <p className="text-sm font-medium text-foreground">{ticket.estimated_duration || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Tag className="w-5 h-5 text-foreground-secondary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-foreground-secondary">Type</p>
                    <p className="text-sm font-medium text-foreground capitalize">{ticket.ticket_type}</p>
                  </div>
                </div>

                {ticket.category && (
                  <div className="flex items-start gap-3">
                    <Tag className="w-5 h-5 text-foreground-secondary mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-foreground-secondary">Category</p>
                      <p className="text-sm font-medium text-foreground">{ticket.category}</p>
                    </div>
                  </div>
                )}

                {ticket.subcategory && (
                  <div className="flex items-start gap-3">
                    <Tag className="w-5 h-5 text-foreground-secondary mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-foreground-secondary">Subcategory</p>
                      <p className="text-sm font-medium text-foreground">{ticket.subcategory}</p>
                    </div>
                  </div>
                )}

                {ticket.parent_ticket_id && (
                  <div className="flex items-start gap-3">
                    <GitBranch className="w-5 h-5 text-purple-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-foreground-secondary">Parent Ticket</p>
                      <button
                        onClick={() => router.push(`/tickets/${ticket.parent_ticket_id}`)}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        #{ticket.parent_ticket_number}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Activity History / Audit Trail */}
            {auditLog.length > 0 && (
              <div className="bg-white border border-border rounded-xl p-6">
                <h3 className="font-poppins font-semibold text-foreground mb-4 flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Activity History
                </h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {auditLog.map((log: any) => {
                    // Determine icon and color based on action type
                    let icon = <RefreshCw className="w-4 h-4" />
                    let iconBg = "bg-gray-100 text-gray-600"
                    let actionText = ""

                    if (log.action_type === 'created') {
                      icon = <PlusCircle className="w-4 h-4" />
                      iconBg = "bg-blue-100 text-blue-600"
                      actionText = "created this ticket"
                    } else if (log.action_type.startsWith('status_change')) {
                      const newStatus = log.new_value
                      if (newStatus === 'closed') {
                        icon = <CheckCircle2 className="w-4 h-4" />
                        iconBg = "bg-green-100 text-green-600"
                        actionText = `closed the ticket`
                      } else if (newStatus === 'hold' || newStatus === 'on-hold') {
                        icon = <PauseCircle className="w-4 h-4" />
                        iconBg = "bg-yellow-100 text-yellow-600"
                        actionText = `put the ticket on hold`
                      } else if (newStatus === 'resolved') {
                        icon = <CheckCircle2 className="w-4 h-4" />
                        iconBg = "bg-emerald-100 text-emerald-600"
                        actionText = `resolved the ticket`
                      } else if (newStatus === 'returned') {
                        icon = <RotateCcw className="w-4 h-4" />
                        iconBg = "bg-orange-100 text-orange-600"
                        actionText = `returned the ticket`
                      } else if (newStatus === 'deleted') {
                        icon = <Trash2 className="w-4 h-4" />
                        iconBg = "bg-red-100 text-red-600"
                        actionText = `deleted the ticket`
                      } else if (newStatus === 'open') {
                        icon = <PlayCircle className="w-4 h-4" />
                        iconBg = "bg-blue-100 text-blue-600"
                        actionText = log.old_value === 'closed' ? `reopened the ticket` : log.old_value === 'hold' ? `removed hold from the ticket` : `opened the ticket`
                      } else {
                        actionText = `changed status from ${log.old_value} to ${newStatus}`
                      }
                    } else if (log.action_type === 'assignment_change') {
                      icon = <UserPlus className="w-4 h-4" />
                      iconBg = "bg-purple-100 text-purple-600"
                      actionText = `assigned ticket to ${log.new_value}`
                      if (log.old_value && log.old_value !== 'Unassigned') {
                        actionText = `reassigned ticket from ${log.old_value} to ${log.new_value}`
                      }
                    } else if (log.action_type === 'project_change') {
                      icon = <FolderKanban className="w-4 h-4" />
                      iconBg = "bg-indigo-100 text-indigo-600"
                      if (log.new_value === 'None') {
                        actionText = `removed project assignment`
                      } else if (log.old_value === 'None') {
                        actionText = `assigned to project ${log.new_value}`
                      } else {
                        actionText = `moved to project ${log.new_value}`
                      }
                    } else if (log.action_type === 'ticket_redirect') {
                      icon = <ArrowRightLeft className="w-4 h-4" />
                      iconBg = "bg-orange-100 text-orange-600"
                      actionText = `redirected ticket: ${log.old_value} -> ${log.new_value}`
                    } else if (log.action_type === 'sub_ticket_created') {
                      icon = <GitBranch className="w-4 h-4" />
                      iconBg = "bg-purple-100 text-purple-600"
                      actionText = log.new_value
                    } else {
                      actionText = `${log.action_type}: ${log.new_value || ''}`
                    }

                    return (
                      <div key={log.id} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconBg}`}>
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">
                            <span className="font-medium">{log.performed_by_name || 'System'}</span>
                            {' '}{actionText}
                          </p>
                          {log.notes && (
                            <p className="text-xs text-muted-foreground mt-0.5 italic">"{log.notes}"</p>
                          )}
                          <p className="text-xs text-foreground-secondary mt-0.5">
                            {format(new Date(log.created_at), "MMM dd, yyyy 'at' HH:mm")}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {currentUser && (
        <>
          <StatusChangeModal
            isOpen={showStatusModal}
            onClose={() => setShowStatusModal(false)}
            onConfirm={handleStatusChangeConfirm}
            currentStatus={ticket.status}
            ticketNumber={ticket.ticket_number}
            ticketTitle={ticket.title}
            currentUser={{ id: Number(currentUser.id), role: currentUser.role }}
            ticket={{
              created_by: ticket.created_by,
              assigned_to: ticket.assigned_to,
              spoc_user_id: ticket.spoc_user_id,
            }}
          />

          <RedirectTicketModal
            isOpen={showRedirectModal}
            onClose={() => setShowRedirectModal(false)}
            onConfirm={handleRedirectConfirm}
            ticketNumber={ticket.ticket_number}
            ticketTitle={ticket.title}
            currentBusinessGroup={ticket.business_unit_group_id ? { id: ticket.business_unit_group_id, name: ticket.group_name || "" } : null}
            currentSpoc={ticket.spoc_user_id ? { id: ticket.spoc_user_id, name: ticket.spoc_name || "" } : null}
            users={users}
          />

          <CreateSubTicketModal
            isOpen={showSubTicketModal}
            onClose={() => setShowSubTicketModal(false)}
            onSuccess={loadTicket}
            parentTicket={{
              id: ticket.id,
              ticket_number: ticket.ticket_number,
              title: ticket.title,
              business_unit_group_id: ticket.business_unit_group_id,
              spoc_user_id: ticket.spoc_user_id,
            }}
          />
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="font-poppins font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Delete Ticket
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete ticket #{ticket.ticket_number}? This action cannot be undone.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Remarks <span className="text-red-500">*</span>
              </label>
              <textarea
                value={deleteRemarks}
                onChange={(e) => setDeleteRemarks(e.target.value)}
                placeholder="Please provide a reason for deletion..."
                className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-sm resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                disabled={!deleteRemarks.trim()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Ticket
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
