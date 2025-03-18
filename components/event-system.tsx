"use client"

import { useEffect } from "react"

export function EventSystem() {
  useEffect(() => {
    // Create a global event listener for player position updates
    const handlePlayerPositionUpdate = (event: Event) => {
      const customEvent = event as CustomEvent
      const { position, rotation } = customEvent.detail

      // Dispatch to the peer connection manager
      window.dispatchEvent(
        new CustomEvent("playerPositionUpdate", {
          detail: { position, rotation },
        }),
      )
    }

    // Create a global event listener for canvas updates
    const handleCanvasUpdated = (event: Event) => {
      const customEvent = event as CustomEvent
      const { canvasId, imageData } = customEvent.detail

      // Dispatch to the peer connection manager
      window.dispatchEvent(
        new CustomEvent("canvasUpdated", {
          detail: { canvasId, imageData },
        }),
      )
    }

    // Add event listeners
    window.addEventListener("playerPositionUpdate", handlePlayerPositionUpdate)
    window.addEventListener("canvasUpdated", handleCanvasUpdated)

    // Cleanup
    return () => {
      window.removeEventListener("playerPositionUpdate", handlePlayerPositionUpdate)
      window.removeEventListener("canvasUpdated", handleCanvasUpdated)
    }
  }, [])

  return null
}

