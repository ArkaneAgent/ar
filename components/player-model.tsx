"use client"

import * as THREE from "three"

export class PlayerModel extends THREE.Group {
  constructor(color: string, position: THREE.Vector3) {
    super()

    // Create a pill-shaped player model (thinner than the statue)
    const capsuleLength = 1.5
    const capsuleRadius = 0.4
    const capsuleSegments = 8 // Reduced from 16 for better performance

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

    // Add a slight outline - REMOVED for better performance
    // const outlineMaterial = new THREE.MeshBasicMaterial({
    //   color: 0x000000,
    //   side: THREE.BackSide,
    // })
    //
    // const outlineGeometry = new THREE.CapsuleGeometry(
    //   capsuleRadius * 1.05,
    //   capsuleLength * 1.05,
    //   capsuleSegments,
    //   capsuleSegments,
    // )
    //
    // const outline = new THREE.Mesh(outlineGeometry, outlineMaterial)
    // outline.position.y = capsuleRadius + capsuleLength / 2
    // this.add(outline)

    // Add googly eyes
    this.addGooglyEyes(capsuleRadius, capsuleLength)

    // Position the player
    this.position.copy(position)
  }

  addGooglyEyes(capsuleRadius: number, capsuleLength: number) {
    // Eye socket material (white part)
    const eyeSocketMaterial = new THREE.MeshBasicMaterial({
      // Changed to MeshBasicMaterial for better performance
      color: 0xffffff,
    })

    // Pupil material (black part)
    const pupilMaterial = new THREE.MeshBasicMaterial({
      // Changed to MeshBasicMaterial for better performance
      color: 0x000000,
    })

    // Create eye sockets
    const eyeRadius = capsuleRadius * 0.3
    const eyeDistance = capsuleRadius * 0.6
    const eyeYPosition = capsuleRadius + capsuleLength * 0.7 // Position eyes near top of player

    // Left eye socket
    const leftEyeSocket = new THREE.Mesh(
      new THREE.SphereGeometry(eyeRadius, 8, 8), // Reduced segments for better performance
      eyeSocketMaterial,
    )
    leftEyeSocket.position.set(-eyeDistance, eyeYPosition, capsuleRadius * 0.8)
    this.add(leftEyeSocket)

    // Right eye socket
    const rightEyeSocket = new THREE.Mesh(
      new THREE.SphereGeometry(eyeRadius, 8, 8), // Reduced segments for better performance
      eyeSocketMaterial,
    )
    rightEyeSocket.position.set(eyeDistance, eyeYPosition, capsuleRadius * 0.8)
    this.add(rightEyeSocket)

    // Left pupil (smaller than the socket)
    const leftPupil = new THREE.Mesh(
      new THREE.SphereGeometry(eyeRadius * 0.6, 8, 8), // Reduced segments for better performance
      pupilMaterial,
    )
    leftPupil.position.set(-eyeDistance, eyeYPosition, capsuleRadius * 0.8 + eyeRadius * 0.5)
    this.add(leftPupil)

    // Right pupil
    const rightPupil = new THREE.Mesh(
      new THREE.SphereGeometry(eyeRadius * 0.6, 8, 8), // Reduced segments for better performance
      pupilMaterial,
    )
    rightPupil.position.set(eyeDistance, eyeYPosition, capsuleRadius * 0.8 + eyeRadius * 0.5)
    this.add(rightPupil)
  }
}

