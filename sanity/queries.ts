import { groq } from 'next-sanity'
import { PARENT_GROUPS, TEACHER_GROUPS } from './groups'

const gameFields = groq`_id, name, tagline, builds, badges, url, image, "filters": filters[]->{_id, group, label}`

export const settingsQuery = groq`*[_type == "siteSettings"][0]{ mission, footerLinks[]{label, url} }`

export const homeQuery = groq`*[_type == "homePage"][0]{ headline, highlight, subline, panels[]{persona, eyebrow, title, text, cta}, seo }`

export const teachersQuery = groq`{
  "page": *[_type == "teachersPage"][0],
  "moments": *[_type == "moment"] | order(order asc){ _id, title, blurb, "games": games[]->{${gameFields}} },
  "options": *[_type == "filterOption" && group in $groups] | order(order asc){ _id, group, label }
}`
export const teacherGroupKeys = TEACHER_GROUPS.map((g) => g.key)

export const parentsQuery = groq`{
  "page": *[_type == "parentsPage"][0],
  "games": *[_type == "game" && "parents" in audience] | order(name asc){${gameFields}},
  "options": *[_type == "filterOption" && group in $groups] | order(order asc){ _id, group, label }
}`
export const parentGroupKeys = PARENT_GROUPS.map((g) => g.key)
