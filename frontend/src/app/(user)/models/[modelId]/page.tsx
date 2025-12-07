'use client'

import { Button } from '@/components/ui/button'
import { History, Check, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import SampleImages from './_components/SampleImages'
import Training from './_components/Training'
import GeneratedImages from './_components/GeneratedImages'
import RunDialog from './_components/RunDialog'
import { models as modelsAPI } from '@/lib/api'
import { useParams, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

type StepType = 'sample_images' | 'generated_images' | 'training'

const STEPS = [
  { id: 'sample_images', label: '1. Sample Images', description: 'Upload & Annotate' },
  { id: 'generated_images', label: '2. Generate Data', description: 'Create Synthetic Data' },
  { id: 'training', label: '3. Training', description: 'Train & Validate' },
]

export default function ModelDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const modelId = params.modelId as string
  const step = (searchParams.get('step') as StepType) || 'sample_images'
  const id = parseInt(modelId)

  const [stats, setStats] = useState<any>(null)
  const [model, setModel] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [statsData, modelData] = await Promise.all([
        modelsAPI.getStatistics(id),
        modelsAPI.get(id),
      ])
      setStats(statsData)
      setModel(modelData)
    } catch (e) {
      console.error('Failed to fetch data', e)
    } finally {
      setLoading(false)
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
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-200 pb-4">
        <div className="w-full md:w-auto text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <Link href="/models" className="md:hidden">
                <Button variant="ghost" size="icon" className="h-6 w-6 -ml-1 text-slate-400">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {model?.name || `QCL-${modelId}`}
            </h1>
            {model?.status && (
                 <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${ 
                     model.status === 'ready' ? 'bg-green-50 text-green-700 border-green-200' : 
                     model.status === 'training' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                 }`}>
                     {model.status.replace(/_/g, ' ')}
                 </span>
             )}
          </div>
          <p className="text-xs text-slate-500 mt-1 ml-0 md:ml-0">Manage the lifecycle of your inspection model.</p>
        </div>

        <div className="flex items-center gap-2">
          {canRun && (
            <Link href={`./${modelId}/runs`}>
              <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-slate-200 text-slate-700 bg-white hover:bg-slate-50 shadow-sm">
                <History className="mr-1.5 h-3.5 w-3.5" />
                History
              </Button>
            </Link>
          )}

          {canRun ? (
            <div className="transform scale-95 origin-right">
                <RunDialog modelId={id} />
            </div>
          ) : null}
        </div>
      </div>

      {/* Compact Stepper Navigation */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
         <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {STEPS.map((s, index) => {
                const isActive = s.id === step
                const isCompleted = 
                    (s.id === 'sample_images' && hasImages) ||
                    (s.id === 'generated_images' && hasGenerated) ||
                    (s.id === 'training' && model?.accuracy)
                
                const isDisabled = 
                    (s.id === 'generated_images' && !hasImages) ||
                    (s.id === 'training' && !hasGenerated)

                return (
                    <div key={s.id} className="flex-1">
                        <Link 
                           href={isDisabled ? '#' : `?step=${s.id}`} 
                           className={`group flex items-center px-4 py-3 transition-all ${isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-slate-50'}`}
                        >
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                                isActive ? 'border-blue-600 bg-blue-600 text-white shadow-sm' :
                                isCompleted ? 'border-green-500 bg-green-50 text-green-600' :
                                'border-slate-200 text-slate-500 bg-slate-50 group-hover:border-slate-300'
                            }`}>
                                {isCompleted && !isActive ? <Check className="h-4 w-4" /> : index + 1}
                            </div>
                            <div className="ml-3 flex flex-col">
                                <span className={`text-sm font-semibold leading-none ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>
                                    {s.label}
                                </span>
                                <span className="text-[10px] text-slate-500 mt-1 font-medium">
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
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 min-h-[500px]">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
             <StepComponent modelId={id} model={model} onModelUpdate={refreshModel} />
        </div>
      </div>
    </div>
  )
}