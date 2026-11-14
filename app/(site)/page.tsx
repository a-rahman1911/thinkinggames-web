import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ParentsView } from '@/components/ParentsView'
import { WelcomeDialog } from '@/components/WelcomeDialog'
import { loadSavedList } from '@/components/saved/load'
import { sanityFetch } from '@/sanity/client'
import { parentsQuery, welcomeQuery } from '@/sanity/queries'
import type { ParentsData, WelcomePopup } from '@/sanity/types'

// There is no home page. A visitor who has chosen an audience never gets here: middleware.ts redirects them.
// Everyone else gets the Parents page with the welcome pop-up open over it, already open in the HTML.
const load = () => Promise.all([sanityFetch<ParentsData>(parentsQuery), sanityFetch<WelcomePopup>(welcomeQuery)])

export async function generateMetadata(): Promise<Metadata> {
  const [{ page }] = await load()
  return {
    title: page?.seo?.title || 'For parents',
    description: page?.seo?.description,
    alternates: { canonical: '/parents' },
  }
}

export default async function Welcome() {
  const [[data, popup], savedList] = await Promise.all([load(), loadSavedList()])
  // "Show the welcome pop-up" switched off in Studio: `/` is just a way in to the Parents page.
  if (!popup || popup.enabled === false) redirect('/parents')
  return (
    <WelcomeDialog popup={popup}>
      <ParentsView data={data} savedList={savedList} />
    </WelcomeDialog>
  )
}
