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
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
import { Building2, Mail, MoreVertical, Save, Search, Shield, Trash2, UserPlus } from 'lucide-react'
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
        setMembers(membersList)
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
        data.companyIndustry,
        data.companyDescription,
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
      const invitation = await invitationsAPI.create(newIdentifier, newPermission, adminPassword)
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
      const updated = await invitationsAPI.resend(id)
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
      const updated = await invitationsAPI.revoke(id)
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
      const updatedMembers = await companyAPI.getMembers()
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
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Company Management</h1>
        <p className="text-slate-600">Manage your company information and team members</p>
      </div>

      <div className="mx-auto max-w-5xl space-y-6">
        {/* Company Information Display Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <CardTitle>Company Information</CardTitle>
            </div>
            <CardDescription>Your current company details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <p className="text-sm font-medium">{userData?.company?.name || 'Not set'}</p>
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <p className="text-sm font-medium">{userData?.company?.industry || 'Not specified'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <p className="text-sm font-medium">{userData?.company?.description || 'Not specified'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Team Members Section */}
        <div>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Team Members</h2>
              <p className="text-slate-600">Invite and manage team member access</p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
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
          <div className="mb-6 flex flex-wrap gap-4">
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username/Email</TableHead>
                  <TableHead>Permission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvitations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No team members found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">{invitation.target_identifier}</TableCell>
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
                      <TableCell>{new Date(invitation.created_at).toLocaleDateString()}</TableCell>
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="text-muted-foreground mt-4 text-sm">
            Showing {filteredInvitations.length} of {invitations.length} invitation
            {invitations.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Current Members Section */}
        <div className="mt-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Current Members</h2>
            <p className="text-slate-600">Manage permissions and remove members from your company</p>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Permission</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No members found
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.username}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <Badge variant={member.role === 'COMPANY_ADMIN' ? 'default' : 'secondary'}>
                          {member.role === 'COMPANY_ADMIN' ? 'Company Admin' : 'Member'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPermissionBadgeColor(member.permission)} variant="secondary">
                          {getPermissionLabel(member.permission)}
                        </Badge>
                      </TableCell>
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="text-muted-foreground mt-4 text-sm">
            {members.length} company member{members.length !== 1 ? 's' : ''}
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

        {/* Update Company Information Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Update Company Information</h2>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card className="border-yellow-200 bg-yellow-50/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  <CardTitle>Edit Company Details</CardTitle>
                </div>
                <CardDescription>Update your company information with password verification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    placeholder="Enter company name"
                    {...form.register('companyName')}
                    aria-invalid={!!form.formState.errors.companyName}
                  />
                  {form.formState.errors.companyName && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.companyName.message}
                    </p>
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

                <div className="space-y-2">
                  <Label htmlFor="companyDescription">Description</Label>
                  <Input
                    id="companyDescription"
                    placeholder="Brief description of the company"
                    {...form.register('companyDescription')}
                  />
                </div>

                <div className="border-t border-yellow-300 pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-5 w-5 text-yellow-600" />
                    <Label className="text-yellow-900 font-semibold">Verify Your Identity</Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password *</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      placeholder="Enter current password to confirm changes"
                      {...form.register('currentPassword')}
                      aria-invalid={!!form.formState.errors.currentPassword}
                    />
                    {form.formState.errors.currentPassword && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.currentPassword.message}
                      </p>
                    )}
                    <p className="text-xs text-yellow-800">
                      Your password is required to update company information
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isUpdating} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  {isUpdating ? 'Saving Changes...' : 'Save Company Information'}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </div>
      </div>
    </div>
  )
}
