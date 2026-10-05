/** Wraps the CMS "highlight" words inside the headline. Falls back to plain text if they don't match. */
export function Highlight({ text, highlight }: { text?: string; highlight?: string }) {
  if (!text) return null
  const i = highlight ? text.indexOf(highlight) : -1
  if (!highlight || i === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <span className="hl">{highlight}</span>
      {text.slice(i + highlight.length)}
    </>
  )
}
