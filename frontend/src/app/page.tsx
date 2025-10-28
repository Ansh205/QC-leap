'use client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function HomePage() {
  const [showSignIn, setShowSignIn] = useState(true)
  const router = useRouter()

  function handleSignIn() {
    router.push('/models')
  }

  return (
    <>
      <div className="flex px-6">
        <div className="w-1/2 text-3xl">QC-Leap</div>
      </div>

      <div className="fixed top-6 right-6">
        {showSignIn ? (
          <Card className="w-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Sign In</CardTitle>
              <CardDescription>Welcome back to QC-Leap</CardDescription>
            </CardHeader>
            <CardContent>
              <form id="form-signin" className="space-y-5" action={handleSignIn}>
                <div className="grid gap-3">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="your@email.com" />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="Enter your password" />
                </div>
              </form>
            </CardContent>

            <CardFooter className="flex-col gap-2">
              <Button type="submit" className="w-full" form="form-signin">
                Sign In
              </Button>
              <div className="flex items-center gap-1">
                Don't have an account?{' '}
                <span onClick={() => setShowSignIn(false)} className="cursor-pointer font-bold">
                  Sign Up
                </span>
              </div>
            </CardFooter>
          </Card>
        ) : (
          <Card className="w-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Create Account</CardTitle>
              <CardDescription>Get started with QC-Leap today</CardDescription>
            </CardHeader>
            <CardFooter className="flex-col gap-2">
              <Button type="submit" className="w-full">
                Create Account
              </Button>
              <div className="flex items-center gap-1">
                Already have an account?{' '}
                <span onClick={() => setShowSignIn(true)} className="cursor-pointer font-bold">
                  Sign In
                </span>
              </div>
            </CardFooter>
          </Card>
        )}
      </div>
    </>
  )
}
