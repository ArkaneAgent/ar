"use client"

import { useEffect } from "react"

export function ForceUrlDisplay() {
  useEffect(() => {
    // Create a standalone URL display that doesn't depend on React state
    function createUrlDisplay() {
      // Remove any existing display first
      const existingDisplay = document.getElementById("force-url-display")
      if (existingDisplay) {
        document.body.removeChild(existingDisplay)
      }

      // Create a new display
      const display = document.createElement("div")
      display.id = "force-url-display"
      display.style.position = "fixed"
      display.style.top = "0"
      display.style.left = "0"
      display.style.width = "100%"
      display.style.backgroundColor = "rgba(0, 0, 0, 0.9)"
      display.style.color = "white"
      display.style.padding = "15px"
      display.style.zIndex = "99999"
      display.style.fontFamily = "Arial, sans-serif"
      display.style.fontSize = "16px"
      display.style.textAlign = "center"
      display.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.5)"
      display.style.borderBottom = "3px solid #4CAF50"

      // Get the current URL
      const currentUrl = window.location.href

      // Check if URL has peer parameter
      const urlParams = new URLSearchParams(window.location.search)
      const hasPeerParam = urlParams.has("p") || urlParams.has("peer")

      // Create content
      let content = ""

      if (hasPeerParam) {
        content = `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1; text-align: left;">
              <strong style="font-size: 18px;">MULTIPLAYER URL:</strong> 
              <span id="current-url" style="background: #333; padding: 5px; border-radius: 3px;">${currentUrl}</span>
            </div>
            <div>
              <button id="copy-url-button" style="background: #4CAF50; border: none; color: white; padding: 8px 15px; cursor: pointer; border-radius: 4px; margin-left: 10px;">Copy URL</button>
              <button id="hide-display-button" style="background: #f44336; border: none; color: white; padding: 8px 15px; cursor: pointer; border-radius: 4px; margin-left: 10px;">Hide</button>
            </div>
          </div>
        `
      } else {
        content = `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1; text-align: left;">
              <strong style="color: #f44336; font-size: 18px;">NO PEER ID DETECTED!</strong> 
              <span>Reload the page to generate a peer ID.</span>
            </div>
            <div>
              <button id="reload-button" style="background: #4CAF50; border: none; color: white; padding: 8px 15px; cursor: pointer; border-radius: 4px; margin-left: 10px;">Reload Page</button>
              <button id="hide-display-button" style="background: #f44336; border: none; color: white; padding: 8px 15px; cursor: pointer; border-radius: 4px; margin-left: 10px;">Hide</button>
            </div>
          </div>
        `
      }

      display.innerHTML = content
      document.body.appendChild(display)

      // Add event listeners
      document.getElementById("copy-url-button")?.addEventListener("click", () => {
        navigator.clipboard.writeText(currentUrl)
        alert("URL copied to clipboard!")
      })

      document.getElementById("reload-button")?.addEventListener("click", () => {
        window.location.reload()
      })

      document.getElementById("hide-display-button")?.addEventListener("click", () => {
        display.style.display = "none"

        // Create a small button to show the display again
        const showButton = document.createElement("button")
        showButton.id = "show-url-button"
        showButton.textContent = "Show URL"
        showButton.style.position = "fixed"
        showButton.style.top = "10px"
        showButton.style.left = "10px"
        showButton.style.zIndex = "99999"
        showButton.style.background = "#4CAF50"
        showButton.style.color = "white"
        showButton.style.border = "none"
        showButton.style.padding = "8px 15px"
        showButton.style.borderRadius = "4px"
        showButton.style.cursor = "pointer"
        showButton.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.5)"

        showButton.addEventListener("click", () => {
          display.style.display = "block"
          document.body.removeChild(showButton)
        })

        document.body.appendChild(showButton)
      })
    }

    // Create the display immediately
    createUrlDisplay()

    // Also set up an interval to check and update the URL display
    const intervalId = setInterval(() => {
      const urlDisplay = document.getElementById("current-url")
      if (urlDisplay) {
        urlDisplay.textContent = window.location.href
      } else {
        // If the display is gone, recreate it
        createUrlDisplay()
      }
    }, 2000)

    // Add a keyboard shortcut (Alt+U) to show the URL display
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "KeyU") {
        const display = document.getElementById("force-url-display")
        if (display) {
          display.style.display = "block"

          // Remove the show button if it exists
          const showButton = document.getElementById("show-url-button")
          if (showButton) {
            document.body.removeChild(showButton)
          }
        } else {
          createUrlDisplay()
        }
      }
    }

    window.addEventListener("keydown", handleKeyPress)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener("keydown", handleKeyPress)
    }
  }, [])

  return null
}

