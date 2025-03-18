"use client"

import { Suspense, useState } from "react"
import dynamic from "next/dynamic"
import { LoadingScreen } from "@/components/loading-screen"
import { LoginScreen } from "@/components/login-screen"

// Import the Gallery component dynamically with SSR disabled
// This is necessary because Three.js requires the browser environment
const Gallery = dynamic(() => import("@/components/gallery"), {
  ssr: false,
  loading: () => <LoadingScreen />,
})

export default function Home() {
  const [username, setUsername] = useState<string>("")
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const handleLogin = (name: string) => {
    setUsername(name)
    setIsLoggedIn(true)
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return (
    <main className="h-screen w-screen overflow-hidden">
      <Suspense fallback={<LoadingScreen />}>
        <Gallery username={username} />
      </Suspense>
    </main>
  )
}

