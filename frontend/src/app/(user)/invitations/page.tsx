'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Mail, MoreVertical, Search, Trash2, UserPlus } from 'lucide-react'

type UserRole = 'Owner' | 'Manager' | 'Developer' | 'Auditor'
type InvitationStatus = 'Pending' | 'Accepted' | 'Expired'

type Invitation = {
  id: string
  email: string
  role: UserRole
  status: InvitationStatus
  sentDate: string
}

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([
    {
      id: '1',
      email: 'john.doe@example.com',
      role: 'Manager',
      status: 'Accepted',
      sentDate: '2024-10-15',
    },
    {
      id: '2',
      email: 'jane.smith@example.com',
      role: 'Developer',
      status: 'Pending',
      sentDate: '2024-10-20',
    },
    {
      id: '3',
      email: 'bob.wilson@example.com',
      role: 'Auditor',
      status: 'Pending',
      sentDate: '2024-10-25',
    },
  ])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'All'>('All')
  const [statusFilter, setStatusFilter] = useState<InvitationStatus | 'All'>('All')

  // Form state
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('Developer')

  const handleSendInvitation = () => {
    if (!newEmail || !newPassword) {
      alert('Please fill in all fields')
      return
    }

    const newInvitation: Invitation = {
      id: crypto.randomUUID(),
      email: newEmail,
      role: newRole,
      status: 'Pending',
      sentDate: new Date().toISOString().split('T')[0],
    }

    setInvitations((prev) => [...prev, newInvitation])

    // Reset form
    setNewEmail('')
    setNewPassword('')
    setNewRole('Developer')
    setIsDialogOpen(false)

    // Here you would typically send the invitation via API
    console.log('Sending invitation:', { email: newEmail, password: newPassword, role: newRole })
  }

  const handleResendInvitation = (id: string) => {
    console.log('Resending invitation:', id)
    // API call to resend invitation
  }

  const handleDeleteInvitation = (id: string) => {
    setInvitations((prev) => prev.filter((inv) => inv.id !== id))
  }

  const handleRevokeInvitation = (id: string) => {
    setInvitations((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, status: 'Expired' as InvitationStatus } : inv))
    )
  }

  // Filter invitations
  const filteredInvitations = invitations.filter((invitation) => {
    const matchesSearch = invitation.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'All' || invitation.role === roleFilter
    const matchesStatus = statusFilter === 'All' || invitation.status === statusFilter

    return matchesSearch && matchesRole && matchesStatus
  })

  const getStatusBadgeVariant = (status: InvitationStatus) => {
    switch (status) {
      case 'Accepted':
        return 'default'
      case 'Pending':
        return 'secondary'
      case 'Expired':
        return 'destructive'
      default:
        return 'default'
    }
  }

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'Owner':
        return 'bg-purple-100 text-purple-800'
      case 'Manager':
        return 'bg-blue-100 text-blue-800'
      case 'Developer':
        return 'bg-green-100 text-green-800'
      case 'Auditor':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invitations</h1>
          <p className="text-slate-600">Manage team member invitations and access</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Send Invitation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Send New Invitation</DialogTitle>
              <DialogDescription>
                Invite a new team member by providing their email and assigning a role
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Temporary Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter temporary password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select value={newRole} onValueChange={(value) => setNewRole(value as UserRole)}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Owner">Owner - Full access and control</SelectItem>
                    <SelectItem value="Manager">Manager - Manage operations and users</SelectItem>
                    <SelectItem value="Developer">Developer - Model Management</SelectItem>
                    <SelectItem value="Auditor">Auditor - Read-only access</SelectItem>
                  </SelectContent>
                </Select>
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
            placeholder="Search by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={roleFilter}
          onValueChange={(value) => setRoleFilter(value as UserRole | 'All')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Roles</SelectItem>
            <SelectItem value="Owner">Owner</SelectItem>
            <SelectItem value="Manager">Manager</SelectItem>
            <SelectItem value="Developer">Developer</SelectItem>
            <SelectItem value="Auditor">Auditor</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as InvitationStatus | 'All')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Accepted">Accepted</SelectItem>
            <SelectItem value="Expired">Expired</SelectItem>
          </SelectContent>
        </Select>

        {(searchQuery || roleFilter !== 'All' || statusFilter !== 'All') && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearchQuery('')
              setRoleFilter('All')
              setStatusFilter('All')
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Invitations Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sent Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvitations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No invitations found
                </TableCell>
              </TableRow>
            ) : (
              filteredInvitations.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell className="font-medium">{invitation.email}</TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(invitation.role)} variant="secondary">
                      {invitation.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(invitation.status)}>
                      {invitation.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(invitation.sentDate).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {invitation.status === 'Pending' && (
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
  )
}
