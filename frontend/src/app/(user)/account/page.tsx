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
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Building2, User, KeyRound, AlertTriangle, Pencil, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { auth } from '@/lib/api'

// Schema for Password Change
const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
})

// Schema for Profile Edit
const profileSchema = z.object({
    username: z.string().min(2, 'Username must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    full_name: z.string().optional(),
})

type PasswordFormValues = z.infer<typeof passwordSchema>
type ProfileFormValues = z.infer<typeof profileSchema>

export default function AccountPage() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // Dialog States
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Forms
  const passwordForm = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) })
  const profileForm = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema) })

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = await auth.getCurrentUser()
        setUserData(user)
        // Pre-fill profile form
        profileForm.reset({
            username: user.username,
            email: user.email,
            full_name: user.full_name || '',
        })
      } catch (error) {
        toast.error('Failed to load user data')
      } finally {
        setLoading(false)
      }
    }
    fetchUserData()
  }, [profileForm])

  const onPasswordSubmit = async (data: PasswordFormValues) => {
     setIsUpdating(true)
     // Simulate API call
     setTimeout(() => { 
         setIsUpdating(false) 
         setIsPasswordDialogOpen(false) 
         passwordForm.reset()
         toast.success('Password updated successfully')
     }, 1000)
  }

  const onProfileSubmit = async (data: ProfileFormValues) => {
    setIsUpdating(true)
    try {
        // NOTE: Replace with actual auth.updateProfile(data) call when available
        // await auth.updateProfile(data) 
        
        // Simulating update for UI feedback
        setUserData({ ...userData, ...data })
        
        setTimeout(() => {
            setIsUpdating(false)
            setIsProfileDialogOpen(false)
            toast.success('Profile updated successfully')
        }, 800)
    } catch (error) {
        toast.error('Failed to update profile')
        setIsUpdating(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
        // Simulate API call for deletion
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        setIsDeleting(false)
        setIsDeleteDialogOpen(false)
        toast.success("Account deleted successfully")
        
        // Optional: Redirect to login or home
        // window.location.href = '/'
    } catch (error) {
        setIsDeleting(false)
        toast.error("Failed to delete account")
    }
  }

  if (loading) return <div className="container mx-auto py-8 text-center text-sm text-slate-500">Loading...</div>

  return (
    <div className="container mx-auto space-y-2 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-2 border-b border-gray-100 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Account Settings</h1>
          <p className="text-xs text-slate-500">Manage your profile and security.</p>
        </div>
        
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs bg-white border-slate-200 shadow-sm">
              <KeyRound className="mr-2 h-3 w-3" /> Change Password
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
             <DialogHeader>
                 <DialogTitle>Change Password</DialogTitle>
                 <DialogDescription>Enter your current password to make changes.</DialogDescription>
             </DialogHeader>
             <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="py-2 space-y-3">
                <div className="space-y-1">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input id="currentPassword" type="password" {...passwordForm.register('currentPassword')} />
                    {passwordForm.formState.errors.currentPassword && <p className="text-xs text-red-500">{passwordForm.formState.errors.currentPassword.message}</p>}
                </div>
                <div className="space-y-1">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" {...passwordForm.register('newPassword')} />
                    {passwordForm.formState.errors.newPassword && <p className="text-xs text-red-500">{passwordForm.formState.errors.newPassword.message}</p>}
                </div>
                <div className="space-y-1">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input id="confirmPassword" type="password" {...passwordForm.register('confirmPassword')} />
                    {passwordForm.formState.errors.confirmPassword && <p className="text-xs text-red-500">{passwordForm.formState.errors.confirmPassword.message}</p>}
                </div>
                <DialogFooter className="pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isUpdating}>{isUpdating ? 'Updating...' : 'Update Password'}</Button>
                </DialogFooter>
             </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {/* User Information */}
        <Card className="w-full shadow-sm border-slate-200">
          <CardHeader className="py-2 border-b border-slate-50 px-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 rounded-lg"><User className="h-4 w-4 text-blue-600" /></div>
                    <div><CardTitle className="text-sm font-semibold text-slate-900">User Information</CardTitle></div>
                </div>
                
                <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-slate-100">
                            <Pencil className="h-3.5 w-3.5 text-slate-500" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Edit Profile</DialogTitle>
                            <DialogDescription>Update your personal information.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="username">Username</Label>
                                <Input id="username" {...profileForm.register('username')} />
                                {profileForm.formState.errors.username && <p className="text-xs text-red-500">{profileForm.formState.errors.username.message}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" {...profileForm.register('email')} />
                                {profileForm.formState.errors.email && <p className="text-xs text-red-500">{profileForm.formState.errors.email.message}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="full_name">Full Name</Label>
                                <Input id="full_name" {...profileForm.register('full_name')} />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsProfileDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isUpdating}>{isUpdating ? 'Saving...' : 'Save Changes'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
          </CardHeader>
          <CardContent className="pt-2 px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-3">
              <div><Label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Username</Label><p className="text-sm font-medium">{userData?.username}</p></div>
              <div><Label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Email</Label><p className="text-sm font-medium">{userData?.email}</p></div>
              <div><Label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Full Name</Label><p className="text-sm font-medium">{userData?.full_name || '-'}</p></div>
              <div><Label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Company</Label><p className="text-sm font-medium">{userData?.company?.name || 'None'}</p></div>
            </div>
          </CardContent>
        </Card>

        {/* Company Info */}
        {userData?.company_id && (
          <Card className="w-full shadow-sm border-slate-200">
            <CardHeader className="py-2 border-b border-slate-50 px-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 rounded-lg"><Building2 className="h-4 w-4 text-indigo-600" /></div>
                <div><CardTitle className="text-sm font-semibold text-slate-900">Company Information</CardTitle></div>
              </div>
            </CardHeader>
            <CardContent className="pt-2 px-4 pb-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                <div><Label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Name</Label><p className="text-sm font-medium">{userData?.company?.name}</p></div>
                <div><Label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Industry</Label><p className="text-sm font-medium">{userData?.company?.industry}</p></div>
              </div>
              <div><Label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Description</Label><p className="text-sm font-medium">{userData?.company?.description}</p></div>
            </CardContent>
          </Card>
        )}

        {/* Danger Zone */}
        <Card className="w-full border-red-100 shadow-sm">
          <CardHeader className="py-2 border-b border-red-50 bg-red-50/30 px-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-100 rounded-lg"><AlertTriangle className="h-4 w-4 text-red-600" /></div>
              <div><CardTitle className="text-sm font-semibold text-red-900">Danger Zone</CardTitle></div>
            </div>
          </CardHeader>
          <CardContent className="pt-2 px-4 pb-2">
            <div className="flex justify-between items-center my-1">
              <div><h4 className="text-sm font-medium text-slate-900">Delete Account</h4><p className="text-[11px] text-slate-500">Permanently remove your account.</p></div>
              <Button variant="destructive" size="sm" className="h-7 text-xs px-3" onClick={() => setIsDeleteDialogOpen(true)}>Delete</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Added Missing Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
                <DialogTitle className="text-red-600">Delete Account</DialogTitle>
                <DialogDescription>
                    Are you sure you want to delete your account? This action cannot be undone and will remove all your data.
                </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 py-4">
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>Cancel</Button>
                <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting}>
                    {isDeleting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Deleting...
                        </>
                    ) : (
                        'Confirm Delete'
                    )}
                </Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}