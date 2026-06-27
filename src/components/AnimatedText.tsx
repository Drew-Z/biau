interface AnimatedTextProps {
  text: string
  delay?: number
}

export function AnimatedText({ text, delay = 0 }: AnimatedTextProps) {
  const chars = text.split('')
  
  return (
    <>
      {chars.map((char, i) => (
        <span 
          key={i}
          className="char"
          style={{ 
            animationDelay: `${delay + i * 0.032}s`,
            opacity: 0 
          }}
        >
          {char}
        </span>
      ))}
    </>
  )
}
