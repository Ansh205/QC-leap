'use client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { runs as runsAPI, images as imagesAPI } from '@/lib/api'
import { Loader2, FileText, ArrowLeft, Download } from 'lucide-react'

// Types omitted

export default function ModelRunDetailPage() {
  const params = useParams()
  const modelId = parseInt(params.modelId as string)
  const runId = parseInt(params.runId as string)

  const [activeTab, setActiveTab] = useState<'defective' | 'normal'>('defective')
  const [run, setRun] = useState<any>(null)
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingReportId, setDownloadingReportId] = useState<number | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [runData, resultsData] = await Promise.all([
          runsAPI.get(runId),
          runsAPI.getResults(runId),
        ])
        setRun(runData as unknown as any)
        setResults(resultsData as unknown as any[])
      } catch (err) {
        console.error('Failed to fetch run details', err)
      } finally {
        setLoading(false)
      }
    }
    if (runId) fetchData()
  }, [runId])

  if (loading)
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    )
  if (!run)
    return <div className="flex h-96 items-center justify-center text-slate-500">Run not found</div>

  const defectiveImages = results.filter((r) => r.prediction === 'defective')
  const displayedImages =
    activeTab === 'defective'
      ? defectiveImages
      : results.filter((r) => r.prediction !== 'defective')

  const handleDownloadReport = async (resultId: number) => {
    try {
      setDownloadingReportId(resultId)
      const response = await runsAPI.downloadReport(runId, resultId)

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response as any]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `report_${resultId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error('Failed to download report', err)
    } finally {
      setDownloadingReportId(null)
    }
  }

  return (
    // UPDATED: Tight layout
    <div className="animate-in fade-in mx-auto max-w-7xl space-y-4 pt-1 pb-8 duration-500">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-gray-100 pb-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link href={`/models/${modelId}/runs`}>
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 h-8 w-8 text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Run #{run.run_number}
              </h1>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${run.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}
              >
                {run.status}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              QCL-{modelId} •{' '}
              {new Date(run.created_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs & Content */}
      <div className="space-y-4">
        <div className="flex w-fit rounded-lg border bg-white p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('defective')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'defective'
                ? 'bg-red-50 text-red-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Defective ({defectiveImages.length})
          </button>
          <button
            onClick={() => setActiveTab('normal')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'normal'
                ? 'bg-green-50 text-green-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Normal ({results.length - defectiveImages.length})
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {displayedImages.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed bg-slate-50/50 py-16 text-center text-slate-400">
              <p>No {activeTab} items found in this run.</p>
            </div>
          ) : (
            displayedImages.map((result) => (
              <Card key={result.id} className="group relative overflow-hidden border-gray-200">
                <div className="relative aspect-square overflow-hidden border-b bg-gray-100">
                  <img
                    src={imagesAPI.getImageUrl(result.image_id)}
                    alt={`Result ${result.id}`}
                    className="h-full w-full object-contain p-2"
                  />
                  <div className="absolute top-2 right-2">
                    <span
                      className={`rounded bg-white/90 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase shadow-sm ${result.prediction === 'defective' ? 'text-red-600' : 'text-green-600'}`}
                    >
                      {(result.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <CardContent className="p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p
                      className={`text-sm font-bold ${result.prediction === 'defective' ? 'text-red-700' : 'text-green-700'}`}
                    >
                      {result.prediction === 'defective' ? 'Defect' : 'Normal'}
                    </p>
                  </div>
                  {activeTab === 'defective' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-full bg-white text-xs"
                      disabled={downloadingReportId === result.id}
                      onClick={() => handleDownloadReport(result.id)}
                    >
                      {downloadingReportId === result.id ? (
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                      ) : (
                        <FileText className="mr-1.5 h-3 w-3" />
                      )}
                      Report
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
