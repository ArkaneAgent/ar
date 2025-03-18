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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

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
      e.preventDefault() // Prevent default behavior
      setDrawing(true)
      const rect = canvas.getBoundingClientRect()
      lastPosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }

      // Draw a single dot at the starting position
      if (ctx) {
        ctx.beginPath()
        ctx.arc(lastPosRef.current.x, lastPosRef.current.y, brushSize / 2, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault() // Prevent default behavior
      if (!drawing || !lastPosRef.current) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      ctx.lineWidth = brushSize
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.strokeStyle = color

      ctx.beginPath()
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
      ctx.lineTo(x, y)
      ctx.stroke()

      lastPosRef.current = { x, y }
    }

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault() // Prevent default behavior
      setDrawing(false)
      lastPosRef.current = null
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        saveAndClose()
      }
    }

    // Add touch support
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault() // Prevent default behavior
      if (e.touches.length > 0) {
        setDrawing(true)
        const rect = canvas.getBoundingClientRect()
        lastPosRef.current = {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        }

        // Draw a single dot at the starting position
        if (ctx) {
          ctx.beginPath()
          ctx.arc(lastPosRef.current.x, lastPosRef.current.y, brushSize / 2, 0, Math.PI * 2)
          ctx.fillStyle = color
          ctx.fill()
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault() // Prevent default behavior
      if (!drawing || !lastPosRef.current || e.touches.length === 0) return

      const rect = canvas.getBoundingClientRect()
      const x = e.touches[0].clientX - rect.left
      const y = e.touches[0].clientY - rect.top

      ctx.lineWidth = brushSize
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.strokeStyle = color

      ctx.beginPath()
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
      ctx.lineTo(x, y)
      ctx.stroke()

      lastPosRef.current = { x, y }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault() // Prevent default behavior
      setDrawing(false)
      lastPosRef.current = null
    }

    canvas.addEventListener("mousedown", handleMouseDown, { passive: false })
    canvas.addEventListener("mousemove", handleMouseMove, { passive: false })
    canvas.addEventListener("mouseup", handleMouseUp, { passive: false })
    canvas.addEventListener("mouseout", handleMouseUp, { passive: false })

    // Add touch events
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false })
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false })
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false })

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseup", handleMouseUp)
      canvas.removeEventListener("mouseout", handleMouseUp)

      canvas.removeEventListener("touchstart", handleTouchStart)
      canvas.removeEventListener("touchmove", handleTouchMove)
      canvas.removeEventListener("touchend", handleTouchEnd)

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
    if (canvasRef.current && window.exitDrawingMode) {
      setSaveAttempted(true)
      try {
        // Create a copy of the canvas data to ensure it persists
        const tempCanvas = document.createElement("canvas")
        tempCanvas.width = canvasRef.current.width
        tempCanvas.height = canvasRef.current.height
        const tempCtx = tempCanvas.getContext("2d")

        if (tempCtx) {
          tempCtx.drawImage(canvasRef.current, 0, 0)

          // Now pass this temp canvas to exitDrawingMode
          window.exitDrawingMode(tempCanvas)
          console.log("Drawing saved and exited successfully")
        } else {
          throw new Error("Could not get context from temp canvas")
        }
      } catch (error) {
        console.error("Error saving drawing:", error)
        // Force exit drawing mode after 500ms if exitDrawingMode fails
        setTimeout(() => {
          window.location.reload()
        }, 500)
      }
    } else {
      console.error("Cannot save drawing - missing canvas or exitDrawingMode function")
      // Force reload as a last resort
      window.location.reload()
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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80">
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
    </div>
  )
}

