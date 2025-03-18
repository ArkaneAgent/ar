"use client"

import { useEffect } from "react"
import Peer from "peerjs"

export function StandalonePeer() {
  useEffect(() => {
    // Function to initialize PeerJS
    const initializePeer = () => {
      console.log("Initializing standalone PeerJS connection")

      try {
        // Create a new Peer with a random ID
        const peer = new Peer({
          debug: 3,
          config: {
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:global.stun.twilio.com:3478" }],
          },
        })

        // On connection established
        peer.on("open", (id) => {
          console.log("Standalone PeerJS connected with ID:", id)

          // Update the URL with the peer ID if it's not already there
          const urlParams = new URLSearchParams(window.location.search)
          const existingPeer = urlParams.get("p") || urlParams.get("peer")

          if (!existingPeer) {
            // We're creating a new gallery
            const baseUrl = window.location.origin + window.location.pathname
            const newUrl = `${baseUrl}?p=${id}`

            // Update the URL in the browser
            try {
              window.history.replaceState({}, "", newUrl)
              console.log("Updated URL to:", newUrl)

              // Force refresh the URL display
              const urlDisplay = document.getElementById("current-url")
              if (urlDisplay) {
                urlDisplay.textContent = window.location.href
              }

              // Create a notification
              const notification = document.createElement("div")
              notification.style.position = "fixed"
              notification.style.bottom = "20px"
              notification.style.right = "20px"
              notification.style.backgroundColor = "#4CAF50"
              notification.style.color = "white"
              notification.style.padding = "15px"
              notification.style.borderRadius = "5px"
              notification.style.zIndex = "99999"
              notification.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.5)"
              notification.innerHTML = `
                <strong>Peer ID generated!</strong><br>
                Your multiplayer URL is ready to share.
              `
              document.body.appendChild(notification)

              // Remove the notification after 5 seconds
              setTimeout(() => {
                if (document.body.contains(notification)) {
                  document.body.removeChild(notification)
                }
              }, 5000)
            } catch (e) {
              console.error("Failed to update URL:", e)
            }
          }
        })

        // Handle errors
        peer.on("error", (err) => {
          console.error("Standalone PeerJS error:", err)

          // Try to reinitialize after error
          if (err.type === "peer-unavailable") {
            console.log("Peer unavailable, continuing...")
          } else {
            console.log("Attempting to reconnect...")
            setTimeout(() => {
              if (peer) {
                peer.destroy()
                initializePeer()
              }
            }, 3000)
          }
        })(
          // Store the peer in window for debugging
          window as any,
        ).standalonePeer = peer
      } catch (error) {
        console.error("Error setting up standalone PeerJS:", error)

        // Try again after a delay
        setTimeout(initializePeer, 5000)
      }
    }

    // Initialize PeerJS
    initializePeer()

    // No cleanup needed - we want the peer connection to persist
  }, [])

  return null
}

