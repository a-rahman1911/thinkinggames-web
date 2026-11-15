// Ideas (round 11): private preview. Server only.
// SANITY_READ_TOKEN is a Sanity API token with the Viewer role. With it, a browser that came through
// /api/preview (Next.js draft mode) sees the section whatever the switch says, drafts included.
// Without it there is no preview at all: /api/preview answers 404 and draft mode is ignored.

import { draftMode } from 'next/headers'
import { client } from '@/sanity/client'

const token = process.env.SANITY_READ_TOKEN

/** Reads drafts laid over published content. Null when the token is not set. Never cached, never sent to a browser. */
export const previewClient = token
  ? client.withConfig({ token, useCdn: false, apiVersion: '2025-02-19', perspective: 'drafts' })
  : null

/** Is this request a preview? False outside a request (the build, the sitemap) and whenever the token is missing. */
export async function isPreview(): Promise<boolean> {
  if (!previewClient) return false
  try {
    return (await draftMode()).isEnabled
  } catch {
    return false
  }
}
