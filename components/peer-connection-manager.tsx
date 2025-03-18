"use client"

import { useEffect, useState, useRef } from "react"
import Peer from "peerjs"

interface PeerConnectionManagerProps {
  username: string
  onPeerConnected: (peerId: string) => void
  onPlayerJoined: (playerId: string, username: string, color: string, position: any) => void
  onPlayerMoved: (playerId: string, position: any, rotation: number) => void
  onPlayerLeft: (playerId: string) => void
  onCanvasUpdated: (canvasId: string, imageData: string) => void
}

export function PeerConnectionManager({
  username,
  onPeerConnected,
  onPlayerJoined,
  onPlayerMoved,
  onPlayerLeft,
  onCanvasUpdated,
}: PeerConnectionManagerProps) {
  const [myPeerId, setMyPeerId] = useState<string>("")
  const [connections, setConnections] = useState<Record<string, Peer.DataConnection>>({})
  const [isHost, setIsHost] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState("Initializing...")
  const [connectedPeers, setConnectedPeers] = useState<string[]>([])

  // Use refs to maintain access to latest state in event handlers
  const connectionsRef = useRef<Record<string, Peer.DataConnection>>({})
  const myPeerIdRef = useRef<string>("")
  const myColorRef = useRef<string>("")
  const myPositionRef = useRef<any>({ x: 0, y: 1.6, z: 5 })

  useEffect(() => {
    // Function to generate a random color
    const getRandomColor = () => {
      const letters = "0123456789ABCDEF"
      let color = "#"
      for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)]
      }
      return color
    }

    // My player color
    const myColor = getRandomColor()
    myColorRef.current = myColor

    // Function to log with timestamp
    const log = (message: string) => {
      const timestamp = new Date().toISOString().substr(11, 8)
      console.log(`[${timestamp}] ${message}`)
      setConnectionStatus(message)
    }

    log("Initializing peer connection...")

    // Check if we're joining an existing room
    const urlParams = new URLSearchParams(window.location.search)
    const hostPeerId = urlParams.get("p") || urlParams.get("peer")

    // Initialize PeerJS
    const peer = new Peer({
      debug: 3,
      config: {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:global.stun.twilio.com:3478" }],
      },
    })

    // Store peer in window for debugging and access from other components
    ;(window as any).peerInstance = peer
    ;(window as any).peerConnections = {}

    // Handle peer open event
    peer.on("open", (id) => {
      log(`Connected with peer ID: ${id}`)
      setMyPeerId(id)
      myPeerIdRef.current = id
      onPeerConnected(id)

      // Create our own player model
      const myPosition = { x: 0, y: 1.6, z: 5 }
      myPositionRef.current = myPosition

      // Add ourselves to the player list
      onPlayerJoined(id, username, myColor, myPosition)

      // Update URL if we're the host
      if (!hostPeerId) {
        setIsHost(true)
        const baseUrl = window.location.origin + window.location.pathname
        const newUrl = `${baseUrl}?p=${id}`

        try {
          window.history.replaceState({}, "", newUrl)
          log(`Created new room with URL: ${newUrl}`)
        } catch (e) {
          console.error("Failed to update URL:", e)
        }
      } else {
        // We're joining an existing room
        log(`Joining room hosted by: ${hostPeerId}`)
        connectToPeer(hostPeerId)
      }
    })

    // Handle incoming connections
    peer.on("connection", (conn) => {
      log(`Incoming connection from: ${conn.peer}`)
      setupConnection(conn)
    })

    // Handle errors
    peer.on("error", (err) => {
      console.error("Peer error:", err)
      log(`Error: ${err.type}`)

      if (err.type === "peer-unavailable") {
        log("Host not found. The room may no longer exist.")
      }
    })

    // Function to connect to a peer
    const connectToPeer = (peerId: string) => {
      if (peerId === myPeerIdRef.current) return

      log(`Connecting to peer: ${peerId}`)
      const conn = peer.connect(peerId, { reliable: true })
      setupConnection(conn)
    }

    // Function to set up a connection
    const setupConnection = (conn: Peer.DataConnection) => {
      // Store the connection
      connectionsRef.current[conn.peer] = conn
      ;(window as any).peerConnections[conn.peer] = conn

      setConnections((prev) => ({
        ...prev,
        [conn.peer]: conn,
      }))

      // Handle connection open
      conn.on("open", () => {
        log(`Connection established with: ${conn.peer}`)
        setConnectedPeers((prev) => [...prev, conn.peer])

        // Send my info to the peer
        conn.send({
          type: "playerInfo",
          data: {
            id: myPeerIdRef.current,
            username,
            color: myColor,
            position: myPositionRef.current,
          },
        })

        // Request info about all other players
        conn.send({
          type: "requestAllPlayers",
          data: {},
        })
      })

      // Handle incoming data
      conn.on("data", (data: any) => {
        switch (data.type) {
          case "playerInfo":
            log(`Received player info: ${data.data.username} (${data.data.id})`)
            onPlayerJoined(data.data.id, data.data.username, data.data.color, data.data.position)
            break

          case "playerMove":
            onPlayerMoved(conn.peer, data.data.position, data.data.rotation)
            break

          case "canvasData":
          case "updateCanvas":
            log(`Received canvas update for: ${data.data.canvasId}`)
            onCanvasUpdated(data.data.canvasId, data.data.imageData)
            break

          case "requestAllPlayers":
            // The new peer is requesting info about all connected players
            log("Received request for all players")

            // Send info about myself
            conn.send({
              type: "playerInfo",
              data: {
                id: myPeerIdRef.current,
                username,
                color: myColor,
                position: myPositionRef.current,
              },
            })

            // Forward the request to all other peers to ensure complete network knowledge
            Object.values(connectionsRef.current).forEach((otherConn) => {
              if (otherConn.peer !== conn.peer) {
                otherConn.send({
                  type: "forwardPlayerInfo",
                  data: {
                    targetPeer: conn.peer,
                  },
                })
              }
            })
            break

          case "forwardPlayerInfo":
            // Someone is requesting that I send my player info to a specific peer
            const targetPeer = data.data.targetPeer
            if (connectionsRef.current[targetPeer]) {
              connectionsRef.current[targetPeer].send({
                type: "playerInfo",
                data: {
                  id: myPeerIdRef.current,
                  username,
                  color: myColor,
                  position: myPositionRef.current,
                },
              })
              log(`Forwarded my player info to: ${targetPeer}`)
            }
            break
        }
      })

      // Handle connection close
      conn.on("close", () => {
        log(`Connection closed with: ${conn.peer}`)

        // Remove the connection
        delete connectionsRef.current[conn.peer]
        delete (window as any).peerConnections[conn.peer]

        setConnections((prev) => {
          const newConnections = { ...prev }
          delete newConnections[conn.peer]
          return newConnections
        })

        setConnectedPeers((prev) => prev.filter((id) => id !== conn.peer))

        // Notify that player left
        onPlayerLeft(conn.peer)
      })

      // Handle connection error
      conn.on("error", (err) => {
        console.error(`Connection error with ${conn.peer}:`, err)
        log(`Connection error with ${conn.peer}: ${err}`)
      })
    }

    // Set up event listener for player position updates
    const handlePlayerPositionUpdate = (event: CustomEvent) => {
      const { position, rotation } = event.detail

      // Update our stored position
      myPositionRef.current = position

      // Send position update to all connected peers
      Object.values(connectionsRef.current).forEach((conn) => {
        conn.send({
          type: "playerMove",
          data: {
            position,
            rotation,
          },
        })
      })
    }

    // Set up event listener for canvas updates
    const handleCanvasUpdated = (event: CustomEvent) => {
      const { canvasId, imageData } = event.detail

      // Send canvas update to all connected peers
      Object.values(connectionsRef.current).forEach((conn) => {
        conn.send({
          type: "updateCanvas",
          data: {
            canvasId,
            imageData,
          },
        })
      })
    }

    // Add event listeners
    window.addEventListener("playerPositionUpdate", handlePlayerPositionUpdate as EventListener)
    window.addEventListener("canvasUpdated", handleCanvasUpdated as EventListener)

    // Cleanup function
    return () => {
      log("Cleaning up peer connection...")

      // Remove event listeners
      window.removeEventListener("playerPositionUpdate", handlePlayerPositionUpdate as EventListener)
      window.removeEventListener("canvasUpdated", handleCanvasUpdated as EventListener)

      // Close all connections
      Object.values(connectionsRef.current).forEach((conn) => {
        conn.close()
      })

      // Close and destroy the peer
      peer.destroy()
    }
  }, [username, onPeerConnected, onPlayerJoined, onPlayerMoved, onPlayerLeft, onCanvasUpdated])

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-black/80 p-2 rounded text-white text-sm">
      <div className="font-bold">Connection Status:</div>
      <div>{connectionStatus}</div>
      <div className="mt-1">My Peer ID: {myPeerId}</div>
      <div>Connected Peers: {connectedPeers.length}</div>
      {connectedPeers.length > 0 && (
        <div className="mt-1 text-xs">
          <div>Connected to:</div>
          <ul className="list-disc pl-4">
            {connectedPeers.map((peerId) => (
              <li key={peerId}>{peerId.substring(0, 8)}...</li>
            ))}
          </ul>
        </div>
      )}
      {isHost && <div className="mt-1 text-green-400">You are the host</div>}
    </div>
  )
}

