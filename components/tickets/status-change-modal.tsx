"use client"

import { useState, useEffect } from "react"
import { X, AlertCircle, CheckCircle2, PauseCircle, PlayCircle, RotateCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TICKET_STATUSES, STATUS_CONFIG, getAvailableStatusOptions } from "@/lib/constants/ticket-statuses"
import type { TicketStatus } from "@/lib/constants/ticket-statuses"

interface StatusChangeModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (status: string, remarks: string) => Promise<void>
  currentStatus: string
  ticketNumber: number
  ticketTitle: string
  currentUser: {
    id: number
    role: string
  }
  ticket: {
    created_by: number
    assigned_to: number | null
    spoc_user_id: number | null
  }
}

const statusIcons: Record<string, React.ReactNode> = {
  'open': <PlayCircle className="w-5 h-5" />,
  'on-hold': <PauseCircle className="w-5 h-5" />,
  'resolved': <CheckCircle2 className="w-5 h-5" />,
  'closed': <CheckCircle2 className="w-5 h-5" />,
  'returned': <RotateCcw className="w-5 h-5" />,
  'deleted': <Trash2 className="w-5 h-5" />,
}

export default function StatusChangeModal({
  isOpen,
  onClose,
  onConfirm,
  currentStatus,
  ticketNumber,
  ticketTitle,
  currentUser,
  ticket,
}: StatusChangeModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [remarks, setRemarks] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get available status options based on current status and user permissions
  const availableStatuses = getAvailableStatusOptions(
    currentStatus as TicketStatus,
    currentUser.role as 'admin' | 'user' | 'agent',
    currentUser.id,
    ticket
  )

  useEffect(() => {
    if (isOpen) {
      setSelectedStatus("")
      setRemarks("")
      setError(null)
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!selectedStatus) {
      setError("Please select a status")
      return
    }

    if (!remarks.trim()) {
      setError("Remarks are required for status changes")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onConfirm(selectedStatus, remarks.trim())
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to update status")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-poppins font-semibold text-lg text-foreground">
              Change Status
            </h2>
            <p className="text-sm text-muted-foreground">
              Ticket #{ticketNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Current Status */}
          <div className="bg-surface/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Current Status</p>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                STATUS_CONFIG[currentStatus as TicketStatus]?.bgColor || 'bg-gray-100'
              } ${STATUS_CONFIG[currentStatus as TicketStatus]?.color || 'text-gray-700'}`}>
                {statusIcons[currentStatus]}
                {STATUS_CONFIG[currentStatus as TicketStatus]?.label || currentStatus}
              </span>
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              New Status <span className="text-red-500">*</span>
            </label>
            {availableStatuses.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-700">
                  No status transitions available for your role.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {availableStatuses.map((status) => (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => setSelectedStatus(status.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all text-left ${
                      selectedStatus === status.value
                        ? `${STATUS_CONFIG[status.value]?.bgColor} ${STATUS_CONFIG[status.value]?.borderColor} ring-2 ring-offset-1 ring-primary/30`
                        : 'border-border hover:bg-surface'
                    }`}
                  >
                    <span className={selectedStatus === status.value
                      ? STATUS_CONFIG[status.value]?.color
                      : 'text-muted-foreground'
                    }>
                      {statusIcons[status.value]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${
                        selectedStatus === status.value
                          ? STATUS_CONFIG[status.value]?.color
                          : 'text-foreground'
                      }`}>
                        {status.label}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Remarks <span className="text-red-500">*</span>
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Please provide a reason for this status change..."
              className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm resize-none"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Remarks will be recorded in the ticket's activity history.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface/30">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedStatus || !remarks.trim()}
            className="bg-gradient-to-r from-primary to-secondary"
          >
            {isSubmitting ? "Updating..." : "Update Status"}
          </Button>
        </div>
      </div>
    </div>
  )
}
