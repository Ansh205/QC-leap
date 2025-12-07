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
  Zap,
  ShieldCheck,
  ArrowRight,
  Eye,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { auth } from '@/lib/api'

// Types
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [signupStep, setSignupStep] = useState(1)
  const [isCreatingCompany, setIsCreatingCompany] = useState(false)
  const [otp, setOtp] = useState('')
  const [tempToken, setTempToken] = useState('')
  
  const router = useRouter()

  // Sign In Logic
  const { register: registerSignIn, handleSubmit: handleSubmitSignIn } = useForm<SignInFormInputs>()
  const handleSignInSubmit: SubmitHandler<SignInFormInputs> = async (data, e) => {
    e?.preventDefault()
    setLoading(true)
    setError('')
    try {
      await auth.login(data.username, data.password)
      router.push('/models')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  // Sign Up Logic
  const { register: registerSignUp, handleSubmit: handleSubmitSignUp, trigger: triggerSignUp, getValues } = useForm<SignUpFormInputs>()
  
  const handleNextStep = async () => {
    const isValid = await triggerSignUp(['username', 'email', 'full_name', 'password', 'confirm_password'])
    if (isValid) setSignupStep(2)
  }

  const handleSignUpSubmit: SubmitHandler<SignUpFormInputs> = async (data, e) => {
    e?.preventDefault()
    setError('')
    if (data.password !== data.confirm_password) return setError('Passwords do not match')
    
    setLoading(true)
    try {
      const companyData = data.is_company_admin ? { name: data.company_name, industry: data.company_industry } : undefined
      const res = await auth.register(data.email, data.username, data.password, data.full_name, data.is_company_admin, companyData)
      
      if (res.require_otp) {
        setTempToken(res.temp_token)
        setSignupStep(3)
      } else {
        setSuccessMessage('Account created!')
        setShowSignIn(true)
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async () => {
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

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-50 selection:bg-blue-500 selection:text-white">
      {/* Animated Blobs Background */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-32 left-20 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      <div className="relative flex min-h-screen w-full items-center justify-center p-4 md:p-8">
        <div className="grid w-full max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          
          {/* Left: Hero */}
          <div className="flex flex-col space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
             <div className="flex items-center gap-3 mb-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20">
                   <Eye className="h-7 w-7" />
                </div>
                <span className="text-2xl font-bold text-slate-900 tracking-tight">QC-Leap</span>
             </div>

             <div className="space-y-6">
               <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-7xl leading-tight">
                 Quality Control, <br />
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Reimagined.</span>
               </h1>
               <p className="max-w-xl text-lg text-slate-600 leading-relaxed font-medium">
                 The enterprise-grade computer vision platform built for speed. 
                 Train custom defect detection models in minutes, not months.
               </p>
             </div>

             <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-4 rounded-2xl border border-white/60 bg-white/40 backdrop-blur-md p-5 shadow-sm hover:bg-white/60 transition-colors">
                   <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                     <Zap className="h-6 w-6" />
                   </div>
                   <div>
                      <p className="font-bold text-slate-900 text-lg">Lightning Fast</p>
                      <p className="text-sm text-slate-600">Train on &lt;50 images</p>
                   </div>
                </div>
                <div className="flex items-center gap-4 rounded-2xl border border-white/60 bg-white/40 backdrop-blur-md p-5 shadow-sm hover:bg-white/60 transition-colors">
                   <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                     <ShieldCheck className="h-6 w-6" />
                   </div>
                   <div>
                      <p className="font-bold text-slate-900 text-lg">Enterprise Ready</p>
                      <p className="text-sm text-slate-600">Secure & Scalable</p>
                   </div>
                </div>
             </div>
          </div>

          {/* Right: Auth Card */}
          <div className="flex justify-center lg:justify-end animate-in fade-in slide-in-from-right-8 delay-100 duration-700">
            <Card className="w-full max-w-[420px] border-white/40 bg-white/70 shadow-2xl shadow-blue-900/10 backdrop-blur-xl ring-1 ring-white/60">
              <CardHeader className="space-y-1 pb-6 text-center">
                <CardTitle className="text-2xl font-bold tracking-tight">
                  {showSignIn ? 'Welcome back' : 'Get started'}
                </CardTitle>
                <CardDescription className="text-slate-500">
                  {showSignIn ? 'Enter your credentials to access your workspace' : 'Create an account to start training models'}
                </CardDescription>
              </CardHeader>

              <CardContent>
                {showSignIn ? (
                   <form onSubmit={handleSubmitSignIn(handleSignInSubmit)} className="space-y-4">
                      {successMessage && <div className="text-sm bg-green-50 text-green-700 p-3 rounded-md flex items-center gap-2"><CheckCircle2 className="h-4 w-4"/> {successMessage}</div>}
                      {error && <div className="text-sm bg-red-50 text-red-700 p-3 rounded-md">{error}</div>}
                      <div className="space-y-2">
                        <Label>Username or Email</Label>
                        <Input className="bg-white/50 border-slate-200 h-11" {...registerSignIn('username')} disabled={loading} />
                      </div>
                      <div className="space-y-2">
                        <Label>Password</Label>
                        <Input type="password" className="bg-white/50 border-slate-200 h-11" {...registerSignIn('password')} disabled={loading} />
                      </div>
                      <Button className="w-full h-11 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02]" type="submit" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'} <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                   </form>
                ) : (
                   <form onSubmit={handleSubmitSignUp(handleSignUpSubmit)} className="space-y-4">
                      {error && <div className="text-sm bg-red-50 text-red-700 p-3 rounded-md">{error}</div>}
                      
                      {signupStep === 1 && (
                        <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
                          <Input placeholder="Username" className="h-10 bg-white/50" {...registerSignUp('username')} />
                          <Input placeholder="Email" type="email" className="h-10 bg-white/50" {...registerSignUp('email')} />
                          <Input placeholder="Full Name" className="h-10 bg-white/50" {...registerSignUp('full_name')} />
                          <div className="grid grid-cols-2 gap-3">
                             <Input placeholder="Password" type="password" className="h-10 bg-white/50" {...registerSignUp('password')} />
                             <Input placeholder="Confirm" type="password" className="h-10 bg-white/50" {...registerSignUp('confirm_password')} />
                          </div>
                          <div className="flex items-center gap-2 p-1">
                            <input type="checkbox" id="is_company_admin" className="rounded border-gray-300 text-blue-600" {...registerSignUp('is_company_admin')} onChange={(e) => setIsCreatingCompany(e.target.checked)} />
                            <Label htmlFor="is_company_admin" className="cursor-pointer font-medium">Create Company Account</Label>
                          </div>
                          <Button className="w-full h-10 bg-blue-600 hover:bg-blue-700" type={isCreatingCompany ? 'button' : 'submit'} onClick={isCreatingCompany ? handleNextStep : undefined}>
                            {isCreatingCompany ? 'Next Step' : 'Create Account'}
                          </Button>
                        </div>
                      )}

                      {signupStep === 2 && (
                         <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
                            <Input placeholder="Company Name" className="h-10 bg-white/50" {...registerSignUp('company_name')} />
                            <Input placeholder="Industry" className="h-10 bg-white/50" {...registerSignUp('company_industry')} />
                            <div className="flex gap-3 pt-2">
                               <Button type="button" variant="outline" className="flex-1" onClick={() => setSignupStep(1)}>Back</Button>
                               <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">Finish</Button>
                            </div>
                         </div>
                      )}

                      {signupStep === 3 && (
                        <div className="space-y-4 text-center animate-in slide-in-from-right-4">
                           <p className="text-sm text-slate-600">Enter code sent to {getValues('email')}</p>
                           <Input placeholder="000000" className="text-center text-2xl tracking-[0.5em] h-14 font-mono bg-white/50" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} />
                           <Button className="w-full h-11 bg-blue-600 hover:bg-blue-700" type="button" onClick={handleOtpSubmit}>Verify</Button>
                        </div>
                      )}
                   </form>
                )}
              </CardContent>
              
              <CardFooter className="justify-center border-t border-slate-100/50 pt-4">
                <button 
                  type="button" 
                  onClick={() => { setShowSignIn(!showSignIn); setSignupStep(1); setError(''); }} 
                  className="text-sm font-semibold text-blue-600 hover:underline transition-all"
                >
                  {showSignIn ? "Create an account" : "Sign in to existing account"}
                </button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}