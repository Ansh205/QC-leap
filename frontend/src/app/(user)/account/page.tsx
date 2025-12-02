'use client'

<<<<<<< HEAD
import { useState } from 'react'
=======
import { useState, useEffect } from 'react'
>>>>>>> master
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
<<<<<<< HEAD
import { Building2, Lock, Save, Shield } from 'lucide-react'
import { toast } from 'sonner'

// Combined schema for all account changes - requires current password
const accountSchema = z
  .object({
    companyName: z.string().min(2, {
      message: 'Company name must be at least 2 characters.',
    }),
=======
import { Building2, Lock, Save, Shield, User, Mail, UserCircle, Award } from 'lucide-react'
import { toast } from 'sonner'
import { auth } from '@/lib/api'

// Schema for password changes - requires current password
const accountSchema = z
  .object({
>>>>>>> master
    currentPassword: z.string().min(1, {
      message: 'Current password is required to make changes.',
    }),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      // If new password is provided, it must be at least 8 characters
      if (data.newPassword && data.newPassword.length > 0) {
        return data.newPassword.length >= 8
      }
      return true
    },
    {
      message: 'New password must be at least 8 characters.',
      path: ['newPassword'],
    }
  )
  .refine(
    (data) => {
      // If new password is provided, confirm password must match
      if (data.newPassword && data.newPassword.length > 0) {
        return data.newPassword === data.confirmPassword
      }
      return true
    },
    {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    }
  )
  .refine(
    (data) => {
      // If new password is provided, it must be different from current
      if (data.newPassword && data.newPassword.length > 0) {
        return data.currentPassword !== data.newPassword
      }
      return true
    },
    {
      message: 'New password must be different from current password',
      path: ['newPassword'],
    }
  )

type AccountFormValues = z.infer<typeof accountSchema>

export default function AccountPage() {
  const [isUpdating, setIsUpdating] = useState(false)
<<<<<<< HEAD

  // Single form for all account changes
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      companyName: 'Company Pvt. Ltd.',
=======
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Fetch current user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = await auth.getCurrentUser()
        setUserData(user)
      } catch (error) {
        toast.error('Failed to load user data')
      } finally {
        setLoading(false)
      }
    }
    fetchUserData()
  }, [])

  // Form for password changes
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
>>>>>>> master
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: AccountFormValues) => {
    setIsUpdating(true)

    try {
<<<<<<< HEAD
      // Determine what's being changed
      const isChangingPassword = data.newPassword && data.newPassword.length > 0
      const isChangingCompany = data.companyName !== 'Company Pvt. Ltd.' // Compare with original value

      // API call to verify current password first
      // Then update company name and/or password
      await new Promise((resolve) => setTimeout(resolve, 1000))
      console.log('Account update data:', data)

      if (isChangingPassword && isChangingCompany) {
        toast.success('Company name and password updated successfully.')
      } else if (isChangingPassword) {
        toast.success('Password changed successfully.')
      } else if (isChangingCompany) {
        toast.success('Company name updated successfully.')
      }

      // Reset only the password fields after successful submission
=======
      const isChangingPassword = data.newPassword && data.newPassword.length > 0

      if (!isChangingPassword) {
        toast.error('Please enter a new password to change it.')
        setIsUpdating(false)
        return
      }

      // API call to verify current password and change password
      await new Promise((resolve) => setTimeout(resolve, 1000))
      console.log('Password change data:', data)

      toast.success('Password changed successfully.')

      // Reset password fields after successful submission
>>>>>>> master
      form.setValue('currentPassword', '')
      form.setValue('newPassword', '')
      form.setValue('confirmPassword', '')
    } catch (error) {
<<<<<<< HEAD
      toast.error('Failed to update account. Please check your current password.')
=======
      toast.error('Failed to update password. Please check your current password.')
>>>>>>> master
    } finally {
      setIsUpdating(false)
    }
  }

<<<<<<< HEAD
=======
  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

>>>>>>> master
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-slate-600">Manage your account information and security</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="mx-auto max-w-3xl space-y-6 pt-3">
<<<<<<< HEAD
          {/* Company Information Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <CardTitle>Company Information</CardTitle>
              </div>
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
=======
          {/* User Information Card (Read-only) */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <CardTitle>User Information</CardTitle>
              </div>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    Username
                  </Label>
                  <p className="text-sm font-medium">{userData?.username}</p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <p className="text-sm font-medium">{userData?.email}</p>
                </div>
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <p className="text-sm font-medium">{userData?.full_name || 'Not provided'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Associated Company
                  </Label>
                  <p className="text-sm font-medium">{userData?.company?.name || 'None'}</p>
                </div>
>>>>>>> master
              </div>
            </CardContent>
          </Card>

<<<<<<< HEAD
          {/* Password Change Card */}
          <Card>
=======
          {/* Company Information Card - Only show for users with company */}
          {userData?.company_id && userData?.role?.toUpperCase() !== 'COMPANY_ADMIN' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  <CardTitle>Company Information</CardTitle>
                </div>
                <CardDescription>Your company details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <p className="text-sm font-medium">{userData?.company?.name}</p>
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
                <div className="space-y-2 pt-2 border-t">
                  <Label className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Your Role & Permission
                  </Label>
                  <p className="text-sm font-medium">
                    {userData?.role?.toUpperCase() === 'COMPANY_ADMIN' ? 'Company Admin' : 'Member'} •{' '}
                    {userData?.permission?.toUpperCase() === 'INSPECT_AND_TRAIN'
                      ? 'Inspect & Train'
                      : userData?.permission?.toUpperCase() === 'INSPECT_ONLY'
                      ? 'Inspect Only'
                      : 'Unknown Permission'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Contact a company admin to modify company information
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Password Change Card */}
          <Card className="border-yellow-200 bg-yellow-50/50">
>>>>>>> master
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                <CardTitle>Change Password</CardTitle>
              </div>
<<<<<<< HEAD
=======
              <CardDescription>Update your password with verification</CardDescription>
>>>>>>> master
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter your new password"
                  {...form.register('newPassword')}
                  aria-invalid={!!form.formState.errors.newPassword}
                />
                {form.formState.errors.newPassword && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.newPassword.message}
                  </p>
                )}
                <p className="text-muted-foreground text-xs">
                  Password must be at least 8 characters long
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  {...form.register('confirmPassword')}
                  aria-invalid={!!form.formState.errors.confirmPassword}
                />
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
<<<<<<< HEAD
            </CardContent>
          </Card>

          {/* Authentication Card - Current Password Required */}
          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-yellow-600" />
                <CardTitle className="text-yellow-900">Verify Your Identity</CardTitle>
              </div>
              <CardDescription className="text-yellow-800">
                Enter your current password to save any changes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password *</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="Enter current password"
                  {...form.register('currentPassword')}
                  aria-invalid={!!form.formState.errors.currentPassword}
                />
                {form.formState.errors.currentPassword && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.currentPassword.message}
                  </p>
                )}
=======

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
                    Your current password is required to change your password
                  </p>
                </div>
>>>>>>> master
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isUpdating} className="w-full">
                <Save className="mr-2 h-4 w-4" />
<<<<<<< HEAD
                {isUpdating ? 'Saving Changes...' : 'Save Changes'}
=======
                {isUpdating ? 'Saving Changes...' : 'Change Password'}
>>>>>>> master
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  )
}
