"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { ArrowLeft, Save } from "lucide-react"
import { getTicketById } from "@/lib/actions/tickets"
import { getBusinessUnitGroups, getCategories, getSubcategories } from "@/lib/actions/master-data"
import { getUsers } from "@/lib/actions/tickets"
import { Button } from "@/components/ui/button"
import { updateTicket } from "@/lib/actions/tickets"

export default function EditTicketPage() {
  const params = useParams()
  const router = useRouter()
  const ticketId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "",
    priority: "",
    businessUnitGroupId: "",
    categoryId: "",
    subcategoryId: "",
    assigneeId: "",
    estimatedDuration: "",
  })

  const [businessUnitGroups, setBusinessUnitGroups] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [subcategories, setSubcategories] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [ticketId])

  const loadData = async () => {
    setLoading(true)
    const [ticketResult, buResult, catResult, usersResult] = await Promise.all([
      getTicketById(Number(ticketId)),
      getBusinessUnitGroups(),
      getCategories(),
      getUsers(),
    ])

    if (ticketResult.success) {
      const ticket = ticketResult.data
      setFormData({
        title: ticket.title || "",
        description: ticket.description || "",
        status: ticket.status || "",
        priority: ticket.priority || "",
        businessUnitGroupId: ticket.business_unit_group_id?.toString() || "",
        categoryId: ticket.category_id?.toString() || "",
        subcategoryId: ticket.subcategory_id?.toString() || "",
        assigneeId: ticket.assigned_to?.toString() || "",
        estimatedDuration: ticket.estimated_duration || "",
      })

      if (ticket.category_id) {
        const subcatResult = await getSubcategories(ticket.category_id)
        if (subcatResult.success) setSubcategories(subcatResult.data)
      }
    }

    if (buResult.success) setBusinessUnitGroups(buResult.data)
    if (catResult.success) setCategories(catResult.data)
    if (usersResult.success) setUsers(usersResult.data)

    setLoading(false)
  }

  useEffect(() => {
    if (formData.categoryId) {
      loadSubcategories(Number(formData.categoryId))
    }
  }, [formData.categoryId])

  const loadSubcategories = async (categoryId: number) => {
    const result = await getSubcategories(categoryId)
    if (result.success) {
      setSubcategories(result.data)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const result = await updateTicket(Number(ticketId), {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      businessUnitGroupId: Number(formData.businessUnitGroupId),
      categoryId: Number(formData.categoryId),
      subcategoryId: Number(formData.subcategoryId),
      assigneeId: Number(formData.assigneeId),
      estimatedDuration: formData.estimatedDuration,
    })

    setSaving(false)

    if (result.success) {
      router.push(`/tickets/${ticketId}`)
    } else {
      alert("Failed to update ticket")
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-foreground-secondary">Loading...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="p-2 hover:bg-surface rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-poppins font-bold text-foreground">Edit Ticket</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white border border-border rounded-xl p-6 space-y-4">
            <h3 className="font-poppins font-semibold text-foreground">Basic Information</h3>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
                >
                  <option value="open">Open</option>
                  <option value="hold">On Hold</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Priority *</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white border border-border rounded-xl p-6 space-y-4">
            <h3 className="font-poppins font-semibold text-foreground">Classification</h3>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Business Unit Group *</label>
              <select
                value={formData.businessUnitGroupId}
                onChange={(e) => setFormData({ ...formData, businessUnitGroupId: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
              >
                <option value="">Select...</option>
                {businessUnitGroups.map((bu) => (
                  <option key={bu.id} value={bu.id}>
                    {bu.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Category *</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
              >
                <option value="">Select...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Subcategory *</label>
              <select
                value={formData.subcategoryId}
                onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value })}
                required
                disabled={!formData.categoryId}
                className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm disabled:opacity-50"
              >
                <option value="">Select...</option>
                {subcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white border border-border rounded-xl p-6 space-y-4">
            <h3 className="font-poppins font-semibold text-foreground">Assignment</h3>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Assignee *</label>
              <select
                value={formData.assigneeId}
                onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
              >
                <option value="">Select...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Estimated Duration</label>
              <input
                type="text"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-gradient-to-r from-primary to-secondary">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
