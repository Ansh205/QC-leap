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
import { Mail, MoreVertical, Search, Trash2, UserPlus, Send } from 'lucide-react'

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
  const [newRole, setNewRole] = useState<UserRole>('Developer')

  const handleSendInvitation = () => {
    setIsDialogOpen(false)
  }

  // Filter logic omitted for brevity
  const filteredInvitations = invitations // Placeholder for filter logic

  const getStatusBadgeVariant = (status: InvitationStatus) => {
    switch (status) {
      case 'Accepted': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'Pending': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'Expired': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  return (
    <div className="space-y-3 pt-0 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* Header - Stats Page Layout */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Invitations</h1>
          <p className="text-xs text-slate-500 font-medium">Manage pending invites and team access requests.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-xs shadow-lg shadow-blue-600/20 transition-transform hover:scale-105">
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Send Invitation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Send New Invitation</DialogTitle>
              <DialogDescription>Invite a new team member via email.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
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
        <div className="relative flex-1 min-w-[200px] group">
          <div className="absolute left-2.5 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-slate-400 group-focus-within:bg-indigo-500 group-focus-within:text-white transition-colors duration-200">
             <Search className="h-2.5 w-2.5" />
          </div>
          <Input 
            placeholder="Search by email..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-9 h-8 text-xs bg-white border-slate-200 focus:border-indigo-300 transition-all"
          />
        </div>
        <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as UserRole | 'All')}>
          <SelectTrigger className="w-[140px] h-8 text-xs bg-white border-slate-200"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Roles</SelectItem>
            <SelectItem value="Owner">Owner</SelectItem>
            <SelectItem value="Manager">Manager</SelectItem>
            <SelectItem value="Developer">Developer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as InvitationStatus | 'All')}>
          <SelectTrigger className="w-[140px] h-8 text-xs bg-white border-slate-200"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Accepted">Accepted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table - Glassmorphic */}
      <div className="rounded-xl border border-white/60 bg-white/80 backdrop-blur-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow className="h-9 hover:bg-slate-50/80">
              <TableHead className="font-bold text-[10px] text-slate-500 uppercase tracking-wider h-9">Email</TableHead>
              <TableHead className="font-bold text-[10px] text-slate-500 uppercase tracking-wider h-9">Role</TableHead>
              <TableHead className="font-bold text-[10px] text-slate-500 uppercase tracking-wider h-9">Status</TableHead>
              <TableHead className="font-bold text-[10px] text-slate-500 uppercase tracking-wider h-9">Sent Date</TableHead>
              <TableHead className="text-right font-bold text-[10px] text-slate-500 uppercase tracking-wider h-9">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvitations.map((invitation) => (
              <TableRow key={invitation.id} className="h-10 hover:bg-slate-50/50 border-slate-50">
                <TableCell className="font-medium text-xs text-slate-900 py-2">{invitation.email}</TableCell>
                <TableCell className="py-2"><Badge variant="secondary" className="text-[10px] font-medium border border-slate-200">{invitation.role}</Badge></TableCell>
                <TableCell className="py-2"><Badge variant="secondary" className={`text-[10px] font-medium border ${getStatusBadgeVariant(invitation.status)}`}>{invitation.status}</Badge></TableCell>
                <TableCell className="text-xs text-slate-500 py-2">{new Date(invitation.sentDate).toLocaleDateString()}</TableCell>
                <TableCell className="text-right py-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-slate-100 rounded-full"><MoreVertical className="h-3.5 w-3.5 text-slate-400" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem className="text-xs cursor-pointer"><Mail className="mr-2 h-3.5 w-3.5 text-slate-500" /> Resend</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete</DropdownMenuItem>
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