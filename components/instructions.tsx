"use client"

interface InstructionsProps {
  onClick: () => void
}

export function Instructions({ onClick }: InstructionsProps) {
  return (
    <div className="absolute left-5 top-5 z-10 max-w-xs rounded bg-white/80 p-5 text-black shadow-lg">
      <h3 className="mb-2 text-lg font-bold">Art Gallery Controls</h3>
      <p>W, A, S, D - Move around</p>
      <p>Mouse - Look around</p>
      <p>Space - Jump</p>
      <p>E - Draw on canvas (when near)</p>
      <p>ESC - Exit drawing mode</p>
      <button onClick={onClick} className="mt-4 rounded bg-black px-4 py-2 text-white">
        Click anywhere to start
      </button>
    </div>
  )
}

