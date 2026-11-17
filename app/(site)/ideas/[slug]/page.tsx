import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/Header'
import { ArticleBody } from '@/components/ideas/ArticleBody'
import { CopyLink } from '@/components/ideas/CopyLink'
import { IdeaCover } from '@/components/ideas/IdeaCover'
import { IdeaStrip } from '@/components/ideas/IdeaStrip'
import { loadIdeas, loadPublicIdeas, toCard } from '@/components/ideas/load'
import { audienceLabel, cardAudience, formatDate, ideasHeading, moreArticles, readMinutes, type BodyBlock } from '@/lib/ideas'
import { urlFor } from '@/sanity/client'

// Ideas (round 11): one article. With the section switched off, or for a slug that matches no article, this answers 404.

const SITE = 'https://thinkinggames.com'

type Props = { params: Promise<{ slug: string }> }

// Published articles are built ahead; one published later is built on its first visit. Off: nothing to build.
export async function generateStaticParams() {
  const ideas = await loadPublicIdeas()
  return (ideas?.articles || []).map((a) => ({ slug: a.slug }))
}

async function find(params: Props['params']) {
  const [{ slug }, ideas] = await Promise.all([params, loadIdeas()])
  const article = ideas?.articles.find((a) => a.slug === slug)
  return ideas && article ? { ideas, article } : null
}

const shareImage = (cover: NonNullable<Parameters<typeof urlFor>[0]>) => urlFor(cover).width(1200).height(630).fit('crop').url()

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await find(params)
  if (!found) return {}
  const { article } = found
  const title = article.seo?.title || article.title
  const description = article.seo?.description || article.summary
  const url = `/ideas/${article.slug}`
  const hasCover = !!(article.cover as { asset?: unknown } | null | undefined)?.asset
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      publishedTime: article.publishedAt,
      authors: article.author ? [article.author] : undefined,
      // The share image is the uploaded cover. A cover built from game pictures is not one image, so there is none.
      images: hasCover ? [{ url: shareImage(article.cover!), width: 1200, height: 630, alt: article.cover!.alt || article.title }] : undefined,
    },
  }
}

export default async function ArticlePage({ params }: Props) {
  const found = await find(params)
  if (!found) notFound()
  const { ideas, article } = found
  const card = toCard(article)
  const path = `/ideas/${article.slug}`
  const date = formatDate(article.publishedAt)
  const more = moreArticles(ideas.articles, article).map(toCard)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.summary,
    datePublished: article.publishedAt,
    dateModified: article._updatedAt,
    mainEntityOfPage: SITE + path,
    author: article.author ? { '@type': 'Person', name: article.author } : undefined,
    image: card.cover ? [shareImage(card.cover)] : undefined,
    publisher: { '@type': 'Organization', name: 'Thinking Games Initiative', url: SITE },
  }

  return (
    <>
      <Header current="ideas" ideasLabel={ideas.texts.navLabel} />
      <main className="wrap idea-page">
        <article className={`idea-article idea-${article.audience}`}>
          <Link href="/ideas" className="idea-back">
            ← All ideas
          </Link>
          <span className="idea-chip">{audienceLabel(article.audience)}</span>
          <h1>{article.title}</h1>
          {article.summary && <p className="idea-summary">{article.summary}</p>}
          <div className="idea-byline">
            <span>
              {article.author && <>By {article.author} · </>}
              {date && (
                <>
                  <time dateTime={article.publishedAt}>{date}</time> ·{' '}
                </>
              )}
              {readMinutes(article.body as BodyBlock[] | null)} min read
            </span>
            <CopyLink path={path} slug={article.slug} />
          </div>
          <IdeaCover card={card} size="article" alt={article.cover?.alt} />
          <ArticleBody body={article.body || []} audience={cardAudience(article.audience)} slug={article.slug} />
          <div className="idea-share">
            <p>Know someone who would use this?</p>
            <CopyLink path={path} slug={article.slug} />
          </div>
        </article>
      </main>
      <IdeaStrip heading={ideasHeading(`More ${ideas.texts.navLabel.toLowerCase()}`, article.audience)} cards={more} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    </>
  )
}
