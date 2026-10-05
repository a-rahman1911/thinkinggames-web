import { revalidateTag } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'
import { parseBody } from 'next-sanity/webhook'

// Sanity webhook target. Studio publish → POST here → every page refreshes within seconds.
export async function POST(req: NextRequest) {
  try {
    const { isValidSignature, body } = await parseBody<{ _type?: string }>(req, process.env.SANITY_REVALIDATE_SECRET)
    if (!isValidSignature) return new NextResponse('Invalid signature', { status: 401 })
    revalidateTag('sanity')
    return NextResponse.json({ revalidated: true, type: body?._type, now: Date.now() })
  } catch (err) {
    return new NextResponse((err as Error).message, { status: 500 })
  }
}
