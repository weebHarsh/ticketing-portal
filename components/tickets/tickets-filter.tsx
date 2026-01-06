"use client"

import { useState } from "react"
import { Search, Filter } from "lucide-react"

interface TicketsFilterProps {
  onFilterChange: (filters: any) => void
}

export default function TicketsFilter({ onFilterChange }: TicketsFilterProps) {
  const [filters, setFilters] = useState({
    status: "all",
    dateFrom: "",
    dateTo: "",
    assignee: "",
    type: "all",
    search: "",
  })

  const handleApplyFilters = () => {
    onFilterChange(filters)
  }

  const handleReset = () => {
    const resetFilters = {
      status: "all",
      dateFrom: "",
      dateTo: "",
      assignee: "",
      type: "all",
      search: "",
    }
    setFilters(resetFilters)
    onFilterChange(resetFilters)
  }

  return (
    <div className="bg-white border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-foreground" />
        <h3 className="font-poppins font-semibold text-foreground">Filters</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-foreground-secondary" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-4 py-2.5 pl-10 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="hold">On Hold</option>
          </select>
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Type</label>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
          >
            <option value="all">All Types</option>
            <option value="support">Support Issues</option>
            <option value="requirement">New Requirements</option>
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">From Date</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">To Date</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pt-4 border-t border-border">
        <button
          onClick={handleReset}
          className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-surface transition-colors text-sm font-medium"
        >
          Reset
        </button>
        <button
          onClick={handleApplyFilters}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors text-sm font-medium"
        >
          Apply Filters
        </button>
      </div>
    </div>
  )
}
