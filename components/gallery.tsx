"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls"
import { PillStatue } from "@/components/pill-statue"
import { Instructions } from "@/components/instructions"
import { InteractionPrompt } from "@/components/interaction-prompt"
import { DrawingInterface } from "@/components/drawing-interface"
import { PlayerModel } from "@/components/player-model"
import { TextSprite } from "@/components/text-sprite"
import Peer from "peerjs"

interface Player {
  id: string
  username: string
  position: THREE.Vector3
  rotation: number
  color: string
  model?: PlayerModel
  nameSprite?: TextSprite
}

interface GalleryProps {
  username: string
}

// Add global type for window.exitDrawingMode
declare global {
  interface Window {
    exitDrawingMode: (canvas: HTMLCanvasElement) => void
  }
}

export default function Gallery({ username }: GalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const peerRef = useRef<Peer | null>(null)
  const connectionsRef = useRef<Record<string, Peer.DataConnection>>({})
  const [started, setStarted] = useState(false)
  const [drawingMode, setDrawingMode] = useState(false)
  const [nearbyCanvas, setNearbyCanvas] = useState<THREE.Mesh | null>(null)
  const [currentCanvas, setCurrentCanvas] = useState<THREE.Mesh | null>(null)
  const [interactionPrompt, setInteractionPrompt] = useState("")
  const [players, setPlayers] = useState<Record<string, Player>>({})
  const [myId, setMyId] = useState<string>("")
  const playerPositionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.6, 5))
  const playerRotationRef = useRef<number>(0)
  const myPlayerRef = useRef<{ model: PlayerModel | null; nameSprite: TextSprite | null }>({
    model: null,
    nameSprite: null,
  })
  const [debugMode, setDebugMode] = useState(false)
  const [canvasInteractionEnabled, setCanvasInteractionEnabled] = useState(true)

  // Function to handle entering drawing mode - defined at component level
  const enterDrawingMode = (canvasObj: THREE.Mesh) => {
    console.log("Entering drawing mode from component level")
    setDrawingMode(true)
    setCurrentCanvas(canvasObj)
  }

  // Scene setup
  useEffect(() => {
    if (!containerRef.current) return

    console.log("Setting up gallery with username:", username)

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)

    // Camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const startPosition = new THREE.Vector3(0, 1.6, 5)
    camera.position.copy(startPosition)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    containerRef.current.appendChild(renderer.domElement)

    // Controls
    const controls = new PointerLockControls(camera, document.body)

    // Movement variables
    const velocity = new THREE.Vector3()
    const direction = new THREE.Vector3()
    let moveForward = false
    let moveBackward = false
    let moveLeft = false
    let moveRight = false
    let canJump = true

    // Raycaster for interactions
    const raycaster = new THREE.Raycaster()

    // Array to store canvases
    const canvases: THREE.Mesh[] = []

    // Array to store walls for collision detection
    const walls: THREE.Box3[] = []

    // Player's actual position (for collision detection)
    const playerPosition = playerPositionRef.current.copy(startPosition)

    // Setup event listeners
    const onKeyDown = (event: KeyboardEvent) => {
      if (drawingMode) return

      switch (event.code) {
        case "KeyW":
          moveForward = true
          break
        case "KeyA":
          moveLeft = true
          break
        case "KeyS":
          moveBackward = true
          break
        case "KeyD":
          moveRight = true
          break
        case "Space":
          if (canJump) {
            velocity.y = 4.0
            canJump = false
          }
          break
        case "KeyE":
          if (canvasInteractionEnabled && nearbyCanvas && !drawingMode && controls.isLocked) {
            console.log("E key pressed in main event listener, entering drawing mode")

            // Unlock controls first
            controls.unlock()

            // Small delay to ensure controls are unlocked
            setTimeout(() => {
              setDrawingMode(true)
              setCurrentCanvas(nearbyCanvas)
              console.log("Drawing mode activated from E key press")
            }, 100)
          }
          break
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (drawingMode) return

      switch (event.code) {
        case "KeyW":
          moveForward = false
          break
        case "KeyA":
          moveLeft = false
          break
        case "KeyS":
          moveBackward = false
          break
        case "KeyD":
          moveRight = false
          break
      }
    }

    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("keyup", onKeyUp)
    window.addEventListener("resize", onWindowResize)

    // Lock/unlock controls
    document.addEventListener("click", () => {
      if (!drawingMode && !started) {
        controls.lock()
        setStarted(true)
      }
    })

    controls.addEventListener("lock", () => {
      setStarted(true)
    })

    controls.addEventListener("unlock", () => {
      if (!drawingMode) {
        setStarted(false)
      }
    })

    // Improved lighting
    // Ambient light - increased intensity for better overall lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2) // Further increased intensity
    scene.add(ambientLight)

    // Hemisphere light for more natural lighting
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xf0f0f0, 0.5) // Increased intensity
    scene.add(hemisphereLight)

    // Create room
    createRoom()

    // Create pill statue
    const pillStatue = new PillStatue()
    scene.add(pillStatue)

    // Place canvases
    placeCanvases()

    // Setup peer connection for multiplayer
    function setupPeerConnection() {
      // Generate a random color for this player
      const playerColor = getRandomColor()

      // Create a new Peer with a random ID
      const peer = new Peer({
        debug: 1, // Reduce debug level for better performance
        config: {
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:global.stun.twilio.com:3478" }],
        },
      })

      peerRef.current = peer

      // On connection established
      peer.on("open", (id) => {
        console.log("My peer ID is:", id)
        setMyId(id)

        // IMPORTANT: Clean up any existing player models before creating new ones
        if (myPlayerRef.current.model) {
          scene.remove(myPlayerRef.current.model)
        }
        if (myPlayerRef.current.nameSprite) {
          scene.remove(myPlayerRef.current.nameSprite)
        }

        // Join the gallery by connecting to a signaling server or known peers
        joinGallery(id, playerColor)

        // Create a player model for ourselves (so others can see us)
        // Set y position explicitly to 1.6 to ensure consistent height
        const playerPos = new THREE.Vector3(playerPosition.x, 1.6, playerPosition.z)
        const playerModel = new PlayerModel(playerColor, playerPos)

        const nameSprite = new TextSprite(
          username,
          new THREE.Vector3(
            playerPos.x,
            playerPos.y + 2.2, // Position above player
            playerPos.z,
          ),
        )

        // Store references to our own model and sprite
        myPlayerRef.current = {
          model: playerModel,
          nameSprite: nameSprite,
        }

        scene.add(playerModel)
        scene.add(nameSprite)

        // Add ourselves to the players list - REPLACE existing entry if it exists
        setPlayers((prev) => {
          // Create a new object without our previous entry (if it exists)
          const newPlayers = { ...prev }

          // If we already had an entry, remove it
          if (newPlayers[id]) {
            delete newPlayers[id]
          }

          // Add our new entry
          return {
            ...newPlayers,
            [id]: {
              id,
              username,
              position: playerPos,
              rotation: playerRotationRef.current,
              color: playerColor,
              model: playerModel,
              nameSprite,
            },
          }
        })
      })

      // Handle incoming connections
      peer.on("connection", (conn) => {
        console.log("Incoming connection from:", conn.peer)

        // Store the connection
        connectionsRef.current[conn.peer] = conn

        // Handle data from this peer
        setupConnectionHandlers(conn)

        // Send our info to the new peer
        conn.on("open", () => {
          console.log("Connection opened with peer:", conn.peer)

          // Send our player info
          conn.send({
            type: "playerInfo",
            data: {
              id: peer.id,
              username,
              position: {
                x: playerPosition.x,
                y: 1.6, // Ensure consistent height
                z: playerPosition.z,
              },
              rotation: playerRotationRef.current,
              color: playerColor,
            },
          })

          // Send canvas data
          canvases.forEach((canvas) => {
            const canvasId = canvas.userData.id
            const savedData = localStorage.getItem(`canvas-${canvasId}`)

            if (savedData) {
              conn.send({
                type: "canvasData",
                data: {
                  canvasId,
                  imageData: savedData,
                },
              })
            }
          })
        })
      })

      // Handle errors
      peer.on("error", (err) => {
        console.error("Peer error:", err)
      })

      return peer
    }

    // Animation loop
    let prevTime = performance.now()
    let lastUpdateTime = 0

    function animate() {
      requestAnimationFrame(animate)

      // Update pill statue rotation - reduce frequency for better performance
      if (Math.random() < 0.1) {
        // Only update 10% of the time
        pillStatue.rotation.y += 0.005
      }

      // Skip movement if controls are not locked
      if (!controls.isLocked) {
        renderer.render(scene, camera)
        return
      }

      const time = performance.now()
      const delta = (time - prevTime) / 1000

      // Movement with collision detection
      velocity.x -= velocity.x * 10.0 * delta
      velocity.z -= velocity.z * 10.0 * delta

      // Gravity
      velocity.y -= 9.8 * delta

      // Get movement direction
      direction.z = Number(moveForward) - Number(moveBackward)
      direction.x = Number(moveRight) - Number(moveLeft)
      direction.normalize()

      // Apply movement
      if (moveForward || moveBackward) velocity.z -= direction.z * 25.0 * delta
      if (moveLeft || moveRight) velocity.x -= direction.x * 25.0 * delta

      // Store old position for collision detection
      const oldPosition = playerPosition.clone()

      // Calculate new position
      const cameraDirection = new THREE.Vector3(0, 0, -1)
      cameraDirection.applyQuaternion(camera.quaternion)
      cameraDirection.y = 0
      cameraDirection.normalize()

      const sidewaysDirection = new THREE.Vector3(-cameraDirection.z, 0, cameraDirection.x)

      // Apply movement in camera direction
      if (moveForward || moveBackward) {
        const movementVector = cameraDirection.clone().multiplyScalar(-velocity.z * delta)
        playerPosition.add(movementVector)
      }

      if (moveLeft || moveRight) {
        const movementVector = sidewaysDirection.clone().multiplyScalar(-velocity.x * delta)
        playerPosition.add(movementVector)
      }

      // Apply gravity
      playerPosition.y += velocity.y * delta

      // Check floor collision
      if (playerPosition.y < startPosition.y) {
        velocity.y = 0
        playerPosition.y = startPosition.y
        canJump = true
      }

      // Check wall collisions - optimize by only checking if we've moved
      if (oldPosition.distanceTo(playerPosition) > 0.01) {
        const playerBoundingSphere = new THREE.Sphere(playerPosition, 0.5)
        let collision = false

        for (let i = 0; i < walls.length; i++) {
          if (walls[i].intersectsSphere(playerBoundingSphere)) {
            collision = true
            break
          }
        }

        if (collision) {
          playerPosition.copy(oldPosition)
        }
      }

      // Update camera position
      controls.getObject().position.copy(playerPosition)

      // Store current rotation
      playerRotationRef.current = camera.rotation.y

      // Update our own player model if it exists - only if we've moved
      if (myId && myPlayerRef.current.model && oldPosition.distanceTo(playerPosition) > 0.01) {
        myPlayerRef.current.model.position.copy(playerPosition)
        myPlayerRef.current.model.rotation.y = camera.rotation.y

        if (myPlayerRef.current.nameSprite) {
          myPlayerRef.current.nameSprite.position.set(
            playerPosition.x,
            playerPosition.y + 2.9, // Increased height for name tag
            playerPosition.z,
          )
        }
      }

      // Check for canvas interaction - only do this occasionally for performance
      if (Math.random() < 0.2) {
        // Only check 20% of the time
        checkCanvasInteraction()
      }

      // Send position update to peers (limit to 5 updates per second for better performance)
      if (time - lastUpdateTime > 200 && peerRef.current) {
        lastUpdateTime = time

        // Send position update to all connected peers
        Object.values(connectionsRef.current).forEach((conn) => {
          conn.send({
            type: "playerMove",
            data: {
              position: {
                x: playerPosition.x,
                y: playerPosition.y,
                z: playerPosition.z,
              },
              rotation: camera.rotation.y,
            },
          })
        })
      }

      prevTime = time
      renderer.render(scene, camera)
    }

    function createRoom() {
      // Room dimensions
      const roomSize = 30
      const wallHeight = 14
      const halfSize = roomSize / 2

      // Floor
      const floorGeometry = new THREE.PlaneGeometry(roomSize, roomSize)
      const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x2196f3,
        roughness: 0.2,
        metalness: 0.1,
      })

      const floor = new THREE.Mesh(floorGeometry, floorMaterial)
      floor.rotation.x = -Math.PI / 2
      floor.position.y = 0
      floor.receiveShadow = true
      scene.add(floor)

      // Walls
      createWall(0, wallHeight / 2, -halfSize, roomSize, wallHeight, 0.3, halfSize) // North
      createWall(0, wallHeight / 2, halfSize, roomSize, wallHeight, 0.3, halfSize) // South
      createWall(halfSize, wallHeight / 2, 0, 0.3, wallHeight, roomSize, halfSize) // East
      createWall(-halfSize, wallHeight / 2, 0, 0.3, wallHeight, roomSize, halfSize) // West

      // Ceiling
      const ceilingGeometry = new THREE.PlaneGeometry(roomSize, roomSize)
      const ceilingMaterial = new THREE.MeshStandardMaterial({
        color: 0xfafafa,
        roughness: 0.1,
      })

      const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial)
      ceiling.rotation.x = Math.PI / 2
      ceiling.position.y = wallHeight
      ceiling.receiveShadow = true
      scene.add(ceiling)

      // Track lighting
      const trackWidth = 0.4
      const trackDepth = roomSize * 0.8
      const trackSpacing = roomSize / 3

      for (let i = -1; i <= 1; i += 2) {
        const trackGeometry = new THREE.BoxGeometry(trackWidth, 0.2, trackDepth)
        const trackMaterial = new THREE.MeshStandardMaterial({
          color: 0x888888,
          roughness: 0.2,
          metalness: 0.8,
        })

        const track = new THREE.Mesh(trackGeometry, trackMaterial)
        track.position.set((i * trackSpacing) / 2, wallHeight - 0.1, 0)
        track.castShadow = true
        scene.add(track)

        // Add lights
        const numLights = 6 // Increased from 4 to 6
        const lightSpacing = trackDepth / numLights

        for (let j = 0; j < numLights; j++) {
          const lightZ = -trackDepth / 2 + j * lightSpacing + lightSpacing / 2

          // Light fixture
          const fixtureGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 16)
          const fixtureMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.2,
            metalness: 0.9,
          })

          const fixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial)
          fixture.position.set((i * trackSpacing) / 2, wallHeight - 0.3, lightZ)
          fixture.rotation.x = Math.PI / 2
          fixture.castShadow = true
          scene.add(fixture)

          // Spotlight - increased intensity
          const spotlight = new THREE.SpotLight(0xffffff, 1.2) // Increased intensity
          spotlight.position.set((i * trackSpacing) / 2, wallHeight - 0.4, lightZ)

          const targetX = (i * trackSpacing) / 2
          const targetY = 0.5
          const targetZ = lightZ

          spotlight.target.position.set(targetX, targetY, targetZ)
          spotlight.angle = Math.PI / 7 // Wider angle
          spotlight.penumbra = 0.4
          spotlight.decay = 1.3
          spotlight.distance = 20 // Increased distance

          spotlight.castShadow = true // All lights cast shadows now

          spotlight.shadow.mapSize.width = 256
          spotlight.shadow.mapSize.height = 256
          spotlight.shadow.camera.near = 0.5
          spotlight.shadow.camera.far = 20

          scene.add(spotlight)
          scene.add(spotlight.target)
        }
      }

      // Add some additional point lights for better overall lighting
      const pointLightColors = [0xffcc77, 0x77ccff, 0xff77cc, 0x77ffcc]

      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2
        const radius = roomSize / 3

        const pointLight = new THREE.PointLight(pointLightColors[i], 0.5, 15)
        pointLight.position.set(Math.cos(angle) * radius, wallHeight / 2, Math.sin(angle) * radius)

        scene.add(pointLight)
      }
    }

    function createWall(
      x: number,
      y: number,
      z: number,
      width: number,
      height: number,
      depth: number,
      halfSize: number,
    ) {
      const geometry = new THREE.BoxGeometry(width, height, depth)
      const material = new THREE.MeshStandardMaterial({
        color: z === halfSize ? 0xf0f0f0 : 0xffffff,
        roughness: 0.1,
        metalness: 0.0,
      })

      const wall = new THREE.Mesh(geometry, material)
      wall.position.set(x, y, z)
      wall.castShadow = true
      wall.receiveShadow = true
      scene.add(wall)

      // Add to collision detection
      const wallBox = new THREE.Box3().setFromObject(wall)
      walls.push(wallBox)
    }

    function placeCanvases() {
      // Room dimensions
      const roomSize = 30
      const halfSize = roomSize / 2

      // Canvas settings
      const canvasSpacing = 4
      const canvasHeight = 2
      const canvasesPerWall = 4

      // Calculate positions
      const wallLength = roomSize - 2
      const totalSpace = canvasesPerWall * canvasSpacing
      const startOffset = (wallLength - totalSpace) / 2 + canvasSpacing / 2

      // Place canvases on all walls
      for (let i = 0; i < canvasesPerWall; i++) {
        // North wall
        const xNorth = -halfSize + startOffset + i * canvasSpacing
        createCanvas(xNorth, canvasHeight, -halfSize + 0.2, 0, 0, 0, `north-${i}`)

        // South wall
        const xSouth = -halfSize + startOffset + i * canvasSpacing
        createCanvas(xSouth, canvasHeight, halfSize - 0.2, Math.PI, 0, 0, `south-${i}`)

        // East wall
        const zEast = -halfSize + startOffset + i * canvasSpacing
        createCanvas(halfSize - 0.2, canvasHeight, zEast, -Math.PI / 2, 0, 0, `east-${i}`)

        // West wall
        const zWest = -halfSize + startOffset + i * canvasSpacing
        createCanvas(-halfSize + 0.2, canvasHeight, zWest, Math.PI / 2, 0, 0, `west-${i}`)
      }
    }

    function createCanvas(
      x: number,
      y: number,
      z: number,
      rotationY: number,
      rotationX: number,
      rotationZ: number,
      id: string,
    ) {
      function setupDefaultCanvas(ctx: CanvasRenderingContext2D) {
        // Fill with white
        ctx.fillStyle = "white"
        ctx.fillRect(0, 0, 1024, 768)

        // Add grid pattern
        ctx.strokeStyle = "#f0f0f0"
        ctx.lineWidth = 1

        // Grid lines
        for (let x = 0; x <= 1024; x += 50) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, 768)
          ctx.stroke()
        }

        for (let y = 0; y <= 768; y += 50) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(1024, y)
          ctx.stroke()
        }
      }

      // Frame
      const frameGeometry = new THREE.BoxGeometry(2.4, 1.8, 0.05)
      const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.05,
        metalness: 0.1,
      })

      const frame = new THREE.Mesh(frameGeometry, frameMaterial)
      frame.position.set(x, y, z)
      frame.rotation.set(rotationX, rotationY, rotationZ)
      frame.castShadow = true
      frame.receiveShadow = true
      scene.add(frame)

      // Canvas surface
      const canvasGeometry = new THREE.PlaneGeometry(2, 1.5)

      // Create a blank canvas texture or load from localStorage
      const offScreenCanvas = document.createElement("canvas")
      offScreenCanvas.width = 1024
      offScreenCanvas.height = 768
      const offCtx = offScreenCanvas.getContext("2d")

      if (offCtx) {
        // Try to load saved canvas data
        const savedDataString = localStorage.getItem(`canvas-${id}`)

        if (savedDataString) {
          try {
            const savedData = JSON.parse(savedDataString)
            const currentTime = Date.now()
            // Check if data is less than 30 minutes old (1800000 ms)
            if (savedData.timestamp && currentTime - savedData.timestamp < 1800000) {
              // Load the saved image
              const img = new Image()
              img.onload = () => {
                offCtx.drawImage(img, 0, 0)
                canvasTexture.needsUpdate = true
              }
              img.src = savedData.imageData
            } else {
              // Data is too old, clear it
              localStorage.removeItem(`canvas-${id}`)
              setupDefaultCanvas(offCtx)
            }
          } catch (e) {
            console.error("Error parsing saved canvas data:", e)
            setupDefaultCanvas(offCtx)
          }
        } else {
          setupDefaultCanvas(offCtx)
        }
      }

      const canvasTexture = new THREE.CanvasTexture(offScreenCanvas)

      const canvasMaterial = new THREE.MeshBasicMaterial({
        map: canvasTexture,
        side: THREE.DoubleSide,
      })

      const canvas = new THREE.Mesh(canvasGeometry, canvasMaterial)
      canvas.position.set(x, y, z)
      canvas.rotation.set(rotationX, rotationY, rotationZ)

      // Adjust position slightly to avoid z-fighting
      if (Math.abs(rotationY) === Math.PI / 2) {
        canvas.position.x += rotationY > 0 ? 0.06 : -0.06
      } else if (Math.abs(rotationY) === Math.PI || rotationY === 0) {
        canvas.position.z += rotationY === 0 ? 0.06 : -0.06
      }

      // Store canvas and context for drawing
      canvas.userData = {
        offScreenCanvas,
        offCtx,
        id,
      }

      scene.add(canvas)
      canvases.push(canvas)
    }

    function checkCanvasInteraction() {
      // Cast a ray from the camera center
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)

      const intersects = raycaster.intersectObjects(canvases)

      if (intersects.length > 0 && intersects[0].distance < 3) {
        const canvasObject = intersects[0].object as THREE.Mesh

        // Only update if it's a different canvas or we didn't have one before
        if (!nearbyCanvas || nearbyCanvas.userData?.id !== canvasObject.userData?.id) {
          console.log("Looking at canvas:", canvasObject.userData?.id, "Distance:", intersects[0].distance)
          setNearbyCanvas(canvasObject)
          setInteractionPrompt("Press E to draw on canvas")
          setCanvasInteractionEnabled(true)
        }
      } else if (nearbyCanvas) {
        console.log("No longer looking at a canvas")
        setNearbyCanvas(null)
        setInteractionPrompt("")
      }
    }

    function joinGallery(peerId: string, playerColor: string) {
      // Check if there's a peer ID in the URL to connect to
      const urlParams = new URLSearchParams(window.location.search)
      const connectToPeer = urlParams.get("p") || urlParams.get("peer") // Support both formats

      if (connectToPeer && connectToPeer !== peerId) {
        // Connect to the specified peer
        const peerIds = connectToPeer.split(",")
        console.log("Connecting to peers:", peerIds)

        peerIds.forEach((targetPeerId) => {
          if (targetPeerId && targetPeerId !== peerId) {
            connectToPeerById(targetPeerId)
          }
        })

        // Don't modify the URL if we're connecting to an existing peer
        console.log("Joining existing gallery with peer:", connectToPeer)
      } else {
        // Only update the URL if we're creating a new gallery
        const baseUrl = window.location.origin + window.location.pathname
        const newUrl = `${baseUrl}?p=${peerId}`
        window.history.replaceState({}, "", newUrl)
        console.log("Created new gallery with peer ID:", peerId)
      }

      // Display connection info
      console.log("Share this URL for others to join:", window.location.href)
    }

    function connectToPeerById(targetPeerId: string) {
      if (!peerRef.current) return

      console.log("Connecting to peer:", targetPeerId)

      // Connect to the target peer
      const conn = peerRef.current.connect(targetPeerId, {
        reliable: true,
      })

      // Store the connection
      connectionsRef.current[targetPeerId] = conn

      // Setup handlers for this connection
      setupConnectionHandlers(conn)
    }

    function setupConnectionHandlers(conn: Peer.DataConnection) {
      conn.on("data", (data: any) => {
        // Handle different message types
        switch (data.type) {
          case "playerInfo":
            console.log("Received player info:", data.data)
            handlePlayerInfo(data.data)
            break

          case "playerMove":
            handlePlayerMove(conn.peer, data.data)
            break

          case "canvasData":
            handleCanvasData(data.data)
            break

          case "updateCanvas":
            handleCanvasUpdate(data.data)
            break

          case "playerLeft":
            handlePlayerLeft(data.data.id)
            break
        }
      })

      conn.on("open", () => {
        console.log("Connection opened to peer:", conn.peer)
      })

      conn.on("close", () => {
        console.log("Connection closed with peer:", conn.peer)

        // Remove the connection
        delete connectionsRef.current[conn.peer]

        // Remove the player
        handlePlayerLeft(conn.peer)
      })

      conn.on("error", (err) => {
        console.error("Connection error:", err)
      })
    }

    // Fix the handlePlayerInfo function to prevent duplicates
    function handlePlayerInfo(playerData: any) {
      // Skip if this is our own player info
      if (playerData.id === myId) {
        console.log("Ignoring own player info")
        return
      }

      console.log("Creating player model for:", playerData.username)

      // IMPORTANT: Remove any existing models for this player first
      setPlayers((prev) => {
        if (prev[playerData.id]) {
          if (prev[playerData.id].model) {
            scene.remove(prev[playerData.id].model)
          }
          if (prev[playerData.id].nameSprite) {
            scene.remove(prev[playerData.id].nameSprite)
          }
        }
        return prev
      })

      // Create a new player model
      const playerModel = new PlayerModel(
        playerData.color,
        new THREE.Vector3(playerData.position.x, playerData.position.y, playerData.position.z),
      )

      const nameSprite = new TextSprite(
        playerData.username,
        new THREE.Vector3(
          playerData.position.x,
          playerData.position.y + 2.2, // Position above player
          playerData.position.z,
        ),
      )

      scene.add(playerModel)
      scene.add(nameSprite)

      // Add to players list
      setPlayers((prev) => {
        // Create a new object without this player's previous entry
        const newPlayers = { ...prev }

        // If player already existed, remove old entry
        if (newPlayers[playerData.id]) {
          delete newPlayers[playerData.id]
        }

        // Add the new entry
        return {
          ...newPlayers,
          [playerData.id]: {
            ...playerData,
            position: new THREE.Vector3(playerData.position.x, playerData.position.y, playerData.position.z),
            model: playerModel,
            nameSprite,
          },
        }
      })
    }

    function handlePlayerMove(playerId: string, moveData: any) {
      // Skip if this is our own movement data
      if (playerId === myId) return

      setPlayers((prev) => {
        if (!prev[playerId]) return prev

        const updatedPlayer = {
          ...prev[playerId],
          position: new THREE.Vector3(moveData.position.x, moveData.position.y, moveData.position.z),
          rotation: moveData.rotation,
        }

        // Update model and name sprite positions
        if (updatedPlayer.model) {
          updatedPlayer.model.position.copy(updatedPlayer.position)
          updatedPlayer.model.rotation.y = updatedPlayer.rotation
        }

        if (updatedPlayer.nameSprite) {
          updatedPlayer.nameSprite.position.set(
            updatedPlayer.position.x,
            updatedPlayer.position.y + 2.2,
            updatedPlayer.position.z,
          )
        }

        return {
          ...prev,
          [playerId]: updatedPlayer,
        }
      })
    }

    function handleCanvasData(data: any) {
      const { canvasId, imageData } = data

      // Find the canvas
      const canvas = canvases.find((c) => c.userData.id === canvasId)
      if (!canvas) return

      // Update the canvas texture
      const offScreenCanvas = canvas.userData.offScreenCanvas
      const offCtx = offScreenCanvas.getContext("2d")

      if (offCtx) {
        const img = new Image()
        img.onload = () => {
          offCtx.drawImage(img, 0, 0)

          // Update the texture
          const texture = (canvas.material as THREE.MeshBasicMaterial).map
          if (texture) {
            texture.needsUpdate = true
          }

          // Save to localStorage with timestamp to allow for expiration
          const canvasData = {
            imageData,
            timestamp: Date.now(),
          }
          localStorage.setItem(`canvas-${canvasId}`, JSON.stringify(canvasData))
        }
        img.src = imageData
      }
    }

    function handleCanvasUpdate(data: any) {
      // Same as handleCanvasData
      handleCanvasData(data)

      // Forward to other peers
      Object.values(connectionsRef.current).forEach((conn) => {
        conn.send({
          type: "canvasData",
          data,
        })
      })
    }

    function handlePlayerLeft(playerId: string) {
      console.log("Player left:", playerId)

      setPlayers((prev) => {
        if (!prev[playerId]) return prev

        // Remove player model and name sprite from scene
        if (prev[playerId].model) {
          scene.remove(prev[playerId].model)
        }

        if (prev[playerId].nameSprite) {
          scene.remove(prev[playerId].nameSprite)
        }

        const newPlayers = { ...prev }
        delete newPlayers[playerId]
        return newPlayers
      })
    }

    // Helper function to generate random color
    function getRandomColor() {
      const letters = "0123456789ABCDEF"
      let color = "#"
      for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)]
      }
      return color
    }

    // Expose functions to React component
    window.exitDrawingMode = (drawingCanvas: HTMLCanvasElement) => {
      if (!currentCanvas) return

      // Get the canvas data
      const canvasId = currentCanvas.userData.id
      const offScreenCanvas = currentCanvas.userData.offScreenCanvas
      const offCtx = offScreenCanvas.getContext("2d")

      if (offCtx) {
        // Copy drawing to the texture
        offCtx.drawImage(drawingCanvas, 0, 0, offScreenCanvas.width, offScreenCanvas.height)

        // Update the texture
        const texture = (currentCanvas.material as THREE.MeshBasicMaterial).map
        if (texture) {
          texture.needsUpdate = true
        }

        // Save to localStorage with timestamp
        const imageData = offScreenCanvas.toDataURL("image/png")
        const canvasData = {
          imageData,
          timestamp: Date.now(),
        }
        localStorage.setItem(`canvas-${canvasId}`, JSON.stringify(canvasData))

        // Broadcast to other peers
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

      // Reset state
      setDrawingMode(false)
      setCurrentCanvas(null)

      // Temporarily disable canvas interaction to prevent immediate re-entry
      setCanvasInteractionEnabled(false)
      setTimeout(() => {
        setCanvasInteractionEnabled(true)
      }, 500)

      // Re-lock controls
      setTimeout(() => {
        controls.lock()
      }, 100)
    }

    // Start animation loop
    animate()

    // Cleanup
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("resize", onWindowResize)

      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }

      if (peerRef.current) {
        peerRef.current.destroy()
      }

      renderer.dispose()
    }
  }, [username, myId])

  // Add a direct event listener for the E key at the component level
  useEffect(() => {
    const handleKeyE = (e: KeyboardEvent) => {
      if (e.code === "KeyE" && !drawingMode && nearbyCanvas && started && canvasInteractionEnabled) {
        console.log("E key pressed at component level")
        e.preventDefault()
        enterDrawingMode(nearbyCanvas)
      }
    }

    window.addEventListener("keydown", handleKeyE)
    return () => window.removeEventListener("keydown", handleKeyE)
  }, [nearbyCanvas, drawingMode, started, canvasInteractionEnabled])

  // Add a click handler for canvases
  useEffect(() => {
    const handleClick = () => {
      if (nearbyCanvas && !drawingMode && started && canvasInteractionEnabled) {
        console.log("Canvas clicked, entering drawing mode")
        enterDrawingMode(nearbyCanvas)
      }
    }

    window.addEventListener("click", handleClick)
    return () => window.removeEventListener("click", handleClick)
  }, [nearbyCanvas, drawingMode, started, canvasInteractionEnabled])

  const connectionInfoText = myId ? (
    <div className="absolute bottom-4 left-4 z-10 rounded bg-black/70 p-2 text-white">
      <p>Share this URL for others to join:</p>
      <p className="text-xs">{window.location.href}</p>
      <p className="mt-2 text-xs">You can open this URL in multiple browsers to test multiplayer.</p>
      <p className="text-xs">Each browser creates a separate player with its own connection.</p>
      <p className="mt-2 text-xs font-bold">Connected players: {Object.keys(players).length}</p>
    </div>
  ) : null

  // Debug overlay
  const debugOverlay = debugMode ? (
    <div className="absolute top-4 right-4 z-10 bg-black/80 p-3 text-white text-xs max-w-xs overflow-auto max-h-96">
      <h3 className="font-bold mb-1">Debug Info:</h3>
      <p>Near Canvas: {nearbyCanvas ? nearbyCanvas.userData?.id : "none"}</p>
      <p>Drawing Mode: {drawingMode ? "true" : "false"}</p>
      <p>Controls Locked: {started ? "true" : "false"}</p>
      <p>Canvas Interaction Enabled: {canvasInteractionEnabled ? "true" : "false"}</p>
      <p>
        Player Position:{" "}
        {JSON.stringify({
          x: playerPositionRef.current.x.toFixed(2),
          y: playerPositionRef.current.y.toFixed(2),
          z: playerPositionRef.current.z.toFixed(2),
        })}
      </p>
      <p>My ID: {myId}</p>
      <p>Players Connected: {Object.keys(players).length}</p>
      <p>Player List: {Object.keys(players).join(", ")}</p>
      <p className="mt-2 text-gray-400">Press Alt+D to toggle debug</p>
    </div>
  ) : null

  // Toggle debug mode with the "D" key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "KeyD" && e.altKey) {
        setDebugMode((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [])

  return (
    <div ref={containerRef} className="h-screen w-screen">
      {!started && !drawingMode && <Instructions onClick={() => {}} />}

      {interactionPrompt && <InteractionPrompt text={interactionPrompt} />}

      {drawingMode && currentCanvas && <DrawingInterface />}

      {connectionInfoText}

      {debugOverlay}
    </div>
  )
}

