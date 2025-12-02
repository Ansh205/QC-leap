'use client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
<<<<<<< HEAD
<<<<<<< HEAD
import { useState } from 'react'

export default function GeneratedImages() {
  const [isImageGenerated, setIsImageGenerated] = useState(false)
  const [activeTab, setActiveTab] = useState<'defective' | 'non-defective'>('defective')

  if (isImageGenerated) {
    return (
      <div>
        <div className="mb-6 flex justify-between space-x-2">
          <div className="flex rounded-lg border">
            <button
              onClick={() => setActiveTab('defective')}
              className={`rounded-l-md border-r border-gray-200 px-3 py-1 ${
                activeTab === 'defective' ? 'bg-red-50 text-red-500' : 'bg-white text-gray-600'
              }`}
            >
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
            </button>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="max-w-xl space-y-6">
      <p className="text-muted-foreground text-[15px] leading-relaxed">
        Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ipsam earum autem consequuntur
        vero exercitationem, minus placeat ad nihil, similique iure voluptates deserunt perferendis
        quo explicabo repudiandae laudantium! Similique, nostrum vitae.
      </p>

      <div className="space-y-2">
        <Label htmlFor="numImages" className="text-sm font-medium">
          Number of synthetic images you want
        </Label>
        <Input id="numImages" type="number" value={50} className="w-full" />
      </div>

      <Button
        onClick={() => setIsImageGenerated(true)}
        className="bg-orange-500 text-white hover:bg-orange-400"
      >
        Generate Image
      </Button>
=======
=======
>>>>>>> mail-services
import { useState, useEffect, useRef } from 'react'
import { models as modelsAPI, images as imagesAPI, Image } from '@/lib/api'
import { Loader2, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react'

export default function GeneratedImages({
  modelId,
  model,
  onModelUpdate,
}: {
  modelId: number
  model: any
  onModelUpdate?: () => void
}) {
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<string>('')
  const [syntheticImages, setSyntheticImages] = useState<Image[]>([])
  const [numImages, setNumImages] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const [minImages, setMinImages] = useState(10)
  const [maxImages, setMaxImages] = useState(1000)

  // Polling interval ref
  const pollInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Check initial status
    checkStatus()
    // Fetch existing images
    fetchImages()
    // Fetch statistics for limits
    fetchStats()

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current)
    }
  }, [modelId])

  const fetchStats = async () => {
    try {
      const stats: any = await modelsAPI.getStatistics(modelId)
      const normal = stats.normal_images || 0
      const defective = stats.defective_images || 0

      // Formula:
      // Min = max(normal - defective, defective)
      // Max = normal * defective

      // const calculatedMin = Math.max(normal - defective)
      // Ensure min is at least 1 to avoid issues
      const finalMin = Math.floor((normal * defective) / 2)

      const calculatedMax = 2 * normal * defective
      // Ensure max is at least min
      const finalMax = Math.max(finalMin, calculatedMax)

      console.log('Stats:', { normal, defective, finalMin, finalMax })

      setMinImages(finalMin)
      setMaxImages(finalMax)

      // Set default to min if current is default (5) or out of range
      setNumImages(Math.floor(finalMax / 2))
    } catch (err) {
      console.error('Failed to fetch stats', err)
    }
  }

  const fetchImages = async () => {
    try {
      console.log('Fetching synthetic images for model:', modelId)
      const imgs = await imagesAPI.list(modelId, 'synthetic')
      console.log('Fetched images:', imgs)
      setSyntheticImages(imgs)
    } catch (err) {
      console.error('Failed to fetch synthetic images', err)
    }
  }

  const handleDeleteImage = async (imageId: number) => {
    try {
      await imagesAPI.delete(imageId)
      setSyntheticImages((prev) => prev.filter((img) => img.id !== imageId))
      if (onModelUpdate) onModelUpdate()
    } catch (err) {
      console.error('Failed to delete image', err)
    }
  }

  const checkStatus = async () => {
    try {
      const statusData = await modelsAPI.getTrainingStatus(modelId)
      if (statusData.has_training_job && statusData.training_job) {
        const job = statusData.training_job

        // Only care about synthetic generation jobs
        if (job.job_type === 'SYNTHETIC_GENERATION') {
          setStatus(job.status)
          setProgress(job.progress)

          if (job.status === 'RUNNING' || job.status === 'PENDING') {
            setGenerating(true)
            startPolling()
          } else if (job.status === 'COMPLETED') {
            setGenerating(false)
            setProgress(100)
            if (pollInterval.current) clearInterval(pollInterval.current)
            fetchImages()
          } else if (job.status === 'FAILED') {
            setGenerating(false)
            setError(job.error_message || 'Generation failed')
            if (pollInterval.current) clearInterval(pollInterval.current)
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

          // Also fetch images periodically to show them appearing?
          // Or just wait until done? Let's fetch every few polls if we want live updates
          // But for now, let's just fetch when done or if progress > 90
          if (job.progress > 90) {
            fetchImages()
          }

          if (job.status === 'COMPLETED') {
            setGenerating(false)
            setProgress(100)
            if (pollInterval.current) clearInterval(pollInterval.current)
            pollInterval.current = null
            fetchImages()
            if (onModelUpdate) onModelUpdate()
          } else if (job.status === 'FAILED') {
            setGenerating(false)
            setError(job.error_message || 'Generation failed')
            if (pollInterval.current) clearInterval(pollInterval.current)
            pollInterval.current = null
          }
        }
      } catch (err) {
        console.error('Polling error', err)
      }
    }, 2000)
  }

  const handleGenerate = async () => {
    try {
      console.log('Generate button clicked for model:', modelId)
      setGenerating(true)
      setError(null)
      setProgress(0)
      setSyntheticImages([]) // Clear previous images

      // First update the model config with num images?
      // The API uses model.num_synthetic_images.
      // We might need to update the model first.
      await modelsAPI.update(modelId, { num_synthetic_images: numImages })

      console.log('Calling API to generate synthetic images...')
      // Trigger generation
      await modelsAPI.generateSynthetic(modelId)
      console.log('API call successful')

      startPolling()
    } catch (err: any) {
      console.error('Failed to start generation', err)
      setError(err.message || 'Failed to start generation')
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="max-w-xl space-y-6">
        <div className="space-y-2">
          <Label htmlFor="numImages" className="text-sm font-medium">
            Number of defective images to be generate
          </Label>
          <Input
            id="numImages"
            type="number"
            value={numImages}
            onChange={(e) => setNumImages(parseInt(e.target.value))}
            className="w-full"
            min={minImages}
            max={maxImages}
            disabled={generating}
          />
          <p className="text-xs text-gray-500">
            Min: {minImages}, Max: {maxImages} (Based on your dataset size)
          </p>
        </div>

        {(model?.status === 'created' || model?.status === 'failed' || status === 'FAILED') && (
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full bg-orange-500 text-white hover:bg-orange-400 sm:w-auto"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {status === 'PENDING' ? 'Awaiting Worker...' : `Generating...`}
              </>
            ) : (
              'Generate Images'
            )}
          </Button>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-red-600">
            <AlertCircle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>

      {syntheticImages.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Generated Images ({syntheticImages.length})</h3>
            {status === 'COMPLETED' && (
              <span className="flex items-center rounded bg-green-50 px-2 py-1 text-sm text-green-600">
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Generation Complete
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
            {syntheticImages.map((img) => (
              <div
                key={img.id}
                className="group relative aspect-square overflow-hidden rounded-lg border bg-gray-50"
              >
                <img
                  src={imagesAPI.getImageUrl(img.id)}
                  alt="Synthetic"
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
                <div className="absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => handleDeleteImage(img.id)}
                    className="rounded bg-white p-1.5 text-red-500 shadow hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
<<<<<<< HEAD
>>>>>>> master
=======
>>>>>>> mail-services
    </div>
  )
}
