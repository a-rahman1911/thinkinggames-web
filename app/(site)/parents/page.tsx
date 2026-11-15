import type { Metadata } from 'next'
import { ParentsView } from '@/components/ParentsView'
import { loadIdeasFor } from '@/components/ideas/load'
import { loadSavedList } from '@/components/saved/load'
import { sanityFetch } from '@/sanity/client'
import { parentsQuery } from '@/sanity/queries'
import type { ParentsData } from '@/sanity/types'

const load = () => sanityFetch<ParentsData>(parentsQuery)

export async function generateMetadata(): Promise<Metadata> {
  const { page } = await load()
  return { title: page?.seo?.title || 'For parents', description: page?.seo?.description }
}

export default async function ParentsPage() {
  const [data, savedList, ideas] = await Promise.all([load(), loadSavedList(), loadIdeasFor('parents')])
  return <ParentsView data={data} savedList={savedList} ideas={ideas} />
}
