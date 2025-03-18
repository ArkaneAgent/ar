"use client"

import * as THREE from "three"

export class PlayerModel extends THREE.Group {
  constructor(color: string, position: THREE.Vector3) {
    super()

    // Create a pill-shaped player model (thinner than the statue)
    const capsuleLength = 1.5
    const capsuleRadius = 0.4
    const capsuleSegments = 16

    // Main body material with the random color
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.3,
      metalness: 0.2,
    })

    // Create the pill body
    const bodyGeometry = new THREE.CapsuleGeometry(capsuleRadius, capsuleLength, capsuleSegments, capsuleSegments)

    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = capsuleRadius + capsuleLength / 2
    body.castShadow = true
    body.receiveShadow = true
    this.add(body)

    // Add a slight outline
    const outlineMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.BackSide,
    })

    const outlineGeometry = new THREE.CapsuleGeometry(
      capsuleRadius * 1.05,
      capsuleLength * 1.05,
      capsuleSegments,
      capsuleSegments,
    )

    const outline = new THREE.Mesh(outlineGeometry, outlineMaterial)
    outline.position.y = capsuleRadius + capsuleLength / 2
    this.add(outline)

    // Position the player
    this.position.copy(position)
  }
}

