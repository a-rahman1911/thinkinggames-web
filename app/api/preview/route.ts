import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { type NextRequest, NextResponse } from 'next/server'
import { defineEnableDraftMode } from 'next-sanity/draft-mode'
import { previewClient } from '@/components/ideas/preview'

// Ideas (round 11): private preview, using Next.js draft mode.
//
// The "Preview" action on an article in Studio (sanity/previewAction.ts) makes a one-time secret that is
// valid for an hour and opens /api/preview?sanity-preview-secret=…&sanity-preview-pathname=/ideas/{slug}.
// The secret is checked against the dataset with SANITY_READ_TOKEN, then this browser is put in draft mode
// and sent to the article. /api/preview?exit=1 leaves preview.
//
// Without SANITY_READ_TOKEN this route answers 404 and there is no preview; the rest of the site is unaffected.
export async function GET(request: NextRequest) {
  if (!previewClient) return new NextResponse('Not found', { status: 404 })
  if (request.nextUrl.searchParams.has('exit')) {
    ;(await draftMode()).disable()
    redirect('/')
  }
  // Answers 401 for a missing, wrong or expired secret. The redirect is always to a path on this site.
  return defineEnableDraftMode({ client: previewClient }).GET(request)
}
