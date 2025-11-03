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
import { CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function HomePage() {
  const [showSignIn, setShowSignIn] = useState(true)
  const router = useRouter()

  function handleSignIn() {
    router.push('/models')
  }

  function handleSignUp() {
    router.push('/models')
  }

  return (
    <>
      <div className="flex px-10">
        <div className="w-1/2 py-10">
          <h1 className="text-5xl font-bold text-[#0064C8]">QC-Leap</h1>
          <h2 className="mt-2 text-4xl font-bold">Transform Quality Control with AI</h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-600">
            Transform your manufacturing quality control with advanced AI models trained on just
            50–100 sample images. Built specifically for MSMEs who lack massive datasets but demand
            enterprise-grade defect detection.
          </p>

          <ul className="mt-8 space-y-3 text-gray-700">
            <li className="flex items-start gap-3 text-lg">
              <CheckCircle2 className="mt-1 h-5 w-5 text-green-500" />
              <p>
                <b>Train custom models</b> from minimal data — no thousands of images required
              </p>
            </li>
            <li className="flex items-start gap-3 text-lg">
              <CheckCircle2 className="mt-1 h-5 w-5 text-green-500" />
              <p>
                <b>Detect defects instantly</b> with Vision AI that learns your specific product
                quality standards
              </p>
            </li>
            <li className="flex items-start gap-3 text-lg">
              <CheckCircle2 className="mt-1 h-5 w-5 text-green-500" />
              <p>
                <b>Deploy in days, not months</b> — upload samples, validate synthetic data, start
                inspecting
              </p>
            </li>
            <li className="flex items-start gap-3 text-lg">
              <CheckCircle2 className="mt-1 h-5 w-5 text-green-500" />
              <p>
                <b>No technical expertise needed</b> — guided workflows from model creation to
                production deployment
              </p>
            </li>
            <li className="flex items-start gap-3 text-lg">
              <CheckCircle2 className="mt-1 h-5 w-5 text-green-500" />
              <p>
                <b>Real-time classification</b> with confidence scores for every inspection result
              </p>
            </li>
          </ul>
        </div>
      </div>

      <div className="fixed top-12 right-16">
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
              <div className="mt-1 flex items-center gap-1">
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
            <CardContent>
              <form id="form-signup" className="space-y-5" action={handleSignUp}>
                <div className="grid gap-3">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    type="text"
                    placeholder="Enter your company name"
                    required
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="your@email.com" required />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="Enter your password" required />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="confirm_password">Confirm Password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    placeholder="Confirm your password"
                    required
                  />
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button type="submit" className="w-full" form="form-signup">
                Create Account
              </Button>
              <div className="mt-1 flex items-center gap-1">
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
