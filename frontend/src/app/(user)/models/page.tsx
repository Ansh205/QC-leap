'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImageIcon, Plus, Settings } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

type Status = 'New' | 'Awaiting' | 'Training' | 'Run'

interface Model {
  id: number
  name: string
  created: string
  training?: string
  trainingTime?: string
  accuracy?: string
  status: Status
  statusPercent?: number
  images: string[]
}

const initialModels: Model[] = [
  {
    id: 1,
    name: 'QCL-1',
    created: '1 January 2025',
    status: 'New',
    images: [],
  },
  {
    id: 2,
    name: 'QCL-2',
    created: '1 January 2025',
    training: '51 Original + 101 Generated',
    status: 'Awaiting',
    statusPercent: 53,
    images: [
      '/placeholder-image.png',
      '/placeholder-image.png',
      '/placeholder-image.png',
      '/placeholder-image.png',
    ],
  },
  {
    id: 3,
    name: 'QCL-3',
    created: '1 January 2025',
    training: '51 Original + 101 Generated',
    trainingTime: '40 min + 10 min (remain)',
    status: 'Training',
    statusPercent: 95,
    images: [
      '/placeholder-image.png',
      '/placeholder-image.png',
      '/placeholder-image.png',
      '/placeholder-image.png',
    ],
  },
  {
    id: 4,
    name: 'QCL-4',
    created: '1 January 2025',
    training: '51 Original + 101 Generated',
    trainingTime: '51 min',
    accuracy: '98.5%',
    status: 'Run',
    images: [
      '/placeholder-image.png',
      '/placeholder-image.png',
      '/placeholder-image.png',
      '/placeholder-image.png',
    ],
  },
]

export default function ModelsPage() {
  const [models] = useState(initialModels)

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('All')

  const filteredAndSortedModels = useMemo(() => {
    let result = [...models]

    if (searchQuery.trim()) {
      result = result.filter((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    if (filterStatus !== 'All') result = result.filter((m) => m.status === filterStatus)

    if (sortBy === 'date') {
      result.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
    }

    return result
  }, [models, searchQuery, sortBy, filterStatus])

  return (
    <div className="pt-8 pb-3">
      <p className="text-slate-600">Company Pvt. Ltd.</p>
      <div className="flex justify-between">
        <p className="text-3xl font-bold">Inspection Models</p>
        <Link href={'/models/QCL-1'}>
          <Button className="w-48">
            <Plus />
            Create New Model
          </Button>
        </Link>
      </div>

      <div className="mt-10 mb-10 flex flex-wrap items-center gap-4">        <div className="grid gap-3">
          <Label className="text-slate-800">Model Name</Label>

          <Input
            placeholder="Search by name"
            className="w-60"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="grid gap-3">
          <Label className="text-slate-800">Sort By</Label>
          <Select defaultValue="date" onValueChange={(v) => setSortBy(v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date Created</SelectItem>
              <SelectItem value="accuracy">Accuracy</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3">
          <Label className="text-slate-800">Filters</Label>
          <Select defaultValue="All" onValueChange={(v) => setFilterStatus(v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Awaiting">Awaiting</SelectItem>
              <SelectItem value="Training">Training</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {filteredAndSortedModels.map((model) => (
          <Card key={model.id} className="relative pt-0 pb-20">
            <div className="overflow-hidden rounded-t-md">
              {model.images.length === 0 ? (
                <div className="flex h-60 flex-col items-center justify-center rounded-md text-gray-400">
                  <ImageIcon size={48} />
                  <p className="mt-3 text-sm">No images added</p>
                </div>
              ) : (
                <div className="grid h-60 grid-cols-2 grid-rows-2">
                  {model.images.map((src, i) => (
                    <div key={i} className="flex items-center justify-center">
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <CardContent>
              <div className="flex items-start justify-between">
                <h3 className="text-xl font-semibold">{model.name}</h3>
                <Settings size={22} className="text-gray-500" />
              </div>
              <div className="pt-2 text-gray-700">
                <p>
                  <span className="font-semibold">Created:</span> {model.created}
                </p>
                {model.training && (
                  <p>
                    <span className="font-semibold">Training:</span> {model.training}
                  </p>
                )}
                {model.trainingTime && (
                  <p>
                    <span className="font-semibold">Training Time (Est.):</span>{' '}
                    {model.trainingTime}
                  </p>
                )}
                {model.accuracy && (
                  <p>
                    <span className="font-semibold">Accuracy:</span> {model.accuracy}
                  </p>
                )}
              </div>
            </CardContent>

            <CardFooter className="absolute bottom-5 w-full px-4">
              <div className="grid w-full grid-cols-2 gap-4">
                <Link href={`/models/${model.id}`} className="w-full">
                  <Button variant="outline" className="w-full" size={'lg'}>
                    View
                  </Button>
                </Link>

                {model.status === 'Run' ? (
                  <span className="flex h-full items-center justify-center rounded-md bg-green-600 py-2 text-sm text-white hover:bg-green-700">
                    Run
                  </span>
                ) : model.status === 'Training' ? (
                  <span className="flex h-full w-full items-center justify-center rounded-md bg-blue-600 py-2 text-sm text-white">
                    Training {model.statusPercent ? `(${model.statusPercent}%)` : ''}
                  </span>
                ) : model.status === 'Awaiting' ? (
                  <span className="flex h-full w-full items-center justify-center rounded-md bg-orange-500 py-2 text-sm text-white">
                    Awaiting {model.statusPercent ? `(${model.statusPercent}%)` : ''}
                  </span>
                ) : (
                  <span className="flex h-full items-center justify-center rounded-md bg-gray-700 py-2 text-sm text-white">
                    New
                  </span>
                )}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
