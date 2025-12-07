'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Building2, Mail, MoreVertical, Factory, Search, Shield, Trash2, UserPlus } from 'lucide-react'
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
    case 'Accepted': return 'bg-green-100 text-green-800'
    case 'Pending': return 'bg-yellow-100 text-yellow-800'
    case 'Declined': return 'bg-red-100 text-red-800'
    case 'Expired':
    case 'Revoked': return 'bg-gray-100 text-gray-800'
    default: return 'bg-gray-100 text-gray-800'
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

        setLoadingInvitations(true)
        const [invitationsList, membersList] = await Promise.all([
          invitationsAPI.list(),
          companyAPI.getMembers()
        ])
        setInvitations(invitationsList as unknown as InvitationType[])
        // [FIX] Double cast: AxiosResponse -> unknown -> any[]
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
    defaultValues: { companyName: '', companyIndustry: '', companyDescription: '', currentPassword: '' },
  })

  const onSubmit = async (data: CompanyFormValues) => {
    setIsUpdating(true)
    try {
      await companyAPI.updateCompany(data.companyName, data.companyIndustry || '', data.companyDescription || '', data.currentPassword)
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

  const handleUpdatePermission = async () => {
    if (!editingMember || !editPassword) {
      toast.error('Please enter your password')
      return
    }
    try {
      await companyAPI.updateMemberPermission(editingMember.id, editPermission, editPassword)
      // [FIX] Double cast here as well
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
      case 'Accepted': return 'default'
      case 'Pending': return 'secondary'
      case 'Declined': return 'outline'
      case 'Expired': return 'destructive'
      default: return 'default'
    }
  }

  const getPermissionBadgeColor = (permission: UserPermission | string) => {
    const perm = permission.toUpperCase()
    switch (perm) {
      case 'INSPECT_AND_TRAIN': return 'bg-green-100 text-green-800'
      case 'INSPECT_ONLY': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPermissionLabel = (permission: UserPermission | string) => {
    const perm = permission.toUpperCase()
    return perm === 'INSPECT_AND_TRAIN' ? 'Inspect & Train' : 'Inspect Only'
  }

  if (loading) return <div className="container mx-auto py-8 text-center">Loading...</div>

  return (
    <div className="container mx-auto pt-1 pb-8 space-y-3">
      <div className="flex flex-col gap-1 border-b border-gray-100 pb-3">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Company Management</h1>
        <p className="text-sm text-slate-500">Manage your company profile and team access.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {/* Company Profile Card */}
        <Card className="md:col-span-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 shadow-sm">
            <CardContent className="pt-4 pb-4 px-5">
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="p-3 bg-white rounded-lg shadow-sm text-blue-600 ring-1 ring-blue-100">
                  <Building2 size={32} />
                </div>
                <div className="flex-1 space-y-1 text-center md:text-left">
                  <h2 className="text-xl font-bold text-blue-900">{userData?.company?.name || 'Company Name'}</h2>
                  <p className="text-sm text-blue-700">{userData?.company?.industry || 'Industry Not Set'}</p>
                </div>
                <div className="flex gap-3">
                   <div className="text-center px-3 py-1.5 bg-white/60 rounded-md">
                      <p className="text-lg font-bold text-blue-900">{members.length}</p>
                      <p className="text-[10px] text-blue-700 font-bold uppercase">Members</p>
                   </div>
                   <div className="text-center px-3 py-1.5 bg-white/60 rounded-md">
                      <p className="text-lg font-bold text-blue-900">{invitations.filter(i => i.status === 'PENDING').length}</p>
                      <p className="text-[10px] text-blue-700 font-bold uppercase">Pending</p>
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

      {/* Team Section */}
      <div className="space-y-3">
          <div className="flex items-center justify-between pt-2">
            <div><h2 className="text-lg font-bold">Team Members</h2></div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700"><UserPlus className="mr-2 h-3.5 w-3.5" /> Invite</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Invite New Team Member</DialogTitle>
                  <DialogDescription>Invite a new team member by providing their username or email.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="identifier">Username or Email</Label>
                    <Input id="identifier" value={newIdentifier} onChange={(e) => setNewIdentifier(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="permission">Permission Level</Label>
                    <Select value={newPermission} onValueChange={(value) => setNewPermission(value as UserPermission)}>
                      <SelectTrigger id="permission"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inspect_and_train">Inspect & Train</SelectItem>
                        <SelectItem value="inspect_only">Inspect Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Your Password</Label>
                    <Input id="password" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSendInvitation}>Send Invitation</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
              <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-8 text-sm bg-white" />
            </div>
            <Select value={permissionFilter} onValueChange={(v) => setPermissionFilter(v as any)}><SelectTrigger className="w-[140px] h-8 text-sm"><SelectValue placeholder="Role" /></SelectTrigger><SelectContent><SelectItem value="All">All</SelectItem><SelectItem value="inspect_and_train">Inspect & Train</SelectItem><SelectItem value="inspect_only">Inspect Only</SelectItem></SelectContent></Select>
          </div>

          <div className="rounded-lg border bg-white overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="h-9">
                  <TableHead className="font-semibold text-xs text-gray-700">User</TableHead>
                  <TableHead className="font-semibold text-xs text-gray-700">Role</TableHead>
                  <TableHead className="font-semibold text-xs text-gray-700">Permission</TableHead>
                  <TableHead className="font-semibold text-xs text-gray-700">Status</TableHead>
                  <TableHead className="text-right font-semibold text-xs text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                    <TableRow key={`member-${member.id}`} className="h-12">
                      <TableCell><div className="font-medium text-sm">{member.username}</div><div className="text-xs text-gray-500">{member.email}</div></TableCell>
                      <TableCell><span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">{member.role === 'COMPANY_ADMIN' ? 'Admin' : 'Member'}</span></TableCell>
                      <TableCell><Badge className={getPermissionBadgeColor(member.permission)} variant="secondary">{getPermissionLabel(member.permission)}</Badge></TableCell>
                      <TableCell><span className="text-xs text-green-600 font-medium">Active</span></TableCell>
                      <TableCell className="text-right">
                        {member.role !== 'COMPANY_ADMIN' && member.id !== userData?.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-6 w-6 p-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditingMember({ id: member.id, username: member.username, currentPermission: member.permission }); setEditPermission(member.permission) }}><Shield className="mr-2 h-3.5 w-3.5" /> Change Permission</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setRemovingMember({id: member.id, username: member.username})} className="text-red-600"><Trash2 className="mr-2 h-3.5 w-3.5" /> Remove</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                ))}
                {filteredInvitations.map((invitation) => (
                    <TableRow key={`invitation-${invitation.id}`} className="h-12">
                      <TableCell><div className="font-medium text-sm text-gray-600">{invitation.target_identifier}</div><div className="text-xs text-gray-400">Invitation</div></TableCell>
                      <TableCell>-</TableCell>
                      <TableCell><Badge className={getPermissionBadgeColor(invitation.permission as UserPermission)} variant="secondary">{getPermissionLabel(invitation.permission as UserPermission)}</Badge></TableCell>
                      <TableCell><Badge className={getStatusColor(invitation.status)} variant="secondary">{mapStatus(invitation.status)}</Badge></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-6 w-6 p-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {invitation.status === 'pending' && <><DropdownMenuItem onClick={() => handleResendInvitation(invitation.id)}><Mail className="mr-2 h-3.5 w-3.5" /> Resend</DropdownMenuItem><DropdownMenuItem onClick={() => handleRevokeInvitation(invitation.id)}>Revoke</DropdownMenuItem></>}
                            <DropdownMenuItem onClick={() => handleDeleteInvitation(invitation.id)} className="text-red-600"><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete</DropdownMenuItem>
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
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader><DialogTitle>Change Permission</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <Select value={editPermission} onValueChange={setEditPermission}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="INSPECT_AND_TRAIN">Inspect & Train</SelectItem><SelectItem value="INSPECT_ONLY">Inspect Only</SelectItem></SelectContent>
              </Select>
              <Input type="password" placeholder="Password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
            </div>
            <DialogFooter><Button onClick={handleUpdatePermission}>Update</Button></DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Remove Dialog */}
      <Dialog open={!!removingMember} onOpenChange={(open) => !open && setRemovingMember(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader><DialogTitle>Remove Member</DialogTitle></DialogHeader>
            <div className="py-4"><Input type="password" placeholder="Password" value={removePassword} onChange={(e) => setRemovePassword(e.target.value)} /></div>
            <DialogFooter><Button variant="destructive" onClick={handleRemoveMember}>Remove</Button></DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  )
}