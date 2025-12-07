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
    // Logic omitted for brevity
    setIsDialogOpen(false)
  }

  // Filter logic omitted for brevity
  const filteredInvitations = invitations // Placeholder for filter logic

  const getStatusBadgeVariant = (status: InvitationStatus) => {
    switch (status) {
      case 'Accepted': return 'default'
      case 'Pending': return 'secondary'
      case 'Expired': return 'destructive'
      default: return 'default'
    }
  }

  return (
    // UPDATED: Tight layout
    <div className="container mx-auto pt-1 pb-8 space-y-3 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-100 pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Invitations</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage team member invitations and access.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 bg-primary hover:bg-primary/90 text-xs font-medium shadow-sm">
              <UserPlus className="mr-2 h-3.5 w-3.5" />
              Send Invitation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Send New Invitation</DialogTitle>
              <DialogDescription>Invite a new team member.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="user@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={newRole} onValueChange={(value) => setNewRole(value as UserRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Owner">Owner</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Developer">Developer</SelectItem>
                    <SelectItem value="Auditor">Auditor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSendInvitation}>Send Invitation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters - Compact */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="text-slate-400 absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <Input 
            placeholder="Search by email..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-8 h-8 text-sm bg-white"
          />
        </div>
        <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as UserRole | 'All')}>
          <SelectTrigger className="w-[140px] h-8 text-sm bg-white"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Roles</SelectItem>
            <SelectItem value="Owner">Owner</SelectItem>
            <SelectItem value="Manager">Manager</SelectItem>
            <SelectItem value="Developer">Developer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as InvitationStatus | 'All')}>
          <SelectTrigger className="w-[140px] h-8 text-sm bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Accepted">Accepted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table - Compact */}
      <div className="rounded-lg border bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow className="h-9">
              <TableHead className="font-semibold text-xs text-gray-700">Email</TableHead>
              <TableHead className="font-semibold text-xs text-gray-700">Role</TableHead>
              <TableHead className="font-semibold text-xs text-gray-700">Status</TableHead>
              <TableHead className="font-semibold text-xs text-gray-700">Sent Date</TableHead>
              <TableHead className="text-right font-semibold text-xs text-gray-700">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvitations.map((invitation) => (
              <TableRow key={invitation.id} className="h-12 hover:bg-slate-50/50">
                <TableCell className="font-medium text-sm text-slate-900">{invitation.email}</TableCell>
                <TableCell><Badge variant="secondary" className="text-[10px] font-medium">{invitation.role}</Badge></TableCell>
                <TableCell><Badge variant={getStatusBadgeVariant(invitation.status)} className="text-[10px]">{invitation.status}</Badge></TableCell>
                <TableCell className="text-xs text-slate-500">{new Date(invitation.sentDate).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Mail className="mr-2 h-3.5 w-3.5" /> Resend</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600"><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}