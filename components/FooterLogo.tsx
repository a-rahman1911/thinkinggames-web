import { TopLink } from './TopLink'

/**
 * The footer logo (round 16): a link to the top of the page the visitor is on (components/TopLink.tsx). The header
 * logo goes to `/`, where middleware sends a returning visitor to their remembered page; this one must not.
 */
export function FooterLogo() {
  return (
    <TopLink className="ftr-logo" label="Thinking Games Initiative: back to top">
      <img src="/brand/logo-footer.svg" alt="" />
    </TopLink>
  )
}
