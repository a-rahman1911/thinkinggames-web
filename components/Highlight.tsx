/**
 * Wraps the CMS "highlight" words inside a headline. Falls back to plain text if they don't match.
 * className is the wrapper's class: "hl" (the light band) unless told otherwise.
 */
export function Highlight({ text, highlight, className = 'hl' }: { text?: string; highlight?: string; className?: string }) {
  if (!text) return null
  const i = highlight ? text.indexOf(highlight) : -1
  if (!highlight || i === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <span className={className}>{highlight}</span>
      {text.slice(i + highlight.length)}
    </>
  )
}
