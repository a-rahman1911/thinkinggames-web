import Link from 'next/link'

type Props = {
  current?: 'teachers' | 'parents'
  /** Homepage shows the wordmark-only logo; persona pages show the mascot logo (matches current site). */
  wordmark?: boolean
  /** Rendered between logo and nav, e.g. the Teachers search box. */
  children?: React.ReactNode
}

export function Header({ current, wordmark, children }: Props) {
  return (
    <header className="hdr">
      <div className="wrap">
        <Link href="/" className={`hdr-logo${wordmark ? ' word' : ''}`}>
          <img
            src={wordmark ? '/brand/logo-logotype.svg' : '/brand/logo-horizontal.svg'}
            alt="Thinking Games Initiative"
          />
        </Link>
        {children}
        <nav className="pills" aria-label="Audience">
          <Link
            href="/teachers"
            className="pill"
            style={{ '--c': 'var(--teacher)' } as React.CSSProperties}
            aria-current={current === 'teachers' ? 'page' : undefined}
          >
            Teachers
          </Link>
          <Link
            href="/parents"
            className="pill"
            style={{ '--c': 'var(--parent)' } as React.CSSProperties}
            aria-current={current === 'parents' ? 'page' : undefined}
          >
            Parents
          </Link>
        </nav>
      </div>
    </header>
  )
}
