import type { Metadata } from 'next'
import { TeachersView } from '@/components/TeachersView'
import { sanityFetch } from '@/sanity/client'
import { teachersQuery } from '@/sanity/queries'
import type { TeachersData } from '@/sanity/types'

const load = () => sanityFetch<TeachersData>(teachersQuery)

export async function generateMetadata(): Promise<Metadata> {
  const { page } = await load()
  return { title: page?.seo?.title || 'For teachers', description: page?.seo?.description }
}

export default async function TeachersPage() {
  const data = await load()
  return <TeachersView data={data} />
}
