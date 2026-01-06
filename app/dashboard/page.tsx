"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import QuickStats from "@/components/dashboard/quick-stats"
import RecentTickets from "@/components/dashboard/recent-tickets"

export default function DashboardPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const user = localStorage.getItem("user")
    if (!user) {
      router.push("/login")
    }
    setIsLoading(false)
  }, [router])

  if (isLoading) return <div>Loading...</div>

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <DashboardHeader />
        <QuickStats />
        <RecentTickets />
      </div>
    </DashboardLayout>
  )
}
