import type { Metadata } from 'next'
import { ParentsView } from '@/components/ParentsView'
import { sanityFetch } from '@/sanity/client'
import { parentGroupKeys, parentsQuery } from '@/sanity/queries'
import type { ParentsData } from '@/sanity/types'

const load = () => sanityFetch<ParentsData>(parentsQuery, { groups: parentGroupKeys })

export async function generateMetadata(): Promise<Metadata> {
  const { page } = await load()
  return { title: page?.seo?.title || 'For parents', description: page?.seo?.description }
}

export default async function ParentsPage() {
  const data = await load()
  return <ParentsView data={{ ...data, games: data.games || [], options: data.options || [] }} />
}
