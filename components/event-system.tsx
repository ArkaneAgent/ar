"use client"

import { useEffect } from "react"

export function EventSystem() {
  useEffect(() => {
    // Create a global event listener for player position updates
    const handlePlayerPositionUpdate = (event: Event) => {
      const customEvent = event as CustomEvent
      const { position, rotation } = customEvent.detail

      // Find all peer connections
      const peerConnections = Object.values((window as any).peerConnections || {})

      // Send position update to all connections
      peerConnections.forEach((conn: any) => {
        if (conn && conn.send) {
          conn.send({
            type: "playerMove",
            data: {
              position,
              rotation,
            },
          })
        }
      })
    }

    // Create a global event listener for canvas updates
    const handleCanvasUpdated = (event: Event) => {
      const customEvent = event as CustomEvent
      const { canvasId, imageData } = customEvent.detail

      // Find all peer connections
      const peerConnections = Object.values((window as any).peerConnections || {})

      // Send canvas update to all connections
      peerConnections.forEach((conn: any) => {
        if (conn && conn.send) {
          conn.send({
            type: "updateCanvas",
            data: {
              canvasId,
              imageData,
            },
          })
        }
      })
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

