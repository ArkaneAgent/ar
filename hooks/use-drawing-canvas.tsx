"use client"

import type React from "react"

import { useState, useCallback, createContext, useContext, useEffect, useRef } from "react"
import * as THREE from "three"

interface CanvasData {
  id: string
  mesh: THREE.Mesh
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D | null
  texture: THREE.CanvasTexture
}

interface DrawingCanvasContextType {
  canvases: Record<string, CanvasData>
  registerCanvas: (data: CanvasData) => void
  checkCanvasInteraction: (camera: THREE.Camera) => void
}

const DrawingCanvasContext = createContext<DrawingCanvasContextType>({
  canvases: {},
  registerCanvas: () => {},
  checkCanvasInteraction: () => {},
})

export function DrawingCanvasProvider({ children }: { children: React.ReactNode }) {
  const [canvases, setCanvases] = useState<Record<string, CanvasData>>({})
  const [activeCanvas, setActiveCanvas] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)
  const raycasterRef = useRef(new THREE.Raycaster())
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const registerCanvas = useCallback((data: CanvasData) => {
    setCanvases((prev) => ({
      ...prev,
      [data.id]: data,
    }))
  }, [])

  const checkCanvasInteraction = useCallback(
    (camera: THREE.Camera) => {
      if (activeCanvas) return // Already in drawing mode

      // Cast a ray from the camera center (crosshair)
      raycasterRef.current.setFromCamera(new THREE.Vector2(0, 0), camera)

      // Check for intersections with canvases
      const meshes = Object.values(canvases).map((c) => c.mesh)
      const intersects = raycasterRef.current.intersectObjects(meshes)

      if (intersects.length > 0) {
        // We're looking at a canvas
        const mesh = intersects[0].object as THREE.Mesh
        const canvasId = Object.keys(canvases).find((id) => canvases[id].mesh === mesh)

        // Show interaction hint
        document.body.style.cursor = "pointer"

        // Clear any existing timeout
        if (interactionTimeoutRef.current) {
          clearTimeout(interactionTimeoutRef.current)
        }

        // Set a timeout to prevent accidental clicks
        interactionTimeoutRef.current = setTimeout(() => {
          // Check for click
          const handleClick = () => {
            if (canvasId) {
              setActiveCanvas(canvasId)
            }
            document.removeEventListener("click", handleClick)
          }

          document.addEventListener("click", handleClick, { once: true })
        }, 100)
      } else {
        document.body.style.cursor = "default"

        // Clear any existing timeout
        if (interactionTimeoutRef.current) {
          clearTimeout(interactionTimeoutRef.current)
          interactionTimeoutRef.current = null
        }
      }
    },
    [activeCanvas, canvases],
  )

  // Handle drawing on the active canvas
  useEffect(() => {
    if (!activeCanvas) return

    const canvasData = canvases[activeCanvas]
    if (!canvasData || !canvasData.context) return

    // Create a drawing overlay
    const overlay = document.createElement("div")
    overlay.style.position = "absolute"
    overlay.style.top = "0"
    overlay.style.left = "0"
    overlay.style.width = "100%"
    overlay.style.height = "100%"
    overlay.style.zIndex = "1000"
    overlay.style.cursor = "crosshair"
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.3)"

    // Create a drawing canvas that covers the screen
    const drawingCanvas = document.createElement("canvas")
    drawingCanvas.width = window.innerWidth
    drawingCanvas.height = window.innerHeight
    drawingCanvas.style.width = "100%"
    drawingCanvas.style.height = "100%"
    overlay.appendChild(drawingCanvas)

    // Add instructions
    const instructions = document.createElement("div")
    instructions.style.position = "absolute"
    instructions.style.top = "20px"
    instructions.style.left = "50%"
    instructions.style.transform = "translateX(-50%)"
    instructions.style.padding = "10px 20px"
    instructions.style.backgroundColor = "rgba(0, 0, 0, 0.7)"
    instructions.style.color = "white"
    instructions.style.borderRadius = "5px"
    instructions.style.fontFamily = "Arial, sans-serif"
    instructions.textContent = "Click and drag to draw. Press ESC to exit."
    overlay.appendChild(instructions)

    // Add color picker
    const colorPicker = document.createElement("div")
    colorPicker.style.position = "absolute"
    colorPicker.style.bottom = "20px"
    colorPicker.style.left = "50%"
    colorPicker.style.transform = "translateX(-50%)"
    colorPicker.style.display = "flex"
    colorPicker.style.gap = "10px"
    colorPicker.style.padding = "10px"
    colorPicker.style.backgroundColor = "rgba(0, 0, 0, 0.7)"
    colorPicker.style.borderRadius = "5px"

    const colors = ["#000000", "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"]
    let currentColor = "#000000"

    colors.forEach((color) => {
      const colorButton = document.createElement("button")
      colorButton.style.width = "30px"
      colorButton.style.height = "30px"
      colorButton.style.backgroundColor = color
      colorButton.style.border = color === currentColor ? "2px solid white" : "none"
      colorButton.style.borderRadius = "50%"
      colorButton.style.cursor = "pointer"

      colorButton.addEventListener("click", () => {
        currentColor = color
        // Update all button borders
        Array.from(colorPicker.children).forEach((btn: HTMLElement) => {
          btn.style.border = btn.style.backgroundColor === color ? "2px solid white" : "none"
        })
      })

      colorPicker.appendChild(colorButton)
    })

    overlay.appendChild(colorPicker)

    document.body.appendChild(overlay)

    const ctx = drawingCanvas.getContext("2d")

    const handleMouseDown = (e: MouseEvent) => {
      setIsDrawing(true)
      lastPosRef.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawing || !lastPosRef.current || !ctx || !canvasData.context) return

      // Draw on the screen canvas
      ctx.beginPath()
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
      ctx.lineTo(e.clientX, e.clientY)
      ctx.strokeStyle = currentColor
      ctx.lineWidth = 5
      ctx.lineCap = "round"
      ctx.stroke()

      // Map to the 3D canvas coordinates
      const rect = drawingCanvas.getBoundingClientRect()
      const x1 = ((lastPosRef.current.x - rect.left) / rect.width) * canvasData.canvas.width
      const y1 = ((lastPosRef.current.y - rect.top) / rect.height) * canvasData.canvas.height
      const x2 = ((e.clientX - rect.left) / rect.width) * canvasData.canvas.width
      const y2 = ((e.clientY - rect.top) / rect.height) * canvasData.canvas.height

      // Draw on the actual canvas
      canvasData.context.beginPath()
      canvasData.context.moveTo(x1, y1)
      canvasData.context.lineTo(x2, y2)
      canvasData.context.strokeStyle = currentColor
      canvasData.context.lineWidth = 5
      canvasData.context.lineCap = "round"
      canvasData.context.stroke()

      // Update the texture
      canvasData.texture.needsUpdate = true

      lastPosRef.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseUp = () => {
      setIsDrawing(false)
      lastPosRef.current = null
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        setActiveCanvas(null)
      }
    }

    drawingCanvas.addEventListener("mousedown", handleMouseDown)
    drawingCanvas.addEventListener("mousemove", handleMouseMove)
    drawingCanvas.addEventListener("mouseup", handleMouseUp)
    drawingCanvas.addEventListener("mouseleave", handleMouseUp)
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      drawingCanvas.removeEventListener("mousedown", handleMouseDown)
      drawingCanvas.removeEventListener("mousemove", handleMouseMove)
      drawingCanvas.removeEventListener("mouseup", handleMouseUp)
      drawingCanvas.removeEventListener("mouseleave", handleMouseUp)
      window.removeEventListener("keydown", handleKeyDown)
      document.body.removeChild(overlay)
    }
  }, [activeCanvas, canvases, isDrawing])

  return (
    <DrawingCanvasContext.Provider value={{ canvases, registerCanvas, checkCanvasInteraction }}>
      {children}
    </DrawingCanvasContext.Provider>
  )
}

export function useDrawingCanvas() {
  return useContext(DrawingCanvasContext)
}

