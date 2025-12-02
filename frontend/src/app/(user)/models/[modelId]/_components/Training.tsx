<<<<<<< HEAD
import { Button } from '@/components/ui/button'

export default function Training() {
  return (
    <div className="max-w-xl space-y-6">
      <p className="text-muted-foreground text-[15px] leading-relaxed">
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Numquam dicta a officia excepturi
        nobis, veritatis cupiditate rerum id magnam, suscipit eaque saepe sapiente voluptas quas?
        Sed, officia vero! Iure, dignissimos?
      </p>

      <Button className="bg-green-600 text-white hover:bg-green-500">Start Training</Button>
=======
'use client'
import { Button } from '@/components/ui/button'
import { useState, useEffect, useRef } from 'react'
import { models as modelsAPI } from '@/lib/api'
import { Loader2, CheckCircle2, AlertCircle, Play } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

export default function Training({
  modelId,
  model,
  onModelUpdate,
}: {
  modelId: number
  model: any
  onModelUpdate?: () => void
}) {
  const [training, setTraining] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<string>('')
  const [currentStage, setCurrentStage] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<any>(null)

  const pollInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (model) {
      // Initialize metrics from model if available (check accuracy to support retraining state)
      if (model.status === 'ready' || model.accuracy) {
        setMetrics({
          accuracy: model.accuracy,
          precision: model.precision,
          recall: model.recall,
          f1_score: model.f1_score,
        })
      }
    }
  }, [model])

  useEffect(() => {
    checkStatus()
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current)
        pollInterval.current = null
      }
    }
  }, [modelId])

  const checkStatus = async () => {
    try {
      const statusData = await modelsAPI.getTrainingStatus(modelId)
      if (statusData.has_training_job && statusData.training_job) {
        const job = statusData.training_job

        // Only care about full training jobs
        if (job.job_type === 'FULL_TRAINING') {
          setStatus(job.status)
          setProgress(job.progress)
          setCurrentStage(job.current_stage || '')

          if (job.status === 'RUNNING' || job.status === 'PENDING') {
            setTraining(true)
            startPolling()
            if (onModelUpdate) onModelUpdate()
          } else if (job.status === 'COMPLETED') {
            setTraining(false)
            setProgress(100)
            // If job has metrics, use them (might be more recent than model if just finished)
            if (job.metrics) {
              setMetrics(job.metrics)
            }
            if (pollInterval.current) clearInterval(pollInterval.current)
            if (onModelUpdate) onModelUpdate()
          } else if (job.status === 'FAILED') {
            setTraining(false)
            setError(job.error_message || 'Training failed')
            if (pollInterval.current) clearInterval(pollInterval.current)
            if (onModelUpdate) onModelUpdate()
          }
        }
      }
    } catch (err) {
      console.error('Failed to check status', err)
    }
  }

  const startPolling = () => {
    if (pollInterval.current) return

    pollInterval.current = setInterval(async () => {
      try {
        const statusData = await modelsAPI.getTrainingStatus(modelId)
        if (statusData.has_training_job && statusData.training_job) {
          const job = statusData.training_job
          setStatus(job.status)
          setProgress(job.progress)
          setCurrentStage(job.current_stage || '')

          if (job.status === 'COMPLETED') {
            setTraining(false)
            setProgress(100)
            setMetrics(job.metrics)
            if (pollInterval.current) clearInterval(pollInterval.current)
            pollInterval.current = null
            if (onModelUpdate) onModelUpdate()
          } else if (job.status === 'FAILED') {
            setTraining(false)
            setError(job.error_message || 'Training failed')
            if (pollInterval.current) clearInterval(pollInterval.current)
            pollInterval.current = null
            if (onModelUpdate) onModelUpdate()
          }
        }
      } catch (err) {
        console.error('Polling error', err)
      }
    }, 2000)
  }

  const handleStartTraining = async () => {
    try {
      setTraining(true)
      setError(null)
      setProgress(0)

      await modelsAPI.startTraining(modelId)
      if (onModelUpdate) onModelUpdate()

      startPolling()
    } catch (err: any) {
      console.error('Failed to start training', err)
      setError(err.message || 'Failed to start training')
      setTraining(false)
    }
  }

  return (
    <div className="max-w-xl space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Model Training</h3>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          This process will train a custom AI model using your uploaded images and the generated
          synthetic data. The training pipeline includes:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>Data preparation and splitting</li>
          <li>Training</li>
          <li>Validation and metric calculation</li>
        </ul>
      </div>

      {!training &&
        status !== 'COMPLETED' &&
        (model?.status === 'awaiting_validation' || model?.status === 'failed') && (
          <Button
            onClick={handleStartTraining}
            className="w-full bg-green-600 text-white hover:bg-green-500 sm:w-auto"
          >
            <Play className="mr-2 h-4 w-4" /> {model?.accuracy ? 'Retrain Model' : 'Start Training'}
          </Button>
        )}

      {/* Inform user about retraining */}
      {!training && model?.status === 'ready' && (
        <div className="rounded-md bg-blue-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-blue-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Model Trained</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  To retrain this model, please go to the <b>Sample Images</b> step to add more data
                  then <b>Generate Images</b>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inform user about mandatory generation */}
      {!training && model?.status === 'created' && (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Synthetic Data Required</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  New data has been detected. Please go to the <b>Generate Images</b> tab and
                  generate synthetic data before starting the training process.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {(training || status === 'COMPLETED' || model?.status === 'ready' || metrics) && (
        <div className="space-y-4 rounded-lg border bg-gray-50 p-4">
          {training || status === 'COMPLETED' ? (
            <>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Training</span>
                <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />

              <div className="mt-2 text-xs text-gray-500 capitalize">
                Current Stage:{' '}
                {currentStage.replace(/_/g, ' ') || (model?.status === 'ready' ? 'Completed' : '')}
              </div>
            </>
          ) : (
            <div className="mt-2 text-gray-500">Current Model Metrics</div>
          )}

          {metrics && (
            <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4">
              <div>
                <span className="block text-xs text-gray-500">Accuracy</span>
                <span className="font-mono text-lg font-medium">
                  {metrics.accuracy
                    ? (typeof metrics.accuracy === 'number'
                        ? metrics.accuracy.toFixed(1)
                        : parseFloat(metrics.accuracy).toFixed(1)) + '%'
                    : metrics.mobilenet_metrics?.best_val_accuracy
                      ? metrics.mobilenet_metrics.best_val_accuracy.toFixed(1) + '%'
                      : 'N/A'}
                </span>
              </div>
              <div>
                <span className="block text-xs text-gray-500">Precision</span>
                <span className="font-mono text-lg font-medium">
                  {metrics.precision
                    ? (typeof metrics.precision === 'number'
                        ? metrics.precision.toFixed(1)
                        : parseFloat(metrics.precision).toFixed(1)) + '%'
                    : 'N/A'}
                </span>
              </div>
              <div>
                <span className="block text-xs text-gray-500">Recall</span>
                <span className="font-mono text-lg font-medium">
                  {metrics.recall
                    ? (typeof metrics.recall === 'number'
                        ? metrics.recall.toFixed(1)
                        : parseFloat(metrics.recall).toFixed(1)) + '%'
                    : 'N/A'}
                </span>
              </div>
              <div>
                <span className="block text-xs text-gray-500">F1 Score</span>
                <span className="font-mono text-lg font-medium">
                  {metrics.f1_score
                    ? (typeof metrics.f1_score === 'number'
                        ? metrics.f1_score.toFixed(1)
                        : parseFloat(metrics.f1_score).toFixed(1)) + '%'
                    : 'N/A'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
>>>>>>> master
    </div>
  )
}
