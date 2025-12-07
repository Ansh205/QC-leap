'use client'

import { Button } from '@/components/ui/button'
import { History, Check, ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'
import SampleImages from './_components/SampleImages'
import Training from './_components/Training'
import GeneratedImages from './_components/GeneratedImages'
import RunDialog from './_components/RunDialog'
import { models as modelsAPI, auth } from '@/lib/api'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type StepType = 'sample_images' | 'generated_images' | 'training'

const STEPS = [
  { id: 'sample_images', label: '1. Sample Images', description: 'Upload & Annotate' },
  { id: 'generated_images', label: '2. Generate Data', description: 'Create Synthetic Data' },
  { id: 'training', label: '3. Training', description: 'Train & Validate' },
]

export default function ModelDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const modelId = params.modelId as string
  const step = (searchParams.get('step') as StepType) || 'sample_images'
  const id = parseInt(modelId)

  const [stats, setStats] = useState<any>(null)
  const [model, setModel] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Delete State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')

  const fetchData = async () => {
    try {
      const [statsData, modelData, currentUser] = await Promise.all([
        modelsAPI.getStatistics(id),
        modelsAPI.get(id),
        auth.getCurrentUser(),
      ])
      setStats(statsData)
      setModel(modelData)
      setUserData(currentUser)
    } catch (e) {
      console.error('Failed to fetch data', e)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteModel = async () => {
    if (!deletePassword) return

    setIsDeleting(true)
    try {
      await modelsAPI.delete(id, deletePassword)
      toast.success('Model deleted successfully')
      router.push('/models')
    } catch (error: any) {
      toast.error(error.detail || 'Failed to delete model')
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const refreshModel = () => {
    fetchData()
  }

  // Check for step completion/availability
  const hasImages = stats && stats.defective_images > 0 && stats.normal_images > 0
  const hasGenerated = stats && stats.synthetic_images > 0

  const StepComponent = {
    sample_images: SampleImages,
    generated_images: GeneratedImages,
    training: Training,
  }[step]

  const canRun =
    model && (model.status === 'ready' || (model.accuracy !== null && model.accuracy !== undefined))

  return (
    <div className="space-y-4">
      {/* Standardized Header - Compact Style
          Updated: Center alignment on mobile (text-center, justify-center) 
          switches to left alignment on desktop (md:text-left, md:justify-start)
      */}
      <div className="flex flex-col items-center justify-between gap-4 border-b border-slate-200 pb-4 md:flex-row">
        <div className="w-full text-center md:w-auto md:text-left">
          <div className="flex items-center justify-center gap-3 md:justify-start">
            <Link href="/models" className="md:hidden">
              <Button variant="ghost" size="icon" className="-ml-1 h-6 w-6 text-slate-400">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {model?.name || `QCL-${modelId}`}
            </h1>
            {model?.status && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                  model.status === 'ready'
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : model.status === 'training'
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                {model.status.replace(/_/g, ' ')}
              </span>
            )}
            {userData?.role === 'COMPANY_ADMIN' && (
              <button
                onClick={() => {
                  setDeletePassword('')
                  setIsDeleteDialogOpen(true)
                }}
                className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-red-700 uppercase transition-colors hover:bg-red-100"
              >
                DELETE
              </button>
            )}
          </div>
          <p className="mt-1 ml-0 text-xs text-slate-500 md:ml-0">
            Manage the lifecycle of your inspection model.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canRun && (
            <Link href={`./${modelId}/runs`}>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-slate-200 bg-white text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <History className="mr-1.5 h-3.5 w-3.5" />
                Run History
              </Button>
            </Link>
          )}

          {canRun ? (
            <div className="origin-right scale-95 transform">
              <RunDialog modelId={id} />
            </div>
          ) : null}
        </div>
      </div>

      {/* Compact Stepper Navigation */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col divide-y divide-slate-100 md:flex-row md:divide-x md:divide-y-0">
          {STEPS.map((s, index) => {
            const isActive = s.id === step
            const isCompleted =
              (s.id === 'sample_images' && hasImages) ||
              (s.id === 'generated_images' && hasGenerated) ||
              (s.id === 'training' && model?.accuracy)

            const isDisabled =
              (s.id === 'generated_images' && !hasImages) || (s.id === 'training' && !hasGenerated)

            return (
              <div key={s.id} className="flex-1">
                <Link
                  href={isDisabled ? '#' : `?step=${s.id}`}
                  className={`group flex items-center px-4 py-3 transition-all ${isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-slate-50'}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                      isActive
                        ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                        : isCompleted
                          ? 'border-green-500 bg-green-50 text-green-600'
                          : 'border-slate-200 bg-slate-50 text-slate-500 group-hover:border-slate-300'
                    }`}
                  >
                    {isCompleted && !isActive ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <div className="ml-3 flex flex-col">
                    <span
                      className={`text-sm leading-none font-semibold ${isActive ? 'text-blue-700' : 'text-slate-700'}`}
                    >
                      {s.label}
                    </span>
                    <span className="mt-1 text-[10px] font-medium text-slate-500">
                      {s.description}
                    </span>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="min-h-[500px] rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <StepComponent modelId={id} model={model} onModelUpdate={refreshModel} />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" /> Delete Model
            </DialogTitle>
            <DialogDescription>
              Are you sure want to delete{' '}
              <span className="font-bold text-slate-900">{model?.name}</span> inspection model and
              all associated images/data? This action cannot be undone.
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

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteModel}
              disabled={isDeleting || !deletePassword}
            >
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
