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
    debugLog: (message: string) => void
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
  const [shareUrl, setShareUrl] = useState<string>("")
  const playerPositionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.6, 5))
  const playerRotationRef = useRef<number>(0)
  const myPlayerRef = useRef<{ model: PlayerModel | null; nameSprite: TextSprite | null }>({
    model: null,
    nameSprite: null,
  })
  const [debugMode, setDebugMode] = useState(true)
  const [canvasInteractionEnabled, setCanvasInteractionEnabled] = useState(true)
  const [peerInitialized, setPeerInitialized] = useState(false)
  const [showShareInfo, setShowShareInfo] = useState(true)
  const [debugLog, setDebugLog] = useState<string[]>([])

  // Add debug log function
  const addDebugLog = (message: string) => {
    console.log(message)
    setDebugLog((prev) => [...prev.slice(-19), message])
  }

  // Expose debug log function globally
  useEffect(() => {
    window.debugLog = addDebugLog
  }, [])

  // Function to handle entering drawing mode - defined at component level
  const enterDrawingMode = (canvasObj: THREE.Mesh) => {
    addDebugLog("Entering drawing mode")
    setDrawingMode(true)
    setCurrentCanvas(canvasObj)
  }

  // Scene setup
  useEffect(() => {
    if (!containerRef.current) return

    addDebugLog("Setting up gallery with username: " + username)

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
            addDebugLog("E key pressed, entering drawing mode")

            // Unlock controls first
            controls.unlock()

            // Small delay to ensure controls are unlocked
            setTimeout(() => {
              setDrawingMode(true)
              setCurrentCanvas(nearbyCanvas)
            }, 100)
          }
          break
        case "KeyI":
          // Toggle share info
          setShowShareInfo((prev) => !prev)
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
    setupPeerConnection()

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
              img.crossOrigin = "anonymous"
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
          addDebugLog("Looking at canvas: " + canvasObject.userData?.id)
          setNearbyCanvas(canvasObject)
          setInteractionPrompt("Press E to draw on canvas")
          setCanvasInteractionEnabled(true)
        }
      } else if (nearbyCanvas) {
        addDebugLog("No longer looking at a canvas")
        setNearbyCanvas(null)
        setInteractionPrompt("")
      }
    }

    function setupPeerConnection() {
      if (peerInitialized) {
        addDebugLog("Peer already initialized, skipping setup")
        return
      }

      addDebugLog("Initializing PeerJS connection")

      // Generate a random color for this player
      const playerColor = getRandomColor()

      try {
        // Create a new Peer with a random ID
        const peer = new Peer({
          debug: 3, // Increase debug level to see more logs
          config: {
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:global.stun.twilio.com:3478" }],
          },
        })

        peerRef.current = peer
        setPeerInitialized(true)

        // On connection established
        peer.on("open", (id) => {
          addDebugLog("My peer ID is: " + id)
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
          addDebugLog("Incoming connection from: " + conn.peer)

          // Store the connection
          connectionsRef.current[conn.peer] = conn

          // Handle data from this peer
          setupConnectionHandlers(conn)

          // Send our info to the new peer
          conn.on("open", () => {
            addDebugLog("Connection opened with peer: " + conn.peer)

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
          addDebugLog("Peer error: " + err.type)

          // Try to reinitialize after error
          if (err.type === "peer-unavailable") {
            addDebugLog("Peer unavailable, continuing...")
          } else {
            addDebugLog("Attempting to reconnect...")
            setTimeout(() => {
              if (peer) {
                peer.destroy()
                setPeerInitialized(false)
                setupPeerConnection()
              }
            }, 3000)
          }
        })
      } catch (error) {
        console.error("Error setting up PeerJS:", error)
        addDebugLog("Error setting up PeerJS: " + error)
        setPeerInitialized(false)
      }
    }

    function joinGallery(peerId: string, playerColor: string) {
      // Check if there's a peer ID in the URL to connect to
      const urlParams = new URLSearchParams(window.location.search)
      const connectToPeer = urlParams.get("p") || urlParams.get("peer") // Support both formats

      if (connectToPeer && connectToPeer !== peerId) {
        // Connect to the specified peer
        const peerIds = connectToPeer.split(",")
        addDebugLog("Connecting to peers: " + peerIds.join(", "))

        peerIds.forEach((targetPeerId) => {
          if (targetPeerId && targetPeerId !== peerId) {
            connectToPeerById(targetPeerId)
          }
        })

        // Don't modify the URL if we're connecting to an existing peer
        addDebugLog("Joining existing gallery with peer: " + connectToPeer)

        // Set the share URL to the current URL
        setShareUrl(window.location.href)
      } else {
        // We're creating a new gallery
        const baseUrl = window.location.origin + window.location.pathname
        const newUrl = `${baseUrl}?p=${peerId}`

        // Update the URL in the browser
        try {
          window.history.replaceState({}, "", newUrl)
          addDebugLog("Updated URL to: " + newUrl)
        } catch (e) {
          console.error("Failed to update URL:", e)
          addDebugLog("Failed to update URL: " + e)
        }

        setShareUrl(newUrl)
        addDebugLog("Created new gallery with peer ID: " + peerId)
      }

      // Always show share info when we have a peer ID
      setShowShareInfo(true)

      // Force display the connection info
      const connectionInfo = document.createElement("div")
      connectionInfo.style.position = "fixed"
      connectionInfo.style.top = "10px"
      connectionInfo.style.left = "10px"
      connectionInfo.style.backgroundColor = "rgba(0,0,0,0.8)"
      connectionInfo.style.color = "white"
      connectionInfo.style.padding = "10px"
      connectionInfo.style.borderRadius = "5px"
      connectionInfo.style.zIndex = "9999"
      connectionInfo.innerHTML = `
        <h3 style="margin-bottom: 5px; font-weight: bold;">Share URL</h3>
        <p style="margin: 5px 0; word-break: break-all;">${window.location.href}</p>
        <p style="margin: 5px 0;">Your Peer ID: ${peerId}</p>
        <button id="copy-url-btn" style="background: #4CAF50; border: none; color: white; padding: 5px 10px; cursor: pointer; margin-top: 5px;">Copy URL</button>
      `
      document.body.appendChild(connectionInfo)

      // Add click event to copy button
      document.getElementById("copy-url-btn")?.addEventListener("click", () => {
        navigator.clipboard.writeText(window.location.href)
        alert("URL copied to clipboard!")
      })

      // Keep this visible for longer
      setTimeout(() => {
        if (document.body.contains(connectionInfo)) {
          document.body.removeChild(connectionInfo)
        }
      }, 30000)
    }

    function connectToPeerById(targetPeerId: string) {
      if (!peerRef.current) return

      addDebugLog("Connecting to peer: " + targetPeerId)

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
            addDebugLog("Received player info: " + data.data.username)
            handlePlayerInfo(data.data)
            break

          case "playerMove":
            handlePlayerMove(conn.peer, data.data)
            break

          case "canvasData":
            addDebugLog("Received canvas data for: " + data.data.canvasId)
            handleCanvasData(data.data)
            break

          case "updateCanvas":
            addDebugLog("Received canvas update for: " + data.data.canvasId)
            handleCanvasUpdate(data.data)
            break

          case "playerLeft":
            handlePlayerLeft(data.data.id)
            break
        }
      })

      conn.on("open", () => {
        addDebugLog("Connection opened to peer: " + conn.peer)
      })

      conn.on("close", () => {
        addDebugLog("Connection closed with peer: " + conn.peer)

        // Remove the connection
        delete connectionsRef.current[conn.peer]

        // Remove the player
        handlePlayerLeft(conn.peer)
      })

      conn.on("error", (err) => {
        console.error("Connection error:", err)
        addDebugLog("Connection error: " + err)
      })
    }

    // Fix the handlePlayerInfo function to prevent duplicates
    function handlePlayerInfo(playerData: any) {
      // Skip if this is our own player info
      if (playerData.id === myId) {
        addDebugLog("Ignoring own player info")
        return
      }

      addDebugLog("Creating player model for: " + playerData.username)

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
      if (!canvas) {
        addDebugLog("Canvas not found: " + canvasId)
        return
      }

      // Update the canvas texture
      const offScreenCanvas = canvas.userData.offScreenCanvas
      const offCtx = offScreenCanvas.getContext("2d")

      if (offCtx) {
        try {
          let imgData = imageData

          // If imageData is a JSON string, parse it
          if (typeof imageData === "string" && imageData.startsWith("{")) {
            try {
              const parsedData = JSON.parse(imageData)
              imgData = parsedData.imageData
              addDebugLog("Parsed JSON imageData")
            } catch (e) {
              console.error("Failed to parse JSON imageData:", e)
              addDebugLog("Failed to parse JSON imageData")
            }
          }

          // Create a new image and load the data
          const img = new Image()
          img.crossOrigin = "anonymous" // Important for CORS

          // Set up onload handler before setting src
          img.onload = () => {
            // Clear the canvas first
            offCtx.clearRect(0, 0, offScreenCanvas.width, offScreenCanvas.height)

            // Draw the image
            offCtx.drawImage(img, 0, 0)
            addDebugLog("Drew image on canvas: " + canvasId)

            // Update the texture
            const texture = (canvas.material as THREE.MeshBasicMaterial).map
            if (texture) {
              texture.needsUpdate = true
              addDebugLog("Updated texture for canvas: " + canvasId)
            }

            // Save to localStorage with timestamp to allow for expiration
            const canvasData = {
              imageData: imgData,
              timestamp: Date.now(),
            }

            try {
              localStorage.setItem(`canvas-${canvasId}`, JSON.stringify(canvasData))
              addDebugLog("Canvas data saved to localStorage: " + canvasId)
            } catch (e) {
              console.error("Failed to save canvas data to localStorage:", e)
              addDebugLog("Failed to save canvas data to localStorage: " + e)
            }
          }

          // Handle errors
          img.onerror = (e) => {
            console.error("Error loading image:", e)
            addDebugLog("Error loading image: " + e)
          }

          // Set the source to load the image
          img.src = imgData
        } catch (e) {
          console.error("Error handling canvas data:", e)
          addDebugLog("Error handling canvas data: " + e)
        }
      }
    }

    function handleCanvasUpdate(data: any) {
      // Same as handleCanvasData
      handleCanvasData(data)

      // Forward to other peers
      Object.values(connectionsRef.current).forEach((conn) => {
        try {
          conn.send({
            type: "canvasData",
            data,
          })
          addDebugLog("Forwarded canvas data to peer: " + conn.peer)
        } catch (e) {
          addDebugLog("Failed to forward canvas data: " + e)
        }
      })
    }

    function handlePlayerLeft(playerId: string) {
      addDebugLog("Player left: " + playerId)

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
      if (!currentCanvas) {
        addDebugLog("No current canvas to save to")
        setDrawingMode(false)
        setTimeout(() => {
          controls.lock()
        }, 100)
        return
      }

      try {
        // Get the canvas data
        const canvasId = currentCanvas.userData.id
        const offScreenCanvas = currentCanvas.userData.offScreenCanvas
        const offCtx = offScreenCanvas.getContext("2d")

        if (offCtx) {
          addDebugLog("Saving drawing to canvas: " + canvasId)

          // Clear the canvas first to avoid ghosting
          offCtx.clearRect(0, 0, offScreenCanvas.width, offScreenCanvas.height)

          // Copy drawing to the texture
          offCtx.drawImage(drawingCanvas, 0, 0, offScreenCanvas.width, offScreenCanvas.height)
          addDebugLog("Drawing copied to canvas")

          // Update the texture
          const texture = (currentCanvas.material as THREE.MeshBasicMaterial).map
          if (texture) {
            texture.needsUpdate = true
            addDebugLog("Texture updated")
          }

          // Save to localStorage with timestamp
          const imageData = offScreenCanvas.toDataURL("image/png")
          const canvasData = {
            imageData,
            timestamp: Date.now(),
          }

          // Save to localStorage
          try {
            localStorage.setItem(`canvas-${canvasId}`, JSON.stringify(canvasData))
            addDebugLog("Canvas saved to localStorage: " + canvasId)
          } catch (e) {
            console.error("Failed to save to localStorage:", e)
            addDebugLog("Failed to save to localStorage: " + e)
          }

          // Broadcast to other peers
          Object.values(connectionsRef.current).forEach((conn) => {
            try {
              conn.send({
                type: "updateCanvas",
                data: {
                  canvasId,
                  imageData,
                },
              })
              addDebugLog("Canvas data sent to peer: " + conn.peer)
            } catch (e) {
              console.error("Failed to send canvas data to peer:", e)
              addDebugLog("Failed to send canvas data to peer: " + e)
            }
          })
        }

        // Reset state
        setDrawingMode(false)
        setCurrentCanvas(null)
        addDebugLog("Drawing mode exited")

        // Temporarily disable canvas interaction to prevent immediate re-entry
        setCanvasInteractionEnabled(false)
        setTimeout(() => {
          setCanvasInteractionEnabled(true)
        }, 500)

        // Re-lock controls
        setTimeout(() => {
          controls.lock()
        }, 100)
      } catch (error) {
        console.error("Error in exitDrawingMode:", error)
        addDebugLog("Error in exitDrawingMode: " + error)

        // Force exit drawing mode
        setDrawingMode(false)
        setCurrentCanvas(null)
        setTimeout(() => {
          controls.lock()
        }, 100)
      }
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
  }, [username, myId, peerInitialized])

  // Add a direct event listener for the E key at the component level
  useEffect(() => {
    const handleKeyE = (e: KeyboardEvent) => {
      if (e.code === "KeyE" && !drawingMode && nearbyCanvas && started && canvasInteractionEnabled) {
        addDebugLog("E key pressed at component level")
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
        addDebugLog("Canvas clicked, entering drawing mode")
        enterDrawingMode(nearbyCanvas)
      }
    }

    window.addEventListener("click", handleClick)
    return () => window.removeEventListener("click", handleClick)
  }, [nearbyCanvas, drawingMode, started, canvasInteractionEnabled])

  // Add a handler for the ESC key to exit drawing mode
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawingMode) {
        addDebugLog("ESC key pressed, exiting drawing mode")
        if (window.exitDrawingMode && document.querySelector("canvas")) {
          const canvas = document.querySelector("canvas") as HTMLCanvasElement
          window.exitDrawingMode(canvas)
        } else {
          // Force exit drawing mode
          setDrawingMode(false)
          setCurrentCanvas(null)
        }
      }
    }

    window.addEventListener("keydown", handleEsc)
    return () => window.removeEventListener("keydown", handleEsc)
  }, [drawingMode])

  // Always show share info when myId is available
  useEffect(() => {
    if (myId) {
      setShowShareInfo(true)
    }
  }, [myId])

  // Create a permanent URL display
  useEffect(() => {
    if (myId) {
      // Create a fixed position element to show the share URL
      const urlDisplay = document.createElement("div")
      urlDisplay.id = "permanent-url-display"
      urlDisplay.style.position = "fixed"
      urlDisplay.style.top = "10px"
      urlDisplay.style.left = "10px"
      urlDisplay.style.backgroundColor = "rgba(0,0,0,0.8)"
      urlDisplay.style.color = "white"
      urlDisplay.style.padding = "10px"
      urlDisplay.style.borderRadius = "5px"
      urlDisplay.style.zIndex = "9999"
      urlDisplay.style.maxWidth = "80%"
      urlDisplay.style.wordBreak = "break-all"
      urlDisplay.innerHTML = `
        <h3 style="margin-bottom: 5px; font-weight: bold;">Multiplayer Link (Copy This)</h3>
        <p id="share-url" style="margin: 5px 0;">${window.location.href}</p>
        <p style="margin: 5px 0;">Your Peer ID: ${myId}</p>
        <button id="copy-url-btn" style="background: #4CAF50; border: none; color: white; padding: 5px 10px; cursor: pointer; margin-top: 5px;">Copy URL</button>
      `
      document.body.appendChild(urlDisplay)

      // Add click event to copy button
      document.getElementById("copy-url-btn")?.addEventListener("click", () => {
        navigator.clipboard.writeText(window.location.href)
        alert("URL copied to clipboard!")
      })

      // Update the URL display whenever the URL changes
      const updateUrlDisplay = () => {
        const urlElement = document.getElementById("share-url")
        if (urlElement) {
          urlElement.textContent = window.location.href
        }
      }

      // Check URL every second
      const urlCheckInterval = setInterval(updateUrlDisplay, 1000)

      return () => {
        clearInterval(urlCheckInterval)
        if (document.getElementById("permanent-url-display")) {
          document.body.removeChild(document.getElementById("permanent-url-display")!)
        }
      }
    }
  }, [myId])

  const connectionInfoText =
    myId && showShareInfo ? (
      <div
        className="fixed top-4 left-4 z-50 rounded bg-black/90 p-4 text-white shadow-lg border-2 border-green-500"
        style={{ maxWidth: "90%" }}
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-bold">Multiplayer Link</h3>
          <button onClick={() => setShowShareInfo(false)} className="text-white hover:text-gray-300">
            ✕
          </button>
        </div>
        <p className="mb-2">Share this URL for others to join:</p>
        <div className="bg-gray-800 p-2 rounded mb-2 flex items-center">
          <p className="text-sm select-all cursor-pointer overflow-auto" style={{ wordBreak: "break-all" }}>
            {window.location.href}
          </p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href)
              alert("URL copied to clipboard!")
            }}
            className="ml-2 bg-green-600 px-2 py-1 rounded text-sm hover:bg-green-700 whitespace-nowrap"
          >
            Copy
          </button>
        </div>
        <p className="text-xs mt-2">Your Peer ID: {myId}</p>
        <p className="text-xs">Connected players: {Object.keys(players).length}</p>
        <p className="text-xs mt-2 text-yellow-300">Press I to toggle this panel</p>
      </div>
    ) : null

  // Debug overlay
  const debugOverlay = debugMode ? (
    <div className="fixed top-4 right-4 z-10 bg-black/80 p-3 text-white text-xs max-w-xs overflow-auto max-h-96">
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
      <p>Share URL: {shareUrl}</p>
      <p>Players Connected: {Object.keys(players).length}</p>
      <p>Player List: {Object.keys(players).join(", ")}</p>
      <div className="mt-2 border-t border-gray-600 pt-2">
        <h4 className="font-bold">Log:</h4>
        <div className="max-h-40 overflow-y-auto">
          {debugLog.map((log, i) => (
            <div key={i} className="text-xs text-gray-300">
              {log}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-gray-400">Press Alt+D to toggle debug</p>
    </div>
  ) : null

  // Toggle debug mode with the "D" key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "KeyD" && e.altKey) {
        setDebugMode((prev) => !prev)
      }
      if (e.code === "KeyI") {
        setShowShareInfo((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [])

  // Floating info button to show share info
  const infoButton =
    !showShareInfo && myId ? (
      <button
        onClick={() => setShowShareInfo(true)}
        className="absolute top-4 left-4 z-10 bg-green-600 p-2 rounded-full text-white shadow-lg hover:bg-green-700 animate-pulse"
        title="Show multiplayer link"
      >
        i
      </button>
    ) : null

  return (
    <div ref={containerRef} className="h-screen w-screen">
      {!started && !drawingMode && <Instructions onClick={() => {}} />}

      {interactionPrompt && <InteractionPrompt text={interactionPrompt} />}

      {drawingMode && currentCanvas && <DrawingInterface />}

      {connectionInfoText}
      {infoButton}

      {debugOverlay}
    </div>
  )
}

