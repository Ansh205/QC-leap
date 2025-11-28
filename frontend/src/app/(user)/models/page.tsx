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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ImageIcon, Plus, Trash2, Globe, Lock } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { models as modelsAPI, Model as BackendModel, auth } from '@/lib/api'

type Status = 'New' | 'Awaiting' | 'Training' | 'Run' | 'Failed'

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
  thumbnailUrl?: string
  isPublic: boolean
  ownerId: number
}

// Map backend status to frontend display status
function mapStatus(backendStatus: BackendModel['status']): Status {
  const statusMap: Record<BackendModel['status'], Status> = {
    created: 'New',
    uploading: 'New',
    generating_data: 'Awaiting',
    awaiting_validation: 'Awaiting',
    training: 'Training',
    ready: 'Run',
    failed: 'Failed',
  }
  return statusMap[backendStatus]
}

// Format date from ISO string to readable format
function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [modelToDelete, setModelToDelete] = useState<Model | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('All')

  // Fetch current user
  useEffect(() => {
    async function fetchUser() {
      try {
        const user = await auth.getCurrentUser()
        setCurrentUserId(user.id)
      } catch (err) {
        console.error('Failed to fetch user:', err)
      }
    }
    fetchUser()
  }, [])

  // Fetch models from backend
  useEffect(() => {
    async function fetchModels() {
      try {
        setLoading(true)
        const backendModels = await modelsAPI.list()

        // Map backend models to frontend format
        const mappedModels: Model[] = backendModels.map((model) => ({
          id: model.id,
          name: model.name,
          created: formatDate(model.created_at),
          accuracy: model.accuracy,
          status: mapStatus(model.status),
          images: [], // Images will be loaded separately when needed
          thumbnailUrl: model.thumbnail_url,
          isPublic: model.is_public,
          ownerId: model.owner_id,
        }))

        setModels(mappedModels)
        setError('')
      } catch (err: any) {
        setError(err.message || 'Failed to load models')
        console.error('Failed to fetch models:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchModels()
  }, [])

  const handleDeleteClick = (model: Model) => {
    setModelToDelete(model)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!modelToDelete) return

    try {
      setDeleting(true)
      await modelsAPI.delete(modelToDelete.id)
      setModels(models.filter(m => m.id !== modelToDelete.id))
      setDeleteDialogOpen(false)
      setModelToDelete(null)
    } catch (err: any) {
      alert(err.message || 'Failed to delete model')
    } finally {
      setDeleting(false)
    }
  }

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
    <div className="py-8">
      <div className="flex justify-between">
        <div>
          <p className="text-3xl font-bold">Inspection Models</p>
          <p className="text-slate-600">Company Pvt. Ltd.</p>
        </div>

        <Link href={'/models/new'} className="flex items-end">
          <Button className="w-48">
            <Plus />
            Create New Model
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-10 flex items-center justify-center">
          <p className="text-lg text-gray-600">Loading models...</p>
        </div>
      )}

      <div className="mt-10 mb-10 flex flex-wrap items-center gap-4">
        {' '}
        <div className="grid gap-3">
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
              <SelectItem value="Run">Ready</SelectItem>
              <SelectItem value="Failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {filteredAndSortedModels.map((model) => (
          <Card key={model.id} className="relative pt-0 pb-20">
            <div className="overflow-hidden rounded-t-md relative">
              {!model.thumbnailUrl ? (
                <div className="flex h-60 flex-col items-center justify-center rounded-md text-gray-400 bg-gray-50">
                  <ImageIcon size={48} />
                  <p className="mt-3 text-sm">No images added</p>
                </div>
              ) : (
                <div className="h-60 w-full">
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}${model.thumbnailUrl}?token=${typeof window !== 'undefined' ? localStorage.getItem('qc_leap_token') : ''}`}
                    alt={model.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      // Fallback to placeholder if image fails to load
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.parentElement!.innerHTML = '<div class="flex h-60 flex-col items-center justify-center text-gray-400"><svg class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><p class="mt-2 text-sm">Image unavailable</p></div>'
                    }}
                  />
                </div>
              )}
              {/* Public/Private Badge */}
              <div className="absolute top-2 right-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                  model.isPublic
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {model.isPublic ? (
                    <><Globe className="h-3 w-3" /> Public</>
                  ) : (
                    <><Lock className="h-3 w-3" /> Private</>
                  )}
                </span>
              </div>
            </div>
            <CardContent>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xl font-semibold">{model.name}</h3>
                {currentUserId === model.ownerId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(model)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
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
                  <button className="flex h-full items-center justify-center rounded-md bg-green-600 py-2 text-sm text-white hover:bg-green-700">
                    Run
                  </button>
                ) : model.status === 'Training' ? (
                  <span className="flex h-full w-full items-center justify-center rounded-md bg-blue-600 py-2 text-sm text-white">
                    Training {model.statusPercent ? `(${model.statusPercent}%)` : ''}
                  </span>
                ) : model.status === 'Awaiting' ? (
                  <span className="flex h-full w-full items-center justify-center rounded-md bg-orange-500 py-2 text-sm text-white">
                    Awaiting {model.statusPercent ? `(${model.statusPercent}%)` : ''}
                  </span>
                ) : model.status === 'Failed' ? (
                  <span className="flex h-full items-center justify-center rounded-md bg-red-600 py-2 text-sm text-white">
                    Failed
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Inspection Model</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{modelToDelete?.name}&quot;? This action cannot be undone and will delete all associated images, annotations, and training data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
