"use client"

import DashboardLayout from "@/components/layout/dashboard-layout"
import { Database } from "lucide-react"
import UnifiedMasterDataV2 from "@/components/master-data/unified-master-data-v2"

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
            Manage business groups, categories, subcategories, and ticket classification mappings
          </p>
        </div>

        <UnifiedMasterDataV2 />
      </div>
    </DashboardLayout>
  )
}
