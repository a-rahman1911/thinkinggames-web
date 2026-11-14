/**
 * The audience a visitor last chose, kept in the `tg_audience` cookie so a visit to `/` goes straight to
 * their page (see middleware.ts). It holds "teachers" or "parents" and nothing else, and identifies nobody.
 */
export const AUDIENCE_COOKIE = 'tg_audience'
export type Audience = 'teachers' | 'parents'

export const isAudience = (v: unknown): v is Audience => v === 'teachers' || v === 'parents'

/** Browser only. One year, whole site, SameSite=Lax. */
export function rememberAudience(audience: Audience) {
  document.cookie = `${AUDIENCE_COOKIE}=${audience}; Max-Age=31536000; Path=/; SameSite=Lax`
}
