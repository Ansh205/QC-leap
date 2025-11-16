'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { models, trainingJobs } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Play, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'

interface Model {
  id: number
  name: string
  description: string
  status: string
  accuracy: number | null
  precision: number | null
  recall: number | null
  f1_score: number | null
  created_at: string
  num_synthetic_images: number
  is_public: boolean
}

interface TrainingJob {
  id: number
  status: string
  progress: number
  current_stage: string
  error_message: string | null
  started_at: string
  completed_at: string | null
}

export default function ModelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const modelId = parseInt(resolvedParams.id)

  const [model, setModel] = useState<Model | null>(null)
  const [trainingJob, setTrainingJob] = useState<TrainingJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  // Fetch model data
  const fetchModel = async () => {
    try {
      const data = await models.get(modelId)
      setModel(data)
    } catch (error: any) {
      console.error('Failed to fetch model:', error)
      alert(error.message || 'Failed to load model')
    }
  }

  // Fetch training status
  const fetchTrainingStatus = async () => {
    try {
      const response = await trainingJobs.getStatus(modelId)
      if (response.has_training_job && response.training_job) {
        setTrainingJob(response.training_job)

        // If training is in progress, continue polling
        if (response.training_job.status === 'RUNNING' || response.training_job.status === 'PENDING') {
          return true // Continue polling
        }
      } else {
        setTrainingJob(null)
      }
      return false // Stop polling
    } catch (error) {
      console.error('Failed to fetch training status:', error)
      return false
    }
  }

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await fetchModel()
      await fetchTrainingStatus()
      setLoading(false)
    }
    init()
  }, [modelId])

  // Polling for training status
  useEffect(() => {
    if (!trainingJob) return

    const shouldPoll = trainingJob.status === 'RUNNING' || trainingJob.status === 'PENDING'
    if (!shouldPoll) return

    const interval = setInterval(async () => {
      const continuePoll = await fetchTrainingStatus()
      if (!continuePoll) {
        clearInterval(interval)
        // Refresh model data when training completes
        await fetchModel()
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(interval)
  }, [trainingJob?.status])

  // Start training
  const handleStartTraining = async () => {
    try {
      setStarting(true)
      const result = await models.startTraining(modelId)
      alert(`Training started successfully!`)
      // Immediately fetch training status
      await fetchTrainingStatus()
    } catch (error: any) {
      alert(error.message || 'Failed to start training')
    } finally {
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!model) {
    return (
      <div className="text-center">
        <p className="text-gray-600">Model not found</p>
        <Button onClick={() => router.push('/models')} className="mt-4">
          Back to Models
        </Button>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'READY':
        return 'text-green-600'
      case 'TRAINING':
      case 'RUNNING':
        return 'text-blue-600'
      case 'FAILED':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStageDisplay = (stage: string) => {
    const stageMap: Record<string, string> = {
      'gan_training': 'Training GAN Model',
      'synthetic_generation': 'Generating Synthetic Images',
      'vit_training': 'Training ViT Classifier',
      'completed': 'Training Complete',
      'pending': 'Starting...'
    }
    return stageMap[stage] || stage
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/models')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Models
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{model.name}</h1>
            {model.description && (
              <p className="mt-2 text-gray-600">{model.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(model.status)} bg-gray-100`}>
              {model.status}
            </span>
            {model.is_public && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-green-600 bg-green-100">
                Public
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Training Progress Card */}
      {trainingJob && (trainingJob.status === 'RUNNING' || trainingJob.status === 'PENDING') && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Loader2 className="h-5 w-5 animate-spin" />
              Training in Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-blue-900">{getStageDisplay(trainingJob.current_stage)}</span>
                <span className="text-blue-700">{trainingJob.progress}%</span>
              </div>
              <Progress value={trainingJob.progress} className="h-3" />
            </div>

            {/* Stage Details */}
            <div className="bg-white rounded-lg p-4 text-sm text-gray-700">
              <p className="font-semibold mb-2">Current Progress:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li className={trainingJob.progress >= 10 ? 'text-green-600' : ''}>
                  {trainingJob.progress >= 10 ? '✓' : '○'} GAN Training {trainingJob.progress < 10 ? '(In Progress)' : ''}
                </li>
                <li className={trainingJob.progress >= 30 && trainingJob.progress < 50 ? 'text-blue-600' : trainingJob.progress >= 50 ? 'text-green-600' : 'text-gray-400'}>
                  {trainingJob.progress >= 50 ? '✓' : trainingJob.progress >= 30 ? '⟳' : '○'} Synthetic Image Generation
                </li>
                <li className={trainingJob.progress >= 50 && trainingJob.progress < 100 ? 'text-blue-600' : trainingJob.progress === 100 ? 'text-green-600' : 'text-gray-400'}>
                  {trainingJob.progress === 100 ? '✓' : trainingJob.progress >= 50 ? '⟳' : '○'} ViT Classifier Training
                </li>
              </ul>
            </div>

            <p className="text-xs text-gray-600">
              Started: {new Date(trainingJob.started_at).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Training Error Card */}
      {trainingJob && trainingJob.status === 'FAILED' && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <XCircle className="h-5 w-5" />
              Training Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-800 mb-4">{trainingJob.error_message || 'An unknown error occurred'}</p>
            <Button onClick={handleStartTraining} disabled={starting} variant="outline" className="border-red-300">
              {starting ? 'Starting...' : 'Retry Training'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Model Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Model Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Created:</span>
              <span className="font-medium">{new Date(model.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Synthetic Images:</span>
              <span className="font-medium">{model.num_synthetic_images}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Visibility:</span>
              <span className="font-medium">{model.is_public ? 'Public' : 'Private'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {model.accuracy !== null ? (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Accuracy:</span>
                  <span className="font-medium text-green-600">{(model.accuracy * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Precision:</span>
                  <span className="font-medium">{model.precision !== null ? (model.precision * 100).toFixed(2) + '%' : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Recall:</span>
                  <span className="font-medium">{model.recall !== null ? (model.recall * 100).toFixed(2) + '%' : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">F1 Score:</span>
                  <span className="font-medium">{model.f1_score !== null ? (model.f1_score * 100).toFixed(2) + '%' : 'N/A'}</span>
                </div>
              </>
            ) : (
              <p className="text-gray-500 italic">Model not trained yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      {model.status !== 'TRAINING' && model.status !== 'RUNNING' && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleStartTraining}
              disabled={starting || (trainingJob && trainingJob.status === 'RUNNING')}
              className="w-full md:w-auto"
            >
              {starting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting Training...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Training
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
