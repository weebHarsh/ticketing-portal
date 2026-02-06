"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { TicketIcon, BarChart3, Settings, Users, LogOut, X, Home, Plus, Database, UserCog, FileText, Trash2, ChevronDown, ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"

interface SidebarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [adminExpanded, setAdminExpanded] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Check if user is admin and auto-expand admin section when on admin pages
  useEffect(() => {
    try {
      const userData = localStorage.getItem("user")
      if (userData) {
        const user = JSON.parse(userData)
        setIsAdmin(user.role?.toLowerCase() === "admin")
      }
    } catch (e) {
      setIsAdmin(false)
    }

    if (pathname.startsWith("/admin")) {
      setAdminExpanded(true)
    }
  }, [pathname])

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/tickets/create", label: "Create Ticket", icon: Plus },
    { href: "/tickets", label: "My Tickets", icon: TicketIcon },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/teams", label: "Teams", icon: Users },
    { href: "/users", label: "User Management", icon: UserCog },
    { href: "/master-data", label: "Masters", icon: Database },
  ]

  const adminItems = [
    { href: "/admin", label: "Settings", icon: Settings },
    { href: "/admin/reports", label: "Reports", icon: FileText },
    { href: "/admin/tickets", label: "Deleted Tickets", icon: Trash2 },
  ]

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem("user")
    localStorage.removeItem("isLoggedIn")

    // Clear the authentication cookie
    document.cookie = "user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"

    // Redirect to login page
    router.push("/login")
    router.refresh()
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-border transform lg:transform-none transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo Section */}
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                <span className="text-white font-poppins font-bold">T</span>
              </div>
              <div>
                <h2 className="font-poppins font-bold text-foreground text-sm">Portal</h2>
                <p className="text-xs text-foreground-secondary">Tickets</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="lg:hidden p-1 hover:bg-surface rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  pathname === href ? "bg-primary text-white" : "text-foreground hover:bg-surface"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            ))}

            {/* Admin Section - Only visible to admins */}
            {isAdmin && (
              <div className="pt-2">
                <button
                  onClick={() => setAdminExpanded(!adminExpanded)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                    pathname.startsWith("/admin") ? "bg-primary/10 text-primary" : "text-foreground hover:bg-surface"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5" />
                    <span className="text-sm font-medium">Admin</span>
                  </div>
                  {adminExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {adminExpanded && (
                  <div className="ml-4 mt-1 space-y-1">
                    {adminItems.map(({ href, label, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                          pathname === href ? "bg-primary text-white" : "text-foreground hover:bg-surface"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm">{label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-border">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-foreground hover:bg-surface rounded-lg transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
