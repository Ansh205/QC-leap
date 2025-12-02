<<<<<<< HEAD
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

const runs = [
  {
    id: '51',
    name: 'Run-51',
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.",
    images: [
      '/placeholder-image.png',
      '/placeholder-image.png',
      '/placeholder-image.png',
      '/placeholder-image.png',
    ],
  },
  {
    id: '52',
    name: 'Run-52',
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.",
    images: [
      '/placeholder-image.png',
      '/placeholder-image.png',
      '/placeholder-image.png',
      '/placeholder-image.png',
    ],
  },
]

export default function ModelRunsPage() {
=======
'use client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { runs as runsAPI, images as imagesAPI } from '@/lib/api'
import { Loader2, Calendar, Activity, Image as ImageIcon } from 'lucide-react'

type Run = {
  id: number
  run_number: number
  status: string
  created_at: string
  inspection_model_id: number
  preview_image_id?: number
}

export default function ModelRunsPage() {
  const params = useParams()
  const modelId = parseInt(params.modelId as string)
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        setLoading(true)
        const data = await runsAPI.list(modelId)
        // API returns the array directly due to interceptor
        setRuns(data as any as Run[])
      } catch (err) {
        console.error('Failed to fetch runs', err)
        setError('Failed to load runs')
      } finally {
        setLoading(false)
      }
    }

    if (modelId) {
      fetchRuns()
    }
  }, [modelId])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error}</p>
        <Link href={`./`}>
          <Button variant="outline">Go Back</Button>
        </Link>
      </div>
    )
  }

>>>>>>> master
  return (
    <div className="py-8">
      <div className="mt-0.5 flex justify-between">
        <div>
<<<<<<< HEAD
          <p className="text-3xl font-bold">QCL-1</p>
          <p className="text-slate-600">Inspection Model / Runs</p>
        </div>
        <div className="flex items-end gap-5">
          <Link href={'./'}>
=======
          <p className="text-3xl font-bold">QCL-{modelId}</p>
          <p className="text-slate-600">Inspection Model / Runs</p>
        </div>
        <div className="flex items-end gap-5">
          <Link href={`/models/${modelId}`}>
>>>>>>> master
            <Button className="w-40 bg-slate-200 text-black" variant={'outline'}>
              View Model
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
<<<<<<< HEAD
        {runs.map((run) => (
          <Card key={run.id} className="relative pt-0">
            <div className="overflow-hidden rounded-t-md">
              <div className="grid h-60 grid-cols-2 grid-rows-2">
                {run.images.map((src, i) => (
                  <div key={i} className="flex items-center justify-center">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
            <CardContent>
              <div className="item-center relative flex justify-between">
                <h3 className="text-lg font-semibold">{run.name}</h3>
                <Link href={`./runs/${run.id}`}>
                  <Button size={'sm'} variant={'outline'} className="absolute right-0 -mt-2 w-28">
                    View
                  </Button>
                </Link>
              </div>
              <p className="mt-2 text-sm text-gray-600">{run.description}</p>
            </CardContent>
          </Card>
        ))}
=======
        {runs.length === 0 ? (
          <div className="col-span-3 py-10 text-center text-gray-500">
            No runs found for this model.
          </div>
        ) : (
          runs.map((run) => (
            <Card key={run.id} className="relative pt-0">
              <div className="relative flex h-48 flex-col items-center justify-center overflow-hidden rounded-t-md bg-gray-100">
                {run.preview_image_id ? (
                  <img
                    src={imagesAPI.getImageUrl(run.preview_image_id)}
                    alt={`Run ${run.run_number} preview`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center text-gray-400">
                    <ImageIcon className="mb-2 h-12 w-12" />
                    <span className="text-sm">No images</span>
                  </div>
                )}

                {/* <div className="absolute top-2 right-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium shadow-sm ${
                      run.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-800'
                        : run.status === 'FAILED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {run.status}
                  </span>
                </div> */}
              </div>
              <CardContent className="pt-4">
                <div className="item-center relative flex justify-between">
                  <h3 className="text-lg font-semibold">Run-{run.run_number}</h3>
                  <Link href={`./runs/${run.id}`}>
                    <Button size={'sm'} variant={'outline'} className="w-24">
                      View
                    </Button>
                  </Link>
                </div>
                <div className="mt-2 flex items-center text-sm text-gray-600">
                  <Calendar className="mr-2 h-4 w-4" />
                  {new Date(run.created_at).toLocaleDateString()}{' '}
                  {new Date(run.created_at).toLocaleTimeString()}
                </div>
              </CardContent>
            </Card>
          ))
        )}
>>>>>>> master
      </div>
    </div>
  )
}
