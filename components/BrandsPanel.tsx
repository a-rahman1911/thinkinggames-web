import { urlFor } from '@/sanity/client'
import type { Brand } from '@/sanity/types'

/** The box a logo is fitted into, in CSS pixels. The chip's CSS caps the height at BOX.h and the width at the chip. */
const BOX = { w: 92, h: 34 }

const hasAsset = (logo: Brand['logo']): logo is NonNullable<Brand['logo']> => !!(logo as { asset?: unknown } | null | undefined)?.asset

/**
 * The logo's size fitted into BOX, from the pixel size in its Sanity asset id (image-<hash>-<w>x<h>-<ext>),
 * so its space is reserved before it loads.
 */
function logoSize(logo: NonNullable<Brand['logo']>) {
  const ref = (logo as { asset?: { _ref?: string } }).asset?._ref
  const m = ref?.match(/-(\d+)x(\d+)-/)
  if (!m) return {}
  const [w, h] = [Number(m[1]), Number(m[2])]
  const scale = Math.min(BOX.w / w, BOX.h / h, 1)
  return { width: Math.round(w * scale), height: Math.round(h * scale) }
}

/**
 * The logo at 2x of BOX, never upscaled. ignoreImageParams() matters: with a width and a height the URL builder
 * otherwise adds a crop rect of the box's shape, which cuts the sides off a logo of any other shape.
 */
const logoUrl = (logo: NonNullable<Brand['logo']>) =>
  urlFor(logo)
    .ignoreImageParams()
    .width(BOX.w * 2)
    .height(BOX.h * 2)
    .fit('max')
    .url()

/**
 * "Brands we support": the title above one line of logo chips, under the Challenge banner. Each logo is
 * scales to fill its chip.
 * A brand without a logo shows its name as text. Hidden when the page has no brands.
 */
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
            {hasAsset(b.logo) ? (
              <img src={logoUrl(b.logo)} alt={b.name} {...logoSize(b.logo)} loading="lazy" />
            ) : (
              <span className="brand-name">{b.name}</span>
            )}
          </a>
        ))}
      </div>
    </section>
  )
}
