"use client"

import { useState, useEffect } from "react"
import { X, AlertCircle, GitBranch, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getBusinessUnitGroups, getCategories, getSubcategories } from "@/lib/actions/master-data"
import { createSubTicket, getUsers } from "@/lib/actions/tickets"

interface CreateSubTicketModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  parentTicket: {
    id: number
    ticket_number: number
    title: string
    business_unit_group_id: number
    spoc_user_id: number | null
  }
}

export default function CreateSubTicketModal({
  isOpen,
  onClose,
  onSuccess,
  parentTicket,
}: CreateSubTicketModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form data
  const [ticketType, setTicketType] = useState<"support" | "requirement">("support")
  const [businessGroupId, setBusinessGroupId] = useState<number | null>(null)
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [estimatedDuration, setEstimatedDuration] = useState("")
  const [spocId, setSpocId] = useState<number | null>(null)

  // Reference data
  const [businessGroups, setBusinessGroups] = useState<Array<{ id: number; name: string }>>([])
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([])
  const [subcategories, setSubcategories] = useState<Array<{ id: number; name: string; category_id: number }>>([])
  const [users, setUsers] = useState<Array<{ id: number; full_name: string; email: string }>>([])

  // Filtered categories and subcategories
  const filteredSubcategories = categoryId
    ? subcategories.filter(sc => sc.category_id === categoryId)
    : []

  useEffect(() => {
    if (isOpen) {
      loadReferenceData()
      resetForm()
    }
  }, [isOpen])

  const loadReferenceData = async () => {
    setIsLoading(true)
    try {
      const [bgResult, catResult, subcatResult, usersResult] = await Promise.all([
        getBusinessUnitGroups(),
        getCategories(),
        getSubcategories(),
        getUsers(),
      ])

      if (bgResult.success && bgResult.data) {
        setBusinessGroups(bgResult.data as Array<{ id: number; name: string }>)
      }
      if (catResult.success && catResult.data) {
        setCategories(catResult.data as Array<{ id: number; name: string }>)
      }
      if (subcatResult.success && subcatResult.data) {
        setSubcategories(subcatResult.data as Array<{ id: number; name: string; category_id: number }>)
      }
      if (usersResult.success && usersResult.data) {
        setUsers(usersResult.data as Array<{ id: number; full_name: string; email: string }>)
      }
    } catch (err) {
      console.error("Error loading reference data:", err)
    }
    setIsLoading(false)
  }

  const resetForm = () => {
    setTicketType("support")
    setBusinessGroupId(parentTicket.business_unit_group_id || null)
    setCategoryId(null)
    setSubcategoryId(null)
    setTitle("")
    setDescription("")
    setEstimatedDuration("")
    setSpocId(parentTicket.spoc_user_id || null)
    setError(null)
  }

  const handleSubmit = async () => {
    // Validation
    if (!businessGroupId) {
      setError("Please select a business group")
      return
    }
    if (ticketType === "support" && !categoryId) {
      setError("Please select a category for support tickets")
      return
    }
    if (ticketType === "requirement" && !title.trim()) {
      setError("Please enter a title for requirement tickets")
      return
    }
    if (!description.trim()) {
      setError("Please enter a description")
      return
    }
    if (!spocId) {
      setError("Please select a SPOC")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await createSubTicket(parentTicket.id, {
        ticketType,
        businessUnitGroupId: businessGroupId,
        categoryId,
        subcategoryId,
        title: title.trim() || `Sub-ticket for #${parentTicket.ticket_number}`,
        description: description.trim(),
        estimatedDuration,
        spocId,
      })

      if (result.success) {
        onSuccess()
        onClose()
      } else {
        setError(result.error || "Failed to create sub-ticket")
      }
    } catch (err: any) {
      setError(err.message || "Failed to create sub-ticket")
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
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <GitBranch className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-poppins font-semibold text-lg text-foreground">
                Create Sub-Ticket
              </h2>
              <p className="text-sm text-muted-foreground">
                Parent: #{parentTicket.ticket_number} - {parentTicket.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-surface rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Ticket Type */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Ticket Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="ticketType"
                      value="support"
                      checked={ticketType === "support"}
                      onChange={() => setTicketType("support")}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm text-foreground">Support</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="ticketType"
                      value="requirement"
                      checked={ticketType === "requirement"}
                      onChange={() => setTicketType("requirement")}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm text-foreground">Requirement</span>
                  </label>
                </div>
              </div>

              {/* Business Group */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Target Business Group <span className="text-red-500">*</span>
                </label>
                <select
                  value={businessGroupId || ""}
                  onChange={(e) => setBusinessGroupId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
                >
                  <option value="">Select Business Group...</option>
                  {businessGroups.map((bg) => (
                    <option key={bg.id} value={bg.id}>
                      {bg.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category (for Support) */}
              {ticketType === "support" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={categoryId || ""}
                      onChange={(e) => {
                        setCategoryId(e.target.value ? Number(e.target.value) : null)
                        setSubcategoryId(null)
                      }}
                      className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
                    >
                      <option value="">Select Category...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Subcategory
                    </label>
                    <select
                      value={subcategoryId || ""}
                      onChange={(e) => setSubcategoryId(e.target.value ? Number(e.target.value) : null)}
                      disabled={!categoryId}
                      className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Subcategory...</option>
                      {filteredSubcategories.map((sc) => (
                        <option key={sc.id} value={sc.id}>
                          {sc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Title (for Requirement) */}
              {ticketType === "requirement" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter ticket title..."
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue or requirement..."
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm resize-none"
                  rows={4}
                />
              </div>

              {/* Estimated Duration & SPOC */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Estimated Duration
                  </label>
                  <input
                    type="text"
                    value={estimatedDuration}
                    onChange={(e) => setEstimatedDuration(e.target.value)}
                    placeholder="e.g., 2 hours, 1 day"
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    SPOC <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={spocId || ""}
                    onChange={(e) => setSpocId(e.target.value ? Number(e.target.value) : null)}
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
              </div>
            </>
          )}

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
            disabled={isSubmitting || isLoading}
            className="bg-gradient-to-r from-primary to-secondary"
          >
            <Plus className="w-4 h-4 mr-2" />
            {isSubmitting ? "Creating..." : "Create Sub-Ticket"}
          </Button>
        </div>
      </div>
    </div>
  )
}
