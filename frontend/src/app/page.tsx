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
import { useForm, SubmitHandler } from 'react-hook-form'
import { auth } from '@/lib/api'

interface SignInFormInputs {
  username: string
  password: string
}

interface SignUpFormInputs {
  username: string
  email: string
  full_name: string
  password: string
  confirm_password: string
  is_company_admin: boolean
  company_name: string
  company_description: string
  company_industry: string
}

export default function HomePage() {
  const [showSignIn, setShowSignIn] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [isCreatingCompany, setIsCreatingCompany] = useState(false)
  const [signupStep, setSignupStep] = useState(1) // 1 = user info, 2 = company info
  const router = useRouter()

  // --- Sign In Form Logic ---
  const { register: registerSignIn, handleSubmit: handleSubmitSignIn, reset: resetSignIn } =
    useForm<SignInFormInputs>()

  const handleSignInSubmit: SubmitHandler<SignInFormInputs> = async (data, event) => {
    event?.preventDefault() // Prevent default form submission
    setError('')
    setSuccessMessage('')
    setLoading(true)
    try {
      await auth.login(data.username, data.password)
      router.push('/models')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  // --- Sign Up Form Logic ---
  const { register: registerSignUp, handleSubmit: handleSubmitSignUp, reset: resetSignUp } =
    useForm<SignUpFormInputs>()

  const handleSignUpSubmit: SubmitHandler<SignUpFormInputs> = async (data, event) => {
    event?.preventDefault() // Prevent default form submission
    setError('')
    setSuccessMessage('')

    if (data.password !== data.confirm_password) {
      setError('Passwords do not match')
      return
    }

    if (data.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    // Validate company data if creating company
    if (data.is_company_admin) {
      if (!data.company_name || data.company_name.trim().length < 2) {
        setError('Company name is required and must be at least 2 characters')
        return
      }
    }

    setLoading(true)
    try {
      const companyData = data.is_company_admin ? {
        name: data.company_name,
        description: data.company_description || undefined,
        industry: data.company_industry || undefined
      } : undefined

      await auth.register(
        data.email,
        data.username,
        data.password,
        data.full_name,
        data.is_company_admin,
        companyData
      )
      setSuccessMessage('Account created successfully! Please sign in to continue.')
      setShowSignIn(true)
      resetSignUp()
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex px-6">
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

      <div className="absolute top-20 right-40">
        {showSignIn ? (
          <Card className="w-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Sign In</CardTitle>
              <CardDescription>Welcome back to QC-Leap</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                id="form-signin"
                method="post"
                className="space-y-5"
                onSubmit={handleSubmitSignIn(handleSignInSubmit)}
              >
                {successMessage && (
                  <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 border border-green-200">
                    {successMessage}
                  </div>
                )}
                {error && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
                    {error}
                  </div>
                )}
                <div className="grid gap-3">
                  <Label htmlFor="username">Username or Email</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username or email"
                    disabled={loading}
                    {...registerSignIn('username', { required: true })}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    disabled={loading}
                    {...registerSignIn('password', { required: true })}
                  />
                </div>
              </form>
            </CardContent>

            <CardFooter className="flex-col gap-2">
              <Button type="submit" className="w-full" form="form-signin" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
              <div className="mt-1 flex items-center gap-1">
                Don't have an account?{' '}
                <span onClick={() => {
                  setShowSignIn(false)
                  setError('')
                  setSuccessMessage('')
                  resetSignIn()
                  resetSignUp()
                }} className="cursor-pointer font-bold">
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
              <form
                id="form-signup"
                method="post"
                className="space-y-5"
                onSubmit={handleSubmitSignUp(handleSignUpSubmit)}
              >
                {error && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
                    {error}
                  </div>
                )}

                {/* Step 1: User Details */}
                {signupStep === 1 && (
                  <>
                    <div className="grid gap-3">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="Choose a username"
                        disabled={loading}
                        {...registerSignUp('username', { required: true })}
                      />
                    </div>
                    <div className="grid gap-3">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        disabled={loading}
                        {...registerSignUp('email', { required: true })}
                      />
                    </div>
                    <div className="grid gap-3">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        type="text"
                        placeholder="Enter your full name"
                        disabled={loading}
                        {...registerSignUp('full_name')}
                      />
                    </div>
                    <div className="grid gap-3">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Min 8 characters"
                        disabled={loading}
                        {...registerSignUp('password', { required: true })}
                      />
                    </div>
                    <div className="grid gap-3">
                      <Label htmlFor="confirm_password">Confirm Password</Label>
                      <Input
                        id="confirm_password"
                        type="password"
                        placeholder="Confirm your password"
                        disabled={loading}
                        {...registerSignUp('confirm_password', { required: true })}
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="is_company_admin"
                        disabled={loading}
                        className="h-4 w-4 rounded border-gray-300"
                        {...registerSignUp('is_company_admin')}
                        onChange={(e) => setIsCreatingCompany(e.target.checked)}
                      />
                      <Label htmlFor="is_company_admin" className="cursor-pointer font-normal">
                        I'm creating a company account
                      </Label>
                    </div>
                  </>
                )}

                {/* Step 2: Company Details Only */}
                {signupStep === 2 && (
                  <>
                    <div className="mb-4 rounded-lg bg-blue-50 p-4 border border-blue-200">
                      <p className="text-sm text-blue-900 font-medium">Company Information</p>
                      <p className="text-xs text-blue-700 mt-1">
                        As the company creator, you'll be the admin and can invite team members later.
                      </p>
                    </div>

                    <div className="grid gap-3">
                      <Label htmlFor="company_name">Company Name *</Label>
                      <Input
                        id="company_name"
                        type="text"
                        placeholder="Your company name"
                        disabled={loading}
                        {...registerSignUp('company_name')}
                      />
                    </div>

                    <div className="grid gap-3">
                      <Label htmlFor="company_industry">Industry</Label>
                      <Input
                        id="company_industry"
                        type="text"
                        placeholder="e.g., Manufacturing, Automotive"
                        disabled={loading}
                        {...registerSignUp('company_industry')}
                      />
                    </div>

                    <div className="grid gap-3">
                      <Label htmlFor="company_description">Company Description</Label>
                      <Input
                        id="company_description"
                        type="text"
                        placeholder="Brief description (optional)"
                        disabled={loading}
                        {...registerSignUp('company_description')}
                      />
                    </div>
                  </>
                )}
              </form>
            </CardContent>

            <CardFooter className="flex-col gap-2">
              {signupStep === 1 && (
                <>
                  {!isCreatingCompany ? (
                    <Button type="submit" className="w-full" form="form-signup" disabled={loading}>
                      {loading ? 'Creating Account...' : 'Create Account'}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="w-full"
                      onClick={() => setSignupStep(2)}
                      disabled={loading}
                    >
                      Next: Company Details
                    </Button>
                  )}
                </>
              )}

              {signupStep === 2 && (
                <div className="flex gap-2 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSignupStep(1)}
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" form="form-signup" disabled={loading}>
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </div>
              )}

              <div className="mt-1 flex items-center gap-1">
                Already have an account?{' '}
                <span onClick={() => {
                  setShowSignIn(true)
                  setError('')
                  setSuccessMessage('')
                  setSignupStep(1)
                  setIsCreatingCompany(false)
                  resetSignIn()
                  resetSignUp()
                }} className="cursor-pointer font-bold">
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