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
import {
  CheckCircle2,
  Factory,
  Sparkles,
  Zap,
  ShieldCheck,
  BarChart3,
  ArrowRight,
  Wand2,
} from 'lucide-react'
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
  const [showOTP, setShowOTP] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [isCreatingCompany, setIsCreatingCompany] = useState(false)
  const [signupStep, setSignupStep] = useState(1) // 1 = user info, 2 = company info
  const router = useRouter()

  // --- Sign In Form Logic ---
  const {
    register: registerSignIn,
    handleSubmit: handleSubmitSignIn,
    reset: resetSignIn,
  } = useForm<SignInFormInputs>()

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

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await auth.verifyOtp(tempToken, otp)
      router.push('/models')
    } catch (err: any) {
      setError(err.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  // --- Sign Up Form Logic ---
  const {
    register: registerSignUp,
    handleSubmit: handleSubmitSignUp,
    reset: resetSignUp,
    trigger: triggerSignUp,
    getValues: getValuesSignUp,
  } = useForm<SignUpFormInputs>()

  const handleNextStep = async () => {
    const isValid = await triggerSignUp(
      ['username', 'email', 'full_name', 'password', 'confirm_password'],
      { shouldFocus: true }
    )
    if (isValid) {
      setSignupStep(2)
    }
  }

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
      const companyData = data.is_company_admin
        ? {
          name: data.company_name,
          description: data.company_description || undefined,
          industry: data.company_industry || undefined,
        }
        : undefined

      const response = await auth.register(
        data.email,
        data.username,
        data.password,
        data.full_name,
        data.is_company_admin,
        companyData
      )

      if (response.require_otp) {
        setTempToken(response.temp_token)
        setSuccessMessage(response.message || 'Please enter the OTP sent to your email')
        setSignupStep(3) // Move to OTP step
      } else {
        // Fallback for old behavior (shouldn't happen with new backend)
        setSuccessMessage('Account created successfully! Please sign in to continue.')
        setShowSignIn(true)
        resetSignUp()
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      {/* Main Grid Layout */}
      <div className="grid w-full max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Left Side: Hero Content */}
        <div className="animate-in fade-in slide-in-from-left-8 flex flex-col space-y-8 duration-700">
          {/* Branding Badge */}
          <div className="flex justify-start">
            <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800 shadow-sm">
              <Sparkles className="mr-2 h-4 w-4 text-blue-600" />
              AI-Powered Quality Control
            </div>
          </div>

          {/* Headlines */}
          <div className="space-y-4">
            <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
              QC-Leap
            </h1>
            <h2 className="text-3xl leading-tight font-bold text-slate-700 sm:text-4xl">
              Transform Manufacturing with <span className="text-blue-600">Intelligent Vision</span>
            </h2>
            <p className="max-w-2xl text-lg leading-relaxed text-slate-600">
              Enterprise-grade defect detection for everyone. Train custom models on just 50 images.
              Built for MSMEs who demand precision without the complexity.
            </p>
          </div>

          {/* Feature List */}
          <ul className="space-y-4">
            {[
              { icon: Factory, text: 'Train custom models from minimal data' },
              { icon: Zap, text: 'Instant defect detection with Vision AI' },
              { icon: ShieldCheck, text: 'Deploy in days, not months' },
              { icon: Wand2, text: 'Zero technical skills required, fully guided workflows' },
              { icon: BarChart3, text: 'Real-time classification & analytics' },
            ].map((item, idx) => (
              <li
                key={idx}
                className="flex items-center gap-4 rounded-lg border border-white/60 bg-white/60 p-3 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-white hover:shadow-md"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="text-base font-medium text-slate-700">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right Side: Auth Form */}
        <div className="animate-in fade-in slide-in-from-right-8 flex justify-center delay-100 duration-700 lg:justify-end">
          <Card className="w-full max-w-md border-0 bg-white/90 shadow-2xl ring-1 ring-slate-900/5 backdrop-blur-xl">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-center text-2xl font-bold">
                {showSignIn ? 'Welcome Back' : 'Create Account'}
              </CardTitle>
              <CardDescription className="text-center text-base">
                {showSignIn
                  ? 'Sign in to access your inspection models'
                  : 'Get started with QC-Leap today'}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {showSignIn ? (
                // --- Sign In Form ---
                <form
                  id="form-signin"
                  method="post"
                  className="space-y-5"
                  onSubmit={handleSubmitSignIn(handleSignInSubmit)}
                >
                  {successMessage && (
                    <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                      <CheckCircle2 className="h-4 w-4" /> {successMessage}
                    </div>
                  )}
                  {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
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
                      className="h-11"
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
                      className="h-11"
                      {...registerSignIn('password', { required: true })}
                    />
                  </div>
                </form>
              ) : (
                // --- Sign Up Form ---
                <form
                  id="form-signup"
                  method="post"
                  className="space-y-5"
                  onSubmit={handleSubmitSignUp(handleSignUpSubmit)}
                >
                  {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      {error}
                    </div>
                  )}

                  {/* Step 1: User Details */}
                  {signupStep === 1 && (
                    <div className="animate-in slide-in-from-right-4 space-y-4 duration-300">
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
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                          <Label htmlFor="password">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            placeholder="Min 8 chars"
                            disabled={loading}
                            {...registerSignUp('password', { required: true })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="confirm_password">Confirm</Label>
                          <Input
                            id="confirm_password"
                            type="password"
                            placeholder="Confirm"
                            disabled={loading}
                            {...registerSignUp('confirm_password', { required: true })}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 p-3 pt-2">
                        <input
                          type="checkbox"
                          id="is_company_admin"
                          disabled={loading}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          {...registerSignUp('is_company_admin')}
                          onChange={(e) => setIsCreatingCompany(e.target.checked)}
                        />
                        <Label
                          htmlFor="is_company_admin"
                          className="cursor-pointer font-medium text-slate-700"
                        >
                          I'm creating a company account
                        </Label>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Company Details Only */}
                  {signupStep === 2 && (
                    <div className="animate-in slide-in-from-right-4 space-y-4 duration-300">
                      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                        <div className="mb-1 flex items-center gap-2">
                          <Factory className="h-4 w-4 text-blue-600" />
                          <p className="text-sm font-semibold text-blue-900">Company Information</p>
                        </div>
                        <p className="text-xs leading-relaxed text-blue-700">
                          As the admin, you'll manage the workspace and invite team members.
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
                    </div>
                  )}

                  {/* Step 3: OTP Verification */}
                  {signupStep === 3 && (
                    <div className="grid gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 mb-4">
                        <div className="mb-1 flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-blue-600" />
                          <p className="text-sm font-semibold text-blue-900">Verify Email</p>
                        </div>
                        <p className="text-xs leading-relaxed text-blue-700">
                          We've sent a verification code to {getValuesSignUp('email')}.
                        </p>
                      </div>

                      <Label htmlFor="otp">One-Time Password</Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        disabled={loading}
                        className="h-11 text-center text-lg tracking-widest"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        maxLength={6}
                      />
                      <p className="text-xs text-slate-500 text-center">
                        Check your email for the code. It expires in 5 minutes.
                      </p>
                    </div>
                  )}
                </form>
              )}
            </CardContent>

            <CardFooter className="flex-col gap-4 pt-2">
              {showSignIn ? (
                <>
                  <Button
                    type="submit"
                    className="h-11 w-full bg-blue-600 text-base hover:bg-blue-700"
                    form="form-signin"
                    disabled={loading}
                  >
                    {loading ? 'Signing in...' : 'Sign In'} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <div className="text-center text-sm text-slate-500">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setShowSignIn(false)
                        setShowOTP(false)
                        setError('')
                        setSuccessMessage('')
                        resetSignIn()
                        resetSignUp()
                      }}
                      className="font-semibold text-blue-600 transition-colors hover:text-blue-700 hover:underline"
                    >
                      Create Account
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {signupStep === 1 && (
                    <>
                      {!isCreatingCompany ? (
                        <Button
                          type="submit"
                          className="h-11 w-full bg-blue-600 hover:bg-blue-700"
                          form="form-signup"
                          disabled={loading}
                        >
                          {loading ? 'Creating Account...' : 'Create Account'}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          className="h-11 w-full"
                          onClick={handleNextStep}
                          disabled={loading}
                        >
                          Next: Company Details <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}

                  {signupStep === 2 && (
                    <div className="flex w-full gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 flex-1"
                        onClick={() => setSignupStep(1)}
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        className="h-11 flex-1 bg-blue-600 hover:bg-blue-700"
                        form="form-signup"
                        disabled={loading}
                      >
                        {loading ? 'Creating...' : 'Create Account'}
                      </Button>
                    </div>
                  )}

                  {signupStep === 3 && (
                    <Button
                      type="button"
                      className="h-11 w-full bg-blue-600 hover:bg-blue-700"
                      onClick={handleOtpSubmit}
                      disabled={loading}
                    >
                      {loading ? 'Verifying...' : 'Verify & Create Account'} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}

                  <div className="text-center text-sm text-slate-500">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setShowSignIn(true)
                        setError('')
                        setSuccessMessage('')
                        setSignupStep(1)
                        setIsCreatingCompany(false)
                        resetSignIn()
                        resetSignUp()
                      }}
                      className="font-semibold text-blue-600 transition-colors hover:text-blue-700 hover:underline"
                    >
                      Sign In
                    </button>
                  </div>
                </>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
