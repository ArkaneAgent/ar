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
      <p className="mb-1 text-green-400 font-bold animate-pulse">E - Draw on canvas (when near)</p>
      <p className="mb-1">
        <span className="font-bold">ESC</span> - Exit drawing mode
      </p>
      <p className="mb-1">
        <span className="font-bold">I</span> - Toggle multiplayer link panel
      </p>
      <button
        onClick={onClick}
        className="mt-4 rounded bg-green-500 px-4 py-2 text-white font-bold hover:bg-green-600 animate-pulse"
      >
        Click anywhere to start
      </button>

      <div className="mt-4 border-t border-white/30 pt-2">
        <p className="text-yellow-300 font-bold">Multiplayer Tips:</p>
        <p className="text-xs mt-1">• Press I to see your share link</p>
        <p className="text-xs">• Copy and share the URL to invite others</p>
        <p className="text-xs">• Each browser window creates a separate player</p>
        <p className="text-xs">• Drawings are shared with all players</p>
      </div>
    </div>
  )
}

