/**
 * Shown on every page of a browser in preview (Next.js draft mode). The robots tag keeps preview pages out
 * of search engines; React moves it into the page's head.
 */
export function PreviewBar() {
  return (
    <div className="idea-preview" role="region" aria-label="Preview">
      <meta name="robots" content="noindex, nofollow" />
      <strong>Preview</strong>
      <span>Unpublished changes are shown. Only this browser sees them.</span>
      {/* A plain link: this address must be a real request, never prefetched. */}
      <a href="/api/preview?exit=1">Exit preview</a>
    </div>
  )
}
