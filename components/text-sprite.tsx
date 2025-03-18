"use client"

import * as THREE from "three"

export class TextSprite extends THREE.Sprite {
  constructor(text: string, position: THREE.Vector3) {
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")

    canvas.width = 256
    canvas.height = 64

    if (context) {
      context.fillStyle = "rgba(0, 0, 0, 0.5)"
      context.fillRect(0, 0, canvas.width, canvas.height)

      context.font = "bold 24px Arial"
      context.textAlign = "center"
      context.textBaseline = "middle"

      // Draw text outline
      context.strokeStyle = "black"
      context.lineWidth = 4
      context.strokeText(text, canvas.width / 2, canvas.height / 2)

      // Draw text
      context.fillStyle = "white"
      context.fillText(text, canvas.width / 2, canvas.height / 2)
    }

    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({ map: texture })

    super(material)

    this.scale.set(2, 0.5, 1)
    this.position.copy(position)
    this.position.y += 1.2 // Significantly raise the text above the player's head
  }
}

