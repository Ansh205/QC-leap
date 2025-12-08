'use client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { runs as runsAPI, images as imagesAPI } from '@/lib/api'
import { Loader2, Calendar, Image as ImageIcon, ArrowLeft } from 'lucide-react'

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
        // [FIX] Double cast: AxiosResponse -> unknown -> Run[]
        setRuns(data as unknown as Run[])
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

  if (loading)
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    )
  if (error)
    return <div className="flex h-96 items-center justify-center text-red-500">{error}</div>

  return (
    <div className="animate-in fade-in mx-auto max-w-7xl space-y-4 pt-1 pb-8 duration-500">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-3">
          <Link href={`/models/${modelId}`}>
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 h-8 w-8 text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Run History</h1>
            <p className="mt-0.5 text-sm text-slate-500">QCL-{modelId}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {runs.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed bg-slate-50/50 py-16 text-center text-slate-400">
            <p>No runs found for this model.</p>
          </div>
        ) : (
          runs.map((run) => (
            <Card
              key={run.id}
              className="group relative overflow-hidden border-gray-200 transition-all duration-300 hover:shadow-md"
            >
              <div className="relative flex h-40 flex-col items-center justify-center overflow-hidden border-b bg-gray-100">
                {run.preview_image_id ? (
                  <img
                    src={imagesAPI.getImageUrl(run.preview_image_id)}
                    alt={`Run ${run.run_number}`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-col items-center text-gray-400">
                    <ImageIcon className="mb-2 h-8 w-8 opacity-20" />
                    <span className="text-[10px] font-medium">No preview</span>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span
                    className={`rounded bg-white/90 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase shadow-sm ${run.status === 'COMPLETED' ? 'text-green-700' : 'text-slate-700'}`}
                  >
                    {run.status}
                  </span>
                </div>
              </div>

              <CardContent className="p-3">
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">Run #{run.run_number}</h3>
                  <Link href={`./runs/${run.id}`}>
                    <Button size="sm" variant="outline" className="h-7 px-3 text-xs">
                      Details
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center text-xs text-slate-500">
                  <Calendar className="mr-1.5 h-3 w-3" />
                  {new Date(run.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
