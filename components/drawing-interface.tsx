"use client"

import { useEffect, useRef, useState } from "react"

declare global {
  interface Window {
    exitDrawingMode: (canvas: HTMLCanvasElement) => void
  }
}

export function DrawingInterface() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [color, setColor] = useState("#000000")
  const [brushSize, setBrushSize] = useState(10)
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)
  const [saveAttempted, setSaveAttempted] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  // Add debug info
  const addDebug = (message: string) => {
    setDebugInfo((prev) => [...prev.slice(-9), message])
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      addDebug("Canvas ref not found")
      return
    }

    const ctx = canvas.getContext("2d")
    if (!ctx) {
      addDebug("Canvas context not found")
      return
    }

    addDebug("Canvas initialized")

    // Fill with white background
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Add grid pattern
    ctx.strokeStyle = "#f0f0f0"
    ctx.lineWidth = 1

    // Grid lines
    for (let x = 0; x <= canvas.width; x += 50) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }

    for (let y = 0; y <= canvas.height; y += 50) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // Add some text
    ctx.fillStyle = "#888888"
    ctx.font = "20px Arial"
    ctx.textAlign = "center"
    ctx.fillText("Draw here", canvas.width / 2, canvas.height / 2)

    // Setup event listeners
    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      addDebug(`Mouse down at ${e.clientX}, ${e.clientY}`)
      setDrawing(true)

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      lastPosRef.current = { x, y }

      // Draw a dot at the starting position
      ctx.beginPath()
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
    }

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (!drawing || !lastPosRef.current) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      ctx.beginPath()
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
      ctx.lineTo(x, y)
      ctx.strokeStyle = color
      ctx.lineWidth = brushSize
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.stroke()

      lastPosRef.current = { x, y }
    }

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      addDebug("Mouse up - drawing stopped")
      setDrawing(false)
      lastPosRef.current = null
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        addDebug("ESC pressed - saving and closing")
        saveAndClose()
      }
    }

    // Add the event listeners
    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseup", handleMouseUp)
    canvas.addEventListener("mouseleave", handleMouseUp)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseup", handleMouseUp)
      canvas.removeEventListener("mouseleave", handleMouseUp)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [drawing, color, brushSize])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Add grid pattern
    ctx.strokeStyle = "#f0f0f0"
    ctx.lineWidth = 1

    for (let x = 0; x <= canvas.width; x += 50) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }

    for (let y = 0; y <= canvas.height; y += 50) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }
  }

  const saveAndClose = () => {
    if (!canvasRef.current) {
      addDebug("No canvas to save")
      return
    }

    setSaveAttempted(true)
    addDebug("Attempting to save canvas")

    try {
      // Create a copy of the canvas data
      const tempCanvas = document.createElement("canvas")
      tempCanvas.width = canvasRef.current.width
      tempCanvas.height = canvasRef.current.height

      const tempCtx = tempCanvas.getContext("2d")
      if (!tempCtx) {
        addDebug("Failed to get temp context")
        throw new Error("Could not get context from temp canvas")
      }

      // Copy the canvas content
      tempCtx.drawImage(canvasRef.current, 0, 0)

      // Save the canvas data to local storage directly
      const canvasId = "manual-save-" + Date.now()
      const imageData = tempCanvas.toDataURL("image/png")

      localStorage.setItem(
        canvasId,
        JSON.stringify({
          imageData,
          timestamp: Date.now(),
        }),
      )

      addDebug("Canvas saved to localStorage")

      // Call the exit function if it exists
      if (window.exitDrawingMode) {
        window.exitDrawingMode(tempCanvas)
        addDebug("exitDrawingMode called successfully")
      } else {
        addDebug("exitDrawingMode not found")
        // Force reload as a last resort
        window.location.reload()
      }
    } catch (error) {
      addDebug(`Error saving: ${error}`)
      console.error("Error saving drawing:", error)

      // Force exit drawing mode after 500ms if exitDrawingMode fails
      setTimeout(() => {
        window.location.reload()
      }, 500)
    }
  }

  // Predefined colors for easy selection
  const colorOptions = [
    "#000000", // Black
    "#FFFFFF", // White
    "#FF0000", // Red
    "#00FF00", // Green
    "#0000FF", // Blue
    "#FFFF00", // Yellow
    "#FF00FF", // Magenta
    "#00FFFF", // Cyan
    "#FFA500", // Orange
    "#800080", // Purple
    "#A52A2A", // Brown
    "#808080", // Gray
  ]

  // Emergency exit button that forces a page reload
  const forceExit = () => {
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={1024}
          height={768}
          className="border-4 border-gray-800 bg-white shadow-2xl"
          style={{
            cursor: "crosshair",
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            MozUserSelect: "none",
            msUserSelect: "none",
          }}
        />
        <div className="absolute -top-10 left-0 right-0 text-center">
          <h2 className="text-2xl font-bold text-white bg-black/50 py-2 rounded-t-lg">Drawing Mode</h2>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-5 rounded bg-white/95 p-4 shadow-lg">
        <div className="flex flex-col items-center">
          <label htmlFor="colorPicker" className="mb-2 text-sm font-medium uppercase text-gray-700">
            Color
          </label>
          <input
            type="color"
            id="colorPicker"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-10 cursor-pointer"
          />
        </div>

        <div className="flex flex-col items-center">
          <label className="mb-2 text-sm font-medium uppercase text-gray-700">Quick Colors</label>
          <div className="flex flex-wrap gap-1">
            {colorOptions.map((c, i) => (
              <button
                key={i}
                onClick={() => setColor(c)}
                className="h-6 w-6 rounded-full border border-gray-300"
                style={{ backgroundColor: c, outline: color === c ? "2px solid black" : "none" }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <label htmlFor="brushSize" className="mb-2 text-sm font-medium uppercase text-gray-700">
            Brush Size: {brushSize}px
          </label>
          <input
            type="range"
            id="brushSize"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(Number.parseInt(e.target.value))}
            className="w-32"
          />
        </div>

        <button onClick={clearCanvas} className="rounded bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700">
          Clear Canvas
        </button>

        <button
          onClick={saveAndClose}
          className={`rounded bg-green-600 px-6 py-3 text-lg font-bold text-white hover:bg-green-700 ${saveAttempted ? "" : "animate-pulse"}`}
          disabled={saveAttempted}
        >
          {saveAttempted ? "SAVING..." : "SAVE & CLOSE"}
        </button>
      </div>

      <div className="mt-3 text-center text-white">
        <p className="text-lg font-bold">Press ESC or click SAVE & CLOSE to save and exit</p>
        {saveAttempted && (
          <button onClick={forceExit} className="mt-4 bg-red-600 px-4 py-2 rounded text-white font-bold animate-pulse">
            EMERGENCY EXIT (Reload Page)
          </button>
        )}
      </div>

      {/* Debug info */}
      <div className="fixed bottom-4 right-4 bg-black/80 p-2 text-white text-xs max-w-xs z-[10000]">
        <h3 className="font-bold">Debug:</h3>
        <ul>
          {debugInfo.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

