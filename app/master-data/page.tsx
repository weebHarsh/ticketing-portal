"use client"

import DashboardLayout from "@/components/layout/dashboard-layout"
import { Database } from "lucide-react"
import UnifiedMasterData from "@/components/master-data/unified-master-data"

export default function MasterDataPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-poppins font-bold text-foreground flex items-center gap-2">
            <Database className="w-8 h-8" />
            Master Data Management
          </h1>
          <p className="text-foreground-secondary mt-2">
            Manage all business units, categories, subcategories, and ticket classification mappings in one unified view
          </p>
        </div>

        <UnifiedMasterData />
      </div>
    </DashboardLayout>
  )
}
