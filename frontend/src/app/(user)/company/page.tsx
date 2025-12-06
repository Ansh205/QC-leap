'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
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
import { Building2, Mail, MoreVertical, Save, Search, Shield, Trash2, UserPlus, Factory } from 'lucide-react'
import { toast } from 'sonner'
import { auth, invitations as invitationsAPI, company as companyAPI, Invitation as InvitationType } from '@/lib/api'

type UserPermission = 'inspect_only' | 'inspect_and_train'

// Map backend status to display status
const mapStatus = (status: string) => {
  const statusMap: { [key: string]: string } = {
    'PENDING': 'Pending',
    'ACCEPTED': 'Accepted',
    'DECLINED': 'Declined',
    'EXPIRED': 'Expired',
    'REVOKED': 'Revoked',
    'pending': 'Pending',
    'accepted': 'Accepted',
    'declined': 'Declined',
    'expired': 'Expired',
    'revoked': 'Revoked'
  }
  return statusMap[status] || status
}

const getStatusColor = (status: string) => {
  const displayStatus = mapStatus(status)
  switch (displayStatus) {
    case 'Accepted':
      return 'bg-green-100 text-green-800'
    case 'Pending':
      return 'bg-yellow-100 text-yellow-800'
    case 'Declined':
      return 'bg-red-100 text-red-800'
    case 'Expired':
    case 'Revoked':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// Company info schema
const companySchema = z.object({
  companyName: z.string().min(2, {
    message: 'Company name must be at least 2 characters.',
  }),
  companyIndustry: z.string().optional(),
  companyDescription: z.string().optional(),
  currentPassword: z.string().min(1, {
    message: 'Current password is required to make changes.',
  }),
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
  const [editingMember, setEditingMember] = useState<{id: number, username: string, currentPermission: string} | null>(null)
  const [editPermission, setEditPermission] = useState<string>('')
  const [editPassword, setEditPassword] = useState('')
  const [removingMember, setRemovingMember] = useState<{id: number, username: string} | null>(null)
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

        // Fetch invitations and members
        setLoadingInvitations(true)
        const [invitationsList, membersList] = await Promise.all([
          invitationsAPI.list(),
          companyAPI.getMembers()
        ])
        setInvitations(invitationsList)
        // [FIX] Double cast to avoid TS overlap error: AxiosResponse -> unknown -> any[]
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

      // Refresh user data
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
      const invitation = await invitationsAPI.create(newIdentifier, newPermission, adminPassword) as unknown as InvitationType
      setInvitations((prev) => [...prev, invitation])

      // Reset form
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
      const updated = await invitationsAPI.resend(id) as unknown as InvitationType
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
      const updated = await invitationsAPI.revoke(id) as unknown as InvitationType
      setInvitations((prev) => prev.map((inv) => (inv.id === id ? updated : inv)))
      toast.success('Invitation revoked')
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke invitation')
    }
  }

  // Member management handlers
  const handleUpdatePermission = async () => {
    if (!editingMember || !editPassword) {
      toast.error('Please enter your password')
      return
    }

    try {
      await companyAPI.updateMemberPermission(editingMember.id, editPermission, editPassword)
      // [FIX] Double cast to avoid TS overlap error: AxiosResponse -> unknown -> any[]
      const updatedMembers = await companyAPI.getMembers() as unknown as any[]
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
    const matchesSearch = invitation.target_identifier.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPermission = permissionFilter === 'All' || invitation.permission.toUpperCase() === permissionFilter.toUpperCase()
    const displayStatus = mapStatus(invitation.status)
    const matchesStatus = statusFilter === 'All' || displayStatus === statusFilter

    return matchesSearch && matchesPermission && matchesStatus
  })

  const getStatusBadgeVariant = (status: string) => {
    const displayStatus = mapStatus(status)
    switch (displayStatus) {
      case 'Accepted':
        return 'default'
      case 'Pending':
        return 'secondary'
      case 'Declined':
        return 'outline'
      case 'Expired':
        return 'destructive'
      default:
        return 'default'
    }
  }

  const getPermissionBadgeColor = (permission: UserPermission | string) => {
    const perm = permission.toUpperCase()
    switch (perm) {
      case 'INSPECT_AND_TRAIN':
        return 'bg-green-100 text-green-800'
      case 'INSPECT_ONLY':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPermissionLabel = (permission: UserPermission | string) => {
    const perm = permission.toUpperCase()
    return perm === 'INSPECT_AND_TRAIN' ? 'Inspect & Train' : 'Inspect Only'
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Company Management</h1>
        <p className="text-slate-600">Manage your company profile and team access permissions.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Company Profile Card */}
        <Card className="md:col-span-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="p-4 bg-white rounded-xl shadow-sm text-blue-600 ring-1 ring-blue-100">
                  <Building2 size={40} />
                </div>
                <div className="space-y-3 flex-1">
                  <div>
                    <h2 className="text-2xl font-bold text-blue-900">{userData?.company?.name || 'Company Name'}</h2>
                    <p className="text-blue-700 font-medium">{userData?.company?.industry || 'Industry Not Set'}</p>
                  </div>
                  <p className="text-blue-800/80 leading-relaxed max-w-3xl">
                    {userData?.company?.description || 'No description provided. You can add a description below to help team members identify this workspace.'}
                  </p>
                </div>
                <div className="flex gap-4 self-start md:self-center">
                   <div className="text-center px-4 py-2 bg-white/60 rounded-lg">
                      <p className="text-2xl font-bold text-blue-900">{members.length}</p>
                      <p className="text-xs text-blue-700 font-medium uppercase tracking-wider">Members</p>
                   </div>
                   <div className="text-center px-4 py-2 bg-white/60 rounded-lg">
                      <p className="text-2xl font-bold text-blue-900">{invitations.filter(i => i.status === 'PENDING').length}</p>
                      <p className="text-xs text-blue-700 font-medium uppercase tracking-wider">Pending</p>
                   </div>
                </div>
              </div>
            </CardContent>
        </Card>

        {/* Edit Company Form */}
        <div className="md:col-span-3">
          <div className="border rounded-xl p-1 bg-slate-50/50">
            <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="mb-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Factory className="h-5 w-5 text-slate-500" />
                        Update Details
                    </h3>
                    <p className="text-sm text-slate-500">Edit company name, industry and description.</p>
                </div>
                
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input
                                id="companyName"
                                placeholder="Enter company name"
                                {...form.register('companyName')}
                                aria-invalid={!!form.formState.errors.companyName}
                            />
                            {form.formState.errors.companyName && (
                                <p className="text-sm text-red-500">{form.formState.errors.companyName.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="companyIndustry">Industry</Label>
                            <Input
                                id="companyIndustry"
                                placeholder="e.g., Manufacturing, Automotive"
                                {...form.register('companyIndustry')}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="companyDescription">Description</Label>
                        <Input
                            id="companyDescription"
                            placeholder="Brief description of the company"
                            {...form.register('companyDescription')}
                        />
                    </div>

                    <div className="pt-4 border-t">
                         <div className="flex items-end gap-4">
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="currentPassword">Confirm Password to Save</Label>
                                <Input
                                    id="currentPassword"
                                    type="password"
                                    placeholder="Enter your password"
                                    {...form.register('currentPassword')}
                                    aria-invalid={!!form.formState.errors.currentPassword}
                                />
                                {form.formState.errors.currentPassword && (
                                    <p className="text-xs text-red-500">{form.formState.errors.currentPassword.message}</p>
                                )}
                            </div>
                            <Button type="submit" disabled={isUpdating} className="min-w-[150px]">
                                {isUpdating ? 'Saving...' : 'Save Changes'}
                            </Button>
                         </div>
                    </div>
                </form>
            </div>
          </div>
        </div>
      </div>

        {/* Team Members Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Team</h2>
              <p className="text-slate-600">Manage access and invitations</p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Invite New Team Member</DialogTitle>
                  <DialogDescription>
                    Invite a new team member by providing their username or email and assigning permissions
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="identifier">Username or Email</Label>
                    <Input
                      id="identifier"
                      type="text"
                      placeholder="username or user@example.com"
                      value={newIdentifier}
                      onChange={(e) => setNewIdentifier(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="permission">Permission Level</Label>
                    <Select value={newPermission} onValueChange={(value) => setNewPermission(value as UserPermission)}>
                      <SelectTrigger id="permission">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inspect_and_train">Inspect & Train - Full model access</SelectItem>
                        <SelectItem value="inspect_only">Inspect Only - Can only run inspections</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password">Your Password (for verification)</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">Your password is required to send invitations</p>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendInvitation}>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invitation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-wrap gap-4">
            <div className="relative min-w-[250px] flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search by username or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={permissionFilter}
              onValueChange={(value) => setPermissionFilter(value as UserPermission | 'All')}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by Permission" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Permissions</SelectItem>
                <SelectItem value="inspect_and_train">Inspect & Train</SelectItem>
                <SelectItem value="inspect_only">Inspect Only</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Accepted">Accepted</SelectItem>
                <SelectItem value="Declined">Declined</SelectItem>
                <SelectItem value="Expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            {(searchQuery || permissionFilter !== 'All' || statusFilter !== 'All') && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchQuery('')
                  setPermissionFilter('All')
                  setStatusFilter('All')
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Members Table */}
          <div className="rounded-md border bg-white overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold text-gray-900">User</TableHead>
                  <TableHead className="font-semibold text-gray-900">Type</TableHead>
                  <TableHead className="font-semibold text-gray-900">Permission</TableHead>
                  <TableHead className="font-semibold text-gray-900">Status</TableHead>
                  <TableHead className="font-semibold text-gray-900">Date</TableHead>
                  <TableHead className="text-right font-semibold text-gray-900">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Active Members */}
                {members.map((member) => (
                    <TableRow key={`member-${member.id}`}>
                      <TableCell>
                          <div>
                              <p className="font-medium text-gray-900">{member.username}</p>
                              <p className="text-xs text-gray-500">{member.email}</p>
                          </div>
                      </TableCell>
                      <TableCell>
                         <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                             {member.role === 'COMPANY_ADMIN' ? 'Admin' : 'Member'}
                         </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPermissionBadgeColor(member.permission)} variant="secondary">
                          {getPermissionLabel(member.permission)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                         <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                             <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span> Active
                         </span>
                      </TableCell>
                      <TableCell><span className="text-gray-500 text-xs">-</span></TableCell>
                      <TableCell className="text-right">
                        {member.role !== 'COMPANY_ADMIN' && member.id !== userData?.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setEditingMember({
                                  id: member.id,
                                  username: member.username,
                                  currentPermission: member.permission
                                })
                                setEditPermission(member.permission)
                              }}>
                                <Shield className="mr-2 h-4 w-4" />
                                Change Permission
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setRemovingMember({id: member.id, username: member.username})}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove Member
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                ))}

                {/* Invitations */}
                {filteredInvitations.map((invitation) => (
                    <TableRow key={`invitation-${invitation.id}`}>
                      <TableCell className="font-medium text-gray-600">{invitation.target_identifier}</TableCell>
                      <TableCell><span className="text-xs text-gray-400">Invitation</span></TableCell>
                      <TableCell>
                        <Badge className={getPermissionBadgeColor(invitation.permission as UserPermission)} variant="secondary">
                          {getPermissionLabel(invitation.permission as UserPermission)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invitation.status)} variant="secondary">
                          {mapStatus(invitation.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500 text-xs">{new Date(invitation.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {invitation.status === 'pending' && (
                              <>
                                <DropdownMenuItem onClick={() => handleResendInvitation(invitation.id)}>
                                  <Mail className="mr-2 h-4 w-4" />
                                  Resend Invitation
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleRevokeInvitation(invitation.id)}>
                                  Revoke Invitation
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDeleteInvitation(invitation.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {members.length === 0 && filteredInvitations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                          No members or invitations found matching your criteria.
                        </TableCell>
                      </TableRow>
                  )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Update Permission Dialog */}
        <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Change Member Permission</DialogTitle>
              <DialogDescription>
                Update permission level for <span className="font-semibold">{editingMember?.username}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-permission">Permission Level</Label>
                <Select value={editPermission} onValueChange={setEditPermission}>
                  <SelectTrigger id="edit-permission">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INSPECT_AND_TRAIN">Inspect & Train - Full model access</SelectItem>
                    <SelectItem value="INSPECT_ONLY">Inspect Only - Can only run inspections</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-password">Your Password (for verification)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  placeholder="Enter your password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                />
                <p className="text-xs text-gray-500">Your password is required to change permissions</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setEditingMember(null)
                setEditPassword('')
              }}>
                Cancel
              </Button>
              <Button onClick={handleUpdatePermission}>
                <Shield className="mr-2 h-4 w-4" />
                Update Permission
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove Member Dialog */}
        <Dialog open={!!removingMember} onOpenChange={(open) => !open && setRemovingMember(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Remove Team Member</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove <span className="font-semibold">{removingMember?.username}</span> from the company? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="remove-password">Your Password (for verification)</Label>
                <Input
                  id="remove-password"
                  type="password"
                  placeholder="Enter your password"
                  value={removePassword}
                  onChange={(e) => setRemovePassword(e.target.value)}
                />
                <p className="text-xs text-gray-500">Your password is required to remove members</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setRemovingMember(null)
                setRemovePassword('')
              }}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleRemoveMember}>
                <Trash2 className="mr-2 h-4 w-4" />
                Remove Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  )
}