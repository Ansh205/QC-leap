'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { images as imagesAPI, annotations as annotationsAPI, Image as BackendImage } from '@/lib/api'
import { toast } from 'sonner'
import AnnotationCanvas from '@/components/annotation/AnnotationCanvas'

export default function AnnotatePage() {
  const params = useParams()
  const router = useRouter()
  const modelId = parseInt(params.modelId as string, 10)

  const [defectiveImages, setDefectiveImages] = useState<BackendImage[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [annotatedCount, setAnnotatedCount] = useState(0)

  useEffect(() => {
    async function fetchImages() {
      try {
        setLoading(true)
        const images = await imagesAPI.list(modelId, 'defective')
        setDefectiveImages(images)

        // Count already annotated images
        let count = 0
        for (const img of images) {
          try {
            await annotationsAPI.getByImage(img.id)
            count++
          } catch (err) {
            // No annotation yet
          }
        }
        setAnnotatedCount(count)
      } catch (err: any) {
        toast.error(err.message || 'Failed to load images')
      } finally {
        setLoading(false)
      }
    }

    fetchImages()
  }, [modelId])

  const handleSaveAnnotation = async (canvasData: any, defectLabels: string) => {
    try {
      setSaving(true)
      const currentImage = defectiveImages[currentImageIndex]

      await annotationsAPI.createManual(
        currentImage.id,
        defectLabels,
        canvasData,
        ''
      )

      toast.success('Annotation saved!')
      setAnnotatedCount(prev => prev + 1)

      // Move to next image
      if (currentImageIndex < defectiveImages.length - 1) {
        setCurrentImageIndex(currentImageIndex + 1)
      } else {
        toast.success('All images annotated!', {
          description: 'Returning to model page...',
        })
        setTimeout(() => {
          router.push(`/models/${modelId}`)
        }, 1500)
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save annotation')
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = () => {
    if (currentImageIndex < defectiveImages.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1)
    } else {
      router.push(`/models/${modelId}`)
    }
  }

  const handlePrevious = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-600">Loading images...</p>
      </div>
    )
  }

  if (defectiveImages.length === 0) {
    return (
      <div className="py-8">
        <Card>
          <CardHeader>
            <CardTitle>No Defective Images</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Please upload defective images before annotating.
            </p>
            <Button
              className="mt-4"
              onClick={() => router.push(`/models/${modelId}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Model
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentImage = defectiveImages[currentImageIndex]
  const imageUrl = imagesAPI.getImageUrl(currentImage.id)

  return (
    <div className="py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => router.push(`/models/${modelId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Model
          </Button>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Annotate Defective Images</h1>
          <p className="text-sm text-gray-600">
            Image {currentImageIndex + 1} of {defectiveImages.length} •{' '}
            {annotatedCount} annotated
          </p>
        </div>
        <div className="w-32" />
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{
              width: `${((currentImageIndex + 1) / defectiveImages.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="mx-auto max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{currentImage.filename}</span>
              <span className="text-sm font-normal text-gray-500">
                {currentImage.image_type}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AnnotationCanvas
              imageUrl={imageUrl}
              onSave={handleSaveAnnotation}
            />

            <div className="mt-6 flex justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentImageIndex === 0 || saving}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              <Button variant="ghost" onClick={handleSkip} disabled={saving}>
                Skip This Image
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
