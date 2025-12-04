'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Play, Upload, X, Loader2 } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { runs as runsAPI } from '@/lib/api'

export default function RunDialog({ modelId }: { modelId: number }) {
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const router = useRouter()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles])
  }, [])

  const onDropRejected = useCallback((fileRejections: any[]) => {
    alert(`${fileRejections.length} files were rejected. Please ensure they are valid images.`)
    console.log('Rejected files:', fileRejections)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.bmp', '.tiff'],
    },
  })

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleRun = async () => {
    if (files.length === 0) return

    try {
      setUploading(true)

      // 1. Create Run
      const run = await runsAPI.create(modelId)

      // 2. Upload Images
      for (const file of files) {
        await runsAPI.uploadImage(run.id, file)
      }

      // 3. Execute Run
      await runsAPI.execute(run.id)

      // 4. Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const updatedRun = await runsAPI.get(run.id)
          if (updatedRun.status === 'COMPLETED') {
            clearInterval(pollInterval)
            setOpen(false)
            router.push(`./${modelId}/runs/${run.id}`)
          } else if (updatedRun.status === 'FAILED') {
            clearInterval(pollInterval)
            setUploading(false)
            alert('Run failed')
          }
        } catch (e) {
          console.error('Polling error', e)
        }
      }, 1000)
    } catch (err) {
      console.error('Failed to start run', err)
      setUploading(false)
      // TODO: Show error toast
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-40 bg-green-600 text-white hover:bg-green-500">
          <Play className="mr-2 h-4 w-4" />
          Run
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Run Inference</DialogTitle>
          <DialogDescription>
            Upload images to detect defects using your trained model.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div
            {...getRootProps()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mb-2 h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-600">
              {isDragActive ? 'Drop images here' : 'Drag & drop images here, or click to select'}
            </p>
          </div>

          {files.length > 0 && (
            <>
              <p className="text-sm font-medium text-gray-700">Selected Files ({files.length})</p>
              <div className="max-h-40 space-y-2 overflow-y-auto">
                {files.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded bg-gray-50 p-2 text-sm"
                  >
                    <span className="truncate">{file.name}</span>
                    <button
                      onClick={() => removeFile(i)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleRun} disabled={files.length === 0 || uploading}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Run Inference'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
