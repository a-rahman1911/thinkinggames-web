// Screen widths that both the stylesheet and the scripts depend on. CSS cannot read a variable inside a media query,
// so app/globals.css repeats these numbers; lib/breakpoints.test.mts fails if the two disagree.

/** Phones: up to this width. */
export const PHONE_MAX = 640

/**
 * Parents filters (round 18): up to this width they sit behind the "Filters" button in the full-screen panel and the
 * "Filters" bar sticks at the top; from one pixel more they are the sidebar beside the list and the search bar sticks.
 */
export const FILTERS_PANEL_MAX = 860

/** Wider than a phone. */
export const ABOVE_PHONE = `(min-width: ${PHONE_MAX + 1}px)`

/** Wide enough for the Parents filter sidebar. */
export const SIDEBAR = `(min-width: ${FILTERS_PANEL_MAX + 1}px)`
