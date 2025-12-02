'use client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
<<<<<<< HEAD
<<<<<<< HEAD
import { useState } from 'react'

export default function ModelRunDetailPage() {
  const [activeTab, setActiveTab] = useState<'defective' | 'non-defective'>('defective')

  const images = [
    {
      id: '51',
      description:
        "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.",
      src: '/placeholder-image.png',
    },

    {
      id: '52',
      description:
        "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.",
      src: '/placeholder-image.png',
    },
  ]
=======
=======
>>>>>>> mail-services
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { runs as runsAPI, images as imagesAPI } from '@/lib/api'
import { Loader2 } from 'lucide-react'

type RunDetails = {
  id: number
  run_number: number
  status: string
  created_at: string
  completed_at?: string
  inspection_model_id: number
}

type InferenceResult = {
  id: number
  image_id: number
  prediction: string
  confidence: number
  details: any
}

export default function ModelRunDetailPage() {
  const params = useParams()
  const modelId = parseInt(params.modelId as string)
  const runId = parseInt(params.runId as string)

  const [activeTab, setActiveTab] = useState<'defective' | 'normal'>('defective')
  const [run, setRun] = useState<RunDetails | null>(null)
  const [results, setResults] = useState<InferenceResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [runData, resultsData] = await Promise.all([
          runsAPI.get(runId),
          runsAPI.getResults(runId),
        ])
        setRun(runData as unknown as RunDetails)
        setResults(resultsData as unknown as InferenceResult[])
      } catch (err) {
        console.error('Failed to fetch run details', err)
        setError('Failed to load run details')
      } finally {
        setLoading(false)
      }
    }

    if (runId) {
      fetchData()
    }
  }, [runId])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (error || !run) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error || 'Run not found'}</p>
        <Link href={`../`}>
          <Button variant="outline">Go Back</Button>
        </Link>
      </div>
    )
  }

  const defectiveImages = results.filter((r) => r.prediction === 'defective')
  const nonDefectiveImages = results.filter((r) => r.prediction === 'normal') // Or 'normal'? Backend usually returns 'normal' for normal. Let's check.
  // Actually, MobileNet service returns 'defective' or 'normal'.
  // Let's filter by what is NOT defective for the normal tab to be safe, or check specifically for 'normal'.
  // The UI says "Normal", so 'normal' maps to that.

  const displayedImages =
    activeTab === 'defective'
      ? defectiveImages
      : results.filter((r) => r.prediction !== 'defective')
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
          <p className="text-slate-600">Inspection Model / Run-51</p>
        </div>
        <div className="flex items-end gap-5">
          <Link href={'../'}>
=======
=======
>>>>>>> mail-services
          <p className="text-3xl font-bold">QCL-{modelId}</p>
          <p className="text-slate-600">
            Inspection Model / Run-{run.run_number}
            {/* <span
              className={`ml-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                run.status === 'COMPLETED'
                  ? 'bg-green-100 text-green-800'
                  : run.status === 'FAILED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {run.status}
            </span> */}
          </p>
        </div>
        <div className="flex items-end gap-5">
          <Link href={`/models/${modelId}`}>
<<<<<<< HEAD
>>>>>>> master
=======
>>>>>>> mail-services
            <Button className="w-40 bg-slate-200 text-black" variant={'outline'}>
              View Model
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex w-fit rounded-lg border">
          <button
            onClick={() => setActiveTab('defective')}
            className={`rounded-l-md border-r border-gray-200 px-3 py-1 ${
              activeTab === 'defective' ? 'bg-red-50 text-red-500' : 'bg-white text-gray-600'
            }`}
          >
<<<<<<< HEAD
<<<<<<< HEAD
            Defective (0)
          </button>
          <button
            onClick={() => setActiveTab('non-defective')}
            className={`rounded-r-md px-3 py-1 ${
              activeTab === 'non-defective'
                ? 'bg-green-50 text-green-600'
                : 'bg-white text-gray-600'
            }`}
          >
            Non-Defective (0)
=======
=======
>>>>>>> mail-services
            Defective ({defectiveImages.length})
          </button>
          <button
            onClick={() => setActiveTab('normal')}
            className={`rounded-r-md px-3 py-1 ${
              activeTab === 'normal' ? 'bg-green-50 text-green-600' : 'bg-white text-gray-600'
            }`}
          >
            Normal ({results.length - defectiveImages.length})
<<<<<<< HEAD
>>>>>>> master
=======
>>>>>>> mail-services
          </button>
        </div>

        <div className="mt-10 grid grid-cols-4 gap-6">
<<<<<<< HEAD
<<<<<<< HEAD
          {images.map((image) => (
            <Card key={image.id} className="relative pt-0">
              <div className="overflow-hidden rounded-t-md">
                <img src={image.src} alt="" className="h-52 w-full object-cover" />
              </div>
              <CardContent>
                <p className="text-sm text-gray-600">{image.description}</p>
              </CardContent>
            </Card>
          ))}
=======
=======
>>>>>>> mail-services
          {displayedImages.map((result) => (
            <Card key={result.id} className="relative pt-0">
              <div className="overflow-hidden rounded-t-md bg-gray-100">
                <img
                  src={imagesAPI.getImageUrl(result.image_id)}
                  alt={`Result ${result.id}`}
                  className="h-52 w-full object-contain"
                />
              </div>
              <CardContent className="pt-4">
                <p className="font-medium text-gray-900">
                  {result.prediction === 'defective' ? 'Defect Detected' : 'Normal'}
                </p>
                <p className="text-sm text-gray-500">
                  Confidence: {(result.confidence * 100).toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          ))}

          {displayedImages.length === 0 && (
            <div className="col-span-4 py-10 text-center text-gray-500">
              No {activeTab} images found in this run.
            </div>
          )}
<<<<<<< HEAD
>>>>>>> master
=======
>>>>>>> mail-services
        </div>
      </div>
    </div>
  )
}
