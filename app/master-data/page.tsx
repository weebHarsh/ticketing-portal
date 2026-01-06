"use client"

import DashboardLayout from "@/components/layout/dashboard-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Database } from "lucide-react"
import BusinessUnitGroupsTab from "@/components/master-data/business-unit-groups-tab"
import CategoriesTab from "@/components/master-data/categories-tab"
import SubcategoriesTab from "@/components/master-data/subcategories-tab"
import TicketClassificationTab from "@/components/master-data/ticket-classification-tab"

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
            Manage business units, categories, subcategories, and ticket classification mappings
          </p>
        </div>

        <Tabs defaultValue="business-units" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="business-units">Business Units</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="subcategories">Subcategories</TabsTrigger>
            <TabsTrigger value="classifications">Ticket Classification</TabsTrigger>
          </TabsList>

          <TabsContent value="business-units">
            <BusinessUnitGroupsTab />
          </TabsContent>

          <TabsContent value="categories">
            <CategoriesTab />
          </TabsContent>

          <TabsContent value="subcategories">
            <SubcategoriesTab />
          </TabsContent>

          <TabsContent value="classifications">
            <TicketClassificationTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
