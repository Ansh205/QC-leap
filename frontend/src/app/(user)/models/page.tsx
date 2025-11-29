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
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { models as modelsAPI, Model as BackendModel, auth } from '@/lib/api'

type Status = 'Created' | 'Awaiting Validation' | 'Training' | 'Ready' | 'Failed'

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
    created: 'Created',
    uploading: 'Created',
    generating_data: 'Awaiting Validation',
    awaiting_validation: 'Awaiting Validation',
    training: 'Training',
    ready: 'Ready',
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
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [modelToDelete, setModelToDelete] = useState<Model | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [creating, setCreating] = useState(false)

  // Create Modal State
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newModelName, setNewModelName] = useState('')
  const [newModelDescription, setNewModelDescription] = useState('')
  const [newModelIsPublic, setNewModelIsPublic] = useState(false)

  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('All')

  // Fetch current user
  useEffect(() => {
    async function fetchUser() {
      try {
        const user = await auth.getCurrentUser()
        setCurrentUser(user)
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
      setModels(models.filter((m) => m.id !== modelToDelete.id))
      setDeleteDialogOpen(false)
      setModelToDelete(null)
    } catch (err: any) {
      alert(err.message || 'Failed to delete model')
    } finally {
      setDeleting(false)
    }
  }

  const handleCreateNewModel = () => {
    // Calculate next ID
    const maxId = models.reduce((max, model) => Math.max(max, model.id), 0)
    const nextId = maxId + 1

    setNewModelName(`QCL-${nextId}`)
    setNewModelDescription('')
    setNewModelIsPublic(false)
    setCreateDialogOpen(true)
  }

  const handleCreateSubmit = async () => {
    try {
      setCreating(true)
      const newModel: any = await modelsAPI.create({
        name: newModelName,
        is_public: newModelIsPublic,
      } as any)

      // Handle both direct data return or axios response
      const modelId = newModel.id || newModel.data?.id

      router.push(`/models/${modelId}`)
    } catch (err: any) {
      alert(err.message || 'Failed to create model')
      setCreating(false)
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
          <p className="text-slate-600">{currentUser?.company?.name}</p>
        </div>

        <Button className="w-48" onClick={handleCreateNewModel}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Model
        </Button>
      </div>

      {error && <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>}

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
              <SelectItem value="Created">Created</SelectItem>
              <SelectItem value="Awaiting Validation">Awaiting Validation</SelectItem>
              <SelectItem value="Training">Training</SelectItem>
              <SelectItem value="Ready">Ready</SelectItem>
              <SelectItem value="Failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && (
        <div className="mt-10 flex items-center justify-center">
          <p className="text-lg text-gray-600">Loading models...</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {filteredAndSortedModels.map((model) => (
          <Card key={model.id} className="relative pt-0 pb-20">
            <div className="relative overflow-hidden rounded-t-md">
              {!model.thumbnailUrl ? (
                <div className="flex h-60 flex-col items-center justify-center rounded-md bg-gray-50 text-gray-400">
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
                      e.currentTarget.parentElement!.innerHTML =
                        '<div class="flex h-60 flex-col items-center justify-center text-gray-400"><svg class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><p class="mt-2 text-sm">Image unavailable</p></div>'
                    }}
                  />
                </div>
              )}
              {/* Public/Private Badge */}
              <div className="absolute top-2 right-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${model.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                >
                  {model.isPublic ? (
                    <>
                      <Globe className="h-3 w-3" /> Public
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3" /> Private
                    </>
                  )}
                </span>
              </div>
            </div>
            <CardContent>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xl font-semibold">{model.name}</h3>
                {currentUser?.id === model.ownerId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(model)}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
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
                    <span className="font-semibold">Accuracy:</span>{' '}
                    {Number(model.accuracy).toFixed(2)}%
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

                {model.status === 'Ready' ? (
                  <span className="flex h-full items-center justify-center rounded-md bg-green-600 py-2 text-sm text-white hover:bg-green-700">
                    Ready
                  </span>
                ) : model.status === 'Training' ? (
                  <span className="flex h-full w-full items-center justify-center rounded-md bg-blue-600 py-2 text-sm text-white">
                    Training {model.statusPercent ? `(${model.statusPercent}%)` : ''}
                  </span>
                ) : model.status === 'Awaiting Validation' ? (
                  <span className="flex h-full w-full items-center justify-center rounded-md bg-orange-500 py-2 text-sm text-white">
                    Awaiting Validation
                  </span>
                ) : model.status === 'Failed' ? (
                  <span className="flex h-full items-center justify-center rounded-md bg-red-600 py-2 text-sm text-white">
                    Failed
                  </span>
                ) : (
                  <span className="flex h-full items-center justify-center rounded-md bg-gray-700 py-2 text-sm text-white">
                    Created
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
              Are you sure you want to delete &quot;{modelToDelete?.name}&quot;? This action cannot
              be undone and will delete all associated images, annotations, and training data.
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
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Model Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Inspection Model</DialogTitle>
            <DialogDescription>Configure the basic settings for your new model.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Model Name</Label>
              <Input
                id="name"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                placeholder="e.g. QCL-1"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                value={newModelIsPublic ? 'public' : 'private'}
                onValueChange={(v) => setNewModelIsPublic(v === 'public')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">
                    <div className="flex items-center">
                      <Lock className="mr-2 h-4 w-4" />
                      Private
                    </div>
                  </SelectItem>
                  <SelectItem value="public">
                    <div className="flex items-center">
                      <Globe className="mr-2 h-4 w-4" />
                      Public
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateSubmit} disabled={creating}>
              {creating ? 'Creating...' : 'Create Model'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
