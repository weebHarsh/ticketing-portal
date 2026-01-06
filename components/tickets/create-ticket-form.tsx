"use client"

import type React from "react"

import { useState, useEffect, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, CheckCircle, Plus, X } from "lucide-react"
import { createTicket, getUsers } from "@/lib/actions/tickets"
import {
  getBusinessUnitGroups,
  getCategories,
  getSubcategories,
  getAutoTitleTemplate,
  getProjects,
  getProductReleases,
} from "@/lib/actions/master-data"
import { Combobox } from "@/components/ui/combobox"

interface FormData {
  ticketType: "support" | "requirement"
  businessUnitGroupId: string
  projectName: string
  categoryId: string
  subcategoryId: string
  title: string
  description: string
  estimatedDuration: string
  assigneeId: string
  productReleaseName: string
  attachments: File[]
}

export default function CreateTicketForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isDuplicate = searchParams.get("duplicate") === "true"

  const [formData, setFormData] = useState<FormData>({
    ticketType: (searchParams.get("ticketType") as "support" | "requirement") || "support",
    businessUnitGroupId: searchParams.get("businessUnitGroupId") || "",
    projectName: searchParams.get("projectName") || "",
    categoryId: searchParams.get("categoryId") || "",
    subcategoryId: searchParams.get("subcategoryId") || "",
    title: searchParams.get("title") || "",
    description: searchParams.get("description") || "",
    estimatedDuration: searchParams.get("estimatedDuration") || "",
    assigneeId: searchParams.get("assigneeId") || "",
    productReleaseName: searchParams.get("productReleaseName") || "",
    attachments: [],
  })

  const [businessUnitGroups, setBusinessUnitGroups] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [subcategories, setSubcategories] = useState<any[]>([])
  const [assignees, setAssignees] = useState<any[]>([])
  const [productReleases, setProductReleases] = useState<any[]>([])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    console.log("[v0] Loading initial data for create ticket form")
    const [buResult, catResult, usersResult, releasesResult] = await Promise.all([
      getBusinessUnitGroups(),
      getCategories(),
      getUsers(),
      getProductReleases(),
    ])

    console.log("[v0] Business Units:", buResult)
    console.log("[v0] Categories:", catResult)
    console.log("[v0] Users:", usersResult)
    console.log("[v0] Product Releases:", releasesResult)

    if (buResult.success) setBusinessUnitGroups(buResult.data || [])
    if (catResult.success) setCategories(catResult.data || [])
    if (usersResult.success) setAssignees(usersResult.data || [])
    if (releasesResult.success) setProductReleases(releasesResult.data || [])

    // If duplicating, load dependent data
    if (isDuplicate) {
      if (formData.businessUnitGroupId) {
        loadProjects(Number(formData.businessUnitGroupId))
      }
      if (formData.categoryId) {
        loadSubcategories(Number(formData.categoryId))
      }
    }
  }

  const loadProjects = async (businessUnitGroupId: number) => {
    console.log("[v0] Loading projects for business unit:", businessUnitGroupId)
    const result = await getProjects(businessUnitGroupId)
    console.log("[v0] Projects result:", result)
    if (result.success) {
      setProjects(result.data || [])
    }
  }

  useEffect(() => {
    if (formData.categoryId) {
      loadSubcategories(Number(formData.categoryId))
    } else {
      setSubcategories([])
      setFormData((prev) => ({ ...prev, subcategoryId: "", title: "", estimatedDuration: "", assigneeId: "" }))
    }
  }, [formData.categoryId])

  const loadSubcategories = async (categoryId: number) => {
    console.log("[v0] Loading subcategories for category:", categoryId)
    const result = await getSubcategories(categoryId)
    console.log("[v0] Subcategories result:", result)
    if (result.success) {
      setSubcategories(result.data || [])
    }
  }

  useEffect(() => {
    // Try auto-fill when business unit, category, or subcategory changes
    if (formData.businessUnitGroupId && formData.categoryId) {
      loadAutoFillData()
    }
  }, [formData.businessUnitGroupId, formData.categoryId, formData.subcategoryId])

  const loadAutoFillData = async () => {
    console.log("[v0] Loading auto-fill data for classification")
    const result = await getAutoTitleTemplate(
      Number(formData.businessUnitGroupId),
      Number(formData.categoryId),
      formData.subcategoryId ? Number(formData.subcategoryId) : null,
    )

    console.log("[v0] Auto-fill result:", result)

    if (result.success && result.data) {
      const { auto_title_template, estimated_duration, spoc_user_id } = result.data

      setFormData((prev) => ({
        ...prev,
        title: auto_title_template || prev.title,
        estimatedDuration: estimated_duration ? `${estimated_duration} minutes` : "",
        assigneeId: spoc_user_id ? spoc_user_id.toString() : prev.assigneeId,
      }))
    }
  }

  useEffect(() => {
    if (formData.businessUnitGroupId) {
      // Load projects for this business unit
      loadProjects(Number(formData.businessUnitGroupId))
      // Only reset classification fields, keep others
      setFormData((prev) => ({
        ...prev,
        projectName: "",
        categoryId: "",
        subcategoryId: "",
      }))
    } else {
      setProjects([])
    }
  }, [formData.businessUnitGroupId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleBusinessUnitChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      businessUnitGroupId: value,
      categoryId: "",
      subcategoryId: "",
    }))
  }

  const handleCategoryChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      categoryId: value,
      subcategoryId: "",
    }))
  }

  const handleSubcategoryChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      subcategoryId: value,
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files || []
    setFormData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...Array.from(files)],
    }))
  }

  const removeAttachment = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      console.log("[v0] Submitting ticket with data:", formData)

      if (
        !formData.businessUnitGroupId ||
        !formData.categoryId ||
        !formData.title ||
        !formData.assigneeId
      ) {
        throw new Error("Please fill in all required fields")
      }

      const result = await createTicket({
        ticketType: formData.ticketType,
        businessUnitGroupId: Number(formData.businessUnitGroupId),
        projectName: formData.projectName,
        categoryId: Number(formData.categoryId),
        subcategoryId: formData.subcategoryId ? Number(formData.subcategoryId) : null,
        title: formData.title,
        description: formData.description || "",
        estimatedDuration: formData.estimatedDuration,
        assigneeId: Number(formData.assigneeId),
        productReleaseName: formData.productReleaseName,
      })

      console.log("[v0] Create ticket result:", result)

      if (!result.success) {
        throw new Error(result.error || "Failed to create ticket")
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(`/tickets?created=${result.data.ticket_id}`)
      }, 2000)
    } catch (err) {
      console.error("[v0] Error creating ticket:", err)
      setError(err instanceof Error ? err.message : "Failed to create ticket")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-6 h-6 text-success" />
        </div>
        <h3 className="text-lg font-poppins font-bold text-green-700 mb-2">Ticket Created Successfully</h3>
        <p className="text-green-600">Redirecting you to the ticket list...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-danger bg-opacity-10 border border-danger border-opacity-30 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-danger text-sm">{error}</p>
        </div>
      )}

      <div className="bg-white border border-border rounded-xl p-6">
        <h3 className="font-poppins font-semibold text-foreground mb-4">Ticket Type</h3>
        <div className="flex gap-4">
          {["support", "requirement"].map((type) => (
            <label key={type} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="ticketType"
                value={type}
                checked={formData.ticketType === type}
                onChange={handleInputChange}
                className="w-4 h-4"
              />
              <span className="text-foreground font-medium capitalize">
                {type === "support" ? "Support Issue" : "New Requirement"}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl p-6 space-y-4">
        <h3 className="font-poppins font-semibold text-foreground">Ticket Classification</h3>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Business Unit Group *</label>
          <Combobox
            options={businessUnitGroups.map((bu) => ({
              value: bu.id.toString(),
              label: bu.name,
              subtitle: bu.description,
            }))}
            value={formData.businessUnitGroupId}
            onChange={handleBusinessUnitChange}
            placeholder="Select a business unit..."
            searchPlaceholder="Search business units..."
            emptyText="No business units found"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Project Name <span className="text-xs text-foreground-secondary font-normal">(Optional)</span>
          </label>
          <Combobox
            options={projects.map((proj) => ({
              value: proj.name,
              label: proj.name,
              subtitle: proj.description,
            }))}
            value={formData.projectName}
            onChange={(value) => setFormData((prev) => ({ ...prev, projectName: value }))}
            placeholder={formData.businessUnitGroupId ? "Select a project..." : "Select a business unit first"}
            searchPlaceholder="Search projects..."
            emptyText="No projects found for this business unit"
            disabled={!formData.businessUnitGroupId}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Category *</label>
          <Combobox
            options={categories.map((cat) => ({
              value: cat.id.toString(),
              label: cat.name,
              subtitle: cat.description,
            }))}
            value={formData.categoryId}
            onChange={handleCategoryChange}
            placeholder={formData.businessUnitGroupId ? "Select a category..." : "Select a business unit first"}
            searchPlaceholder="Search categories..."
            emptyText="No categories found"
            disabled={!formData.businessUnitGroupId}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Sub-Category <span className="text-xs text-foreground-secondary font-normal">(Optional)</span>
          </label>
          <Combobox
            options={subcategories.map((sub) => ({
              value: sub.id.toString(),
              label: sub.name,
              subtitle: sub.description,
            }))}
            value={formData.subcategoryId}
            onChange={handleSubcategoryChange}
            placeholder={formData.categoryId ? "Select a sub-category (optional)..." : "Select a category first"}
            searchPlaceholder="Search sub-categories..."
            emptyText="No sub-categories available. You can proceed without selecting one."
            disabled={!formData.categoryId}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Ticket Title * <span className="text-xs text-blue-600 font-normal">(Auto-filled from classification)</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
            placeholder="Auto-populated based on category and sub-category"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Estimated Duration <span className="text-xs text-blue-600 font-normal">(Auto-filled)</span>
          </label>
          <input
            type="text"
            value={formData.estimatedDuration}
            readOnly
            className="w-full px-4 py-2.5 border border-border rounded-lg bg-surface text-foreground cursor-not-allowed text-sm"
            placeholder="Auto-populated based on classification mapping"
          />
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl p-6 space-y-4">
        <h3 className="font-poppins font-semibold text-foreground">Ticket Details</h3>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Description <span className="text-xs text-foreground-secondary font-normal">(Optional)</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Provide additional details about the ticket..."
            rows={5}
            className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Assign To * <span className="text-xs text-blue-600 font-normal">(Auto-filled with SPOC)</span>
          </label>
          <Combobox
            options={assignees.map((user) => ({
              value: user.id.toString(),
              label: user.full_name || user.name,
              subtitle: user.email,
            }))}
            value={formData.assigneeId}
            onChange={(value) => setFormData((prev) => ({ ...prev, assigneeId: value }))}
            placeholder="Select team member..."
            searchPlaceholder="Search team members..."
            emptyText="No team members found"
          />
        </div>

        {formData.ticketType === "requirement" && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Product Release Name <span className="text-xs text-foreground-secondary font-normal">(For New Requirements)</span>
            </label>
            <Combobox
              options={productReleases.map((release) => ({
                value: release.display_name,
                label: release.display_name,
                subtitle: release.package_name,
              }))}
              value={formData.productReleaseName}
              onChange={(value) => setFormData((prev) => ({ ...prev, productReleaseName: value }))}
              placeholder="Select product release..."
              searchPlaceholder="Search product releases..."
              emptyText="No product releases found"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Attachments</label>
          <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
            <div className="text-center">
              <Plus className="w-6 h-6 text-foreground-secondary mx-auto mb-2" />
              <span className="text-sm font-medium text-foreground">Click to upload or drag and drop</span>
              <p className="text-xs text-foreground-secondary mt-1">Max file size: 50MB</p>
            </div>
            <input type="file" multiple onChange={handleFileChange} className="hidden" />
          </label>

          {formData.attachments.length > 0 && (
            <div className="mt-4 space-y-2">
              {formData.attachments.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-surface border border-border rounded-lg"
                >
                  <span className="text-sm text-foreground truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="p-1 hover:bg-white rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-danger" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 border border-border rounded-lg text-foreground font-medium hover:bg-surface transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-70"
        >
          {isLoading ? "Creating..." : "Create Ticket"}
        </button>
      </div>
    </form>
  )
}
