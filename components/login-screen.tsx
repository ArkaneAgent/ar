"use client"

import type React from "react"
import { useState } from "react"

interface LoginScreenProps {
  onLogin: (username: string) => void
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim()) {
      setError("Please enter a username")
      return
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters")
      return
    }

    if (username.length > 15) {
      setError("Username must be less than 15 characters")
      return
    }

    onLogin(username)
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-gradient-to-b from-blue-900 to-black">
      <div className="w-full max-w-md rounded-lg bg-white/10 p-8 backdrop-blur-md">
        <h1 className="mb-6 text-center text-3xl font-bold text-white">Welcome to the Art Gallery</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-2 block text-sm font-medium text-white">
              Choose a Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter your username"
              required
            />
            {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-800"
          >
            Enter Gallery
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-300">
          <p>Join other artists in this multiplayer experience!</p>
          <p className="mt-2">Draw on canvases and see other visitors in real-time.</p>
        </div>
      </div>
    </div>
  )
}

