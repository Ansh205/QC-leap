import { Button } from '@/components/ui/button'
import { History, Plus } from 'lucide-react'
import Link from 'next/link'
import SampleImages from './_components/SampleImages'
import Training from './_components/Training'
import GeneratedImages from './_components/GeneratedImages'

type StepType = 'sample_images' | 'generated_images' | 'training'

export default async function ModelDetailPage({
  searchParams,
}: {
  searchParams: { step?: StepType }
}) {
  const { step = 'sample_images' } = await searchParams

  const StepComponent = {
    sample_images: SampleImages,
    generated_images: GeneratedImages,
    training: Training,
  }[step]

  return (
    <div className="py-8">
      <div className="mt-0.5 flex justify-between">
        <div>
          <p className="text-3xl font-bold">QCL-1</p>
          <p className="text-slate-600">Inspection Model</p>
        </div>

        <div className="flex items-end gap-5">
          <Link href={'./QCL-1/runs'}>
            <Button className="w-40 bg-slate-200 text-black" variant={'outline'}>
              <History />
              History
            </Button>
          </Link>
          <span className="flex h-9 w-40 items-center justify-center rounded-md bg-gray-700 text-sm text-white">
            New
          </span>
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
      </div>
    </div>
  )
}
