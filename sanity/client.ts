import { createClient } from 'next-sanity'
import imageUrlBuilder from '@sanity/image-url'
import type { SanityImageSource } from '@sanity/image-url/lib/types/types'
import { apiVersion, dataset, projectId } from './env'

export const client = createClient({ projectId, dataset, apiVersion, useCdn: false, perspective: 'published' })

// Every query is tagged 'sanity'. Publishing in Studio → webhook → /api/revalidate → revalidateTag('sanity').
// Pages stay static and fast between edits, and update within seconds of a publish. No redeploy.
export async function sanityFetch<T>(query: string, params: Record<string, unknown> = {}): Promise<T> {
  return client.fetch<T>(query, params, { next: { tags: ['sanity'] } })
}

const builder = imageUrlBuilder({ projectId, dataset })
export const urlFor = (src: SanityImageSource) => builder.image(src).auto('format')
