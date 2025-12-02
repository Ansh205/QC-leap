<<<<<<< HEAD
<<<<<<< HEAD
import { Button } from '@/components/ui/button'
import { History, Plus } from 'lucide-react'
=======
=======
>>>>>>> mail-services
'use client'

import { Button } from '@/components/ui/button'
import { History } from 'lucide-react'
<<<<<<< HEAD
>>>>>>> master
=======
>>>>>>> mail-services
import Link from 'next/link'
import SampleImages from './_components/SampleImages'
import Training from './_components/Training'
import GeneratedImages from './_components/GeneratedImages'
<<<<<<< HEAD
<<<<<<< HEAD

type StepType = 'sample_images' | 'generated_images' | 'training'

export default async function ModelDetailPage({
  searchParams,
}: {
  searchParams: { step?: StepType }
}) {
  const { step = 'sample_images' } = await searchParams
=======
=======
>>>>>>> mail-services
import RunDialog from './_components/RunDialog'
import { models as modelsAPI } from '@/lib/api'
import { useParams, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

type StepType = 'sample_images' | 'generated_images' | 'training'

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

  const hasImages = stats && stats.defective_images > 0 && stats.normal_images > 0
  const hasGenerated = stats && stats.synthetic_images > 0
<<<<<<< HEAD
>>>>>>> master
=======
>>>>>>> mail-services

  const StepComponent = {
    sample_images: SampleImages,
    generated_images: GeneratedImages,
    training: Training,
  }[step]

<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
>>>>>>> mail-services
  // Logic to determine if Run button should be shown
  // Show if status is ready OR if it was previously trained (we can infer this if status is not ready but we want to allow running on old version?
  // Actually, user said: "If it is already trained, never change run button".
  // If status changes to 'training' or 'new', the model might not be runnable in the same way,
  // BUT usually 'ready' means the *current* version is ready.
  // However, if we just uploaded images, status might change to 'new'.
  // If we want to allow running the *previous* model, the backend needs to support that.
  // Assuming the backend keeps the last trained model available until a new one replaces it?
  // For now, let's stick to 'ready' check, but maybe we need to persist 'ready' state locally or check if a model file exists?
  // Let's assume if it WAS ready, we keep showing it? No, that's risky if status is 'training'.
  // Let's look at the user request again: "If it is already trained, never change run button".
  // This implies even if I upload new images (status -> new), I should still be able to run the OLD model.
  // The backend `model.status` reflects the *current configuration* status.
  // If the backend doesn't delete the old model file immediately, we might still be able to run it.
  // But the UI relies on `model.status`.
  // Let's try to be permissive: If model has `accuracy` (implies it was trained at least once), show Run button?
  // Or maybe check if `model.status` is NOT 'training'?
  // Let's try: Show Run button if `model.status === 'ready'` OR `model.accuracy != null`.
  // Wait, `model.accuracy` might be null if never trained.

  const canRun =
    model && (model.status === 'ready' || (model.accuracy !== null && model.accuracy !== undefined))

<<<<<<< HEAD
>>>>>>> master
=======
>>>>>>> mail-services
  return (
    <div className="py-8">
      <div className="mt-0.5 flex justify-between">
        <div>
<<<<<<< HEAD
<<<<<<< HEAD
          <p className="text-3xl font-bold">QCL-1</p>
=======
          <p className="text-3xl font-bold">QCL-{modelId}</p>
>>>>>>> master
=======
          <p className="text-3xl font-bold">QCL-{modelId}</p>
>>>>>>> mail-services
          <p className="text-slate-600">Inspection Model</p>
        </div>

        <div className="flex items-end gap-5">
<<<<<<< HEAD
<<<<<<< HEAD
          <Link href={'./QCL-1/runs'}>
            <Button className="w-40 bg-slate-200 text-black" variant={'outline'}>
              <History />
              History
            </Button>
          </Link>
          <span className="flex h-9 w-40 items-center justify-center rounded-md bg-gray-700 text-sm text-white">
            New
          </span>
=======
=======
>>>>>>> mail-services
          {canRun && (
            <Link href={`./${modelId}/runs`}>
              <Button className="w-40 bg-slate-200 text-black" variant={'outline'}>
                <History className="mr-2 h-4 w-4" />
                History
              </Button>
            </Link>
          )}

          {canRun ? (
            <RunDialog modelId={id} />
          ) : (
            model && (
              <span className="flex h-9 w-40 items-center justify-center rounded-md bg-gray-700 text-sm text-white capitalize">
                {model.status.replace(/_/g, ' ')}
              </span>
            )
          )}
<<<<<<< HEAD
>>>>>>> master
=======
>>>>>>> mail-services
        </div>
      </div>

      <div className="relative mt-10 w-fit">
        <div className="bg-border absolute top-5 z-0 h-px w-full"></div>
        <div className="relative z-10 flex gap-12">
          <Link href="?step=sample_images">
            <Button
              variant={step === 'sample_images' ? 'default' : 'outline'}
              className="w-48"
              size={'lg'}
            >
              1. Sample Images
            </Button>
          </Link>
<<<<<<< HEAD
<<<<<<< HEAD
          <Link href="?step=generated_images">
            <Button
              variant={step === 'generated_images' ? 'default' : 'outline'}
              className="w-48"
              size={'lg'}
            >
              2. Generated Images
            </Button>
          </Link>
          <Link href="?step=training">
            <Button
              variant={step === 'training' ? 'default' : 'outline'}
              className="w-48"
              size={'lg'}
            >
              3. Training
            </Button>
          </Link>
        </div>
      </div>
      <div className="mt-8 h-full w-full">
        <StepComponent />
=======
=======
>>>>>>> mail-services

          <div className={!hasImages ? 'pointer-events-none opacity-50' : ''}>
            <Link href="?step=generated_images" aria-disabled={!hasImages}>
              <Button
                variant={step === 'generated_images' ? 'default' : 'outline'}
                className="w-48"
                size={'lg'}
                disabled={!hasImages}
              >
                2. Generated Images
              </Button>
            </Link>
          </div>

          <div className={!hasGenerated ? 'pointer-events-none opacity-50' : ''}>
            <Link href="?step=training" aria-disabled={!hasGenerated}>
              <Button
                variant={step === 'training' ? 'default' : 'outline'}
                className="w-48"
                size={'lg'}
                disabled={!hasGenerated}
              >
                3. Training
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <div className="mt-8 h-full w-full">
        <StepComponent modelId={id} model={model} onModelUpdate={refreshModel} />
<<<<<<< HEAD
>>>>>>> master
=======
>>>>>>> mail-services
      </div>
    </div>
  )
}
