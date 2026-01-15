"use client"

import type React from "react"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Settings, Plus, Trash2, Users, Eye, EyeOff, Check, UserPlus } from "lucide-react"
import { getBusinessUnitGroups } from "@/lib/actions/master-data"
import { getUsers } from "@/lib/actions/tickets"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("my-group")
  const [businessGroups, setBusinessGroups] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Form states
  const [selectedBusinessGroup, setSelectedBusinessGroup] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const userData = localStorage.getItem("user")
      if (userData) {
        const user = JSON.parse(userData)
        setCurrentUser(user)
        setFullName(user.full_name || "")
        setSelectedBusinessGroup(user.business_unit_group_id || "")
      }

      const [buResult, usersResult] = await Promise.all([
        getBusinessUnitGroups(),
        getUsers(),
      ])

      if (buResult.success) {
        setBusinessGroups(buResult.data || [])
      }

      if (usersResult.success) {
        const users = usersResult.data || []
        setAllUsers(users)

        // Group users by their business unit group
        const mappedMembers = users.map((user: any) => ({
          id: user.id,
          name: user.name || user.full_name,
          email: user.email,
          group: user.group_name || "No Group"
        }))
        setTeamMembers(mappedMembers)
      }
    } catch (error) {
      console.error("Failed to load data:", error)
    }
    setLoading(false)
  }

  const handleSaveBusinessGroup = async () => {
    setSaving(true)
    try {
      // TODO: Implement API call to update business group
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Update localStorage
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          business_unit_group_id: selectedBusinessGroup,
          group_name: businessGroups.find(bg => bg.id === Number(selectedBusinessGroup))?.name
        }
        localStorage.setItem("user", JSON.stringify(updatedUser))
        setCurrentUser(updatedUser)
      }

      alert("Business group updated successfully!")
    } catch (error) {
      alert("Failed to update business group")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAccountInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      // TODO: Implement API call to update account info
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Update localStorage
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          full_name: fullName,
          business_unit_group_id: selectedBusinessGroup,
          group_name: businessGroups.find(bg => bg.id === Number(selectedBusinessGroup))?.name
        }
        localStorage.setItem("user", JSON.stringify(updatedUser))
        setCurrentUser(updatedUser)
      }

      alert("Account information updated successfully!")
    } catch (error) {
      alert("Failed to update account information")
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      alert("New passwords do not match!")
      return
    }

    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters long")
      return
    }

    setSaving(true)
    try {
      // TODO: Implement API call to change password
      await new Promise((resolve) => setTimeout(resolve, 1000))

      alert("Password changed successfully!")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setShowPasswordSection(false)
    } catch (error) {
      alert("Failed to change password")
    } finally {
      setSaving(false)
    }
  }

  const groupedTeamMembers = teamMembers.reduce((acc: any, member: any) => {
    if (!acc[member.group]) {
      acc[member.group] = []
    }
    acc[member.group].push(member)
    return acc
  }, {})

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-poppins font-bold text-foreground flex items-center gap-3">
            <Settings className="w-8 h-8" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">Manage your account settings and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="my-group">My Group</TabsTrigger>
            <TabsTrigger value="my-team">My Team</TabsTrigger>
            <TabsTrigger value="account">Account Information</TabsTrigger>
          </TabsList>

          {/* My Group Tab */}
          <TabsContent value="my-group" className="mt-6">
            <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-foreground">Business Group</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Select your business group</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Business Group <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedBusinessGroup}
                    onChange={(e) => setSelectedBusinessGroup(e.target.value)}
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="">Select a business group</option>
                    {businessGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSaveBusinessGroup}
                    disabled={saving || !selectedBusinessGroup}
                    className="bg-gradient-to-r from-primary to-secondary"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* My Team Tab */}
          <TabsContent value="my-team" className="mt-6">
            <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-poppins font-semibold text-lg text-foreground">My Team</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Manage your team members</p>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </div>

              {Object.keys(groupedTeamMembers).length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground font-medium mb-1">No team members yet</p>
                  <p className="text-sm text-muted-foreground">Add users to start building your team</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedTeamMembers).map(([groupName, members]: [string, any]) => (
                    <div key={groupName} className="border border-border rounded-lg">
                      <div className="bg-surface px-4 py-3 border-b border-border">
                        <h4 className="font-semibold text-foreground">{groupName}</h4>
                      </div>
                      <div className="p-2">
                        {members.map((member: any) => (
                          <div
                            key={member.id}
                            className="flex justify-between items-center p-3 rounded-lg hover:bg-surface group"
                          >
                            <div>
                              <p className="font-medium text-foreground">{member.name}</p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Account Information Tab */}
          <TabsContent value="account" className="mt-6">
            <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
              <h3 className="font-poppins font-semibold text-foreground text-lg mb-6">Account Information</h3>

              <form onSubmit={handleSaveAccountInfo} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Display Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                  <input
                    type="email"
                    value={currentUser?.email || ""}
                    readOnly
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-surface text-foreground cursor-not-allowed text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Business Group</label>
                  <select
                    value={selectedBusinessGroup}
                    onChange={(e) => setSelectedBusinessGroup(e.target.value)}
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="">Select a business group</option>
                    {businessGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Role</label>
                  <input
                    type="text"
                    value={currentUser?.role?.charAt(0).toUpperCase() + currentUser?.role?.slice(1) || "User"}
                    readOnly
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-surface text-foreground cursor-not-allowed text-sm"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-gradient-to-r from-primary to-secondary"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>

              {/* Password Change Section */}
              <div className="mt-8 pt-6 border-t border-border">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="font-semibold text-foreground">Change Password</h4>
                    <p className="text-sm text-muted-foreground">Update your password</p>
                  </div>
                  {!showPasswordSection && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPasswordSection(true)}
                    >
                      Change Password
                    </Button>
                  )}
                </div>

                {showPasswordSection && (
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Current Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                          className="w-full px-4 py-2.5 border border-border rounded-lg bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        New Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          className="w-full px-4 py-2.5 border border-border rounded-lg bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Confirm New Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="w-full px-4 py-2.5 border border-border rounded-lg bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowPasswordSection(false)
                          setCurrentPassword("")
                          setNewPassword("")
                          setConfirmPassword("")
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={saving}
                        className="bg-gradient-to-r from-primary to-secondary"
                      >
                        {saving ? "Changing..." : "Change Password"}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
