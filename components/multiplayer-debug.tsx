"use client"

import { useState, useEffect } from "react"

export function MultiplayerDebug() {
  const [isOpen, setIsOpen] = useState(false)
  const [myPeerId, setMyPeerId] = useState<string>("")
  const [connections, setConnections] = useState<string[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [debugLog, setDebugLog] = useState<string[]>([])
  const [urlParams, setUrlParams] = useState<string>("")
  const [connectionStatus, setConnectionStatus] = useState<string>("")

  useEffect(() => {
    // Update debug info every second
    const interval = setInterval(() => {
      // Get peer info
      const peer = (window as any).peerInstance
      if (peer) {
        setMyPeerId(peer.id || "Unknown")
        setConnectionStatus(peer.disconnected ? "Disconnected" : peer.destroyed ? "Destroyed" : "Connected")
      } else {
        setConnectionStatus("No peer instance")
      }

      // Get connections
      const peerConnections = (window as any).peerConnections || {}
      setConnections(Object.keys(peerConnections))

      // Get players from the window
      const windowPlayers = (window as any).players || {}
      setPlayers(Object.values(windowPlayers))

      // Get URL params
      setUrlParams(window.location.search)

      // Add to log if something changed
      const newLog = `Peers: ${Object.keys(peerConnections).length}, Players: ${Object.values(windowPlayers).length}`
      setDebugLog((prev) => {
        if (prev[prev.length - 1] !== newLog) {
          return [...prev.slice(-9), newLog]
        }
        return prev
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleFixUrl = () => {
    // Extract the peer ID from the URL
    const urlParams = new URLSearchParams(window.location.search)
    const peerId = urlParams.get("p") || urlParams.get("peer")

    if (peerId) {
      // Create a clean URL with just the peer parameter
      const baseUrl = window.location.origin + window.location.pathname
      const newUrl = `${baseUrl}?p=${peerId}`

      // Update the URL and reload
      window.location.href = newUrl
    } else {
      // No peer ID, just reload to generate a new one
      window.location.reload()
    }
  }

  const handleClearAndRestart = () => {
    // Clear the URL and reload
    const baseUrl = window.location.origin + window.location.pathname
    window.location.href = baseUrl
  }

  const handleForceReconnect = () => {
    // Get the peer instance
    const peer = (window as any).peerInstance
    if (peer) {
      // Try to reconnect
      try {
        if (peer.disconnected) {
          peer.reconnect()
        } else {
          // Destroy and recreate
          peer.destroy()
          setTimeout(() => {
            window.location.reload()
          }, 500)
        }
      } catch (error) {
        console.error("Error reconnecting:", error)
        // Force reload as fallback
        window.location.reload()
      }
    } else {
      // No peer instance, just reload
      window.location.reload()
    }
  }

  const handleRemoveAllPlayers = () => {
    // Call the removeAllPlayers function if it exists
    if ((window as any).removeAllPlayers) {
      ;(window as any).removeAllPlayers()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-3 py-1 rounded shadow-lg"
      >
        Debug
      </button>
    )
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-black/90 p-4 rounded shadow-lg text-white max-w-md max-h-[80vh] overflow-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Multiplayer Debug</h2>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
          Close
        </button>
      </div>

      <div className="mb-4">
        <h3 className="font-bold mb-1">URL Parameters:</h3>
        <div className="bg-gray-800 p-2 rounded text-sm break-all">{urlParams || "None"}</div>
      </div>

      <div className="mb-4">
        <h3 className="font-bold mb-1">Connection Status:</h3>
        <div
          className={`bg-gray-800 p-2 rounded text-sm ${connectionStatus === "Connected" ? "text-green-400" : "text-red-400"}`}
        >
          {connectionStatus}
        </div>
      </div>

      <div className="mb-4">
        <h3 className="font-bold mb-1">My Peer ID:</h3>
        <div className="bg-gray-800 p-2 rounded text-sm break-all">{myPeerId || "Not connected"}</div>
      </div>

      <div className="mb-4">
        <h3 className="font-bold mb-1">Connected Peers ({connections.length}):</h3>
        {connections.length > 0 ? (
          <ul className="bg-gray-800 p-2 rounded text-sm">
            {connections.map((conn) => (
              <li key={conn} className="break-all">
                {conn}
              </li>
            ))}
          </ul>
        ) : (
          <div className="bg-gray-800 p-2 rounded text-sm text-red-400">No connections</div>
        )}
      </div>

      <div className="mb-4">
        <h3 className="font-bold mb-1">Players ({players.length}):</h3>
        {players.length > 0 ? (
          <ul className="bg-gray-800 p-2 rounded text-sm">
            {players.map((player, index) => (
              <li key={index} className="mb-1">
                {player.username} ({player.id?.substring(0, 8)}...)
                <div className="text-xs text-gray-400">
                  Position:{" "}
                  {JSON.stringify({
                    x: player.position?.x?.toFixed(2) || "N/A",
                    y: player.position?.y?.toFixed(2) || "N/A",
                    z: player.position?.z?.toFixed(2) || "N/A",
                  })}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="bg-gray-800 p-2 rounded text-sm text-red-400">No players</div>
        )}
      </div>

      <div>
        <h3 className="font-bold mb-1">Log:</h3>
        <div className="bg-gray-800 p-2 rounded text-xs h-32 overflow-y-auto">
          {debugLog.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={handleFixUrl} className="bg-green-600 text-white px-3 py-1 rounded text-sm">
          Fix URL & Reload
        </button>
        <button onClick={handleClearAndRestart} className="bg-yellow-600 text-white px-3 py-1 rounded text-sm">
          Clear URL & Restart
        </button>
        <button onClick={handleForceReconnect} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
          Force Reconnect
        </button>
        <button onClick={handleRemoveAllPlayers} className="bg-red-600 text-white px-3 py-1 rounded text-sm">
          Remove All Players
        </button>
        <button
          onClick={() => window.location.reload()}
          className="bg-purple-600 text-white px-3 py-1 rounded text-sm col-span-2"
        >
          Reload Page
        </button>
      </div>
    </div>
  )
}

