'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Building2, User, KeyRound, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { auth } from '@/lib/api'

const accountSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
})

type AccountFormValues = z.infer<typeof accountSchema>

export default function AccountPage() {
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = await auth.getCurrentUser()
        setUserData(user)
      } catch {
        toast.error('Failed to load user data')
      } finally {
        setLoading(false)
      }
    }
    fetchUserData()
  }, [])

  if (loading) return <div className="container mx-auto py-8 text-center text-sm text-slate-500">Loading...</div>

  return (
    <div className="container mx-auto animate-in fade-in duration-500">
      
      {/* HEADER - no extra padding, no vertical space */}
      <div className="flex flex-col md:flex-row justify-between items-center border-b border-gray-100 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-xs text-slate-500">Manage your profile and security.</p>
        </div>

        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs bg-white border-slate-200">
              <KeyRound className="mr-2 h-3 w-3" /> Change Password
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
            </DialogHeader>
            <div className="py-4">Form goes here</div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards Section — NO GAP above first card */}
      <div className="mt-1 grid gap-3">

        {/* USER INFO */}
        <Card className="w-full shadow-sm border-slate-200">
          <CardHeader className="pb-0 border-b border-slate-50 px-4 pt-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <CardTitle className="text-sm font-semibold text-slate-900">
                User Information
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="pt-3 px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-3">
              <div>
                <Label className="text-[10px] text-slate-500 uppercase font-bold">Username</Label>
                <p className="text-sm font-medium">{userData?.username}</p>
              </div>

              <div>
                <Label className="text-[10px] text-slate-500 uppercase font-bold">Email</Label>
                <p className="text-sm font-medium">{userData?.email}</p>
              </div>

              <div>
                <Label className="text-[10px] text-slate-500 uppercase font-bold">Full Name</Label>
                <p className="text-sm font-medium">{userData?.full_name || '-'}</p>
              </div>

              <div>
                <Label className="text-[10px] text-slate-500 uppercase font-bold">Company</Label>
                <p className="text-sm font-medium">
                  {userData?.company?.name || 'None'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* COMPANY INFO */}
        {userData?.company_id && (
          <Card className="w-full shadow-sm border-slate-200">
            <CardHeader className="pb-0 border-b border-slate-50 px-4 pt-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-indigo-50 rounded-lg">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                </div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Company Information
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="pt-3 px-4 pb-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                <div>
                  <Label className="text-[10px] text-slate-500 uppercase font-bold">Name</Label>
                  <p className="text-sm font-medium">{userData?.company?.name}</p>
                </div>

                <div>
                  <Label className="text-[10px] text-slate-500 uppercase font-bold">Industry</Label>
                  <p className="text-sm font-medium">{userData?.company?.industry}</p>
                </div>
              </div>

              <div>
                <Label className="text-[10px] text-slate-500 uppercase font-bold">Description</Label>
                <p className="text-sm font-medium">{userData?.company?.description}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* DANGER ZONE */}
        <Card className="w-full border-red-100 shadow-sm">
          <CardHeader className="pb-0 border-b border-red-50 bg-red-50/30 px-4 pt-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-red-100 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <CardTitle className="text-sm font-semibold text-red-900">Danger Zone</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="pt-2 px-4 pb-2">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-medium text-slate-900">Delete Account</h4>
                <p className="text-[11px] text-slate-500">Permanently remove your account.</p>
              </div>

              <Button variant="destructive" size="sm" className="h-7 text-xs px-3">
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
