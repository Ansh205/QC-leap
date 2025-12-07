'use client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ImageIcon, Plus, Clock, Search, Filter, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { models as modelsAPI, auth } from '@/lib/api'

// Helper function
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
  
  // Dialog States
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newModelName, setNewModelName] = useState('')
  const [newModelIsPublic, setNewModelIsPublic] = useState(false)
  const [creating, setCreating] = useState(false)
  
  const router = useRouter()

  useEffect(() => {
    async function init() {
      try {
        const [user, data] = await Promise.all([auth.getCurrentUser(), modelsAPI.list()])
        setCurrentUser(user)
        setModels(data.map((m: any) => ({
          ...m,
          created: formatDate(m.created_at),
        })))
      } catch (err) { setError('Failed to load data') } 
      finally { setLoading(false) }
    }
    init()
  }, [])

  const handleCreateSubmit = async () => {
    setCreating(true)
    try {
      const res: any = await modelsAPI.create({ name: newModelName, is_public: newModelIsPublic })
      router.push(`/models/${res.id || res.data?.id}`)
    } catch (e) { alert('Failed to create') }
    finally { setCreating(false) }
  }

  const filteredModels = useMemo(() => {
    let res = [...models]
    if (searchQuery) res = res.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    
    // Filter logic handling status mapping
    if (filterStatus !== 'All') {
        res = res.filter(m => m.status === filterStatus)
    }
    
    return res.sort((a, b) => sortBy === 'date' ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() : parseFloat(b.accuracy||0) - parseFloat(a.accuracy||0))
  }, [models, searchQuery, filterStatus, sortBy])

  return (
    <div className="space-y-3">
      {/* Header - Matches Stats Page Style (Compact) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Inspection Models</h1>
          <p className="text-xs text-slate-500">Manage your AI models for defect detection.</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-xs font-medium shadow-sm">
          <Plus className="mr-2 h-3.5 w-3.5" /> Create Model
        </Button>
      </div>

      {/* Compact Toolbar */}
      <div className="flex flex-col gap-2 rounded-lg border bg-white p-2 shadow-sm sm:flex-row sm:items-end">
        <div className="grid w-full gap-1 sm:max-w-xs">
          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">Search</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
            <Input 
              placeholder="Filter by name..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-slate-50 focus:bg-white"
            />
          </div>
        </div>
        <div className="grid w-full gap-1 sm:max-w-[140px]">
          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sort</Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-8 text-xs bg-slate-50"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Newest First</SelectItem>
              <SelectItem value="accuracy">Best Accuracy</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid w-full gap-1 sm:max-w-[160px]">
          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs bg-slate-50"><SelectValue /></SelectTrigger>
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
        <div className="py-20 text-center text-slate-500 text-sm">Loading models...</div>
      ) : filteredModels.length === 0 ? (
        <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed text-sm">No models found.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredModels.map((model) => (
            <Card key={model.id} className="group overflow-hidden hover:shadow-md transition-all border-slate-200">
              <div className="relative aspect-[16/9] bg-slate-100 border-b flex items-center justify-center">
                 {model.thumbnail_url ? (
                   <img src={`${process.env.NEXT_PUBLIC_API_URL}${model.thumbnail_url}`} className="h-full w-full object-cover" />
                 ) : (
                   <ImageIcon className="text-slate-300 h-8 w-8" />
                 )}
                 <div className="absolute top-2 right-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/90 shadow-sm ${model.is_public ? 'text-green-700' : 'text-slate-700'}`}>
                      {model.is_public ? 'Public' : 'Private'}
                    </span>
                 </div>
              </div>
              <CardContent className="p-3 space-y-2">
                 <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{model.name}</h3>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                        <Clock size={10} /> {model.created}
                      </div>
                    </div>
                 </div>
                 <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <div className="flex flex-col">
                       <span className="text-[10px] font-bold text-slate-400 uppercase">Accuracy</span>
                       <span className={`text-sm font-bold ${model.accuracy ? 'text-green-600' : 'text-slate-300'}`}>
                         {model.accuracy ? `${Number(model.accuracy).toFixed(1)}%` : 'N/A'}
                       </span>
                    </div>
                    <div className="flex flex-col items-end">
                       <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
                       <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                         model.status === 'ready' ? 'bg-green-50 text-green-700' : 
                         model.status === 'training' ? 'bg-blue-50 text-blue-700' : 
                         model.status === 'failed' ? 'bg-red-50 text-red-700' :
                         'bg-slate-100 text-slate-600'
                       }`}>
                         {model.status === 'awaiting_validation' ? 'Validation' : 
                          model.status === 'generating_data' ? 'Generating' : 
                          model.status.replace('_', ' ')}
                       </span>
                    </div>
                 </div>
              </CardContent>
              <CardFooter className="p-3 pt-0">
                <Link href={`/models/${model.id}`} className="w-full">
                  <Button size="sm" className="w-full h-8 text-xs bg-slate-900 hover:bg-slate-800">View Details</Button>
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
                <Input value={newModelName} onChange={e => setNewModelName(e.target.value)} placeholder="e.g. QCL-Beta" />
             </div>
             <div className="space-y-2">
                <Label>Visibility</Label>
                <Select value={newModelIsPublic ? 'public' : 'private'} onValueChange={v => setNewModelIsPublic(v === 'public')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private (Company only)</SelectItem>
                    <SelectItem value="public">Public (Everyone)</SelectItem>
                  </SelectContent>
                </Select>
             </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
             <Button onClick={handleCreateSubmit} disabled={creating}>{creating ? 'Creating...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}