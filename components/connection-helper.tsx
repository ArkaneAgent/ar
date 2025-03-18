"use client"

import { useState, useEffect } from "react"

export function ConnectionHelper() {
  const [isVisible, setIsVisible] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState("Unknown")
  const [peerStatus, setPeerStatus] = useState("Unknown")
  const [peerCount, setPeerCount] = useState(0)

  useEffect(() => {
    // Check connection status periodically
    const interval = setInterval(() => {
      // Check if we're online
      const isOnline = navigator.onLine
      setConnectionStatus(isOnline ? "Online" : "Offline")

      // Check peer status
      const peer = (window as any).peerInstance
      if (peer) {
        setPeerStatus(peer.destroyed ? "Destroyed" : peer.disconnected ? "Disconnected" : "Connected")
      } else {
        setPeerStatus("No peer instance")
      }

      // Count peers
      const peerConnections = (window as any).peerConnections || {}
      setPeerCount(Object.keys(peerConnections).length)

      // Auto-show if there are connection issues
      if (!isOnline || (peer && (peer.destroyed || peer.disconnected))) {
        setIsVisible(true)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  // Handle connection issues
  const handleFixConnection = () => {
    // Try to reconnect the peer
    const peer = (window as any).peerInstance
    if (peer && peer.disconnected) {
      try {
        peer.reconnect()
      } catch (error) {
        console.error("Error reconnecting:", error)
      }
    } else {
      // Reload the page as a last resort
      window.location.reload()
    }
  }

  // Try alternative connection method
  const handleTryAlternative = () => {
    // Get the current peer ID from the URL
    const urlParams = new URLSearchParams(window.location.search)
    const currentPeerId = urlParams.get("p") || urlParams.get("peer")

    // Generate a new random ID
    const randomId = Math.random().toString(36).substring(2, 10) + Date.now().toString(36)

    // Create a new URL with the new peer ID
    const baseUrl = window.location.origin + window.location.pathname
    const newUrl = currentPeerId
      ? `${baseUrl}?p=${currentPeerId}` // Keep the same peer ID if joining a room
      : `${baseUrl}?p=${randomId}` // New peer ID if creating a room

    // Navigate to the new URL
    window.location.href = newUrl
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-yellow-600 text-white px-3 py-1 rounded shadow-lg text-sm"
      >
        Connection
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/90 p-3 rounded shadow-lg text-white max-w-xs">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Connection Helper</h3>
        <button onClick={() => setIsVisible(false)} className="text-gray-400 hover:text-white text-sm">
          Hide
        </button>
      </div>

      <div className="mb-2">
        <div className="flex justify-between">
          <span>Internet:</span>
          <span className={connectionStatus === "Online" ? "text-green-400" : "text-red-400"}>{connectionStatus}</span>
        </div>
        <div className="flex justify-between">
          <span>Peer Status:</span>
          <span className={peerStatus === "Connected" ? "text-green-400" : "text-red-400"}>{peerStatus}</span>
        </div>
        <div className="flex justify-between">
          <span>Connected Peers:</span>
          <span>{peerCount}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={handleFixConnection} className="bg-blue-600 text-white px-2 py-1 text-xs rounded">
          Fix Connection
        </button>
        <button onClick={handleTryAlternative} className="bg-green-600 text-white px-2 py-1 text-xs rounded">
          Try Alternative
        </button>
        <button
          onClick={() => window.location.reload()}
          className="bg-red-600 text-white px-2 py-1 text-xs rounded col-span-2"
        >
          Reload Page
        </button>
      </div>
    </div>
  )
}

