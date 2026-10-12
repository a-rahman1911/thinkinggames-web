import { groq } from 'next-sanity'

// Games carry shared facts plus a `teachers` and a `parents` object (show, overrides, filters).
// lib/derive.ts resolve() folds an audience's overrides in; filters, badges and the "Builds" line are derived from that.
const audienceFields = groq`
  show, url, subtitle, image, icon, minutes, feelsLike, badges, featured,
  "skills": skills[]->{ _id, title, order }
`

const gameFields = groq`
  _id, name, subtitle, url, image, icon,
  ageFrom, ageTo, minutes, players, cost, offline, noReading, platforms, feelsLike,
  hidden,
  "skills": skills[]->{ _id, title, order },
  teachers{ ${audienceFields}, grades },
  parents{ ${audienceFields}, "when": when[]->{ _id, title, order } }
`

export const settingsQuery = groq`*[_type == "siteSettings"][0]{ mission, footerLinks[]{label, url} }`

export const homeQuery = groq`*[_type == "homePage"][0]{ headline, highlight, subline, panels[]{persona, eyebrow, title, text, cta}, seo }`

// Each moment lists its games in the order set by hand in Studio. Games that are hidden or not shown on Teachers are left out.
export const teachersQuery = groq`{
  "page": *[_type == "teachersPage"][0],
  "moments": *[_type == "moment"] | order(order asc){
    _id, title, blurb,
    "games": games[@->teachers.show == true && @->hidden != true]->{${gameFields}}
  }
}`

export const parentsQuery = groq`{
  "page": *[_type == "parentsPage"][0],
  "games": *[_type == "game" && parents.show == true && hidden != true]{${gameFields}},
  "whenOptions": *[_type == "whenOption"] | order(order asc, title asc){ _id, title }
}`
