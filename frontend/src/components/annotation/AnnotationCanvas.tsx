'use client'

import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Line, Image as KonvaImage, Circle } from 'react-konva'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Pencil, Eraser, Save, Trash2, Undo } from 'lucide-react'

interface Point {
  x: number
  y: number
}

interface Polygon {
  points: Point[]
  label: string
  isComplete: boolean
}

interface AnnotationCanvasProps {
  imageUrl: string
  onSave: (canvasData: any, defectLabels: string) => void
  existingAnnotation?: any
}

export default function AnnotationCanvas({
  imageUrl,
  onSave,
  existingAnnotation,
}: AnnotationCanvasProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [polygons, setPolygons] = useState<Polygon[]>([])
  const [currentPolygon, setCurrentPolygon] = useState<Point[]>([])
  const [defectLabel, setDefectLabel] = useState('')
  const [tool, setTool] = useState<'draw' | 'erase'>('draw')
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })

  // Load image
  useEffect(() => {
    const img = new window.Image()
    img.src = imageUrl
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setImage(img)
      // Adjust canvas to image aspect ratio
      const maxWidth = 800
      const maxHeight = 600
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height)
      setCanvasSize({
        width: img.width * ratio,
        height: img.height * ratio,
      })
    }
  }, [imageUrl])

  // Load existing annotation
  useEffect(() => {
    if (existingAnnotation && existingAnnotation.canvas_data) {
      try {
        const data = JSON.parse(existingAnnotation.canvas_data)
        if (data.polygons) {
          setPolygons(
            data.polygons.map((p: any) => ({
              points: p.points,
              label: p.label,
              isComplete: true,
            }))
          )
        }
        if (existingAnnotation.defect_labels) {
          setDefectLabel(existingAnnotation.defect_labels)
        }
      } catch (error) {
        console.error('Failed to load existing annotation:', error)
      }
    }
  }, [existingAnnotation])

  const handleStageClick = (e: any) => {
    if (tool === 'erase') return

    const stage = e.target.getStage()
    const pointerPosition = stage.getPointerPosition()

    if (!pointerPosition) return

    const newPoint: Point = {
      x: pointerPosition.x,
      y: pointerPosition.y,
    }

    setCurrentPolygon([...currentPolygon, newPoint])
  }

  const completePolygon = () => {
    if (currentPolygon.length < 3) {
      alert('A polygon must have at least 3 points')
      return
    }

    if (!defectLabel.trim()) {
      alert('Please enter a defect label')
      return
    }

    setPolygons([
      ...polygons,
      {
        points: currentPolygon,
        label: defectLabel,
        isComplete: true,
      },
    ])
    setCurrentPolygon([])
  }

  const handleUndo = () => {
    if (currentPolygon.length > 0) {
      setCurrentPolygon(currentPolygon.slice(0, -1))
    }
  }

  const handleClear = () => {
    setPolygons([])
    setCurrentPolygon([])
  }

  const handleSave = () => {
    if (polygons.length === 0) {
      alert('Please draw at least one annotation')
      return
    }

    if (!defectLabel.trim()) {
      alert('Please enter defect labels')
      return
    }

    const canvasData = {
      image_width: canvasSize.width,
      image_height: canvasSize.height,
      polygons: polygons.map((p) => ({
        points: p.points,
        label: p.label,
      })),
    }

    onSave(canvasData, defectLabel)
  }

  // Convert polygon points to flat array for Konva Line
  const getLinePoints = (points: Point[]) => {
    return points.flatMap((p) => [p.x, p.y])
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Annotation Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={tool === 'draw' ? 'default' : 'outline'}
              onClick={() => setTool('draw')}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Draw Polygon
            </Button>
            <Button
              variant={tool === 'erase' ? 'default' : 'outline'}
              onClick={() => setTool('erase')}
            >
              <Eraser className="mr-2 h-4 w-4" />
              Erase
            </Button>
            <Button variant="outline" onClick={handleUndo} disabled={currentPolygon.length === 0}>
              <Undo className="mr-2 h-4 w-4" />
              Undo Point
            </Button>
            <Button variant="outline" onClick={handleClear}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All
            </Button>
          </div>

          <div>
            <Label htmlFor="defect-label">Defect Label(s)</Label>
            <Input
              id="defect-label"
              placeholder="e.g., burnt, spot, breakage"
              value={defectLabel}
              onChange={(e) => setDefectLabel(e.target.value)}
            />
            <p className="mt-1 text-sm text-gray-500">
              Separate multiple labels with commas
            </p>
          </div>

          {currentPolygon.length > 0 && (
            <div className="flex gap-2">
              <Button onClick={completePolygon}>Complete Polygon</Button>
              <p className="flex items-center text-sm text-gray-600">
                {currentPolygon.length} points placed
              </p>
            </div>
          )}

          <Button onClick={handleSave} disabled={polygons.length === 0} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            Save Annotation
          </Button>

          {polygons.length > 0 && (
            <p className="text-sm text-green-600">{polygons.length} polygon(s) drawn</p>
          )}
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-lg border">
        <Stage
          width={canvasSize.width}
          height={canvasSize.height}
          onClick={handleStageClick}
          style={{ cursor: tool === 'draw' ? 'crosshair' : 'pointer' }}
        >
          <Layer>
            {/* Background image */}
            {image && <KonvaImage image={image} width={canvasSize.width} height={canvasSize.height} />}

            {/* Completed polygons */}
            {polygons.map((polygon, i) => (
              <Line
                key={i}
                points={getLinePoints(polygon.points)}
                stroke="red"
                strokeWidth={2}
                closed
                fill="rgba(255, 0, 0, 0.2)"
              />
            ))}

            {/* Current polygon being drawn */}
            {currentPolygon.length > 0 && (
              <>
                <Line
                  points={getLinePoints(currentPolygon)}
                  stroke="blue"
                  strokeWidth={2}
                  fill="rgba(0, 0, 255, 0.1)"
                />
                {/* Show points */}
                {currentPolygon.map((point, i) => (
                  <Circle
                    key={i}
                    x={point.x}
                    y={point.y}
                    radius={5}
                    fill="blue"
                    stroke="white"
                    strokeWidth={2}
                  />
                ))}
              </>
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  )
}
