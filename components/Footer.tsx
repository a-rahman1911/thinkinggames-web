import type { Settings } from '@/sanity/types'

const FALLBACK_LINKS = [
  { label: 'Privacy', url: '/privacy' },
  { label: 'Terms', url: '/terms' },
  { label: 'Contact', url: 'mailto:hello@thinkinggames.com' },
]

export function Footer({ settings }: { settings: Settings }) {
  const links = settings?.footerLinks?.length ? settings.footerLinks : FALLBACK_LINKS
  return (
    <div className="ftr">
      {settings?.mission && (
        <div className="wrap ftr-mission">
          <img src="/brand/mascot-tgi.svg" alt="" />
          <p>{settings.mission}</p>
        </div>
      )}
      <footer className="ftr-bar">
        <div className="wrap">
          <img src="/brand/logo-footer.svg" alt="Thinking Games Initiative" />
          <nav aria-label="Footer">
            {links.map((l) => (
              <a key={l.url + l.label} href={l.url}>
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  )
}
