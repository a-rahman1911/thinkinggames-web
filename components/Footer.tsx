import { Highlight } from './Highlight'
import type { Settings } from '@/sanity/types'

// Shown only while Studio has no footer links. The real links are set in Studio (Site settings → Footer links).
const FALLBACK_LINKS = [{ label: 'Privacy', url: '/privacy' }]

export function Footer({ settings }: { settings: Settings }) {
  const links = settings?.footerLinks?.length ? settings.footerLinks : FALLBACK_LINKS
  return (
    <div className="ftr">
      {(settings?.mission || settings?.missionLabel) && (
        <div className="wrap ftr-mission">
          {settings.missionLabel && <div className="ftr-label">{settings.missionLabel}</div>}
          {settings.mission && (
            <p>
              <Highlight text={settings.mission} highlight={settings.missionHighlight} className="accent" />
            </p>
          )}
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
