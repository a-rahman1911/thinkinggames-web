import Link from 'next/link'
import { PortableText, type PortableTextComponents } from 'next-sanity'
import { ParentGameCard, TeacherGameRow } from '@/components/GameBits'
import { resolve } from '@/lib/derive'
import type { PageAudience } from '@/lib/ideas'
import { urlFor } from '@/sanity/client'
import type { ArticleBlock, GameCardBlock, PictureBlock, QuoteBlock, TipBlock } from '@/sanity/types'

/** The picture's size after its crop, from the asset id ("image-<id>-1600x1000-jpg"), so the page does not jump while it loads. */
function pictureSize(p: PictureBlock): { width: number; height: number } | null {
  const img = p as unknown as { asset?: { _ref?: string }; crop?: { top?: number; bottom?: number; left?: number; right?: number } }
  const m = /-(\d+)x(\d+)-[a-z0-9]+$/.exec(img.asset?._ref || '')
  if (!m) return null
  const c = img.crop || {}
  const w = +m[1] * (1 - (c.left || 0) - (c.right || 0))
  const h = +m[2] * (1 - (c.top || 0) - (c.bottom || 0))
  return w > 0 && h > 0 ? { width: 720, height: Math.round((720 * h) / w) } : null
}

/**
 * An article's body. The blocks are the whole menu: text, two heading levels, lists, Game, Tip, Quote, Picture.
 * A Game block is the library's own card: the Teachers row in an article for teachers (with the game's teacher
 * values), the Parents card otherwise (with its parent values). No Save button in articles.
 * `slug` is the article's, for the `card_clicked` event of its game cards.
 */
export function ArticleBody({ body, audience, slug }: { body: ArticleBlock[]; audience: PageAudience; slug: string }) {
  // A game card's place among the article's game cards, counted from 1.
  const places = new Map(body.filter((b) => b._type === 'gameCard' && (b as GameCardBlock).game).map((b, i) => [b._key, i + 1]))
  const components: PortableTextComponents = {
    block: {
      normal: ({ children }) => <p>{children}</p>,
      h2: ({ children }) => <h2>{children}</h2>,
      h3: ({ children }) => <h3>{children}</h3>,
    },
    list: {
      bullet: ({ children }) => <ul>{children}</ul>,
      number: ({ children }) => <ol>{children}</ol>,
    },
    marks: {
      link: ({ value, children }) => {
        const href: string = value?.href || ''
        if (!href) return <>{children}</>
        if (href.startsWith('/')) return <Link href={href}>{children}</Link>
        if (href.startsWith('mailto:')) return <a href={href}>{children}</a>
        return (
          <a href={href} target="_blank" rel="noopener">
            {children}
            <span className="sr-only"> (opens in new tab)</span>
          </a>
        )
      },
    },
    types: {
      gameCard: ({ value }: { value: GameCardBlock }) => {
        // Hidden and missing games were already left out (lib/ideas visibleBody); this is a second guard.
        if (!value.game) return null
        const game = resolve(value.game, audience)
        const where = { audience, surface: 'article' as const, article: slug, position: places.get(value._key) }
        return (
          <div className={`prose-game ${audience}`}>
            {audience === 'teachers' ? <TeacherGameRow game={game} where={where} /> : <ParentGameCard game={game} where={where} />}
          </div>
        )
      },
      tip: ({ value }: { value: TipBlock }) =>
        value.text ? (
          <aside className="prose-tip">
            <span>{value.label?.trim() || 'Tip'}</span>
            <p>{value.text}</p>
          </aside>
        ) : null,
      quote: ({ value }: { value: QuoteBlock }) =>
        value.text ? (
          <blockquote>
            <p>{value.text}</p>
            {value.source && <cite>{value.source}</cite>}
          </blockquote>
        ) : null,
      picture: ({ value }: { value: PictureBlock }) => {
        if (!(value as { asset?: unknown }).asset) return null
        return (
          <figure>
            <img src={urlFor(value).width(1440).fit('max').url()} alt={value.alt || ''} loading="lazy" {...pictureSize(value)} />
            {value.caption && <figcaption>{value.caption}</figcaption>}
          </figure>
        )
      },
    },
    // Anything else is left out without an error.
    unknownType: () => null,
    unknownMark: ({ children }) => <>{children}</>,
  }
  return (
    <div className="prose">
      <PortableText value={body} components={components} onMissingComponent={false} />
    </div>
  )
}
