import { TopLink } from './TopLink'

/**
 * The back-to-top button (round 17), on Teachers and Parents only. It goes last inside the part of the page that
 * holds the list (Parents: the results column; Teachers: the section with the moments), which must have the
 * `to-top-area` class. What it does is the footer logo's link (components/TopLink.tsx).
 *
 * When it shows is CSS alone (app/globals.css, "Back to top"): the track runs from about 600px into that part of the
 * page to its end, and the button sticks to the bottom of the screen inside it. So it is not there at the top of the
 * page, and it scrolls away with the end of the list instead of sitting over the footer.
 */
export function BackToTop() {
  return (
    <div className="to-top-track">
      <TopLink className="to-top" label="Back to top">
        <span aria-hidden="true">↑</span>
      </TopLink>
    </div>
  )
}
