'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Building2,
  Mail,
  MoreVertical,
  Factory,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
  Briefcase,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  auth,
  invitations as invitationsAPI,
  company as companyAPI,
  Invitation as InvitationType,
} from '@/lib/api'

type UserPermission = 'inspect_only' | 'inspect_and_train'

// Map backend status to display status
const mapStatus = (status: string) => {
  const statusMap: { [key: string]: string } = {
    PENDING: 'Pending',
    ACCEPTED: 'Accepted',
    DECLINED: 'Declined',
    EXPIRED: 'Expired',
    REVOKED: 'Revoked',
    pending: 'Pending',
    accepted: 'Accepted',
    declined: 'Declined',
    expired: 'Expired',
    revoked: 'Revoked',
  }
  return statusMap[status] || status
}

const getStatusColor = (status: string) => {
  const displayStatus = mapStatus(status)
  switch (displayStatus) {
    case 'Accepted':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'Pending':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'Declined':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'Expired':
    case 'Revoked':
      return 'bg-slate-100 text-slate-800 border-slate-200'
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200'
  }
}

// Company info schema
const companySchema = z.object({
  companyName: z.string().min(2, { message: 'Company name must be at least 2 characters.' }),
  companyIndustry: z.string().optional(),
  companyDescription: z.string().optional(),
  currentPassword: z.string().min(1, { message: 'Current password is required to make changes.' }),
})

type CompanyFormValues = z.infer<typeof companySchema>

export default function CompanyManagementPage() {
  const [invitations, setInvitations] = useState<InvitationType[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [permissionFilter, setPermissionFilter] = useState<UserPermission | 'All'>('All')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [isUpdating, setIsUpdating] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadingInvitations, setLoadingInvitations] = useState(false)
  const [editingMember, setEditingMember] = useState<{
    id: number
    username: string
    currentPermission: string
  } | null>(null)
  const [editPermission, setEditPermission] = useState<string>('')
  const [editPassword, setEditPassword] = useState('')
  const [removingMember, setRemovingMember] = useState<{ id: number; username: string } | null>(
    null
  )
  const [removePassword, setRemovePassword] = useState('')

  // Form state for invitations
  const [newIdentifier, setNewIdentifier] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [newPermission, setNewPermission] = useState<UserPermission>('inspect_and_train')

  // Fetch current user data and invitations
  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = await auth.getCurrentUser()
        setUserData(user)
        if (user.company?.name) {
          form.setValue('companyName', user.company.name)
          form.setValue('companyIndustry', user.company.industry || '')
          form.setValue('companyDescription', user.company.description || '')
        }

        setLoadingInvitations(true)
        const [invitationsList, membersList] = await Promise.all([
          invitationsAPI.list(),
          companyAPI.getMembers(),
        ])
        setInvitations(invitationsList as unknown as InvitationType[])
        setMembers(membersList as unknown as any[])
      } catch (error: any) {
        toast.error(error.message || 'Failed to load data')
      } finally {
        setLoading(false)
        setLoadingInvitations(false)
      }
    }
    fetchData()
  }, [])

  // Company info form
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      companyName: '',
      companyIndustry: '',
      companyDescription: '',
      currentPassword: '',
    },
  })

  const onSubmit = async (data: CompanyFormValues) => {
    setIsUpdating(true)
    try {
      await companyAPI.updateCompany(
        data.companyName,
        data.companyIndustry || '',
        data.companyDescription || '',
        data.currentPassword
      )
      const user = await auth.getCurrentUser()
      setUserData(user)
      toast.success('Company information updated successfully.')
      form.setValue('currentPassword', '')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update company. Please check your current password.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSendInvitation = async () => {
    if (!newIdentifier || !adminPassword) {
      toast.error('Please fill in all fields')
      return
    }
    try {
      const invitation = (await invitationsAPI.create(
        newIdentifier,
        newPermission,
        adminPassword
      )) as unknown as InvitationType
      setInvitations((prev) => [...prev, invitation])
      setNewIdentifier('')
      setAdminPassword('')
      setNewPermission('inspect_and_train')
      setIsDialogOpen(false)
      toast.success('Invitation sent successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation')
    }
  }

  const handleResendInvitation = async (id: number) => {
    try {
      const updated = (await invitationsAPI.resend(id)) as unknown as InvitationType
      setInvitations((prev) => prev.map((inv) => (inv.id === id ? updated : inv)))
      toast.success('Invitation resent')
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend invitation')
    }
  }

  const handleDeleteInvitation = async (id: number) => {
    try {
      await invitationsAPI.delete(id)
      setInvitations((prev) => prev.filter((inv) => inv.id !== id))
      toast.success('Invitation deleted')
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete invitation')
    }
  }

  const handleRevokeInvitation = async (id: number) => {
    try {
      const updated = (await invitationsAPI.revoke(id)) as unknown as InvitationType
      setInvitations((prev) => prev.map((inv) => (inv.id === id ? updated : inv)))
      toast.success('Invitation revoked')
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke invitation')
    }
  }

  const handleUpdatePermission = async () => {
    if (!editingMember || !editPassword) {
      toast.error('Please enter your password')
      return
    }
    try {
      await companyAPI.updateMemberPermission(editingMember.id, editPermission, editPassword)
      const updatedMembers = (await companyAPI.getMembers()) as unknown as any[]
      setMembers(updatedMembers)
      setEditingMember(null)
      setEditPermission('')
      setEditPassword('')
      toast.success('Permission updated successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update permission')
    }
  }

  const handleRemoveMember = async () => {
    if (!removingMember || !removePassword) {
      toast.error('Please enter your password')
      return
    }
    try {
      await companyAPI.removeMember(removingMember.id, removePassword)
      setMembers((prev) => prev.filter((m) => m.id !== removingMember.id))
      setRemovingMember(null)
      setRemovePassword('')
      toast.success('Member removed from company')
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove member')
    }
  }

  // Filter invitations
  const filteredInvitations = invitations.filter((invitation) => {
    const matchesSearch = invitation.target_identifier
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    const matchesPermission =
      permissionFilter === 'All' ||
      invitation.permission.toUpperCase() === permissionFilter.toUpperCase()
    const displayStatus = mapStatus(invitation.status)
    const matchesStatus = statusFilter === 'All' || displayStatus === statusFilter
    return matchesSearch && matchesPermission && matchesStatus
  })

  const getPermissionBadgeColor = (permission: UserPermission | string) => {
    const perm = permission.toUpperCase()
    switch (perm) {
      case 'INSPECT_AND_TRAIN':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'INSPECT_ONLY':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const getPermissionLabel = (permission: UserPermission | string) => {
    const perm = permission.toUpperCase()
    return perm === 'INSPECT_AND_TRAIN' ? 'Inspect & Train' : 'Inspect Only'
  }

  if (loading) return <div className="py-20 text-center text-sm text-slate-500">Loading...</div>

  return (
    <div className="animate-in fade-in mx-auto max-w-7xl space-y-3 pt-0 duration-500">
      {/* Header - Stats Page Layout */}
      <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Company Management</h1>
          <p className="text-xs font-medium text-slate-500">
            Manage your company profile and team access.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {/* Company Profile Card */}
        <Card className="border-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 md:col-span-3">
          <CardContent className="p-5">
            <div className="flex flex-col items-center gap-5 md:flex-row">
              <div className="rounded-xl border border-white/20 bg-white/10 p-3 text-white shadow-inner backdrop-blur-sm">
                <Building2 size={32} />
              </div>
              <div className="flex-1 space-y-1 text-center md:text-left">
                <h2 className="text-xl font-bold text-white">
                  {userData?.company?.name || 'Company Name'}
                </h2>
                <div className="flex items-center justify-center gap-2 text-blue-100 md:justify-start">
                  <Factory className="h-3.5 w-3.5" />
                  <span className="text-sm font-medium">
                    {userData?.company?.industry || 'Industry Not Set'}
                  </span>
                </div>
                {userData?.company?.description && (
                  <p className="max-w-lg truncate text-xs text-blue-100/80">
                    {userData.company.description}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <div className="rounded-lg border border-white/10 bg-black/20 px-5 py-2 text-center backdrop-blur-sm">
                  <p className="text-2xl leading-none font-bold text-white">{members.length}</p>
                  <p className="mt-1 text-[10px] font-bold tracking-wider text-blue-100 uppercase">
                    Members
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 px-5 py-2 text-center backdrop-blur-sm">
                  <p className="text-2xl leading-none font-bold text-white">
                    {invitations.filter((i) => i.status.toUpperCase() === 'PENDING').length}
                  </p>
                  <p className="mt-1 text-[10px] font-bold tracking-wider text-blue-100 uppercase">
                    Pending
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Company Form */}
        <div className="md:col-span-3">
          <div className="overflow-hidden rounded-xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-3">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-indigo-50 text-indigo-600">
                <Briefcase className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">Update Company Details</h3>
            </div>
            <div className="p-5">
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="companyName"
                      className="text-xs font-semibold tracking-wider text-slate-500 uppercase"
                    >
                      Company Name
                    </Label>
                    <Input
                      id="companyName"
                      placeholder="Enter company name"
                      {...form.register('companyName')}
                      className="h-9 border-slate-200 bg-white/50 text-sm transition-all focus:bg-white"
                    />
                    {form.formState.errors.companyName && (
                      <p className="text-xs text-red-500">
                        {form.formState.errors.companyName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="companyIndustry"
                      className="text-xs font-semibold tracking-wider text-slate-500 uppercase"
                    >
                      Industry
                    </Label>
                    <Input
                      id="companyIndustry"
                      placeholder="e.g., Manufacturing, Automotive"
                      {...form.register('companyIndustry')}
                      className="h-9 border-slate-200 bg-white/50 text-sm transition-all focus:bg-white"
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-4 md:flex-row">
                  <div className="w-full flex-1 space-y-1.5">
                    <Label
                      htmlFor="companyDescription"
                      className="text-xs font-semibold tracking-wider text-slate-500 uppercase"
                    >
                      Description
                    </Label>
                    <Input
                      id="companyDescription"
                      placeholder="Brief description"
                      {...form.register('companyDescription')}
                      className="h-9 border-slate-200 bg-white/50 text-sm transition-all focus:bg-white"
                    />
                  </div>
                  <div className="w-full flex-1 space-y-1.5">
                    <Label
                      htmlFor="currentPassword"
                      className="text-xs font-semibold tracking-wider text-slate-500 uppercase"
                    >
                      Confirm Password to Save
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="currentPassword"
                        type="password"
                        placeholder="Enter your password"
                        {...form.register('currentPassword')}
                        className="h-9 border-slate-200 bg-white/50 text-sm transition-all focus:bg-white"
                      />
                      <Button
                        type="submit"
                        disabled={isUpdating}
                        size="sm"
                        className="h-9 bg-slate-900 px-4 text-xs whitespace-nowrap shadow-md hover:bg-slate-800"
                      >
                        <Save className="mr-2 h-3.5 w-3.5" />
                        {isUpdating ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                    {form.formState.errors.currentPassword && (
                      <p className="mt-1 text-xs text-red-500">
                        {form.formState.errors.currentPassword.message}
                      </p>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Team Management Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Users className="h-4 w-4 text-indigo-600" /> Team & Permissions
          </h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="h-8 bg-blue-600 text-xs shadow-lg shadow-blue-600/20 transition-transform hover:scale-105 hover:bg-blue-700"
              >
                <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Invite New Team Member</DialogTitle>
                <DialogDescription>Send an invitation via email or username.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="identifier">Username or Email</Label>
                  <Input
                    id="identifier"
                    value={newIdentifier}
                    onChange={(e) => setNewIdentifier(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="permission">Permission Level</Label>
                  <Select
                    value={newPermission}
                    onValueChange={(value) => setNewPermission(value as UserPermission)}
                  >
                    <SelectTrigger id="permission">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inspect_and_train">Inspect & Train</SelectItem>
                      <SelectItem value="inspect_only">Inspect Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Your Password (Confirmation)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendInvitation}>Send Invite</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters - Colorful Search */}
        <div className="flex gap-2">
          <div className="group relative max-w-xs flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400 transition-colors" />
            </div>
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 border-slate-200 bg-white pl-9 text-xs transition-all focus:border-indigo-300"
            />
          </div>
          <Select value={permissionFilter} onValueChange={(v) => setPermissionFilter(v as any)}>
            <SelectTrigger className="h-8 w-[130px] border-slate-200 bg-white text-xs">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Roles</SelectItem>
              <SelectItem value="inspect_and_train">Inspect & Train</SelectItem>
              <SelectItem value="inspect_only">Inspect Only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[130px] border-slate-200 bg-white text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="Accepted">Accepted</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table Container */}
        <div className="overflow-hidden rounded-xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="h-9 hover:bg-slate-50/80">
                <TableHead className="h-9 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  User / Email
                </TableHead>
                <TableHead className="h-9 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Type
                </TableHead>
                <TableHead className="h-9 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Permission
                </TableHead>
                <TableHead className="h-9 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Status
                </TableHead>
                <TableHead className="h-9 w-[50px] text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Active Members */}
              {members.map((member) => (
                <TableRow
                  key={`member-${member.id}`}
                  className="h-10 border-slate-50 hover:bg-slate-50/50"
                >
                  <TableCell className="py-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-900">
                        {member.username}
                      </span>
                      <span className="text-[10px] text-slate-500">{member.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    {member.role === 'COMPANY_ADMIN' ? (
                      <span className="inline-flex items-center rounded border border-purple-100 bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                        Member
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge
                      variant="secondary"
                      className={`border text-[10px] font-medium ${getPermissionBadgeColor(member.permission)}`}
                    >
                      {getPermissionLabel(member.permission)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge
                      variant="outline"
                      className="border-green-200 bg-green-50 text-[10px] font-medium text-green-700"
                    >
                      Active
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    {member.role !== 'COMPANY_ADMIN' && member.id !== userData?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-slate-100"
                          >
                            <MoreVertical className="h-3.5 w-3.5 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingMember({
                                id: member.id,
                                username: member.username,
                                currentPermission: member.permission,
                              })
                              setEditPermission(member.permission)
                            }}
                            className="cursor-pointer text-xs"
                          >
                            <Shield className="mr-2 h-3.5 w-3.5" /> Edit Role
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              setRemovingMember({ id: member.id, username: member.username })
                            }
                            className="cursor-pointer text-xs text-red-600 focus:bg-red-50 focus:text-red-700"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {/* Invitations */}
              {filteredInvitations.map((invitation) => (
                <TableRow
                  key={`invitation-${invitation.id}`}
                  className="h-10 border-slate-50 hover:bg-slate-50/50"
                >
                  <TableCell className="py-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-600">
                        {invitation.target_identifier}
                      </span>
                      <span className="text-[10px] text-slate-400 italic">Invitation sent</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-[10px] text-slate-400">-</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge
                      variant="secondary"
                      className={`border text-[10px] font-medium ${getPermissionBadgeColor(invitation.permission)}`}
                    >
                      {getPermissionLabel(invitation.permission)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge
                      variant="secondary"
                      className={`border text-[10px] font-medium ${getStatusColor(invitation.status)}`}
                    >
                      {mapStatus(invitation.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-slate-100"
                        >
                          <MoreVertical className="h-3.5 w-3.5 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        {invitation.status.toLowerCase() === 'pending' && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleResendInvitation(invitation.id)}
                              className="cursor-pointer text-xs"
                            >
                              <Mail className="mr-2 h-3.5 w-3.5" /> Resend
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRevokeInvitation(invitation.id)}
                              className="cursor-pointer text-xs"
                            >
                              Revoke
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDeleteInvitation(invitation.id)}
                          className="cursor-pointer text-xs text-red-600 focus:bg-red-50 focus:text-red-700"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Permission Dialog */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Change Member Permission</DialogTitle>
            <DialogDescription>
              Update access level for{' '}
              <span className="font-medium text-slate-900">{editingMember?.username}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Permission Level</Label>
              <Select value={editPermission} onValueChange={setEditPermission}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INSPECT_AND_TRAIN">Inspect & Train</SelectItem>
                  <SelectItem value="INSPECT_ONLY">Inspect Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Admin Password</Label>
              <Input
                type="password"
                placeholder="Confirm with your password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePermission}>Update Access</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Dialog */}
      <Dialog open={!!removingMember} onOpenChange={(open) => !open && setRemovingMember(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" /> Remove Member
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-bold text-slate-900">{removingMember?.username}</span>? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="mb-2 block">Admin Password</Label>
            <Input
              type="password"
              placeholder="Enter password to confirm"
              value={removePassword}
              onChange={(e) => setRemovePassword(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovingMember(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember}>
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
