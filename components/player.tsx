"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { RigidBody, CapsuleCollider } from "@react-three/rapier"
import { useKeyboardControls } from "@react-three/drei"
import { Vector3 } from "three"
import { useDrawingCanvas } from "@/hooks/use-drawing-canvas"

interface PlayerProps {
  position: [number, number, number]
}

export function Player({ position }: PlayerProps) {
  const playerRef = useRef(null)
  const [, getKeys] = useKeyboardControls()
  const { checkCanvasInteraction } = useDrawingCanvas()

  // Movement speed
  const SPEED = 5
  const JUMP_FORCE = 5

  useFrame((state, delta) => {
    if (!playerRef.current) return

    const { forward, backward, left, right, jump } = getKeys()

    const player = playerRef.current
    const velocity = player.linvel()

    // Calculate movement direction based on camera orientation
    const direction = new Vector3()

    // Forward/backward movement
    if (forward) {
      direction.z = -1
    } else if (backward) {
      direction.z = 1
    }

    // Left/right movement
    if (left) {
      direction.x = -1
    } else if (right) {
      direction.x = 1
    }

    // Normalize direction vector and apply camera rotation
    if (direction.length() > 0) {
      direction.normalize()
      direction.applyEuler(state.camera.rotation)
      direction.y = 0 // Keep movement on the horizontal plane
    }

    // Apply movement
    player.setLinvel({
      x: direction.x * SPEED,
      y: velocity.y, // Keep current vertical velocity (for gravity/jumping)
      z: direction.z * SPEED,
    })

    // Handle jumping - only if on or near the ground
    if (jump && Math.abs(velocity.y) < 0.1) {
      player.setLinvel({
        x: velocity.x,
        y: JUMP_FORCE,
        z: velocity.z,
      })
    }

    // Update camera position to follow player
    const playerPosition = player.translation()
    state.camera.position.x = playerPosition.x
    state.camera.position.z = playerPosition.z
    state.camera.position.y = playerPosition.y + 1.7 // Eye height

    // Check for canvas interaction
    checkCanvasInteraction(state.camera)
  })

  return (
    <RigidBody
      ref={playerRef}
      position={position}
      enabledRotations={[false, false, false]}
      colliders={false}
      mass={1}
      type="dynamic"
      lockRotations
    >
      <CapsuleCollider args={[0.75, 0.5]} />
      {/* Simple player mesh */}
      <group>
        {/* Body */}
        <mesh position={[0, 0, 0]}>
          <capsuleGeometry args={[0.5, 1.5, 8, 16]} />
          <meshStandardMaterial color="#4a5568" />
        </mesh>
        {/* Head */}
        <mesh position={[0, 1.25, 0]}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>
      </group>
    </RigidBody>
  )
}

