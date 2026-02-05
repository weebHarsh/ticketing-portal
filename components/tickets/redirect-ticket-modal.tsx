"use client"

import { useState, useEffect } from "react"
import { X, AlertCircle, ArrowRight, Users, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getBusinessUnitGroups } from "@/lib/actions/master-data"

interface RedirectTicketModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (toBusinessGroupId: number, toSpocId: number, remarks: string) => Promise<void>
  ticketNumber: number
  ticketTitle: string
  currentBusinessGroup: {
    id: number
    name: string
  } | null
  currentSpoc: {
    id: number
    name: string
  } | null
  users: Array<{
    id: number
    full_name: string
    email: string
    business_unit_group_id?: number
  }>
}

export default function RedirectTicketModal({
  isOpen,
  onClose,
  onConfirm,
  ticketNumber,
  ticketTitle,
  currentBusinessGroup,
  currentSpoc,
  users,
}: RedirectTicketModalProps) {
  const [businessGroups, setBusinessGroups] = useState<Array<{ id: number; name: string }>>([])
  const [selectedBusinessGroupId, setSelectedBusinessGroupId] = useState<number | null>(null)
  const [selectedSpocId, setSelectedSpocId] = useState<number | null>(null)
  const [remarks, setRemarks] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Filter users by selected business group
  const filteredUsers = selectedBusinessGroupId
    ? users.filter(u => u.business_unit_group_id === selectedBusinessGroupId)
    : users

  useEffect(() => {
    if (isOpen) {
      loadBusinessGroups()
      setSelectedBusinessGroupId(null)
      setSelectedSpocId(null)
      setRemarks("")
      setError(null)
    }
  }, [isOpen])

  const loadBusinessGroups = async () => {
    setIsLoading(true)
    const result = await getBusinessUnitGroups()
    if (result.success && result.data) {
      setBusinessGroups(result.data as Array<{ id: number; name: string }>)
    }
    setIsLoading(false)
  }

  const handleSubmit = async () => {
    if (!selectedBusinessGroupId) {
      setError("Please select a target business group")
      return
    }

    if (!selectedSpocId) {
      setError("Please select a target SPOC")
      return
    }

    if (!remarks.trim()) {
      setError("Remarks are required for redirecting tickets")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onConfirm(selectedBusinessGroupId, selectedSpocId, remarks.trim())
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to redirect ticket")
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
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-poppins font-semibold text-lg text-foreground">
              Redirect Ticket
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
          {/* Current Assignment */}
          <div className="bg-surface/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-2">Current Assignment</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {currentBusinessGroup?.name || "Not assigned"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {currentSpoc?.name || "Not assigned"}
                </span>
              </div>
            </div>
          </div>

          {/* Arrow indicator */}
          <div className="flex justify-center">
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>

          {/* Target Business Group */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Target Business Group <span className="text-red-500">*</span>
            </label>
            {isLoading ? (
              <div className="h-10 bg-surface rounded-lg animate-pulse" />
            ) : (
              <select
                value={selectedBusinessGroupId || ""}
                onChange={(e) => {
                  setSelectedBusinessGroupId(e.target.value ? Number(e.target.value) : null)
                  setSelectedSpocId(null) // Reset SPOC when BU changes
                }}
                className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
              >
                <option value="">Select Business Group...</option>
                {businessGroups.map((bg) => (
                  <option key={bg.id} value={bg.id}>
                    {bg.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Target SPOC */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Target SPOC <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedSpocId || ""}
              onChange={(e) => setSelectedSpocId(e.target.value ? Number(e.target.value) : null)}
              disabled={!selectedBusinessGroupId}
              className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {selectedBusinessGroupId
                  ? filteredUsers.length > 0
                    ? "Select SPOC..."
                    : "No users in this group"
                  : "Select a business group first..."
                }
              </option>
              {filteredUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
            {selectedBusinessGroupId && filteredUsers.length === 0 && (
              <p className="text-xs text-yellow-600 mt-1">
                No users are assigned to this business group. You can still select from all users.
              </p>
            )}
          </div>

          {/* Show all users option if no users in selected group */}
          {selectedBusinessGroupId && filteredUsers.length === 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Or select from all users
              </label>
              <select
                value={selectedSpocId || ""}
                onChange={(e) => setSelectedSpocId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
              >
                <option value="">Select SPOC...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Remarks <span className="text-red-500">*</span>
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Please provide a reason for redirecting this ticket..."
              className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm resize-none"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              The redirect history will be recorded for tracking purposes.
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
            disabled={isSubmitting || !selectedBusinessGroupId || !selectedSpocId || !remarks.trim()}
            className="bg-gradient-to-r from-primary to-secondary"
          >
            {isSubmitting ? "Redirecting..." : "Redirect Ticket"}
          </Button>
        </div>
      </div>
    </div>
  )
}
