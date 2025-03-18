"use client"

import { useState, useEffect } from "react"

export function OfflineFallback() {
  const [isVisible, setIsVisible] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [peerConnected, setPeerConnected] = useState(false)

  useEffect(() => {
    // Check connection status
    const checkConnection = () => {
      // Check if we're online
      setIsOnline(navigator.onLine)

      // Check if peer is connected
      const peer = (window as any).peerInstance
      setPeerConnected(peer && !peer.disconnected && !peer.destroyed)

      // Show if we're offline or peer is not connected
      setIsVisible(!navigator.onLine || !(peer && !peer.disconnected && !peer.destroyed))
    }

    // Check immediately
    checkConnection()

    // Set up interval to check periodically
    const interval = setInterval(checkConnection, 5000)

    // Listen for online/offline events
    window.addEventListener("online", checkConnection)
    window.addEventListener("offline", checkConnection)

    return () => {
      clearInterval(interval)
      window.removeEventListener("online", checkConnection)
      window.removeEventListener("offline", checkConnection)
    }
  }, [])

  // Handle single player mode
  const handleSinglePlayer = () => {
    // Clear URL parameters
    const baseUrl = window.location.origin + window.location.pathname
    window.location.href = baseUrl
  }

  // Handle reload
  const handleReload = () => {
    window.location.reload()
  }

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000] bg-black/90 p-4 rounded-lg shadow-lg text-white max-w-md text-center">
      <h2 className="text-xl font-bold mb-2">Connection Issue Detected</h2>

      <div className="mb-4">
        <p className="mb-2">
          {!isOnline
            ? "You appear to be offline. Check your internet connection."
            : "Unable to establish multiplayer connection."}
        </p>
        <div className="flex justify-between text-sm bg-gray-800 p-2 rounded">
          <span>Internet Connection:</span>
          <span className={isOnline ? "text-green-400" : "text-red-400"}>{isOnline ? "Online" : "Offline"}</span>
        </div>
        <div className="flex justify-between text-sm bg-gray-800 p-2 rounded mt-1">
          <span>Peer Connection:</span>
          <span className={peerConnected ? "text-green-400" : "text-red-400"}>
            {peerConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={handleSinglePlayer} className="bg-green-600 text-white px-3 py-2 rounded font-bold">
          Single Player Mode
        </button>
        <button onClick={handleReload} className="bg-blue-600 text-white px-3 py-2 rounded font-bold">
          Try Again
        </button>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Note: In single player mode, you can still draw on canvases, but won't see other players.
      </p>
    </div>
  )
}

