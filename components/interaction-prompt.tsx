interface InteractionPromptProps {
  text: string
}

export function InteractionPrompt({ text }: InteractionPromptProps) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-black/80 px-6 py-3 text-white shadow-lg text-lg font-bold border-2 border-white animate-pulse">
      {text}
    </div>
  )
}

