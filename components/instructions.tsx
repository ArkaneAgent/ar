"use client"

interface InstructionsProps {
  onClick: () => void
}

export function Instructions({ onClick }: InstructionsProps) {
  return (
    <div className="absolute left-5 top-5 z-10 max-w-xs rounded bg-black/80 p-5 text-white shadow-lg border-2 border-white">
      <h3 className="mb-2 text-xl font-bold">Art Gallery Controls</h3>
      <p className="mb-1">
        <span className="font-bold">W, A, S, D</span> - Move around
      </p>
      <p className="mb-1">
        <span className="font-bold">Mouse</span> - Look around
      </p>
      <p className="mb-1">
        <span className="font-bold">Space</span> - Jump
      </p>
      <p className="mb-1 text-green-400 font-bold">E - Draw on canvas (when near)</p>
      <p className="mb-1">
        <span className="font-bold">ESC</span> - Exit drawing mode
      </p>
      <button
        onClick={onClick}
        className="mt-4 rounded bg-green-500 px-4 py-2 text-white font-bold hover:bg-green-600 animate-pulse"
      >
        Click anywhere to start
      </button>
    </div>
  )
}

