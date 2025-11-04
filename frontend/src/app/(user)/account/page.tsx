'use client'

import { useState } from 'react'
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
import { Building2, Lock, Save, Shield } from 'lucide-react'
import { toast } from 'sonner'

// Combined schema for all account changes - requires current password
const accountSchema = z
  .object({
    companyName: z.string().min(2, {
      message: 'Company name must be at least 2 characters.',
    }),
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

  // Single form for all account changes
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      companyName: 'Company Pvt. Ltd.',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: AccountFormValues) => {
    setIsUpdating(true)

    try {
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
      form.setValue('currentPassword', '')
      form.setValue('newPassword', '')
      form.setValue('confirmPassword', '')
    } catch (error) {
      toast.error('Failed to update account. Please check your current password.')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-slate-600">Manage your account information and security</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="mx-auto max-w-3xl space-y-6 pt-3">
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
              </div>
            </CardContent>
          </Card>

          {/* Password Change Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                <CardTitle>Change Password</CardTitle>
              </div>
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
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isUpdating} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                {isUpdating ? 'Saving Changes...' : 'Save Changes'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  )
}
