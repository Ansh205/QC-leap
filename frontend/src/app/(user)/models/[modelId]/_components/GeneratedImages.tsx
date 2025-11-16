'use client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'

interface GeneratedImagesProps {
  modelId: number
}

export default function GeneratedImages({ modelId }: GeneratedImagesProps) {
  // TODO: Implement GAN-based synthetic image generation
  // - Fetch generated images from backend
  // - Display approval/rejection interface
  // - Allow human validation if enabled

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
    </div>
  )
}
