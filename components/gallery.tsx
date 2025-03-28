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
import { SimplePeerManager } from "@/components/simple-peer-manager"

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
    removeAllPlayers: () => void
  }
}

export default function Gallery({ username }: GalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [started, setStarted] = useState(false)
  const [drawingMode, setDrawingMode] = useState(false)
  const [nearbyCanvas, setNearbyCanvas] = useState<THREE.Mesh | null>(null)
  const [currentCanvas, setCurrentCanvas] = useState<THREE.Mesh | null>(null)
  const [interactionPrompt, setInteractionPrompt] = useState("")
  const [players, setPlayers] = useState<Record<string, Player>>({})
  const [myId, setMyId] = useState<string>("")
  const playerPositionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.6, 5))
  const playerRotationRef = useRef<number>(0)
  const [debugMode, setDebugMode] = useState(true)
  const [canvasInteractionEnabled, setCanvasInteractionEnabled] = useState(true)
  const [debugLog, setDebugLog] = useState<string[]>([])

  // Refs
  const sceneRef = useRef<THREE.Scene | null>(null)
  const canvasesRef = useRef<THREE.Mesh[]>([])
  const controlsRef = useRef<PointerLockControls | null>(null)
  const existingPlayersRef = useRef<Set<string>>(new Set())
  const playerModelsRef = useRef<Record<string, { model: PlayerModel; nameSprite: TextSprite }>>({})

  // Add debug log function
  const addDebugLog = (message: string) => {
    console.log(message)
    setDebugLog((prev) => [...prev.slice(-19), message])
  }

  // Expose debug log function globally
  useEffect(() => {
    window.debugLog = addDebugLog

    // Add a function to remove all players (for debugging)
    window.removeAllPlayers = () => {
      addDebugLog("Removing all players")

      // Remove all player models from the scene
      Object.values(playerModelsRef.current).forEach(({ model, nameSprite }) => {
        if (sceneRef.current) {
          sceneRef.current.remove(model)
          sceneRef.current.remove(nameSprite)
        }
      })

      // Clear the players state and refs
      setPlayers({})
      playerModelsRef.current = {}
      existingPlayersRef.current.clear()

      addDebugLog("All players removed")
    }
  }, [])

  // Function to handle entering drawing mode - defined at component level
  const enterDrawingMode = (canvasObj: THREE.Mesh) => {
    addDebugLog("Entering drawing mode")
    setDrawingMode(true)
    setCurrentCanvas(canvasObj)
  }

  // Handle peer connection events
  const handlePeerConnected = (peerId: string) => {
    setMyId(peerId)
    addDebugLog(`Connected with peer ID: ${peerId}`)
  }

  const handlePlayerJoined = (playerId: string, playerUsername: string, color: string, position: any) => {
    addDebugLog(`Player joined: ${playerUsername} (${playerId})`)

    // Check if this player already exists to prevent duplication
    if (existingPlayersRef.current.has(playerId)) {
      addDebugLog(`Player ${playerId} already exists, updating position only`)

      // Update the player's position if they already exist
      setPlayers((prev) => {
        if (prev[playerId]) {
          const updatedPlayer = {
            ...prev[playerId],
            position: new THREE.Vector3(position.x, position.y, position.z),
          }

          // Update the model position if it exists
          if (playerModelsRef.current[playerId]) {
            const { model, nameSprite } = playerModelsRef.current[playerId]
            model.position.copy(updatedPlayer.position)
            nameSprite.position.set(updatedPlayer.position.x, updatedPlayer.position.y + 2.2, updatedPlayer.position.z)
          }

          return {
            ...prev,
            [playerId]: updatedPlayer,
          }
        }
        return prev
      })

      return
    }

    // Mark this player as existing
    existingPlayersRef.current.add(playerId)

    // Create a new player model if we have a scene
    if (sceneRef.current) {
      // Create the player model
      const playerPos = new THREE.Vector3(position.x, position.y, position.z)
      const playerModel = new PlayerModel(color, playerPos)

      // Create the name sprite
      const nameSprite = new TextSprite(playerUsername, new THREE.Vector3(playerPos.x, playerPos.y + 2.2, playerPos.z))

      // Add to scene
      sceneRef.current.add(playerModel)
      sceneRef.current.add(nameSprite)

      // Store the model and sprite
      playerModelsRef.current[playerId] = {
        model: playerModel,
        nameSprite: nameSprite,
      }

      if (playerId === myId) {
        addDebugLog(`Created my own player model`)
      } else {
        addDebugLog(`Added player model for: ${playerUsername}`)
      }

      // Add to players state
      setPlayers((prev) => ({
        ...prev,
        [playerId]: {
          id: playerId,
          username: playerUsername,
          position: playerPos,
          rotation: 0,
          color,
        },
      }))
    }
  }

  const handlePlayerMoved = (playerId: string, position: any, rotation: number) => {
    // Skip if this is our own movement
    if (playerId === myId) return

    // Update the player's position
    setPlayers((prev) => {
      if (!prev[playerId]) return prev

      const updatedPlayer = {
        ...prev[playerId],
        position: new THREE.Vector3(position.x, position.y, position.z),
        rotation,
      }

      // Update the model position if it exists
      if (playerModelsRef.current[playerId]) {
        const { model, nameSprite } = playerModelsRef.current[playerId]
        model.position.copy(updatedPlayer.position)
        model.rotation.y = updatedPlayer.rotation
        nameSprite.position.set(updatedPlayer.position.x, updatedPlayer.position.y + 2.2, updatedPlayer.position.z)
      }

      return {
        ...prev,
        [playerId]: updatedPlayer,
      }
    })
  }

  const handlePlayerLeft = (playerId: string) => {
    addDebugLog(`Player left: ${playerId}`)

    // Remove from existing players set
    existingPlayersRef.current.delete(playerId)

    // Remove player model and name sprite from scene
    if (playerModelsRef.current[playerId] && sceneRef.current) {
      const { model, nameSprite } = playerModelsRef.current[playerId]
      sceneRef.current.remove(model)
      sceneRef.current.remove(nameSprite)
      delete playerModelsRef.current[playerId]
    }

    // Remove from players state
    setPlayers((prev) => {
      const newPlayers = { ...prev }
      delete newPlayers[playerId]
      return newPlayers
    })
  }

  const handleCanvasUpdated = (canvasId: string, imageData: string) => {
    addDebugLog(`Canvas updated: ${canvasId}`)

    // Find the canvas
    const canvas = canvasesRef.current.find((c) => c.userData.id === canvasId)
    if (!canvas) {
      addDebugLog(`Canvas not found: ${canvasId}`)
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
          } catch (e) {
            console.error("Failed to parse JSON imageData:", e)
          }
        }

        // Create a new image and load the data
        const img = new Image()
        img.crossOrigin = "anonymous"

        img.onload = () => {
          // Clear the canvas first
          offCtx.clearRect(0, 0, offScreenCanvas.width, offScreenCanvas.height)

          // Draw the image
          offCtx.drawImage(img, 0, 0)

          // Update the texture
          const texture = (canvas.material as THREE.MeshBasicMaterial).map
          if (texture) {
            texture.needsUpdate = true
          }

          // Save to localStorage
          const canvasData = {
            imageData: imgData,
            timestamp: Date.now(),
          }

          try {
            localStorage.setItem(`canvas-${canvasId}`, JSON.stringify(canvasData))
          } catch (e) {
            console.error("Failed to save canvas data to localStorage:", e)
          }
        }

        img.onerror = (e) => {
          console.error("Error loading image:", e)
        }

        img.src = imgData
      } catch (e) {
        console.error("Error handling canvas data:", e)
      }
    }
  }

  // Scene setup
  useEffect(() => {
    if (!containerRef.current) return

    addDebugLog("Setting up gallery with username: " + username)

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)
    sceneRef.current = scene

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
    controlsRef.current = controls

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
    canvasesRef.current = canvases

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
      if (myId && playerModelsRef.current[myId] && oldPosition.distanceTo(playerPosition) > 0.01) {
        const { model, nameSprite } = playerModelsRef.current[myId]
        model.position.copy(playerPosition)
        model.rotation.y = camera.rotation.y
        nameSprite.position.set(
          playerPosition.x,
          playerPosition.y + 2.9, // Increased height for name tag
          playerPosition.z,
        )

        // Broadcast position to other players via the custom event
        if (time - lastUpdateTime > 100) {
          // 10 updates per second
          lastUpdateTime = time

          // Dispatch custom event for position update
          const event = new CustomEvent("playerPositionUpdate", {
            detail: {
              position: {
                x: playerPosition.x,
                y: playerPosition.y,
                z: playerPosition.z,
              },
              rotation: camera.rotation.y,
            },
          })
          window.dispatchEvent(event)
        }
      }

      // Check for canvas interaction - only do this occasionally for performance
      if (Math.random() < 0.2) {
        // Only check 20% of the time
        checkCanvasInteraction()
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

            // Dispatch custom event
            const event = new CustomEvent("canvasUpdated", {
              detail: {
                canvasId,
                imageData,
              },
            })
            window.dispatchEvent(event)
          } catch (e) {
            console.error("Failed to save to localStorage:", e)
            addDebugLog("Failed to save to localStorage: " + e)
          }
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

      renderer.dispose()
    }
  }, [username])

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

  // Add this effect to expose players to the window for debugging
  useEffect(() => {
    // Expose players to window for debugging
    ;(window as any).players = players
  }, [players])

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
      <div className="mt-2">
        <button onClick={() => window.removeAllPlayers?.()} className="bg-red-600 text-white px-2 py-1 text-xs rounded">
          Remove All Players
        </button>
      </div>
      <p className="mt-2 text-gray-400">Press Alt+D to toggle debug</p>
    </div>
  ) : null

  return (
    <div ref={containerRef} className="h-screen w-screen">
      {!started && !drawingMode && <Instructions onClick={() => {}} />}

      {interactionPrompt && <InteractionPrompt text={interactionPrompt} />}

      {drawingMode && currentCanvas && <DrawingInterface />}

      <SimplePeerManager
        username={username}
        onPeerConnected={handlePeerConnected}
        onPlayerJoined={handlePlayerJoined}
        onPlayerMoved={handlePlayerMoved}
        onPlayerLeft={handlePlayerLeft}
        onCanvasUpdated={handleCanvasUpdated}
      />

      {debugOverlay}
    </div>
  )
}

