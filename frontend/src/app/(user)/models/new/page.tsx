'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { models, images, annotations } from '@/lib/api'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useDropzone } from 'react-dropzone'

type Step = 'basic' | 'images' | 'annotations' | 'config' | 'review'

export default function NewModelPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('basic')
  const [loading, setLoading] = useState(false)

  // Form data
  const [modelName, setModelName] = useState('')
  const [modelDescription, setModelDescription] = useState('')
  const [normalImages, setNormalImages] = useState<File[]>([])
  const [defectiveImages, setDefectiveImages] = useState<File[]>([])
  const [maskImages, setMaskImages] = useState<File[]>([])
  const [numSynthetic, setNumSynthetic] = useState(2000)  // Increased from 1000 to fight overfitting
  const [enableValidation, setEnableValidation] = useState(true)
  const [isPublic, setIsPublic] = useState(false)

  const steps: Step[] = ['basic', 'images', 'annotations', 'config', 'review']
  const stepIndex = steps.indexOf(currentStep)

  const nextStep = () => {
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  const prevStep = () => {
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  const handleCreateModel = async () => {
    try {
      setLoading(true)

      // Step 1: Create model
      toast.info('Creating model...')
      const model = await models.create(
        modelName,
        modelDescription,
        numSynthetic,
        enableValidation,
        isPublic
      )

      // Step 2: Upload normal images
      if (normalImages.length > 0) {
        toast.info('Uploading normal images...')
        await images.upload(model.id, normalImages, 'normal')
      }

      // Step 3: Upload defective images
      if (defectiveImages.length > 0) {
        toast.info('Uploading defective images...')
        await images.upload(model.id, defectiveImages, 'defective')
      }

      // Step 4: Upload mask images if provided
      if (maskImages.length > 0) {
        toast.info('Uploading mask images...')
        await images.uploadMasks(model.id, maskImages)
      }

      toast.success('Model created successfully!')
      router.push(`/models/${model.id}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create model')
    } finally {
      setLoading(false)
    }
  }

  // Dropzone for normal images
  const normalDropzone = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png'] },
    onDrop: (acceptedFiles) => {
      setNormalImages((prev) => [...prev, ...acceptedFiles])
    },
  })

  // Dropzone for defective images
  const defectiveDropzone = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png'] },
    onDrop: (acceptedFiles) => {
      setDefectiveImages((prev) => [...prev, ...acceptedFiles])
    },
  })

  // Dropzone for mask images
  const maskDropzone = useDropzone({
    accept: { 'image/png': ['.png'] },
    onDrop: (acceptedFiles) => {
      setMaskImages((prev) => [...prev, ...acceptedFiles])
    },
  })

  return (
    <div className="py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/models')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Models
        </Button>
      </div>

      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-3xl font-bold">Create New Inspection Model</h1>

        {/* Progress indicator */}
        <div className="mb-8 flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  index <= stepIndex ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {index < stepIndex ? <Check className="h-5 w-5" /> : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-1 w-16 ${index < stepIndex ? 'bg-blue-600' : 'bg-gray-200'}`}
                />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 'basic' && 'Basic Information'}
              {currentStep === 'images' && 'Upload Images'}
              {currentStep === 'annotations' && 'Upload Defect Masks'}
              {currentStep === 'config' && 'Configuration'}
              {currentStep === 'review' && 'Review & Create'}
            </CardTitle>
            <CardDescription>
              {currentStep === 'basic' && 'Provide a name and description for your model'}
              {currentStep === 'images' && 'Upload normal and defective sample images'}
              {currentStep === 'annotations' && 'Upload PNG mask files for defect regions'}
              {currentStep === 'config' && 'Configure model training parameters'}
              {currentStep === 'review' && 'Review your settings and create the model'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1: Basic Information */}
            {currentStep === 'basic' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Model Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Cashew Defect Detection"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Optional description"
                    value={modelDescription}
                    onChange={(e) => setModelDescription(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Upload Images */}
            {currentStep === 'images' && (
              <div className="space-y-6">
                <div>
                  <Label>Normal Images ({normalImages.length} files)</Label>
                  <div
                    {...normalDropzone.getRootProps()}
                    className="mt-2 cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center hover:border-blue-500"
                  >
                    <input {...normalDropzone.getInputProps()} />
                    <p className="text-gray-600">
                      Drag & drop normal images here, or click to select files
                    </p>
                  </div>
                  {normalImages.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {normalImages.slice(0, 5).map((file, i) => (
                        <p key={i} className="text-sm text-gray-600">
                          {file.name}
                        </p>
                      ))}
                      {normalImages.length > 5 && (
                        <p className="text-sm text-gray-500">
                          +{normalImages.length - 5} more files
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label>Defective Images ({defectiveImages.length} files)</Label>
                  <div
                    {...defectiveDropzone.getRootProps()}
                    className="mt-2 cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center hover:border-blue-500"
                  >
                    <input {...defectiveDropzone.getInputProps()} />
                    <p className="text-gray-600">
                      Drag & drop defective images here, or click to select files
                    </p>
                  </div>
                  {defectiveImages.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {defectiveImages.slice(0, 5).map((file, i) => (
                        <p key={i} className="text-sm text-gray-600">
                          {file.name}
                        </p>
                      ))}
                      {defectiveImages.length > 5 && (
                        <p className="text-sm text-gray-500">
                          +{defectiveImages.length - 5} more files
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Mask Upload */}
            {currentStep === 'annotations' && (
              <div className="space-y-6">
                <div>
                  <Label>Defect Mask Images ({maskImages.length} files) *</Label>
                  <p className="mb-2 text-sm text-gray-600">
                    Upload PNG mask files for defective images. Mask filenames must match image names (e.g., 005.png for 005.JPG)
                  </p>
                  <div
                    {...maskDropzone.getRootProps()}
                    className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center hover:border-blue-500"
                  >
                    <input {...maskDropzone.getInputProps()} />
                    <p className="text-gray-600">
                      Drag & drop mask PNG files here, or click to select
                    </p>
                  </div>
                  {maskImages.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {maskImages.slice(0, 5).map((file, i) => (
                        <p key={i} className="text-sm text-gray-600">
                          {file.name}
                        </p>
                      ))}
                      {maskImages.length > 5 && (
                        <p className="text-sm text-gray-500">
                          +{maskImages.length - 5} more files
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-lg bg-blue-50 p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Required:</strong> Mask images are required for copy-paste augmentation.
                    Each mask file should be a PNG image with white pixels indicating the defect region.
                    Mask filenames must match your defective image filenames (e.g., 005.png for 005.JPG).
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Configuration */}
            {currentStep === 'config' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="synthetic">Number of Synthetic Images</Label>
                  <Input
                    id="synthetic"
                    type="number"
                    min="100"
                    max="10000"
                    value={numSynthetic}
                    onChange={(e) => setNumSynthetic(parseInt(e.target.value))}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    More images = better quality but longer training time
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="validation"
                    checked={enableValidation}
                    onChange={(e) => setEnableValidation(e.target.checked)}
                  />
                  <Label htmlFor="validation">Enable human validation of synthetic images</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="public"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                  />
                  <Label htmlFor="public">Make model publicly accessible</Label>
                </div>
                <p className="text-sm text-gray-500">
                  Public models can be used by anyone. Private models are accessible only to you and your company members.
                </p>
              </div>
            )}

            {/* Step 5: Review */}
            {currentStep === 'review' && (
              <div className="space-y-4">
                <div className="rounded-lg bg-gray-50 p-4">
                  <h3 className="font-semibold">Model Details</h3>
                  <p className="mt-2 text-sm">
                    <span className="font-medium">Name:</span> {modelName}
                  </p>
                  {modelDescription && (
                    <p className="text-sm">
                      <span className="font-medium">Description:</span> {modelDescription}
                    </p>
                  )}
                  <p className="text-sm">
                    <span className="font-medium">Normal Images:</span> {normalImages.length}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Defective Images:</span> {defectiveImages.length}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Mask Images:</span> {maskImages.length}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Synthetic Images:</span> {numSynthetic}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Human Validation:</span>{' '}
                    {enableValidation ? 'Enabled' : 'Disabled'}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Visibility:</span>{' '}
                    {isPublic ? 'Public' : 'Private (Company only)'}
                  </p>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 'basic' || loading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              {currentStep !== 'review' ? (
                <Button onClick={nextStep} disabled={!modelName && currentStep === 'basic'}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleCreateModel} disabled={loading}>
                  {loading ? 'Creating...' : 'Create Model'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
