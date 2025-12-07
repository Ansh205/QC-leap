'use client'
// ... (imports remain the same, just update Search import)
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ImageIcon, Plus, Clock, Search, Filter, AlertCircle, Box } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { models as modelsAPI, auth } from '@/lib/api'

// ... (formatDate function remains same)
function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ModelsPage() {
  // ... (State logic remains same)
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
    if (filterStatus !== 'All') {
        res = res.filter(m => m.status === filterStatus)
    }
    return res.sort((a, b) => sortBy === 'date' ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() : parseFloat(b.accuracy||0) - parseFloat(a.accuracy||0))
  }, [models, searchQuery, filterStatus, sortBy])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inspection Models</h1>
          <p className="text-xs text-slate-500 font-medium">Manage your AI models for defect detection.</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-xs font-semibold shadow-lg shadow-blue-600/20 transition-transform hover:scale-105">
          <Plus className="mr-2 h-4 w-4" /> Create Model
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 rounded-xl border border-white/60 bg-white/60 backdrop-blur-md p-3 shadow-sm sm:flex-row sm:items-end">
        <div className="grid w-full gap-1.5 sm:max-w-xs">
          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pl-1">
             Search Models
          </Label>
          <div className="relative group">
            <div className="absolute left-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 group-focus-within:bg-indigo-500 group-focus-within:text-white transition-colors duration-300">
                <Search className="h-2.5 w-2.5" />
            </div>
            <Input 
              placeholder="Filter by name..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-xs bg-white/80 focus:bg-white border-slate-200 transition-all shadow-sm"
            />
          </div>
        </div>
        <div className="grid w-full gap-1.5 sm:max-w-[140px]">
          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Sort By</Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-9 text-xs bg-white/80 border-slate-200 shadow-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Newest First</SelectItem>
              <SelectItem value="accuracy">Best Accuracy</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid w-full gap-1.5 sm:max-w-[160px]">
          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Filter Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 text-xs bg-white/80 border-slate-200 shadow-sm"><SelectValue /></SelectTrigger>
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
        <div className="py-24 text-center text-slate-500 text-sm flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            Loading models...
        </div>
      ) : filteredModels.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200/60">
            <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-400">
                <Box className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-slate-600">No models found.</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or create a new model.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredModels.map((model) => (
            <Card key={model.id} className="group overflow-hidden hover:shadow-xl hover:shadow-indigo-500/10 transition-all border-white/60 bg-white/80 backdrop-blur-sm duration-300">
              <div className="relative aspect-[16/9] bg-gradient-to-br from-slate-50 to-slate-100 border-b border-slate-100/50 flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-500">
                 {model.thumbnail_url ? (
                   <img src={`${process.env.NEXT_PUBLIC_API_URL}${model.thumbnail_url}`} className="h-full w-full object-cover" />
                 ) : (
                   <ImageIcon className="text-slate-300 h-8 w-8 opacity-50" />
                 )}
                 <div className="absolute top-2 right-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md ${model.is_public ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' : 'bg-white/80 text-slate-600 border border-white/40'}`}>
                      {model.is_public ? 'Public' : 'Private'}
                    </span>
                 </div>
              </div>
              <CardContent className="p-4 space-y-3">
                 <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">{model.name}</h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1 font-medium">
                        <Clock size={10} /> {model.created}
                      </div>
                    </div>
                 </div>
                 <div className="flex items-center justify-between pt-3 border-t border-slate-100/80">
                    <div className="flex flex-col">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Accuracy</span>
                       <span className={`text-sm font-bold ${model.accuracy ? 'text-emerald-600' : 'text-slate-300'}`}>
                         {model.accuracy ? `${Number(model.accuracy).toFixed(1)}%` : 'N/A'}
                       </span>
                    </div>
                    <div className="flex flex-col items-end">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                       <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                         model.status === 'ready' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                         model.status === 'training' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                         model.status === 'failed' ? 'bg-red-50 text-red-700 border-red-100' :
                         'bg-slate-50 text-slate-600 border-slate-100'
                       }`}>
                         {model.status === 'awaiting_validation' ? 'Validation' : 
                          model.status === 'generating_data' ? 'Generating' : 
                          model.status.replace('_', ' ')}
                       </span>
                    </div>
                 </div>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Link href={`/models/${model.id}`} className="w-full">
                  <Button size="sm" className="w-full h-8 text-xs bg-slate-900 hover:bg-indigo-600 transition-colors shadow-sm">View Details</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog (Kept same logic, just ensure button styling) */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        {/* ... (Dialog content same as before) ... */}
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