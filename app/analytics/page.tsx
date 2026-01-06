"use client"

import DashboardLayout from "@/components/layout/dashboard-layout"
import AnalyticsHeader from "@/components/analytics/analytics-header"
import AnalyticsCharts from "@/components/analytics/analytics-charts"

export default function AnalyticsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <AnalyticsHeader />
        <AnalyticsCharts />
      </div>
    </DashboardLayout>
  )
}
