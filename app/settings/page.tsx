"use client"

import type React from "react"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Settings, Plus, Edit, Trash2, Users, X, UserPlus, LogOut, Check } from "lucide-react"
import { getTeams, createTeam, updateTeam, deleteTeam, getUserTeams, addTeamMember, leaveTeam } from "@/lib/actions/teams"
import { Button } from "@/components/ui/button"

export default function SettingsPage() {
  const [teams, setTeams] = useState<any[]>([])
  const [myTeams, setMyTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [editTeam, setEditTeam] = useState<any>(null)
  const [teamFormData, setTeamFormData] = useState({ name: "", description: "" })
  const [saving, setSaving] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

  useEffect(() => {
    try {
      const userData = localStorage.getItem("user")
      if (userData) {
        const user = JSON.parse(userData)
        setCurrentUserId(user.id)
      }
    } catch (e) {
      console.error("Failed to parse user data:", e)
    }
  }, [])

  const loadTeams = async () => {
    setLoading(true)
    const result = await getTeams()
    if (result.success && result.data) {
      setTeams(result.data)
    } else {
      setTeams([])
    }
    setLoading(false)
  }

  const loadMyTeams = async () => {
    if (!currentUserId) return
    const result = await getUserTeams(currentUserId)
    if (result.success && result.data) {
      setMyTeams(result.data)
    } else {
      setMyTeams([])
    }
  }

  useEffect(() => {
    loadTeams()
  }, [])

  useEffect(() => {
    if (currentUserId) {
      loadMyTeams()
    }
  }, [currentUserId])

  const handleAddTeam = () => {
    setEditTeam(null)
    setTeamFormData({ name: "", description: "" })
    setShowTeamModal(true)
  }

  const handleEditTeam = (team: any) => {
    setEditTeam(team)
    setTeamFormData({ name: team.name, description: team.description || "" })
    setShowTeamModal(true)
  }

  const handleDeleteTeam = async (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete the team "${name}"? This action cannot be undone.`)) {
      const result = await deleteTeam(id)
      if (result.success) {
        await loadTeams()
        await loadMyTeams()
      } else {
        alert(result.error || "Failed to delete team")
      }
    }
  }

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      let result
      if (editTeam) {
        result = await updateTeam(editTeam.id, teamFormData.name, teamFormData.description)
      } else {
        result = await createTeam(teamFormData.name, teamFormData.description)
      }

      if (result.success) {
        await loadTeams()
        setShowTeamModal(false)
      } else {
        alert(result.error || "Failed to save team")
      }
    } catch (error) {
      alert("An error occurred")
    } finally {
      setSaving(false)
    }
  }

  const handleJoinTeam = async (teamId: number) => {
    if (!currentUserId) return
    setSaving(true)
    try {
      const result = await addTeamMember(currentUserId, teamId, "member")
      if (result.success) {
        await loadMyTeams()
        await loadTeams()
        setShowJoinModal(false)
      } else {
        alert(result.error || "Failed to join team")
      }
    } catch (error) {
      alert("An error occurred")
    } finally {
      setSaving(false)
    }
  }

  const handleLeaveTeam = async (teamId: number, teamName: string) => {
    if (!currentUserId) return
    if (!confirm(`Are you sure you want to leave "${teamName}"?`)) return

    setSaving(true)
    try {
      const result = await leaveTeam(currentUserId, teamId)
      if (result.success) {
        await loadMyTeams()
        await loadTeams()
      } else {
        alert(result.error || "Failed to leave team")
      }
    } catch (error) {
      alert("An error occurred")
    } finally {
      setSaving(false)
    }
  }

  const myTeamIds = myTeams.map((t) => t.id)
  const availableTeams = teams.filter((t) => !myTeamIds.includes(t.id))

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-sans font-bold text-foreground flex items-center gap-3">
            <Settings className="w-8 h-8" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">Manage your account settings and team preferences</p>
        </div>

        {/* My Teams Section */}
        <div className="bg-white border border-border rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-sans font-semibold text-lg text-foreground">My Teams</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Teams you are a member of (affects "My Team" filter)</p>
              </div>
            </div>
            <Button onClick={() => setShowJoinModal(true)} size="sm" variant="outline">
              <UserPlus className="w-4 h-4 mr-2" />
              Join Team
            </Button>
          </div>

          {myTeams.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-muted-foreground font-medium mb-1">You haven't joined any teams yet</p>
              <p className="text-sm text-muted-foreground mb-3">Join a team to use the "My Team" filter on tickets</p>
              <Button onClick={() => setShowJoinModal(true)} size="sm" variant="outline">
                <UserPlus className="w-4 h-4 mr-2" />
                Join a Team
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {myTeams.map((team) => (
                <div
                  key={team.id}
                  className="flex justify-between items-center p-3 border border-border rounded-lg hover:bg-muted/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{team.name}</h4>
                      <p className="text-xs text-muted-foreground">{team.role || "Member"}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLeaveTeam(team.id, team.name)}
                    className="opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="w-4 h-4 mr-1" />
                    Leave
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-border rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-sans font-semibold text-lg text-foreground">Teams Management</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Create and manage your organization teams</p>
              </div>
            </div>
            <Button onClick={handleAddTeam} size="sm" className="bg-gradient-to-r from-primary to-secondary">
              <Plus className="w-4 h-4 mr-2" />
              Create Team
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading teams...</p>
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground font-medium mb-2">No teams yet</p>
              <p className="text-sm text-muted-foreground mb-4">Create your first team to organize your members</p>
              <Button onClick={handleAddTeam} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Team
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="flex justify-between items-center p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-all group"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-foreground">{team.name}</h4>
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded">
                        {team.member_count || 0} members
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{team.description || "No description provided"}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => handleEditTeam(team)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTeam(team.id, team.name)}
                      className="hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Existing code */}
        <div className="bg-white border border-border rounded-xl p-6 space-y-6 shadow-sm">
          <div>
            <h3 className="font-sans font-semibold text-foreground mb-4">Account Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Display Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="font-sans font-semibold text-foreground mb-4">Preferences</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-4 h-4" defaultChecked />
              <span className="text-foreground text-sm">Email notifications for ticket updates</span>
            </label>
          </div>

          <div className="border-t border-border pt-6 flex gap-3 justify-end">
            <button className="px-6 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
            <button className="px-6 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:shadow-lg transition-all">
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {showTeamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-sans font-bold text-xl text-foreground">
                {editTeam ? "Edit Team" : "Create New Team"}
              </h3>
              <button
                onClick={() => setShowTeamModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeam} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Team Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={teamFormData.name}
                  onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
                  required
                  placeholder="e.g. Development Team"
                  className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Description</label>
                <textarea
                  value={teamFormData.description}
                  onChange={(e) => setTeamFormData({ ...teamFormData, description: e.target.value })}
                  placeholder="Describe the team's purpose and responsibilities..."
                  className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm resize-none"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">Optional but recommended</p>
              </div>

              <div className="flex gap-3 justify-end pt-6 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTeamModal(false)}
                  disabled={saving}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !teamFormData.name.trim()}
                  className="bg-gradient-to-r from-primary to-secondary px-6"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>{editTeam ? "Update Team" : "Create Team"}</>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-sans font-bold text-xl text-foreground">Join a Team</h3>
              <button
                onClick={() => setShowJoinModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {availableTeams.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-muted-foreground font-medium mb-1">No teams available</p>
                <p className="text-sm text-muted-foreground">
                  You are already a member of all teams, or no teams have been created yet.
                </p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto flex-1">
                {availableTeams.map((team) => (
                  <div
                    key={team.id}
                    className="flex justify-between items-center p-3 border border-border rounded-lg hover:bg-muted/30 transition-all"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{team.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {team.member_count || 0} member{team.member_count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleJoinTeam(team.id)}
                      disabled={saving}
                      className="bg-gradient-to-r from-primary to-secondary"
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Join
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4 mt-4 border-t border-border">
              <Button variant="outline" onClick={() => setShowJoinModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
