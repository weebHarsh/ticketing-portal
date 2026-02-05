"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import {
  AlertTriangle, Clock, Users, Building2, TrendingUp, Download,
  BarChart3, PieChart, RefreshCw, ArrowRightLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  getDelayedTicketsReport,
  getGroupLevelAnalytics,
  getSummaryStatistics,
  getUserPerformanceMetrics,
  getRedirectStatistics,
} from "@/lib/actions/admin-reports"
import { format } from "date-fns"
import * as XLSX from "xlsx"

export default function AdminReportsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const [summary, setSummary] = useState<any>(null)
  const [delayedTickets, setDelayedTickets] = useState<any[]>([])
  const [groupAnalytics, setGroupAnalytics] = useState<any[]>([])
  const [userPerformance, setUserPerformance] = useState<any[]>([])
  const [redirectStats, setRedirectStats] = useState<any[]>([])

  const [activeTab, setActiveTab] = useState<"overview" | "delayed" | "groups" | "users" | "redirects">("overview")

  useEffect(() => {
    try {
      const userData = localStorage.getItem("user")
      if (userData) {
        const user = JSON.parse(userData)
        if (user.role?.toLowerCase() !== "admin") {
          router.push("/dashboard")
          return
        }
        setCurrentUser(user)
      } else {
        router.push("/login")
        return
      }
    } catch (e) {
      router.push("/login")
      return
    }

    loadReports()
  }, [])

  const loadReports = async () => {
    setLoading(true)

    const [summaryResult, delayedResult, groupsResult, usersResult, redirectsResult] = await Promise.all([
      getSummaryStatistics(),
      getDelayedTicketsReport(),
      getGroupLevelAnalytics(),
      getUserPerformanceMetrics(),
      getRedirectStatistics(),
    ])

    if (summaryResult.success) setSummary(summaryResult.data)
    if (delayedResult.success) setDelayedTickets(delayedResult.data || [])
    if (groupsResult.success) setGroupAnalytics(groupsResult.data || [])
    if (usersResult.success) setUserPerformance(usersResult.data || [])
    if (redirectsResult.success) setRedirectStats(redirectsResult.data || [])

    setLoading(false)
  }

  const exportDelayedTickets = () => {
    const exportData = delayedTickets.map((ticket) => ({
      "Ticket #": ticket.ticket_number,
      "Title": ticket.title,
      "Status": ticket.status,
      "Business Group": ticket.business_group || "-",
      "Creator": ticket.creator_name || "-",
      "Assignee": ticket.assignee_name || "Unassigned",
      "SPOC": ticket.spoc_name || "-",
      "Estimated Duration": ticket.estimated_duration || "-",
      "Hours Elapsed": Math.round(ticket.hours_elapsed) || 0,
      "Created At": format(new Date(ticket.created_at), "MMM dd, yyyy HH:mm"),
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)
    XLSX.utils.book_append_sheet(wb, ws, "Delayed Tickets")
    XLSX.writeFile(wb, `delayed_tickets_${format(new Date(), "yyyy-MM-dd")}.xlsx`)
  }

  const exportGroupAnalytics = () => {
    const exportData = groupAnalytics.map((group) => ({
      "Business Group": group.business_group,
      "Total Tickets": group.total_tickets,
      "Open": group.open_tickets,
      "Closed": group.closed_tickets,
      "On Hold": group.on_hold_tickets,
      "Resolved": group.resolved_tickets,
      "Returned": group.returned_tickets,
      "Avg Resolution (hrs)": group.avg_resolution_hours ? Math.round(group.avg_resolution_hours * 10) / 10 : "-",
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)
    XLSX.utils.book_append_sheet(wb, ws, "Group Analytics")
    XLSX.writeFile(wb, `group_analytics_${format(new Date(), "yyyy-MM-dd")}.xlsx`)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-foreground-secondary">Loading reports...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-poppins font-bold text-foreground">Admin Reports</h1>
            <p className="text-foreground-secondary mt-1">View analytics and delayed tickets</p>
          </div>
          <Button onClick={loadReports} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{summary.total_tickets}</p>
                  <p className="text-xs text-muted-foreground">Total Tickets</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{summary.closed_tickets}</p>
                  <p className="text-xs text-muted-foreground">Closed</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{summary.open_tickets}</p>
                  <p className="text-xs text-muted-foreground">Open</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{delayedTickets.length}</p>
                  <p className="text-xs text-muted-foreground">Delayed</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <PieChart className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{summary.sub_tickets}</p>
                  <p className="text-xs text-muted-foreground">Sub-Tickets</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          {[
            { key: "overview", label: "Overview", icon: BarChart3 },
            { key: "delayed", label: "Delayed Tickets", icon: AlertTriangle },
            { key: "groups", label: "Group Analytics", icon: Building2 },
            { key: "users", label: "User Performance", icon: Users },
            { key: "redirects", label: "Redirects", icon: ArrowRightLeft },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white border border-border rounded-xl p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <h2 className="font-poppins font-bold text-foreground">Quick Overview</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <div className="bg-surface/50 rounded-lg p-4">
                  <h3 className="font-semibold text-foreground mb-3">Ticket Activity</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Today</span>
                      <span className="font-medium">{summary?.today_created || 0} created</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">This Week</span>
                      <span className="font-medium">{summary?.week_created || 0} created</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">This Month</span>
                      <span className="font-medium">{summary?.month_created || 0} created</span>
                    </div>
                  </div>
                </div>

                {/* Status Distribution */}
                <div className="bg-surface/50 rounded-lg p-4">
                  <h3 className="font-semibold text-foreground mb-3">Status Distribution</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-blue-600">Open</span>
                      <span className="font-medium">{summary?.open_tickets || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-600">On Hold</span>
                      <span className="font-medium">{summary?.on_hold_tickets || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-600">Resolved</span>
                      <span className="font-medium">{summary?.resolved_tickets || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">Closed</span>
                      <span className="font-medium">{summary?.closed_tickets || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "delayed" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-poppins font-bold text-foreground">
                  Delayed Tickets ({delayedTickets.length})
                </h2>
                {delayedTickets.length > 0 && (
                  <Button variant="outline" onClick={exportDelayedTickets}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                )}
              </div>

              {delayedTickets.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No delayed tickets found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface border-b border-border">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Ticket</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Business Group</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Assignee</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Est. Duration</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Hours Elapsed</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {delayedTickets.map((ticket) => (
                        <tr
                          key={ticket.id}
                          className="hover:bg-surface cursor-pointer"
                          onClick={() => router.push(`/tickets/${ticket.id}`)}
                        >
                          <td className="px-3 py-2">
                            <div className="text-sm font-medium">#{ticket.ticket_number}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">{ticket.title}</div>
                          </td>
                          <td className="px-3 py-2 text-sm">{ticket.business_group || "-"}</td>
                          <td className="px-3 py-2 text-sm">{ticket.assignee_name || "Unassigned"}</td>
                          <td className="px-3 py-2 text-sm">{ticket.estimated_duration || "-"}</td>
                          <td className="px-3 py-2">
                            <span className="text-sm text-red-600 font-medium">
                              {Math.round(ticket.hours_elapsed)} hrs
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                              {ticket.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "groups" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-poppins font-bold text-foreground">
                  Group-Level Analytics
                </h2>
                {groupAnalytics.length > 0 && (
                  <Button variant="outline" onClick={exportGroupAnalytics}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                )}
              </div>

              {groupAnalytics.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No data available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface border-b border-border">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Business Group</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold">Total</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold">Open</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold">Closed</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold">On Hold</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold">Resolved</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold">Avg Resolution (hrs)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {groupAnalytics.map((group) => (
                        <tr key={group.group_id} className="hover:bg-surface">
                          <td className="px-3 py-2 font-medium">{group.business_group}</td>
                          <td className="px-3 py-2 text-center">{group.total_tickets}</td>
                          <td className="px-3 py-2 text-center text-blue-600">{group.open_tickets}</td>
                          <td className="px-3 py-2 text-center text-green-600">{group.closed_tickets}</td>
                          <td className="px-3 py-2 text-center text-yellow-600">{group.on_hold_tickets}</td>
                          <td className="px-3 py-2 text-center text-emerald-600">{group.resolved_tickets}</td>
                          <td className="px-3 py-2 text-center">
                            {group.avg_resolution_hours ? Math.round(group.avg_resolution_hours * 10) / 10 : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "users" && (
            <div className="space-y-4">
              <h2 className="font-poppins font-bold text-foreground">User Performance</h2>

              {userPerformance.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No data available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface border-b border-border">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold">User</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Business Group</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold">Assigned</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold">Closed</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold">As SPOC</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold">Avg Resolution (hrs)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {userPerformance.map((user) => (
                        <tr key={user.id} className="hover:bg-surface">
                          <td className="px-3 py-2">
                            <div className="text-sm font-medium">{user.full_name}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </td>
                          <td className="px-3 py-2 text-sm">{user.business_group || "-"}</td>
                          <td className="px-3 py-2 text-center">{user.total_assigned}</td>
                          <td className="px-3 py-2 text-center text-green-600">{user.total_closed}</td>
                          <td className="px-3 py-2 text-center">{user.total_as_spoc}</td>
                          <td className="px-3 py-2 text-center">
                            {user.avg_resolution_hours ? Math.round(user.avg_resolution_hours * 10) / 10 : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "redirects" && (
            <div className="space-y-4">
              <h2 className="font-poppins font-bold text-foreground">Redirect Statistics</h2>

              {redirectStats.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No redirect data available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface border-b border-border">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold">From Group</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold"></th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">To Group</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold">Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {redirectStats.map((stat, index) => (
                        <tr key={index} className="hover:bg-surface">
                          <td className="px-3 py-2 font-medium">{stat.from_business_group_name || "-"}</td>
                          <td className="px-3 py-2 text-center">
                            <ArrowRightLeft className="w-4 h-4 text-muted-foreground mx-auto" />
                          </td>
                          <td className="px-3 py-2 font-medium">{stat.to_business_group_name || "-"}</td>
                          <td className="px-3 py-2 text-center font-medium">{stat.redirect_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
