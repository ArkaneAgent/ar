"use client"

import { useState, useEffect } from "react"

export function MultiplayerDebug() {
  const [isOpen, setIsOpen] = useState(false)
  const [myPeerId, setMyPeerId] = useState<string>("")
  const [connections, setConnections] = useState<string[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [debugLog, setDebugLog] = useState<string[]>([])

  useEffect(() => {
    // Update debug info every second
    const interval = setInterval(() => {
      // Get peer info
      const peer = (window as any).peerInstance
      if (peer) {
        setMyPeerId(peer.id || "Unknown")
      }

      // Get connections
      const peerConnections = (window as any).peerConnections || {}
      setConnections(Object.keys(peerConnections))

      // Get players from the window
      const windowPlayers = (window as any).players || {}
      setPlayers(Object.values(windowPlayers))

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
        <h3 className="font-bold mb-1">My Peer ID:</h3>
        <div className="bg-gray-800 p-2 rounded text-sm">{myPeerId}</div>
      </div>

      <div className="mb-4">
        <h3 className="font-bold mb-1">Connected Peers ({connections.length}):</h3>
        {connections.length > 0 ? (
          <ul className="bg-gray-800 p-2 rounded text-sm">
            {connections.map((conn) => (
              <li key={conn}>{conn}</li>
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
                {player.username} ({player.id.substring(0, 8)}...)
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

      <div className="mt-4 flex gap-2">
        <button onClick={() => window.location.reload()} className="bg-red-600 text-white px-3 py-1 rounded text-sm">
          Reload Page
        </button>
        <button
          onClick={() => {
            const url = window.location.origin + window.location.pathname
            window.location.href = url
          }}
          className="bg-yellow-600 text-white px-3 py-1 rounded text-sm"
        >
          Clear URL & Restart
        </button>
      </div>
    </div>
  )
}

