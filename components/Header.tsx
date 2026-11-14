'use client'

import Link from 'next/link'
import { rememberAudience } from '@/lib/audience'

/** Logo and the two audience pills. Clicking a pill also remembers that audience for the next visit to `/`. */
export function Header({ current }: { current?: 'teachers' | 'parents' }) {
  return (
    <header className="hdr">
      <div className="wrap">
        {/* A plain link, so `/` is always a fresh request that middleware can redirect to the remembered page. */}
        <a href="/" className="hdr-logo">
          <img src="/brand/logo-horizontal.svg" alt="Thinking Games Initiative" />
        </a>
        <nav className="pills" aria-label="Audience">
          <Link
            href="/teachers"
            className="pill"
            style={{ '--c': 'var(--teacher)' } as React.CSSProperties}
            aria-current={current === 'teachers' ? 'page' : undefined}
            onClick={() => rememberAudience('teachers')}
          >
            Teachers
          </Link>
          <Link
            href="/parents"
            className="pill"
            style={{ '--c': 'var(--parent)' } as React.CSSProperties}
            aria-current={current === 'parents' ? 'page' : undefined}
            onClick={() => rememberAudience('parents')}
          >
            Parents
          </Link>
        </nav>
      </div>
    </header>
  )
}
