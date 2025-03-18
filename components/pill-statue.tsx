"use client"

import * as THREE from "three"

export class PillStatue extends THREE.Group {
  constructor() {
    super()

    // Create the pill based on reference image
    const capsuleLength = 3.0
    const capsuleRadius = 1.0
    const capsuleSegments = 32

    // Materials
    const greenMaterial = new THREE.MeshStandardMaterial({
      color: 0x4eca78, // Bright green
      roughness: 0.1,
      metalness: 0.2,
    })

    const whiteMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff, // White
      roughness: 0.1,
      metalness: 0.2,
    })

    // Bottom half (green)
    const bottomGeometry = new THREE.CylinderGeometry(
      capsuleRadius,
      capsuleRadius,
      capsuleLength / 2,
      capsuleSegments,
      1,
      false,
    )
    const bottomCylinder = new THREE.Mesh(bottomGeometry, greenMaterial)
    bottomCylinder.position.y = capsuleRadius + capsuleLength / 4
    bottomCylinder.castShadow = true
    bottomCylinder.receiveShadow = true
    this.add(bottomCylinder)

    // Top half (white)
    const topGeometry = new THREE.CylinderGeometry(
      capsuleRadius,
      capsuleRadius,
      capsuleLength / 2,
      capsuleSegments,
      1,
      false,
    )
    const topCylinder = new THREE.Mesh(topGeometry, whiteMaterial)
    topCylinder.position.y = capsuleRadius + (capsuleLength * 3) / 4
    topCylinder.castShadow = true
    topCylinder.receiveShadow = true
    this.add(topCylinder)

    // Bottom hemisphere (green)
    const bottomHemisphereGeometry = new THREE.SphereGeometry(
      capsuleRadius,
      capsuleSegments,
      capsuleSegments,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2,
    )
    const bottomHemisphere = new THREE.Mesh(bottomHemisphereGeometry, greenMaterial)
    bottomHemisphere.position.y = capsuleRadius
    bottomHemisphere.rotation.x = Math.PI // Flip
    bottomHemisphere.castShadow = true
    bottomHemisphere.receiveShadow = true
    this.add(bottomHemisphere)

    // Top hemisphere (white)
    const topHemisphereGeometry = new THREE.SphereGeometry(
      capsuleRadius,
      capsuleSegments,
      capsuleSegments,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2,
    )
    const topHemisphere = new THREE.Mesh(topHemisphereGeometry, whiteMaterial)
    topHemisphere.position.y = capsuleRadius + capsuleLength
    topHemisphere.castShadow = true
    topHemisphere.receiveShadow = true
    this.add(topHemisphere)

    // Add dark outline
    const outlineMaterial = new THREE.MeshBasicMaterial({
      color: 0x1a3c2a, // Dark green outline
      side: THREE.BackSide,
    })

    // Outline for cylinder
    const outlineGeometry = new THREE.CylinderGeometry(
      capsuleRadius * 1.01,
      capsuleRadius * 1.01,
      capsuleLength,
      capsuleSegments,
      1,
      false,
    )
    const outline = new THREE.Mesh(outlineGeometry, outlineMaterial)
    outline.position.y = capsuleRadius + capsuleLength / 2
    this.add(outline)

    // Base
    const baseGeometry = new THREE.CylinderGeometry(1.5, 1.5, 0.1, 32)
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.1,
      metalness: 0.5,
    })
    const base = new THREE.Mesh(baseGeometry, baseMaterial)
    base.position.y = 0.05
    base.castShadow = true
    base.receiveShadow = true
    this.add(base)

    // Add a spotlight on the statue
    const spotlight = new THREE.SpotLight(0xffffff, 1.5)
    spotlight.position.set(0, 8, 0)
    spotlight.target = this
    spotlight.angle = Math.PI / 6
    spotlight.penumbra = 0.3
    spotlight.castShadow = true
    spotlight.shadow.mapSize.width = 512
    spotlight.shadow.mapSize.height = 512

    this.add(spotlight)

    // Position the statue
    this.position.set(0, 0, 0)
  }
}

