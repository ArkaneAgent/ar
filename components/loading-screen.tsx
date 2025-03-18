export function LoadingScreen() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Loading Art Gallery</h2>
        <div className="mt-4 h-2 w-64 rounded-full bg-gray-800">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-green-400"></div>
        </div>
      </div>
    </div>
  )
}

