'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { models, images, type Model, type TrainingStatus, type TrainingJob, type Image as ImageType } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Play, RefreshCw, Upload, CheckCircle2, AlertCircle, Clock, Loader2, Download, X, FileCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ModelDetailPage() {
  const params = useParams()
  const router = useRouter()
  const modelId = parseInt(params.modelId as string)

  const [model, setModel] = useState<Model | null>(null)
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus | null>(null)
  const [trainingJobs, setTrainingJobs] = useState<TrainingJob[]>([])
  const [statistics, setStatistics] = useState<any>(null)
  const [modelImages, setModelImages] = useState<ImageType[]>([])
  const [syntheticImages, setSyntheticImages] = useState<ImageType[]>([])
  const [loading, setLoading] = useState(true)
  const [startingTraining, setStartingTraining] = useState(false)
  const [uploadingTestImages, setUploadingTestImages] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [streamingLogs, setStreamingLogs] = useState(false)
  const [logStreamError, setLogStreamError] = useState<string | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Real-time progress state
  const [realtimeProgress, setRealtimeProgress] = useState<number>(0)
  const [realtimeStage, setRealtimeStage] = useState<string>('')

  // Inspection state
  const [inspectionImages, setInspectionImages] = useState<File[]>([])
  const [inspectionResults, setInspectionResults] = useState<Array<{filename: string, prediction: string, confidence: number}>>([])
  const [runningInspection, setRunningInspection] = useState(false)

  // Polling for training status
  useEffect(() => {
    if (!modelId) return

    const fetchData = async () => {
      try {
        const [modelData, statusData, statsData, jobsData, imagesData, syntheticData] = await Promise.all([
          models.get(modelId),
          models.getTrainingStatus(modelId),
          models.getStatistics(modelId),
          models.getTrainingJobs(modelId),
          images.list(modelId),
          images.list(modelId, 'synthetic')
        ])

        setModel(modelData)
        setTrainingStatus(statusData)
        setStatistics(statsData)
        setTrainingJobs(jobsData)
        setModelImages(imagesData)
        setSyntheticImages(syntheticData)
        setLoading(false)

        // Auto-enable log streaming when training starts
        if (statusData?.training_job?.status === 'running' && !streamingLogs) {
          setStreamingLogs(true)
        }
        // Auto-disable when training completes or fails
        if (statusData?.training_job?.status !== 'running' && streamingLogs) {
          setStreamingLogs(false)
        }
      } catch (error: any) {
        toast.error('Failed to load model details: ' + error.message)
        setLoading(false)
      }
    }

    fetchData()

    // Poll every 3 seconds if training is in progress
    const interval = setInterval(() => {
      if (trainingStatus?.training_job?.status === 'running' || trainingStatus?.training_job?.status === 'pending') {
        fetchData()
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [modelId, trainingStatus?.training_job?.status])

  // Stream logs when enabled
  useEffect(() => {
    if (!streamingLogs || !modelId) {
      setLogs([]) // Clear logs when streaming stops
      return
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
    const token = typeof window !== 'undefined' ? localStorage.getItem('qc_leap_token') : ''

    console.log('Starting log stream for model', modelId)
    setLogStreamError(null)

    // EventSource doesn't support custom headers, so pass token as query param
    const eventSource = new EventSource(`${API_URL}/models/${modelId}/logs/stream?token=${token}`)

    eventSource.onopen = () => {
      console.log('Log stream connected')
      setLogStreamError(null)
    }

    eventSource.onmessage = (event) => {
      if (event.data && event.data.trim() && event.data !== 'connected') {
        console.log('Received log:', event.data)
        setLogs(prev => {
          const newLogs = [...prev, event.data]
          return newLogs.slice(-200) // Keep last 200 lines
        })
      }
    }

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error)
      setLogStreamError('Lost connection to log stream')
      eventSource.close()
      // Don't auto-disable streaming, let user control it
    }

    return () => {
      console.log('Closing log stream')
      eventSource.close()
    }
  }, [streamingLogs, modelId])

  // Auto-scroll logs to bottom when new logs arrive
  useEffect(() => {
    if (logs.length > 0 && streamingLogs) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, streamingLogs])

  // Real-time progress streaming
  useEffect(() => {
    if (!modelId || trainingStatus?.training_job?.status !== 'running') {
      return
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
    const token = typeof window !== 'undefined' ? localStorage.getItem('qc_leap_token') : ''

    const eventSource = new EventSource(`${API_URL}/models/${modelId}/progress/stream?token=${token}`)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.progress !== undefined) {
          setRealtimeProgress(data.progress)
          setRealtimeStage(data.current_stage || '')
        }
      } catch (err) {
        console.error('Error parsing progress data:', err)
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
    }

    return () => eventSource.close()
  }, [modelId, trainingStatus?.training_job?.status])

  const handleStartTraining = async () => {
    setStartingTraining(true)
    try {
      await models.startTraining(modelId)
      toast.success('Training started successfully!')
      // Refresh status
      const statusData = await models.getTrainingStatus(modelId)
      setTrainingStatus(statusData)
    } catch (error: any) {
      toast.error('Failed to start training: ' + error.message)
    } finally {
      setStartingTraining(false)
    }
  }

  const handleInspectionImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setInspectionImages(Array.from(files))
    setInspectionResults([]) // Clear previous results
    toast.success(`Selected ${files.length} image(s) for inspection`)
  }

  const handleRunInspection = async () => {
    if (inspectionImages.length === 0) {
      toast.error('Please select images first')
      return
    }

    setRunningInspection(true)
    try {
      // First, upload images as test images
      const uploadedImages = await images.upload(modelId, inspectionImages, 'normal')

      // Extract image IDs and paths
      const imagePaths = uploadedImages.map(img => img.file_path)

      // Run batch prediction
      const predictionResponse = await models.predictBatch(modelId, imagePaths)

      // Map results back to filenames
      const results = inspectionImages.map((file, index) => ({
        filename: file.name,
        prediction: predictionResponse.results[index]?.prediction || 'unknown',
        confidence: (predictionResponse.results[index]?.confidence || 0) * 100
      }))

      setInspectionResults(results)
      toast.success(`Inspection complete! Processed ${results.length} image(s)`)
    } catch (error: any) {
      toast.error('Inspection failed: ' + error.message)
    } finally {
      setRunningInspection(false)
    }
  }

  const handleClearInspection = () => {
    setInspectionImages([])
    setInspectionResults([])
  }

  const handleExportCSV = () => {
    if (inspectionResults.length === 0) {
      toast.error('No results to export')
      return
    }

    // Create CSV content
    const headers = ['Filename', 'Prediction', 'Confidence (%)']
    const rows = inspectionResults.map(result => [
      result.filename,
      result.prediction,
      result.confidence.toFixed(2)
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `inspection_results_${modelId}_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success('CSV exported successfully!')
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any, icon: any, label: string }> = {
      created: { variant: 'secondary', icon: Clock, label: 'Created' },
      uploading: { variant: 'secondary', icon: Upload, label: 'Uploading' },
      generating_data: { variant: 'default', icon: Loader2, label: 'Generating Data' },
      awaiting_validation: { variant: 'default', icon: Clock, label: 'Awaiting Validation' },
      training: { variant: 'default', icon: Loader2, label: 'Training' },
      ready: { variant: 'default', icon: CheckCircle2, label: 'Ready' },
      failed: { variant: 'destructive', icon: AlertCircle, label: 'Failed' }
    }

    const config = statusConfig[status] || { variant: 'secondary', icon: Clock, label: status }
    const Icon = config.icon

    return (
      <Badge variant={config.variant as any} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getStageName = (stage?: string) => {
    const stageNames: Record<string, string> = {
      gan_training: 'Training GAN Model',
      synthetic_generation: 'Generating Synthetic Images',
      vit_training: 'Training ViT Classifier',
      completed: 'Training Complete'
    }
    return stageNames[stage || ''] || stage || 'Initializing'
  }

  const formatDuration = (startedAt?: string, completedAt?: string) => {
    if (!startedAt) return 'Not started'
    const start = new Date(startedAt).getTime()
    const end = completedAt ? new Date(completedAt).getTime() : Date.now()
    const duration = Math.floor((end - start) / 1000)

    const hours = Math.floor(duration / 3600)
    const minutes = Math.floor((duration % 3600) / 60)
    const seconds = duration % 60

    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!model) {
    return (
      <div className="container mx-auto py-8">
        <p>Model not found</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/models')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Models
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(model.status)}
        </div>
      </div>

      {/* Model Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{model.name}</CardTitle>
          <CardDescription>{model.description || 'No description provided'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Normal Images</p>
              <p className="text-2xl font-bold">{statistics?.normal_images || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Defective Images</p>
              <p className="text-2xl font-bold">{statistics?.defective_images || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Synthetic Images</p>
              <p className="text-2xl font-bold">{statistics?.synthetic_images || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Accuracy</p>
              <p className="text-2xl font-bold">{model.accuracy ? `${parseFloat(model.accuracy).toFixed(2)}%` : 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training Status */}
      {trainingStatus?.has_training_job && trainingStatus.training_job && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Training Progress</CardTitle>
              <Badge variant={
                trainingStatus.training_job.status === 'completed' ? 'default' :
                trainingStatus.training_job.status === 'failed' ? 'destructive' :
                trainingStatus.training_job.status === 'running' ? 'default' :
                'secondary'
              }>
                {trainingStatus.training_job.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress Bar - Real-time */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {realtimeStage ? getStageName(realtimeStage) : getStageName(trainingStatus.training_job.current_stage)}
                </span>
                <span className="text-muted-foreground font-mono font-semibold">
                  {(realtimeProgress || trainingStatus.training_job.progress).toFixed(1)}%
                </span>
              </div>
              <div className="relative">
                <Progress value={realtimeProgress || trainingStatus.training_job.progress} className="h-4" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white drop-shadow-md">
                    {(realtimeProgress || trainingStatus.training_job.progress).toFixed(0)}%
                  </span>
                </div>
              </div>
              {trainingStatus.training_job.status === 'running' && (
                <p className="text-xs text-muted-foreground animate-pulse">● Live updates</p>
              )}
            </div>

            {/* Training Logs */}
            {trainingStatus.training_job.status === 'running' && (
              <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Live Training Logs</p>
                    {streamingLogs && (
                      <span className="flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStreamingLogs(!streamingLogs)}
                  >
                    {streamingLogs ? 'Pause Stream' : 'Resume Stream'}
                  </Button>
                </div>

                {logStreamError && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-200 dark:border-yellow-800">
                    <p className="text-yellow-600 dark:text-yellow-400 text-xs">{logStreamError}</p>
                  </div>
                )}

                <div className="max-h-96 overflow-y-auto bg-black text-green-400 p-3 rounded font-mono text-xs space-y-0.5">
                  {logs.length > 0 ? (
                    <>
                      {logs.map((log, i) => (
                        <div key={i} className="whitespace-pre-wrap break-all">{log}</div>
                      ))}
                      <div ref={logsEndRef} />
                    </>
                  ) : (
                    <div className="text-gray-500 italic">
                      {streamingLogs ? 'Waiting for logs...' : 'Click "Resume Stream" to view live logs'}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1 font-mono text-xs">
              {trainingStatus.training_job.started_at && (
                <p className="text-muted-foreground">
                  ▸ Started at {new Date(trainingStatus.training_job.started_at).toLocaleString()}
                </p>
              )}
              {trainingStatus.training_job.current_stage && (
                <p className="text-blue-600 dark:text-blue-400">
                  ▸ {getStageName(trainingStatus.training_job.current_stage)}... ({trainingStatus.training_job.progress.toFixed(1)}% complete)
                </p>
              )}
              {trainingStatus.training_job.status === 'running' && (
                <p className="text-green-600 dark:text-green-400 animate-pulse">
                  ▸ Training in progress... Duration: {formatDuration(trainingStatus.training_job.started_at)}
                </p>
              )}
              {trainingStatus.training_job.status === 'completed' && (
                <p className="text-green-600 dark:text-green-400">
                  ✓ Training completed successfully in {formatDuration(trainingStatus.training_job.started_at, trainingStatus.training_job.completed_at)}
                </p>
              )}
              {trainingStatus.training_job.status === 'failed' && (
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
                  <p className="text-red-600 dark:text-red-400 font-semibold">✗ Training Failed</p>
                  {trainingStatus.training_job.error_message && (
                    <p className="text-red-600 dark:text-red-400 mt-1">{trainingStatus.training_job.error_message}</p>
                  )}
                </div>
              )}
              {trainingStatus.training_job.celery_status && (
                <p className="text-muted-foreground">
                  ▸ Celery Status: {trainingStatus.training_job.celery_status}
                </p>
              )}
            </div>

            {/* Metrics Display (if completed) */}
            {trainingStatus.training_job.metrics && trainingStatus.training_job.status === 'completed' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                {trainingStatus.training_job.metrics.vit_metrics?.best_val_accuracy && (
                  <div>
                    <p className="text-sm text-muted-foreground">Validation Accuracy</p>
                    <p className="text-xl font-bold">{trainingStatus.training_job.metrics.vit_metrics.best_val_accuracy.toFixed(2)}%</p>
                  </div>
                )}
                {trainingStatus.training_job.metrics.vit_metrics?.epochs_completed && (
                  <div>
                    <p className="text-sm text-muted-foreground">Epochs Completed</p>
                    <p className="text-xl font-bold">{trainingStatus.training_job.metrics.vit_metrics.epochs_completed}</p>
                  </div>
                )}
                {trainingStatus.training_job.metrics.gan_metrics && (
                  <div>
                    <p className="text-sm text-muted-foreground">GAN Training</p>
                    <p className="text-xl font-bold text-green-600">✓ Completed</p>
                  </div>
                )}
                {model.num_synthetic_images > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Synthetic Images Generated</p>
                    <p className="text-xl font-bold">{model.num_synthetic_images}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {model.status !== 'ready' && !trainingStatus?.has_training_job && (
          <Button
            onClick={handleStartTraining}
            disabled={startingTraining || (statistics?.normal_images === 0 && statistics?.defective_images === 0)}
            className="gap-2"
          >
            {startingTraining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Start Training
          </Button>
        )}

        {trainingStatus?.training_job?.status === 'running' && (
          <Button disabled variant="secondary" className="gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Training in Progress...
          </Button>
        )}

        {model.status === 'ready' && (
          <Button variant="default" onClick={() => router.push(`/models/${modelId}/runs`)}>
            Run Inspection
          </Button>
        )}

        <Button variant="outline" onClick={() => router.push('/models/new')} disabled>
          Retrain Model
        </Button>
      </div>

      {/* Training Job History */}
      <Card>
        <CardHeader>
          <CardTitle>Training History</CardTitle>
          <CardDescription>Past training attempts and their results</CardDescription>
        </CardHeader>
        <CardContent>
          {trainingJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No training jobs yet. Start training to see history.</p>
          ) : (
            <div className="space-y-2">
              {trainingJobs.map((job) => (
                <div key={job.id} className="border rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Badge variant={
                          job.status === 'completed' ? 'default' :
                          job.status === 'failed' ? 'destructive' :
                          job.status === 'running' ? 'default' :
                          'secondary'
                        }>
                          {job.status}
                        </Badge>
                        <span className="text-sm font-medium">{job.job_type.replace('_', ' ').toUpperCase()}</span>
                      </div>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Started: {new Date(job.created_at).toLocaleString()}
                        </p>
                        {job.completed_at && (
                          <p className="text-xs text-muted-foreground">
                            Duration: {formatDuration(job.created_at, job.completed_at)}
                          </p>
                        )}
                        {job.error_message && (
                          <p className="text-xs text-red-600">Error: {job.error_message}</p>
                        )}
                      </div>
                    </div>
                    {job.status === 'completed' && job.metrics?.vit_metrics?.best_val_accuracy && (
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">
                          {job.metrics.vit_metrics.best_val_accuracy.toFixed(2)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Accuracy</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* GAN-Generated Synthetic Images */}
      {syntheticImages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>GAN-Generated Synthetic Images</CardTitle>
            <CardDescription>Sample defect images generated by the GAN model ({syntheticImages.length} total)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {syntheticImages.slice(0, 24).map((image) => (
                <div key={image.id} className="aspect-square relative group overflow-hidden rounded-lg border hover:border-primary transition-colors bg-gray-900">
                  <img
                    src={images.getImageUrl(image.id)}
                    alt={image.filename}
                    className="w-full h-full object-cover"
                    style={{ filter: 'brightness(1.8) contrast(1.2)' }}
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ddd"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E'
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity px-2 text-center">
                      {image.filename}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {syntheticImages.length > 24 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                Showing 24 of {syntheticImages.length} synthetic images
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quality Inspection Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Quality Inspection
              </CardTitle>
              <CardDescription>Upload images to inspect for defects using your trained model</CardDescription>
            </div>
            {inspectionResults.length > 0 && (
              <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {model.status === 'ready' ? (
            <>
              {/* Upload Section */}
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <Label htmlFor="inspection-images" className="cursor-pointer">
                  <span className="text-sm font-medium text-primary hover:underline">
                    {inspectionImages.length > 0 ? `${inspectionImages.length} image(s) selected` : 'Click to select images'}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload one or more images to inspect for defects
                  </p>
                </Label>
                <Input
                  id="inspection-images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleInspectionImageSelect}
                  className="hidden"
                />
              </div>

              {/* Action Buttons */}
              {inspectionImages.length > 0 && (
                <div className="flex gap-3">
                  <Button
                    onClick={handleRunInspection}
                    disabled={runningInspection}
                    className="flex-1 gap-2"
                  >
                    {runningInspection ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Inspecting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Run Inspection
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleClearInspection}
                    variant="outline"
                    disabled={runningInspection}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                </div>
              )}

              {/* Results Section */}
              {inspectionResults.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Inspection Results</h3>
                    <Badge variant="secondary">{inspectionResults.length} images</Badge>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                          <tr className="border-b">
                            <th className="text-left p-3 text-xs font-medium text-muted-foreground">Filename</th>
                            <th className="text-center p-3 text-xs font-medium text-muted-foreground">Result</th>
                            <th className="text-right p-3 text-xs font-medium text-muted-foreground">Confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inspectionResults.map((result, index) => (
                            <tr key={index} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                              <td className="p-3 text-sm font-mono text-xs truncate max-w-xs">{result.filename}</td>
                              <td className="p-3 text-center">
                                <Badge
                                  variant={result.prediction === 'defective' ? 'destructive' : 'default'}
                                  className="font-medium"
                                >
                                  {result.prediction === 'defective' ? 'Defective' : 'Normal'}
                                </Badge>
                              </td>
                              <td className="p-3 text-right">
                                <span className={`text-sm font-semibold ${
                                  result.confidence >= 90 ? 'text-green-600' :
                                  result.confidence >= 70 ? 'text-yellow-600' :
                                  'text-orange-600'
                                }`}>
                                  {result.confidence.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Summary Statistics */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="border rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {inspectionResults.filter(r => r.prediction === 'normal').length}
                      </p>
                      <p className="text-xs text-muted-foreground">Normal</p>
                    </div>
                    <div className="border rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-red-600">
                        {inspectionResults.filter(r => r.prediction === 'defective').length}
                      </p>
                      <p className="text-xs text-muted-foreground">Defective</p>
                    </div>
                    <div className="border rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold">
                        {(inspectionResults.reduce((sum, r) => sum + r.confidence, 0) / inspectionResults.length).toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">Avg. Confidence</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                Model must be trained and ready before you can run inspections
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Current status: {model.status}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
