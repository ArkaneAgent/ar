interface InteractionPromptProps {
  text: string
}

export function InteractionPrompt({ text }: InteractionPromptProps) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-white/80 px-6 py-3 text-black shadow-lg">
      {text}
    </div>
  )
}

