"use client"

import { useRef, useEffect } from "react"
import * as THREE from "three"
import { useDrawingCanvas } from "@/hooks/use-drawing-canvas"

interface DrawingCanvasProps {
  position: [number, number, number]
  rotation: [number, number, number]
  size: [number, number]
  id: string
}

export function DrawingCanvas({ position, rotation, size, id }: DrawingCanvasProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { registerCanvas } = useDrawingCanvas()

  // Create a canvas texture
  useEffect(() => {
    if (!meshRef.current) return

    // Create HTML canvas for drawing
    const canvas = document.createElement("canvas")
    canvas.width = 1024 // Higher resolution for better drawing quality
    canvas.height = 1024
    canvas.id = id

    const context = canvas.getContext("2d")
    if (context) {
      // Fill with white background
      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, canvas.width, canvas.height)

      // Add a frame
      context.strokeStyle = "#000000"
      context.lineWidth = 20
      context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20)

      // Add some text
      context.fillStyle = "#888888"
      context.font = "40px Arial"
      context.textAlign = "center"
      context.fillText("Click to draw", canvas.width / 2, canvas.height / 2)
    }

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true

    // Apply texture to mesh
    if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
      meshRef.current.material.map = texture
      meshRef.current.material.needsUpdate = true
    }

    // Register this canvas with our drawing system
    registerCanvas({
      id,
      mesh: meshRef.current,
      canvas,
      context,
      texture,
    })
  }, [id, registerCanvas])

  return (
    <group position={position} rotation={rotation}>
      {/* Canvas frame */}
      <mesh position={[0, 0, -0.02]} castShadow receiveShadow>
        <boxGeometry args={[size[0] + 0.2, size[1] + 0.2, 0.05]} />
        <meshStandardMaterial color="#5a5a5a" />
      </mesh>

      {/* Canvas */}
      <mesh ref={meshRef} position={[0, 0, 0]} castShadow receiveShadow>
        <planeGeometry args={size} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  )
}

