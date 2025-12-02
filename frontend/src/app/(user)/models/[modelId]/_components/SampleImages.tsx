'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Trash2, Image as ImageIcon, ImageUp, Edit, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { images as imagesAPI, annotations as annotationsAPI } from '@/lib/api'

type ImageType = {
  id: string
  url: string
  type: 'defective' | 'normal'
  defectBox?: { x: number; y: number; width: number; height: number }
  file?: File
  is_synthetic?: boolean
}

type PendingImage = {
  file: File
  url: string
}

function ImageCard({
  image,
  onEdit,
  onDelete,
}: {
  image: ImageType
  onEdit?: () => void
  onDelete: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (image.type === 'defective' && image.defectBox && canvasRef.current && imgRef.current) {
      const canvas = canvasRef.current
      const img = imgRef.current
      const ctx = canvas.getContext('2d')

      if (!ctx) return

      const drawRectangle = () => {
        // Wait for image to be fully loaded
        if (!img.complete || img.naturalWidth === 0) {
          return
        }

        // Get the container and image dimensions
        const imgRect = img.getBoundingClientRect()
        const naturalWidth = img.naturalWidth
        const naturalHeight = img.naturalHeight

        // Calculate the actual displayed size of the image with object-fit: contain
        const containerAspect = imgRect.width / imgRect.height
        const imageAspect = naturalWidth / naturalHeight

        let displayWidth, displayHeight, offsetX, offsetY

        if (imageAspect > containerAspect) {
          // Image is wider - fit to width
          displayWidth = imgRect.width
          displayHeight = imgRect.width / imageAspect
          offsetX = 0
          offsetY = (imgRect.height - displayHeight) / 2
        } else {
          // Image is taller - fit to height
          displayHeight = imgRect.height
          displayWidth = imgRect.height * imageAspect
          offsetX = (imgRect.width - displayWidth) / 2
          offsetY = 0
        }

        // Set canvas size to match the displayed image
        canvas.width = displayWidth
        canvas.height = displayHeight

        // Position canvas to match image position
        canvas.style.width = `${displayWidth}px`
        canvas.style.height = `${displayHeight}px`
        canvas.style.left = `${offsetX}px`
        canvas.style.top = `${offsetY}px`

        // Calculate scale from natural to displayed size
        const scaleX = displayWidth / naturalWidth
        const scaleY = displayHeight / naturalHeight

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Draw rectangle with scaled coordinates
        ctx.strokeStyle = 'red'
        ctx.lineWidth = 2

        const box = image.defectBox!
        const scaledX = box.x * scaleX
        const scaledY = box.y * scaleY
        const scaledWidth = box.width * scaleX
        const scaledHeight = box.height * scaleY

        ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight)
      }

      // Draw immediately if image is already loaded
      if (img.complete) {
        drawRectangle()
      } else {
        img.onload = drawRectangle
      }

      // Redraw on window resize
      const resizeObserver = new ResizeObserver(drawRectangle)
      if (img.parentElement) {
        resizeObserver.observe(img.parentElement)
      }

      return () => {
        resizeObserver.disconnect()
      }
    }
  }, [image])

  return (
    <Card className="group relative h-64">
      <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {image.type === 'defective' && onEdit && (
          <button
            onClick={onEdit}
            className="rounded bg-white p-1.5 text-blue-500 shadow hover:text-blue-700"
          >
            <Edit size={18} />
          </button>
        )}
        <button
          onClick={onDelete}
          className="rounded bg-white p-1.5 text-red-500 shadow hover:text-red-700"
        >
          <Trash2 size={18} />
        </button>
      </div>
      <CardContent className="relative flex h-full flex-col items-center justify-center overflow-hidden p-0">
        <img ref={imgRef} src={image.url} alt="Sample" className="h-full w-full object-contain" />
        {image.type === 'defective' && image.defectBox && (
          <canvas ref={canvasRef} className="pointer-events-none absolute" />
        )}
      </CardContent>
    </Card>
  )
}

export default function SampleImages({
  modelId,
  onModelUpdate,
}: {
  modelId: number
  onModelUpdate?: () => void
}) {
  const [activeTab, setActiveTab] = useState<'defective' | 'normal'>('defective')
  const [images, setImages] = useState<ImageType[]>([])
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingImageId, setEditingImageId] = useState<string | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [loading, setLoading] = useState(false)

  // Zoom and Pan state
  const [viewportTransform, setViewportTransform] = useState({ x: 0, y: 0, scale: 1 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentRect, setCurrentRect] = useState({ x: 0, y: 0, width: 0, height: 0 })

  const defectiveCount = images.filter((img) => img.type === 'defective').length
  const normalCount = images.filter((img) => img.type === 'normal').length
  const filteredImages = images.filter((img) => img.type === activeTab)

  // Fetch images on mount
  useEffect(() => {
    fetchImages()
  }, [modelId])

  const fetchImages = async () => {
    try {
      const data = await imagesAPI.list(modelId)
      // Filter out inference and other non-training images
      const validImages = data.filter(
        (img: any) => img.image_type === 'normal' || img.image_type === 'defective'
      )

      // Map API response to ImageType
      const mappedImages: ImageType[] = await Promise.all(
        validImages.map(async (img: any) => {
          let defectBox = undefined
          if (img.image_type === 'defective') {
            // Fetch annotation for defective images
            try {
              const annotation: any = await annotationsAPI.getByImage(img.id)
              if (annotation && annotation.canvas_data) {
                const canvasData =
                  typeof annotation.canvas_data === 'string'
                    ? JSON.parse(annotation.canvas_data)
                    : annotation.canvas_data

                if (canvasData.polygons && canvasData.polygons.length > 0) {
                  const points = canvasData.polygons[0].points
                  // Convert polygon points back to rect (simplified assumption for now)
                  const xs = points.map((p: any) => p[0])
                  const ys = points.map((p: any) => p[1])
                  const minX = Math.min(...xs)
                  const minY = Math.min(...ys)
                  const maxX = Math.max(...xs)
                  const maxY = Math.max(...ys)
                  defectBox = {
                    x: minX,
                    y: minY,
                    width: maxX - minX,
                    height: maxY - minY,
                  }
                }
              }
            } catch (e) {
              // No annotation found or error
            }
          }

          return {
            id: img.id.toString(),
            url: imagesAPI.getImageUrl(img.id),
            type: img.image_type === 'normal' ? 'normal' : 'defective',
            defectBox,
            is_synthetic: img.is_synthetic,
          }
        })
      )
      setImages(mappedImages.filter((img) => !img.is_synthetic))
    } catch (err) {
      console.error('Failed to fetch images', err)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (activeTab === 'defective') {
      const pending = files.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      }))
      setPendingImages(pending)
      setCurrentImageIndex(0)
      setIsDialogOpen(true)
      setEditingImageId(null)
      setImageLoaded(false)
      resetViewport()
    } else {
      // Normal images - upload immediately
      try {
        setLoading(true)
        await imagesAPI.upload(modelId, files, 'normal')
        await fetchImages()
        if (onModelUpdate) onModelUpdate()
      } catch (err) {
        console.error('Failed to upload normal images', err)
        alert('Failed to upload images')
      } finally {
        setLoading(false)
      }
    }

    e.target.value = ''
  }

  const resetViewport = () => {
    setViewportTransform({ x: 0, y: 0, scale: 1 })
  }

  const renderCanvas = () => {
    if (!canvasRef.current || !imageRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Use setTransform instead of translate/scale for cleaner transformation
    ctx.setTransform(1, 0, 0, 1, 0, 0) // Reset to identity matrix
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Apply viewport transform: scale first, then translate
    ctx.setTransform(
      viewportTransform.scale,
      0,
      0,
      viewportTransform.scale,
      viewportTransform.x,
      viewportTransform.y
    )

    // Draw image at origin
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height)

    // Draw rectangle if exists
    if (currentRect.width !== 0 || currentRect.height !== 0) {
      ctx.strokeStyle = 'red'
      ctx.lineWidth = 3 / viewportTransform.scale
      ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height)
    }
  }

  const loadImageOnCanvas = () => {
    if (!canvasRef.current || !pendingImages[currentImageIndex]) return

    const canvas = canvasRef.current
    const img = new Image()

    img.onload = () => {
      imageRef.current = img

      // Set canvas to natural image dimensions
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight

      renderCanvas()
      setImageLoaded(true)
    }

    img.onerror = () => {
      console.error('Failed to load image')
    }

    img.src = pendingImages[currentImageIndex].url
  }

  const loadEditImageOnCanvas = (imageData: ImageType) => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const img = new Image()
    // Add crossOrigin to allow canvas manipulation of remote images
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      imageRef.current = img

      // Set canvas to natural image dimensions
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight

      if (imageData.defectBox) {
        setCurrentRect(imageData.defectBox)
      }

      renderCanvas()
      setImageLoaded(true)
    }

    img.onerror = () => {
      console.error('Failed to load image for editing')
    }

    img.src = imageData.url
  }

  useEffect(() => {
    if (!isDialogOpen) {
      setImageLoaded(false)
      return
    }

    const timer = setTimeout(() => {
      if (editingImageId) {
        const imageToEdit = images.find((img) => img.id === editingImageId)
        if (imageToEdit) {
          loadEditImageOnCanvas(imageToEdit)
        }
      } else if (pendingImages.length > 0 && pendingImages[currentImageIndex]) {
        loadImageOnCanvas()
        setCurrentRect({ x: 0, y: 0, width: 0, height: 0 })
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [isDialogOpen, currentImageIndex, editingImageId])

  useEffect(() => {
    if (imageLoaded) {
      renderCanvas()
    }
  }, [viewportTransform, currentRect, imageLoaded])

  const screenToCanvas = (screenX: number, screenY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()

    // Convert screen to canvas display space
    const displayX = screenX - rect.left
    const displayY = screenY - rect.top

    // Scale to canvas resolution (accounting for CSS vs canvas size)
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const canvasX = displayX * scaleX
    const canvasY = displayY * scaleY

    // Apply inverse viewport transform
    const x = (canvasX - viewportTransform.x) / viewportTransform.scale
    const y = (canvasY - viewportTransform.y) / viewportTransform.scale

    return { x, y }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageLoaded) return

    if (e.button === 2 || e.ctrlKey) {
      // Right click or Ctrl+Click for panning
      e.preventDefault()
      setIsPanning(true)
      setPanStart({ x: e.clientX - viewportTransform.x, y: e.clientY - viewportTransform.y })
    } else {
      // Left click for drawing
      const pos = screenToCanvas(e.clientX, e.clientY)
      setStartPos(pos)
      setIsDrawing(true)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setViewportTransform((prev) => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      }))
    } else if (isDrawing) {
      const pos = screenToCanvas(e.clientX, e.clientY)
      const width = pos.x - startPos.x
      const height = pos.y - startPos.y

      setCurrentRect({ x: startPos.x, y: startPos.y, width, height })
    }
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
    setIsPanning(false)
  }

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!imageLoaded) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()

    // Get mouse position in canvas display space
    const displayX = e.clientX - rect.left
    const displayY = e.clientY - rect.top

    // Convert to canvas resolution space
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const mouseX = displayX * scaleX
    const mouseY = displayY * scaleY

    const zoom = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.1, Math.min(10, viewportTransform.scale * zoom))

    // Calculate new offset to keep mouse position fixed
    const newX = mouseX - (mouseX - viewportTransform.x) * (newScale / viewportTransform.scale)
    const newY = mouseY - (mouseY - viewportTransform.y) * (newScale / viewportTransform.scale)

    setViewportTransform({
      x: newX,
      y: newY,
      scale: newScale,
    })
  }

  const handleZoomIn = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    const newScale = Math.min(10, viewportTransform.scale * 1.2)

    setViewportTransform((prev) => ({
      x: centerX - (centerX - prev.x) * (newScale / prev.scale),
      y: centerY - (centerY - prev.y) * (newScale / prev.scale),
      scale: newScale,
    }))
  }

  const handleZoomOut = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    const newScale = Math.max(0.1, viewportTransform.scale / 1.2)

    setViewportTransform((prev) => ({
      x: centerX - (centerX - prev.x) * (newScale / prev.scale),
      y: centerY - (centerY - prev.y) * (newScale / prev.scale),
      scale: newScale,
    }))
  }

  const handleResetZoom = () => {
    resetViewport()
  }

  const uploadAndAnnotate = async (
    file: File,
    rect: { x: number; y: number; width: number; height: number }
  ) => {
    // 1. Upload Image
    const uploaded = await imagesAPI.upload(modelId, [file], 'defective')
    const imageId = uploaded[0].id

    // 2. Create Annotation
    // Ensure rect has positive width/height
    const x = Math.min(rect.x, rect.x + rect.width)
    const y = Math.min(rect.y, rect.y + rect.height)
    const w = Math.abs(rect.width)
    const h = Math.abs(rect.height)

    const canvasData = {
      image_width: imageRef.current?.naturalWidth || 0,
      image_height: imageRef.current?.naturalHeight || 0,
      polygons: [
        {
          points: [
            [x, y],
            [x + w, y],
            [x + w, y + h],
            [x, y + h],
          ],
          label: 'defect',
        },
      ],
    }

    await annotationsAPI.createManual(imageId, 'defect', canvasData)
  }

  const handleSaveDefect = async () => {
    if (!canvasRef.current || !imageRef.current) return

    try {
      setLoading(true)

      if (editingImageId) {
        // Update existing annotation (not fully implemented in backend yet, so maybe just re-create?)
        // For now, let's assume we can just update local state or re-upload if needed.
        // But since we can't easily update the image file, we might just update the annotation.
        // TODO: Implement annotation update logic
        alert('Update not fully implemented yet')
      } else {
        const currentPending = pendingImages[currentImageIndex]
        await uploadAndAnnotate(currentPending.file, currentRect)

        if (currentImageIndex < pendingImages.length - 1) {
          setCurrentImageIndex((prev) => prev + 1)
          setCurrentRect({ x: 0, y: 0, width: 0, height: 0 })
          setImageLoaded(false)
          resetViewport()
        } else {
          setIsDialogOpen(false)
          setPendingImages([])
          setCurrentImageIndex(0)
          setImageLoaded(false)
          resetViewport()
          fetchImages()
          if (onModelUpdate) onModelUpdate()
        }
      }
    } catch (err) {
      console.error('Failed to save defect', err)
      alert('Failed to save defect')
    } finally {
      setLoading(false)
    }
  }

  const handleSkipImage = async () => {
    if (!imageRef.current) return

    try {
      setLoading(true)
      const currentPending = pendingImages[currentImageIndex]

      // Full image annotation
      const fullRect = {
        x: 0,
        y: 0,
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight,
      }

      await uploadAndAnnotate(currentPending.file, fullRect)

      if (currentImageIndex < pendingImages.length - 1) {
        setCurrentImageIndex((prev) => prev + 1)
        setCurrentRect({ x: 0, y: 0, width: 0, height: 0 })
        setImageLoaded(false)
        resetViewport()
      } else {
        setIsDialogOpen(false)
        setPendingImages([])
        setCurrentImageIndex(0)
        setImageLoaded(false)
        resetViewport()
        fetchImages()
        if (onModelUpdate) onModelUpdate()
      }
    } catch (err) {
      console.error('Failed to skip (save full) image', err)
      alert('Failed to save image')
    } finally {
      setLoading(false)
    }
  }

  const handleSkipAll = async () => {
    try {
      setLoading(true)
      // Process all remaining images as full-image defects
      // We need to load each image to get dimensions, or just upload and assume full size?
      // Better to load them. But for speed, maybe we can just upload and let backend handle?
      // No, we need dimensions for canvas_data.

      // For now, let's just process them one by one in background?
      // Or just iterate.

      const remaining = pendingImages.slice(currentImageIndex)

      for (const pending of remaining) {
        // Load image to get dimensions
        const img = new Image()
        img.src = pending.url
        await new Promise((resolve) => {
          img.onload = resolve
        })

        const fullRect = {
          x: 0,
          y: 0,
          width: img.naturalWidth,
          height: img.naturalHeight,
        }

        await uploadAndAnnotate(pending.file, fullRect)
      }

      setIsDialogOpen(false)
      setPendingImages([])
      setCurrentImageIndex(0)
      setCurrentRect({ x: 0, y: 0, width: 0, height: 0 })
      setImageLoaded(false)
      resetViewport()
      fetchImages()
      if (onModelUpdate) onModelUpdate()
    } catch (err) {
      console.error('Failed to skip all', err)
      alert('Failed to process all images')
    } finally {
      setLoading(false)
    }
  }

  const handleEditImage = (imageId: string) => {
    setEditingImageId(imageId)
    setIsDialogOpen(true)
    setPendingImages([])
    setCurrentImageIndex(0)
    setImageLoaded(false)
    resetViewport()
  }

  const handleDeleteImage = async (id: string) => {
    try {
      await imagesAPI.delete(parseInt(id))
      setImages((prev) => prev.filter((img) => img.id !== id))
      if (onModelUpdate) onModelUpdate()
    } catch (err) {
      console.error('Failed to delete image', err)
      alert('Failed to delete image')
    }
  }

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
            Defective ({defectiveCount})
          </button>
          <button
            onClick={() => setActiveTab('normal')}
            className={`rounded-r-md px-3 py-1 ${
              activeTab === 'normal' ? 'bg-green-50 text-green-600' : 'bg-white text-gray-600'
            }`}
          >
            Normal ({normalCount})
          </button>
        </div>

        <Button
          size={'lg'}
          className="-mt-3 w-36 bg-gray-800 text-white hover:bg-gray-700"
          onClick={handleUploadClick}
          disabled={loading}
        >
          <ImageUp className="mr-2" />
          {loading ? 'Uploading...' : 'Upload'}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 md:grid-cols-4 lg:grid-cols-5">
        {filteredImages.map((image) => (
          <ImageCard
            key={image.id}
            image={image}
            onEdit={image.type === 'defective' ? () => handleEditImage(image.id) : undefined}
            onDelete={() => handleDeleteImage(image.id)}
          />
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => !loading && setIsDialogOpen(open)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {editingImageId
                ? 'Edit Defect Area'
                : `Mark Defect Area (${currentImageIndex + 1} of ${pendingImages.length})`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            {/* Zoom Controls */}
            <div className="flex items-center justify-between rounded-lg border bg-gray-50 p-2">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleZoomIn}>
                  <ZoomIn size={16} />
                </Button>
                <Button variant="outline" size="sm" onClick={handleZoomOut}>
                  <ZoomOut size={16} />
                </Button>
                <Button variant="outline" size="sm" onClick={handleResetZoom}>
                  <Maximize2 size={16} />
                </Button>
              </div>
              <span className="text-sm text-gray-600">
                Zoom: {Math.round(viewportTransform.scale * 100)}%
              </span>
            </div>

            <div className="flex min-h-[300px] items-center justify-center overflow-auto rounded-lg border bg-gray-50 p-4">
              {!imageLoaded && <div className="text-gray-500">Loading image...</div>}
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                onContextMenu={(e) => e.preventDefault()}
                className="cursor-crosshair border border-gray-300 bg-white"
                style={{
                  display: imageLoaded ? 'block' : 'none',
                  maxWidth: '100%',
                  maxHeight: '300px',
                  objectFit: 'contain',
                }}
              />
            </div>
          </div>

          <p className="text-sm text-gray-600">
            <strong>Left-click and drag</strong> to draw a rectangle around the defect area.{' '}
            <strong>Right-click and drag</strong> (or Ctrl+drag) to pan. <strong>Scroll</strong> to
            zoom.
          </p>

          <DialogFooter className="gap-2">
            {!editingImageId && (
              <div className="flex w-full justify-between">
                <Button variant="destructive" onClick={handleSkipAll} disabled={loading}>
                  {loading ? 'Processing...' : 'Skip All'}
                </Button>
                <Button variant="outline" onClick={handleSkipImage} disabled={loading}>
                  {loading ? 'Processing...' : 'Skip'}
                </Button>
              </div>
            )}
            {editingImageId && (
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={loading}>
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSaveDefect}
              disabled={(currentRect.width === 0 && !editingImageId) || !imageLoaded || loading}
            >
              {loading ? 'Saving...' : editingImageId ? 'Update' : 'Save & Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
