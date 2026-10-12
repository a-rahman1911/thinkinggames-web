import { groq } from 'next-sanity'

// Games carry facts only. Filters, badges and the "Builds" line are derived in lib/derive.ts.
const gameFields = groq`
  _id, name, subtitle, url, image, icon,
  ageFrom, ageTo, minutes, players, cost, offline, noReading, platforms, feelsLike,
  featured, hidden,
  "skills": skills[]->{ _id, title, order },
  "when": when[]->{ _id, title, order }
`

export const settingsQuery = groq`*[_type == "siteSettings"][0]{ mission, footerLinks[]{label, url} }`

export const homeQuery = groq`*[_type == "homePage"][0]{ headline, highlight, subline, panels[]{persona, eyebrow, title, text, cta}, seo }`

// A game sits under every moment it references.
export const teachersQuery = groq`{
  "page": *[_type == "teachersPage"][0],
  "moments": *[_type == "moment"] | order(order asc){
    _id, title, blurb,
    "games": *[_type == "game" && references(^._id) && "teachers" in showOn && hidden != true]{${gameFields}}
  }
}`

export const parentsQuery = groq`{
  "page": *[_type == "parentsPage"][0],
  "games": *[_type == "game" && "parents" in showOn && hidden != true]{${gameFields}},
  "whenOptions": *[_type == "whenOption"] | order(order asc, title asc){ _id, title }
}`
