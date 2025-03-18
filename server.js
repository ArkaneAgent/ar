const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const cors = require("cors")

const app = express()
app.use(cors())

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

// Store connected players
const players = {}

// Store canvas data
const canvasData = {}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id)

  // Player joins gallery
  socket.on("joinGallery", (playerData) => {
    console.log("Player joined:", socket.id, playerData.username)

    // Store player data
    players[socket.id] = {
      id: socket.id,
      username: playerData.username,
      position: playerData.position,
      rotation: 0,
      color: playerData.color,
    }

    // Send current players to the new player
    socket.emit("currentPlayers", players)

    // Send the new player to all other players
    socket.broadcast.emit("newPlayer", players[socket.id])

    // Send current canvas data to the new player
    Object.keys(canvasData).forEach((canvasId) => {
      socket.emit("canvasUpdated", {
        canvasId,
        imageData: canvasData[canvasId],
      })
    })
  })

  // Player movement
  socket.on("playerMove", (moveData) => {
    if (!players[socket.id]) return

    // Update player position
    players[socket.id].position = moveData.position
    players[socket.id].rotation = moveData.rotation

    // Broadcast to other players
    socket.broadcast.emit("playerMoved", {
      id: socket.id,
      position: moveData.position,
      rotation: moveData.rotation,
    })
  })

  // Canvas update
  socket.on("updateCanvas", (data) => {
    const { canvasId, imageData } = data

    // Store canvas data
    canvasData[canvasId] = imageData

    // Broadcast to other players
    socket.broadcast.emit("canvasUpdated", {
      canvasId,
      imageData,
    })
  })

  // Disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id)

    // Remove player
    delete players[socket.id]

    // Broadcast to other players
    io.emit("playerLeft", socket.id)
  })
})

// Start server
const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

