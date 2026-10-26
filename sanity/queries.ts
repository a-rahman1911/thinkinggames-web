import { groq } from 'next-sanity'

// Games carry facts only. Filters, badges and the "Builds" line are derived in lib/derive.ts,
// after resolve() folds the audience's overrides (teachers{} or parents{}) into the shared values.
const overrideFields = groq`
  url, subtitle, image, icon, minutes, feelsLike, badges, featured,
  "skills": skills[]->{ _id, title, order }
`

const gameFields = groq`
  _id, name, subtitle, url, image, icon,
  ageFrom, ageTo, minutes, players, cost, offline, noReading, platforms, feelsLike,
  hidden,
  "skills": skills[]->{ _id, title, order },
  teachers{ show, grades, ${overrideFields} },
  parents{ show, "when": when[]->{ _id, title, order }, ${overrideFields} }
`

// "Brands we support". A brand needs a logo and a URL to show; until both are set in Studio it is left out.
const brands = (audience: 'Teachers' | 'Parents') => groq`
  "brands": *[_type == "brand" && showOn${audience} == true && defined(logo.asset) && defined(url)]
    | order(${audience.toLowerCase()}Order asc, name asc){ _id, name, url, logo }
`

export const settingsQuery = groq`*[_type == "siteSettings"][0]{ mission, footerLinks[]{label, url} }`

export const homeQuery = groq`*[_type == "homePage"][0]{ headline, highlight, subline, panels[]{persona, eyebrow, title, text, cta}, seo }`

// A moment's games array is the source of truth for which games it holds and in what order.
// Games that are off the Teachers page or hidden are left out; the order is kept.
export const teachersQuery = groq`{
  "page": *[_type == "teachersPage"][0],
  "moments": *[_type == "moment"] | order(order asc){
    _id, title, blurb,
    "games": games[@->teachers.show == true && @->hidden != true]->{${gameFields}}
  },
  ${brands('Teachers')}
}`

export const parentsQuery = groq`{
  "page": *[_type == "parentsPage"][0],
  "games": *[_type == "game" && parents.show == true && hidden != true]{${gameFields}},
  "whenOptions": *[_type == "whenOption"] | order(order asc, title asc){ _id, title },
  ${brands('Parents')}
}`
