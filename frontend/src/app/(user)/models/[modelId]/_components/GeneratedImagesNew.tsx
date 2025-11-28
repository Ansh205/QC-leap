'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { images as imagesAPI, Image as BackendImage, models as modelsAPI } from '@/lib/api'
import { toast } from 'sonner'
import { ImageIcon, Check, X, Trash2 } from 'lucide-react'

interface GeneratedImagesProps {
  modelId: number
}

export default function GeneratedImagesNew({ modelId }: GeneratedImagesProps) {
  const [syntheticImages, setSyntheticImages] = useState<BackendImage[]>([])
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)

  useEffect(() => {
    fetchSyntheticImages()
  }, [modelId])

  const fetchSyntheticImages = async () => {
    try {
      setLoading(true)
      const images = await imagesAPI.list(modelId, 'synthetic')
      setSyntheticImages(images)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load synthetic images')
    } finally {
      setLoading(false)
    }
  }

  const toggleImageSelection = (imageId: number) => {
    const newSelected = new Set(selectedImages)
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId)
    } else {
      newSelected.add(imageId)
    }
    setSelectedImages(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedImages.size === syntheticImages.length) {
      setSelectedImages(new Set())
    } else {
      setSelectedImages(new Set(syntheticImages.map(img => img.id)))
    }
  }

  const handleValidateSelected = async () => {
    if (selectedImages.size === 0) {
      toast.error('Please select images to validate')
      return
    }

    try {
      setValidating(true)
      toast.success(`Validated ${selectedImages.size} images`)

      // TODO: In Sprint 3, send validation to backend
      // Update model status to awaiting_validation or training

      await modelsAPI.update(modelId, { status: 'training' })
    } catch (err: any) {
      toast.error(err.message || 'Failed to validate images')
    } finally {
      setValidating(false)
    }
  }

  const handleRejectSelected = async () => {
    if (selectedImages.size === 0) {
      toast.error('Please select images to reject')
      return
    }

    try {
      // Delete selected images
      for (const imageId of selectedImages) {
        await imagesAPI.delete(imageId)
      }

      toast.success(`Rejected ${selectedImages.size} images`)

      // Refresh list
      setSyntheticImages(prev => prev.filter(img => !selectedImages.has(img.id)))
      setSelectedImages(new Set())
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject images')
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-600">Loading synthetic images...</p>
      </div>
    )
  }

  if (syntheticImages.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-64 flex-col items-center justify-center">
          <ImageIcon className="mb-3 h-16 w-16 text-gray-300" />
          <p className="text-gray-600 font-medium">No synthetic images generated yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Go to the Training tab to generate synthetic images using GAN
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="flex items-center justify-between rounded-lg border bg-gray-50 p-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            {selectedImages.size === syntheticImages.length ? 'Deselect All' : 'Select All'}
          </Button>
          <span className="text-sm text-gray-600">
            {selectedImages.size} of {syntheticImages.length} selected
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRejectSelected}
            disabled={selectedImages.size === 0}
          >
            <X className="mr-2 h-4 w-4" />
            Reject Selected
          </Button>
          <Button
            size="sm"
            onClick={handleValidateSelected}
            disabled={selectedImages.size === 0 || validating}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="mr-2 h-4 w-4" />
            Validate Selected
          </Button>
        </div>
      </div>

      {/* Images Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {syntheticImages.map((image) => (
          <Card
            key={image.id}
            className={`group relative cursor-pointer overflow-hidden transition-all ${
              selectedImages.has(image.id)
                ? 'ring-2 ring-blue-500'
                : 'hover:ring-2 hover:ring-gray-300'
            }`}
            onClick={() => toggleImageSelection(image.id)}
          >
            {selectedImages.has(image.id) && (
              <div className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                <Check className="h-4 w-4" />
              </div>
            )}
            <CardContent className="p-0">
              <div className="aspect-square overflow-hidden bg-gray-100">
                <img
                  src={imagesAPI.getImageUrl(image.id)}
                  alt={image.filename}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E'
                  }}
                />
              </div>
              <div className="p-2">
                <p className="truncate text-xs text-gray-600" title={image.filename}>
                  {image.filename}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info */}
      <Card className="mt-4">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-2">Human Validation</h3>
          <p className="text-sm text-gray-600">
            Review the GAN-generated synthetic images and select which ones look realistic.
            Rejected images will be removed from the training dataset. Validated images will
            be used to train the Vision Transformer model in the next step.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Sprint 3 will implement actual GAN generation. For now, this interface is ready
            for validation once images are generated.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
