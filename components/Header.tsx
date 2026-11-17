'use client'

import Link from 'next/link'
import { toPersona, track } from '@/lib/analytics'
import { rememberAudience, type Audience } from '@/lib/audience'

// A pill remembers the audience, then counts the choice (`persona_selected`, round 14).
const choose = (audience: Audience) => {
  rememberAudience(audience)
  track('persona_selected', { persona: toPersona(audience), method: 'header' })
}

/**
 * Logo and the two audience pills. Clicking a pill also remembers that audience for the next visit to `/`.
 * `ideasLabel` is the Ideas section's name when the section is on (round 11): a plain link before the pills.
 * Without it the header is exactly as it was.
 */
export function Header({ current, ideasLabel }: { current?: 'teachers' | 'parents' | 'ideas'; ideasLabel?: string | null }) {
  return (
    <header className="hdr">
      <div className="wrap">
        {/* A plain link, so `/` is always a fresh request that middleware can redirect to the remembered page. */}
        <a href="/" className="hdr-logo">
          <img src="/brand/logo-horizontal.svg" alt="Thinking Games Initiative" />
        </a>
        <nav className="pills" aria-label={ideasLabel ? 'Main' : 'Audience'}>
          {ideasLabel && (
            <Link href="/ideas" className="hdr-link" aria-current={current === 'ideas' ? 'page' : undefined}>
              {ideasLabel}
            </Link>
          )}
          <Link
            href="/teachers"
            className="pill"
            style={{ '--c': 'var(--teacher)' } as React.CSSProperties}
            aria-current={current === 'teachers' ? 'page' : undefined}
            onClick={() => choose('teachers')}
          >
            Teachers
          </Link>
          <Link
            href="/parents"
            className="pill"
            style={{ '--c': 'var(--parent)' } as React.CSSProperties}
            aria-current={current === 'parents' ? 'page' : undefined}
            onClick={() => choose('parents')}
          >
            Parents
          </Link>
        </nav>
      </div>
    </header>
  )
}
