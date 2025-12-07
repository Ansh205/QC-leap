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
import { ImageIcon, Plus, Clock, Search, Filter, AlertCircle, Box } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { models as modelsAPI, auth } from '@/lib/api'

function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ModelsPage() {
  const [models, setModels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<string>('date')
  const [filterStatus, setFilterStatus] = useState<string>('All')

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newModelName, setNewModelName] = useState('')
  const [newModelIsPublic, setNewModelIsPublic] = useState(false)
  const [creating, setCreating] = useState(false)

  // Store token for image loading
  const [authToken, setAuthToken] = useState('')

  const router = useRouter()

  useEffect(() => {
    async function init() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('qc_leap_token') : ''
        setAuthToken(token || '')

        const [user, data] = await Promise.all([auth.getCurrentUser(), modelsAPI.list()])
        setCurrentUser(user)
        setModels(
          data.map((m: any) => ({
            ...m,
            created: formatDate(m.created_at),
          }))
        )
      } catch (err) {
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const handleCreateSubmit = async () => {
    setCreating(true)
    try {
      const res: any = await modelsAPI.create({ name: newModelName, is_public: newModelIsPublic })
      router.push(`/models/${res.id || res.data?.id}`)
    } catch (e) {
      alert('Failed to create')
    } finally {
      setCreating(false)
    }
  }

  const filteredModels = useMemo(() => {
    let res = [...models]
    if (searchQuery)
      res = res.filter((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    if (filterStatus !== 'All') {
      res = res.filter((m) => m.status === filterStatus)
    }
    return res.sort((a, b) =>
      sortBy === 'date'
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : parseFloat(b.accuracy || 0) - parseFloat(a.accuracy || 0)
    )
  }, [models, searchQuery, filterStatus, sortBy])

  // Helper to construct secure image URL
  const getThumbnailUrl = (model: any) => {
    if (!model.thumbnail_url) return null

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
    let url = model.thumbnail_url

    // Check if it's a relative path
    if (!url.startsWith('http')) {
      url = `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
    }

    // Append token if available
    if (authToken) {
      const separator = url.includes('?') ? '&' : '?'
      return `${url}${separator}token=${authToken}`
    }

    return url
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inspection Models</h1>
          <p className="text-xs font-medium text-slate-500">
            Manage your AI models for defect detection.
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          size="sm"
          className="h-9 bg-blue-600 text-xs font-semibold shadow-lg shadow-blue-600/20 transition-transform hover:scale-105 hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" /> Create Model
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 rounded-xl border border-white/60 bg-white/60 p-3 shadow-sm backdrop-blur-md sm:flex-row sm:items-end">
        <div className="grid w-full gap-1.5 sm:max-w-xs">
          <Label className="flex items-center gap-1.5 pl-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Search Models
          </Label>
          <div className="group relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400 transition-colors" />
            </div>
            <Input
              placeholder="Filter by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 border-slate-200 bg-white/80 pl-9 text-xs shadow-sm transition-all focus:bg-white"
            />
          </div>
        </div>
        <div className="grid w-full gap-1.5 sm:max-w-[140px]">
          <Label className="pl-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Sort By
          </Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-9 border-slate-200 bg-white/80 text-xs shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Newest First</SelectItem>
              <SelectItem value="accuracy">Best Accuracy</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid w-full gap-1.5 sm:max-w-[160px]">
          <Label className="pl-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Filter Status
          </Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 border-slate-200 bg-white/80 text-xs shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="uploading">Uploading</SelectItem>
              <SelectItem value="generating_data">Generating Data</SelectItem>
              <SelectItem value="awaiting_validation">Awaiting Validation</SelectItem>
              <SelectItem value="training">Training</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center text-sm text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
          Loading models...
        </div>
      ) : filteredModels.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/60 bg-slate-50/50 py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Box className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-slate-600">No models found.</p>
          <p className="mt-1 text-xs text-slate-400">
            Try adjusting your filters or create a new model.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredModels.map((model) => (
            <Card
              key={model.id}
              className="group overflow-hidden border-white/60 bg-white/80 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10"
            >
              <div className="relative flex aspect-[16/9] items-center justify-center border-b border-slate-100/50 bg-gradient-to-br from-slate-50 to-slate-100 transition-transform duration-500 group-hover:scale-[1.02]">
                {model.thumbnail_url ? (
                  <img
                    src={getThumbnailUrl(model)!}
                    className="h-full w-full object-cover"
                    alt={model.name}
                    onError={(e) => {
                      // Fallback on error
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.parentElement
                        ?.querySelector('.fallback-icon')
                        ?.classList.remove('hidden')
                    }}
                  />
                ) : (
                  <ImageIcon className="h-8 w-8 text-slate-300 opacity-50" />
                )}
                {/* Fallback Icon (initially hidden if thumb exists) */}
                <ImageIcon
                  className={`fallback-icon absolute h-8 w-8 text-slate-300 opacity-50 ${model.thumbnail_url ? 'hidden' : ''}`}
                />

                {/* <div className="absolute top-2 right-2">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase shadow-sm backdrop-blur-md ${model.is_public ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-700' : 'border border-white/40 bg-white/80 text-slate-600'}`}
                  >
                    {model.is_public ? 'Public' : 'Private'}
                  </span>
                </div> */}
              </div>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="line-clamp-1 text-sm font-bold text-slate-900 transition-colors group-hover:text-indigo-600">
                      {model.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                      <Clock size={10} /> {model.created}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100/80 pt-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      Accuracy
                    </span>
                    <span
                      className={`text-sm font-bold ${model.accuracy ? 'text-emerald-600' : 'text-slate-300'}`}
                    >
                      {model.accuracy ? `${Number(model.accuracy).toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      Status
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                        model.status === 'ready'
                          ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                          : model.status === 'training'
                            ? 'border-blue-100 bg-blue-50 text-blue-700'
                            : model.status === 'failed'
                              ? 'border-red-100 bg-red-50 text-red-700'
                              : 'border-slate-100 bg-slate-50 text-slate-600'
                      }`}
                    >
                      {model.status === 'awaiting_validation'
                        ? 'Validation'
                        : model.status === 'generating_data'
                          ? 'Generating'
                          : model.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Link href={`/models/${model.id}`} className="w-full">
                  <Button
                    size="sm"
                    className="h-8 w-full bg-slate-900 text-xs shadow-sm transition-colors hover:bg-indigo-600"
                  >
                    View Details
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Model</DialogTitle>
            <DialogDescription>Enter details for your new inspection model.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Model Name</Label>
              <Input
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                placeholder="e.g. QCL-Beta"
              />
            </div>
            {/* <div className="space-y-2">
                <Label>Visibility</Label>
                <Select value={newModelIsPublic ? 'public' : 'private'} onValueChange={v => setNewModelIsPublic(v === 'public')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private (Company only)</SelectItem>
                    <SelectItem value="public">Public (Everyone)</SelectItem>
                  </SelectContent>
                </Select>
             </div> */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubmit} disabled={creating}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
