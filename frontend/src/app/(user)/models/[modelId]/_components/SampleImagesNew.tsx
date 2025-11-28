'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Trash2, ImageUp, Edit } from 'lucide-react'
import { images as imagesAPI, Image as BackendImage } from '@/lib/api'
import { toast } from 'sonner'
import { useDropzone } from 'react-dropzone'

interface SampleImagesProps {
  modelId: number
}

export default function SampleImagesNew({ modelId }: SampleImagesProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'defective' | 'normal'>('defective')
  const [normalImages, setNormalImages] = useState<BackendImage[]>([])
  const [defectiveImages, setDefectiveImages] = useState<BackendImage[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // Fetch images from backend
  useEffect(() => {
    async function fetchImages() {
      try {
        setLoading(true)
        const allImages = await imagesAPI.list(modelId)

        setNormalImages(allImages.filter(img => img.image_type === 'real_normal'))
        setDefectiveImages(allImages.filter(img => img.image_type === 'real_defective'))
      } catch (err: any) {
        toast.error(err.message || 'Failed to load images')
      } finally {
        setLoading(false)
      }
    }

    fetchImages()
  }, [modelId])

  // Dropzone for image upload
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png'] },
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return

      try {
        setUploading(true)
        toast.info(`Uploading ${acceptedFiles.length} images...`)

        const uploadedImages = await imagesAPI.upload(
          modelId,
          acceptedFiles,
          activeTab === 'normal' ? 'normal' : 'defective'
        )

        if (activeTab === 'normal') {
          setNormalImages(prev => [...prev, ...uploadedImages])
        } else {
          setDefectiveImages(prev => [...prev, ...uploadedImages])
        }

        toast.success(`Uploaded ${uploadedImages.length} images`)
      } catch (err: any) {
        toast.error(err.message || 'Failed to upload images')
      } finally {
        setUploading(false)
      }
    },
  })

  const handleDeleteImage = async (imageId: number) => {
    if (!confirm('Are you sure you want to delete this image?')) return

    try {
      await imagesAPI.delete(imageId)

      setNormalImages(prev => prev.filter(img => img.id !== imageId))
      setDefectiveImages(prev => prev.filter(img => img.id !== imageId))

      toast.success('Image deleted')
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete image')
    }
  }

  const handleAnnotate = () => {
    router.push(`/models/${modelId}/annotate`)
  }

  const currentImages = activeTab === 'normal' ? normalImages : defectiveImages

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-600">Loading images...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex rounded-lg border">
          <button
            onClick={() => setActiveTab('defective')}
            className={`rounded-l-md border-r px-4 py-2 ${
              activeTab === 'defective'
                ? 'bg-red-50 text-red-600 font-medium'
                : 'bg-white text-gray-600'
            }`}
          >
            Defective ({defectiveImages.length})
          </button>
          <button
            onClick={() => setActiveTab('normal')}
            className={`rounded-r-md px-4 py-2 ${
              activeTab === 'normal'
                ? 'bg-green-50 text-green-600 font-medium'
                : 'bg-white text-gray-600'
            }`}
          >
            Normal ({normalImages.length})
          </button>
        </div>

        <div className="flex gap-3">
          {activeTab === 'defective' && defectiveImages.length > 0 && (
            <Button onClick={handleAnnotate} variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Annotate Images
            </Button>
          )}
        </div>
      </div>

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`mb-6 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400'
        } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
      >
        <input {...getInputProps()} />
        <ImageUp className="mx-auto mb-2 h-12 w-12 text-gray-400" />
        {uploading ? (
          <p className="text-gray-600">Uploading...</p>
        ) : isDragActive ? (
          <p className="text-blue-600">Drop images here...</p>
        ) : (
          <div>
            <p className="text-gray-700 font-medium">
              Drag & drop {activeTab} images here, or click to select
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Supports JPG, JPEG, PNG files
            </p>
          </div>
        )}
      </div>

      {/* Images Grid */}
      {currentImages.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300">
          <ImageUp className="mb-3 h-16 w-16 text-gray-300" />
          <p className="text-gray-500">No {activeTab} images uploaded yet</p>
          <p className="mt-1 text-sm text-gray-400">
            Upload images using the area above
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {currentImages.map((image) => (
            <Card key={image.id} className="group relative overflow-hidden">
              <div className="absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteImage(image.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
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
                  {image.status && (
                    <p className="mt-1 text-xs text-gray-500">
                      Status: {image.status}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
