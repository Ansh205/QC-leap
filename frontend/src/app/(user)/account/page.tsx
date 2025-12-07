'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Building2,
  User,
  KeyRound,
  AlertTriangle,
  Pencil,
  Loader2,
  ShieldCheck,
  Briefcase,
  Mail,
} from 'lucide-react'
import { toast } from 'sonner'
import { auth } from '@/lib/api'

// Schema for Password Change
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

// Schema for Profile Edit
const profileSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  full_name: z.string().optional(),
  currentPassword: z.string().min(1, 'Current password is required to save changes'),
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

  // Delete Password State
  const [deletePassword, setDeletePassword] = useState('')

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
          currentPassword: '',
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
      const updatedUser = await auth.updateProfile({
        username: data.username,
        email: data.email,
        full_name: data.full_name,
        current_password: data.currentPassword,
      })

      setUserData(updatedUser)

      // Reset password field
      profileForm.setValue('currentPassword', '')

      toast.success('Profile updated successfully')
      setIsProfileDialogOpen(false)
    } catch (error: any) {
      toast.error(error.detail || 'Failed to update profile')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Please enter your password to confirm deletion')
      return
    }

    setIsDeleting(true)
    try {
      await auth.deleteAccount(deletePassword)

      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
      toast.success('Account deleted successfully')

      // Redirect to login or home
      window.location.href = '/'
    } catch (error: any) {
      setIsDeleting(false)
      toast.error(error.detail || 'Failed to delete account')
    }
  }

  if (loading)
    return (
      <div className="container mx-auto py-8 text-center text-sm text-slate-500">Loading...</div>
    )

  return (
    <div className="animate-in fade-in container mx-auto space-y-4 duration-500">
      {/* Header */}
      <div className="flex flex-col items-center justify-between gap-4 border-b border-indigo-100/50 pb-4 md:flex-row">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Account Settings</h1>
          <p className="text-xs font-medium text-slate-500">
            Manage your profile and security preferences.
          </p>
        </div>

        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-indigo-100 bg-white text-xs text-indigo-700 shadow-sm hover:border-indigo-200 hover:bg-indigo-50"
            >
              <KeyRound className="mr-2 h-3.5 w-3.5" /> Change Password
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>Enter your current password to make changes.</DialogDescription>
            </DialogHeader>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-3 py-2">
              <div className="space-y-1">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  {...passwordForm.register('currentPassword')}
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-xs text-red-500">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" {...passwordForm.register('newPassword')} />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-xs text-red-500">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...passwordForm.register('confirmPassword')}
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-red-500">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPasswordDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? 'Updating...' : 'Update Password'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {/* User Information */}
        <Card className="w-full gap-0 border-white/60 bg-white/80 shadow-lg shadow-blue-900/5 backdrop-blur-xl">
          <CardHeader className="border-b border-indigo-50/50 px-5 py-3 [.border-b]:pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800">User Profile</CardTitle>
                </div>
              </div>

              <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 rounded-full p-0 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>Update your personal information.</DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                    className="grid gap-4 py-4"
                  >
                    <div className="grid gap-2">
                      <Label htmlFor="username">Username</Label>
                      <Input id="username" {...profileForm.register('username')} />
                      {profileForm.formState.errors.username && (
                        <p className="text-xs text-red-500">
                          {profileForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" {...profileForm.register('email')} />
                      {profileForm.formState.errors.email && (
                        <p className="text-xs text-red-500">
                          {profileForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input id="full_name" {...profileForm.register('full_name')} />
                    </div>

                    <div className="mt-2 grid gap-2 border-t pt-2">
                      <Label htmlFor="profile-password">
                        Current Password <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="profile-password"
                        type="password"
                        placeholder="Required to save changes"
                        {...profileForm.register('currentPassword')}
                      />
                      {profileForm.formState.errors.currentPassword && (
                        <p className="text-xs text-red-500">
                          {profileForm.formState.errors.currentPassword.message}
                        </p>
                      )}
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsProfileDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isUpdating}>
                        {isUpdating ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-5 py-5">
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Username
                </Label>
                <p className="mt-0.5 text-sm font-semibold text-slate-700">{userData?.username}</p>
              </div>
              <div>
                <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Email
                </Label>
                <p className="mt-0.5 text-sm font-medium text-slate-700">{userData?.email}</p>
              </div>
              <div>
                <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Full Name
                </Label>
                <p className="mt-0.5 text-sm font-medium text-slate-700">
                  {userData?.full_name || '-'}
                </p>
              </div>
              <div>
                <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Role
                </Label>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <p className="text-sm font-medium text-slate-700">
                    {userData?.role === 'COMPANY_ADMIN' ? 'Admin' : 'Member'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="w-full gap-0 border-red-100/60 bg-red-50/30 shadow-none">
          <CardHeader className="border-b border-red-100/60 px-5 py-3 [.border-b]:pb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-600 text-white shadow-md shadow-red-500/20">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-red-900">Danger Zone</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 py-5">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Delete Account</h4>
                <p className="mt-0.5 text-xs text-slate-500">
                  Permanently remove your account and all associated data.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="h-8 px-4 text-xs"
                onClick={() => {
                  setDeletePassword('')
                  setIsDeleteDialogOpen(true)
                }}
              >
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Delete Account
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete your account? This action cannot be undone and will
              remove all your data.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Label htmlFor="delete-password">Confirm Password</Label>
            <Input
              id="delete-password"
              type="password"
              placeholder="Enter password to confirm"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 py-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeleting || !deletePassword}
            >
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
