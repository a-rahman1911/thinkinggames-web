import type { Metadata } from 'next'
import { TeachersView } from '@/components/TeachersView'
import { loadIdeasFor } from '@/components/ideas/load'
import { loadSavedList } from '@/components/saved/load'
import { sanityFetch } from '@/sanity/client'
import { teachersQuery } from '@/sanity/queries'
import type { TeachersData } from '@/sanity/types'

const load = () => sanityFetch<TeachersData>(teachersQuery)

export async function generateMetadata(): Promise<Metadata> {
  const { page } = await load()
  return { title: page?.seo?.title || 'For teachers', description: page?.seo?.description }
}

export default async function TeachersPage() {
  const [data, savedList, ideas] = await Promise.all([load(), loadSavedList(), loadIdeasFor('teachers')])
  return <TeachersView data={data} savedList={savedList} ideas={ideas} />
}
