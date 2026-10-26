import { urlFor } from '@/sanity/client'
import type { Brand } from '@/sanity/types'

const LOGO_H = 44

/** Pixel size from a Sanity asset id (image-<hash>-<w>x<h>-<ext>), so the logo's box is reserved before it loads. */
function logoSize(logo: Brand['logo']) {
  const ref = (logo as { asset?: { _ref?: string } }).asset?._ref
  const m = ref?.match(/-(\d+)x(\d+)-/)
  return m ? { width: Math.round((LOGO_H * Number(m[1])) / Number(m[2])), height: LOGO_H } : { height: LOGO_H }
}

/** "Brands we support": logo tiles under the Challenge banner. Hidden when the page has no brands. */
export function BrandsPanel({ brands }: { brands?: Brand[] | null }) {
  if (!brands?.length) return null
  return (
    <section className="brands" aria-labelledby="brands-label">
      <h2 id="brands-label" className="brands-label">
        Brands we support
      </h2>
      <div className="brands-grid">
        {brands.map((b) => (
          <a key={b._id} className="brand" href={b.url} target="_blank" rel="noopener" aria-label={`${b.name} (opens in new tab)`}>
            <img src={urlFor(b.logo).height(LOGO_H * 2).url()} alt={b.name} {...logoSize(b.logo)} loading="lazy" />
            <span className="brand-arrow" aria-hidden="true">
              ↗
            </span>
          </a>
        ))}
      </div>
    </section>
  )
}
