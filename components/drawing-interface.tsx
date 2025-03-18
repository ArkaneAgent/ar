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
      setDrawing(true)
      const rect = canvas.getBoundingClientRect()
      lastPosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
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

    const handleMouseUp = () => {
      setDrawing(false)
      lastPosRef.current = null
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        saveAndClose()
      }
    }

    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseup", handleMouseUp)
    canvas.addEventListener("mouseout", handleMouseUp)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseup", handleMouseUp)
      canvas.removeEventListener("mouseout", handleMouseUp)
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
      window.exitDrawingMode(canvasRef.current)
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

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70">
      <canvas ref={canvasRef} width={1024} height={768} className="border-2 border-gray-800 bg-white shadow-2xl" />
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
          className="rounded bg-green-600 px-6 py-3 text-lg font-bold text-white hover:bg-green-700 animate-pulse"
        >
          SAVE & CLOSE
        </button>
      </div>

      <div className="mt-3 text-center text-white">
        <p className="text-lg font-bold">Press ESC or click SAVE & CLOSE to save and exit</p>
      </div>
    </div>
  )
}
