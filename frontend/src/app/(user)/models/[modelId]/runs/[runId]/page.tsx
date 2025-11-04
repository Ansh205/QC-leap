'use client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { useState } from 'react'

export default function ModelRunDetailPage() {
  const [activeTab, setActiveTab] = useState<'defective' | 'non-defective'>('defective')

  const images = [
    {
      id: '51',
      description:
        "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.",
      src: '/placeholder-image.png',
    },

    {
      id: '52',
      description:
        "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.",
      src: '/placeholder-image.png',
    },
  ]

  return (
    <div className="py-8">
      <div className="mt-0.5 flex justify-between">
        <div>
          <p className="text-3xl font-bold">QCL-1</p>
          <p className="text-slate-600">Inspection Model / Run-51</p>
        </div>
        <div className="flex items-end gap-5">
          <Link href={'../'}>
            <Button className="w-40 bg-slate-200 text-black" variant={'outline'}>
              View Model
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex w-fit rounded-lg border">
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

        <div className="mt-10 grid grid-cols-4 gap-6">
          {images.map((image) => (
            <Card key={image.id} className="relative pt-0">
              <div className="overflow-hidden rounded-t-md">
                <img src={image.src} alt="" className="h-52 w-full object-cover" />
              </div>
              <CardContent>
                <p className="text-sm text-gray-600">{image.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
