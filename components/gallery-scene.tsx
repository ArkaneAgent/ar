"use client"

import { useRef } from "react"
import { RigidBody } from "@react-three/rapier"
import { PillStatue } from "@/components/pill-statue"
import { DrawingCanvas } from "@/components/drawing-canvas"

export function GalleryScene() {
  const floorRef = useRef(null)

  // Gallery dimensions
  const width = 20
  const length = 20
  const height = 5
  const wallThickness = 0.2

  return (
    <group>
      {/* Floor */}
      <RigidBody type="fixed" ref={floorRef} colliders="cuboid">
        <mesh receiveShadow position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width, length]} />
          <meshStandardMaterial color="#f5f5f5" />
        </mesh>
      </RigidBody>

      {/* Walls */}
      {/* North Wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, height / 2, -length / 2]} castShadow receiveShadow>
          <boxGeometry args={[width, height, wallThickness]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </RigidBody>

      {/* South Wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, height / 2, length / 2]} castShadow receiveShadow>
          <boxGeometry args={[width, height, wallThickness]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </RigidBody>

      {/* East Wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[width / 2, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[wallThickness, height, length]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </RigidBody>

      {/* West Wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[-width / 2, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[wallThickness, height, length]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </RigidBody>

      {/* Pill Statue in the center */}
      <PillStatue position={[0, 1, 0]} />

      {/* Drawing Canvases */}
      {/* North Wall Canvases */}
      <DrawingCanvas
        position={[-5, 2, -length / 2 + wallThickness / 2 + 0.01]}
        rotation={[0, 0, 0]}
        size={[3, 2]}
        id="canvas1"
      />
      <DrawingCanvas
        position={[0, 2, -length / 2 + wallThickness / 2 + 0.01]}
        rotation={[0, 0, 0]}
        size={[3, 2]}
        id="canvas2"
      />
      <DrawingCanvas
        position={[5, 2, -length / 2 + wallThickness / 2 + 0.01]}
        rotation={[0, 0, 0]}
        size={[3, 2]}
        id="canvas3"
      />

      {/* South Wall Canvases */}
      <DrawingCanvas
        position={[-5, 2, length / 2 - wallThickness / 2 - 0.01]}
        rotation={[0, Math.PI, 0]}
        size={[3, 2]}
        id="canvas4"
      />
      <DrawingCanvas
        position={[0, 2, length / 2 - wallThickness / 2 - 0.01]}
        rotation={[0, Math.PI, 0]}
        size={[3, 2]}
        id="canvas5"
      />
      <DrawingCanvas
        position={[5, 2, length / 2 - wallThickness / 2 - 0.01]}
        rotation={[0, Math.PI, 0]}
        size={[3, 2]}
        id="canvas6"
      />

      {/* East Wall Canvases */}
      <DrawingCanvas
        position={[width / 2 - wallThickness / 2 - 0.01, 2, -5]}
        rotation={[0, -Math.PI / 2, 0]}
        size={[3, 2]}
        id="canvas7"
      />
      <DrawingCanvas
        position={[width / 2 - wallThickness / 2 - 0.01, 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        size={[3, 2]}
        id="canvas8"
      />
      <DrawingCanvas
        position={[width / 2 - wallThickness / 2 - 0.01, 2, 5]}
        rotation={[0, -Math.PI / 2, 0]}
        size={[3, 2]}
        id="canvas9"
      />

      {/* West Wall Canvases */}
      <DrawingCanvas
        position={[-width / 2 + wallThickness / 2 + 0.01, 2, -5]}
        rotation={[0, Math.PI / 2, 0]}
        size={[3, 2]}
        id="canvas10"
      />
      <DrawingCanvas
        position={[-width / 2 + wallThickness / 2 + 0.01, 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        size={[3, 2]}
        id="canvas11"
      />
      <DrawingCanvas
        position={[-width / 2 + wallThickness / 2 + 0.01, 2, 5]}
        rotation={[0, Math.PI / 2, 0]}
        size={[3, 2]}
        id="canvas12"
      />
    </group>
  )
}

