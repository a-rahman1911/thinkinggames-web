import { defineArrayMember, defineField, defineType } from 'sanity'
import { BADGE_KINDS, COSTS, FEELS, GRADES, PLATFORMS, PLAYERS } from '../lib/derive'

export const SINGLETONS = [
  { type: 'siteSettings', title: 'Site settings' },
  { type: 'homePage', title: 'Home page' },
  { type: 'teachersPage', title: 'Teachers page' },
  { type: 'parentsPage', title: 'Parents page' },
]

const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  options: { collapsible: true, collapsed: true },
  fields: [
    defineField({ name: 'title', type: 'string', description: 'Browser tab and Google title' }),
    defineField({ name: 'description', type: 'text', rows: 3, validation: (r) => r.max(160) }),
  ],
})

const link = defineType({
  name: 'link',
  type: 'object',
  fields: [
    defineField({ name: 'label', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'url',
      validation: (r) => r.required().uri({ allowRelative: true, scheme: ['http', 'https', 'mailto'] }),
    }),
  ],
  preview: { select: { title: 'label', subtitle: 'url' } },
})

const challenge = defineType({
  name: 'challenge',
  title: 'Thinking Challenge banner',
  type: 'object',
  fields: [
    defineField({ name: 'show', type: 'boolean', initialValue: true, description: 'Turn the banner off without deleting it' }),
    defineField({ name: 'eyebrow', type: 'string', initialValue: 'Opens on the Challenge site' }),
    defineField({ name: 'title', type: 'string', initialValue: 'The Thinking Challenge' }),
    defineField({ name: 'text', type: 'text', rows: 3 }),
    defineField({ name: 'buttons', title: 'Age buttons', type: 'array', of: [defineArrayMember({ type: 'link' })] }),
    defineField({ name: 'shareUrl', title: '"Copy link" URL', type: 'url' }),
  ],
})

const heroFields = [
  defineField({ name: 'headline', type: 'string', validation: (r) => r.required() }),
  defineField({
    name: 'highlight',
    type: 'string',
    description: 'Words from the headline to highlight. Must match the headline text exactly.',
  }),
  defineField({ name: 'subline', type: 'text', rows: 2 }),
]

const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    defineField({ name: 'mission', title: 'Mission statement (footer)', type: 'text', rows: 3 }),
    defineField({ name: 'footerLinks', type: 'array', of: [defineArrayMember({ type: 'link' })] }),
  ],
  preview: { prepare: () => ({ title: 'Site settings' }) },
})

const homePage = defineType({
  name: 'homePage',
  title: 'Home page',
  type: 'document',
  fields: [
    ...heroFields,
    defineField({
      name: 'panels',
      title: 'Audience panels',
      type: 'array',
      validation: (r) => r.max(2),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'panel',
          fields: [
            defineField({
              name: 'persona',
              type: 'string',
              options: { list: ['teachers', 'parents'], layout: 'radio' },
              validation: (r) => r.required(),
            }),
            defineField({ name: 'eyebrow', type: 'string' }),
            defineField({ name: 'title', type: 'string' }),
            defineField({ name: 'text', type: 'text', rows: 2 }),
            defineField({ name: 'cta', title: 'Button label', type: 'string' }),
          ],
          preview: { select: { title: 'title', subtitle: 'persona' } },
        }),
      ],
    }),
    defineField({ name: 'seo', type: 'seo' }),
  ],
  preview: { prepare: () => ({ title: 'Home page' }) },
})

const teachersPage = defineType({
  name: 'teachersPage',
  title: 'Teachers page',
  type: 'document',
  fields: [
    ...heroFields,
    defineField({ name: 'searchPlaceholder', type: 'string', initialValue: 'Search games by name' }),
    defineField({ name: 'challenge', type: 'challenge' }),
    defineField({ name: 'momentsHeading', type: 'string', initialValue: "What's the moment?" }),
    defineField({ name: 'momentsSub', type: 'string', initialValue: 'Open one to see its games.' }),
    defineField({
      name: 'defaultOpen',
      title: 'Moment open on load',
      type: 'number',
      description: '1 = first moment, 2 = second… 0 = all closed',
      initialValue: 2,
    }),
    defineField({ name: 'seo', type: 'seo' }),
  ],
  preview: { prepare: () => ({ title: 'Teachers page' }) },
})

const parentsPage = defineType({
  name: 'parentsPage',
  title: 'Parents page',
  type: 'document',
  fields: [
    ...heroFields,
    defineField({ name: 'challenge', type: 'challenge' }),
    defineField({ name: 'searchPlaceholder', type: 'string', initialValue: 'Search games by name' }),
    defineField({ name: 'emptyText', title: 'No results message', type: 'string', initialValue: 'Nothing matches all of those.' }),
    defineField({ name: 'seo', type: 'seo' }),
  ],
  preview: { prepare: () => ({ title: 'Parents page' }) },
})

type GameDoc = { ageFrom?: number }
type AudienceParent = { show?: boolean } | undefined
type ImageParent = { asset?: unknown } | undefined

const refList = (type: string) => [defineArrayMember({ type: 'reference', to: [{ type }] })]

/** Alt text that is required once an image has been chosen. Used on the override images. */
const altIfImage = defineField({
  name: 'alt',
  title: 'Alt text',
  type: 'string',
  validation: (r) => r.custom((alt, ctx) => ((ctx.parent as ImageParent)?.asset && !alt ? 'Add alt text for this image' : true)),
})

/** Everything in an audience tab except `show` is hidden until `show` is on. */
const whenShown = ({ parent }: { parent: unknown }) => !(parent as AudienceParent)?.show

/**
 * The per-audience values that may replace a shared value. Leave one empty to use the shared value.
 * The same set is used for teachers and parents; each audience adds its own filter field in front.
 */
const overrideFields = (audience: 'teachers' | 'parents') => [
  defineField({
    name: 'url',
    title: 'URL',
    type: 'url',
    hidden: whenShown,
    description: `Only if ${audience} should go somewhere else than the shared Game URL`,
  }),
  defineField({ name: 'subtitle', type: 'string', hidden: whenShown, description: `Only if different for ${audience}` }),
  defineField({
    name: 'image',
    type: 'image',
    hidden: whenShown,
    description: `Only if different for ${audience}. Landscape 16:10, upload 1600×1000.`,
    options: { hotspot: true },
    fields: [altIfImage],
  }),
  defineField({
    name: 'icon',
    type: 'image',
    hidden: whenShown,
    description: `Only if different for ${audience}. Square, at least 256 x 256.`,
    fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string' })],
  }),
  defineField({
    name: 'minutes',
    type: 'number',
    hidden: whenShown,
    description: `Only if a round is a different length for ${audience}. Drives the badge and the Minutes filter.`,
    validation: (r) => r.integer().min(1).max(120),
  }),
  defineField({
    name: 'skills',
    title: 'Skills it builds',
    type: 'array',
    hidden: whenShown,
    description: `Only if different for ${audience}. 1 to 3 skills.`,
    of: refList('skill'),
    validation: (r) => r.max(3).unique(),
  }),
  defineField({
    name: 'feelsLike',
    title: 'Feels like',
    type: 'string',
    hidden: whenShown,
    description: `Only if different for ${audience}`,
    options: { list: [...FEELS], layout: 'radio' },
  }),
  defineField({
    name: 'badges',
    type: 'array',
    hidden: whenShown,
    description: 'Which badges to show on the card. Empty = all.',
    of: [defineArrayMember({ type: 'string' })],
    options: { list: [...BADGE_KINDS], layout: 'grid' },
    validation: (r) => r.unique(),
  }),
  defineField({
    name: 'featured',
    type: 'boolean',
    hidden: whenShown,
    initialValue: false,
    description: audience === 'teachers' ? 'Show first in Teachers search results' : 'Pin to the top of the Library',
  }),
]

const teacherSettings = defineType({
  name: 'teacherSettings',
  title: 'Teachers',
  type: 'object',
  fields: [
    defineField({ name: 'show', title: 'On Teachers page', type: 'boolean', initialValue: true, validation: (r) => r.required() }),
    defineField({
      name: 'grades',
      type: 'array',
      hidden: whenShown,
      description: 'Grades it suits, set by hand. Drives the Teachers "Grade" filter.',
      of: [defineArrayMember({ type: 'string' })],
      options: { list: [...GRADES], layout: 'grid' },
      validation: (r) =>
        r.unique().custom((v, ctx) => ((ctx.parent as AudienceParent)?.show && !v?.length ? 'Required when the game is on the Teachers page' : true)),
    }),
    ...overrideFields('teachers'),
  ],
})

const parentSettings = defineType({
  name: 'parentSettings',
  title: 'Parents',
  type: 'object',
  fields: [
    defineField({ name: 'show', title: 'On Parents page', type: 'boolean', initialValue: true, validation: (r) => r.required() }),
    defineField({
      name: 'when',
      title: 'When (parents)',
      type: 'array',
      hidden: whenShown,
      description: 'When families would play it. Drives the Parents "When" filter.',
      of: refList('whenOption'),
      validation: (r) =>
        r.unique().custom((v, ctx) => ((ctx.parent as AudienceParent)?.show && !v?.length ? 'Required when the game is on the Parents page' : true)),
    }),
    ...overrideFields('parents'),
  ],
})

const game = defineType({
  name: 'game',
  title: 'Game',
  type: 'document',
  groups: [
    { name: 'shared', title: 'Shared', default: true },
    { name: 'teachers', title: 'Teachers' },
    { name: 'parents', title: 'Parents' },
  ],
  fields: [
    defineField({ name: 'name', type: 'string', group: 'shared', validation: (r) => r.required() }),
    defineField({
      name: 'subtitle',
      type: 'string',
      group: 'shared',
      description: 'One short line under the name',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'url', title: 'Game URL', type: 'url', group: 'shared', validation: (r) => r.required() }),
    defineField({
      name: 'image',
      type: 'image',
      group: 'shared',
      description: 'Card picture. Landscape 16:10, upload 1600×1000.',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (r) => r.required() })],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'icon',
      type: 'image',
      group: 'shared',
      description: 'Square logo or icon, at least 256 x 256. Used where a picture is too big.',
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string' })],
    }),
    defineField({
      name: 'ageFrom',
      title: 'Age from',
      type: 'number',
      group: 'shared',
      description: 'Youngest age it suits. Drives the Parents "Age" filter. (Teachers grades are set by hand in the Teachers tab.)',
      validation: (r) => r.required().integer().min(3).max(14),
    }),
    defineField({
      name: 'ageTo',
      title: 'Age to',
      type: 'number',
      group: 'shared',
      validation: (r) =>
        r
          .required()
          .integer()
          .min(3)
          .max(14)
          .custom((v, ctx) => {
            const from = (ctx.document as GameDoc | undefined)?.ageFrom
            return typeof v === 'number' && typeof from === 'number' && v < from ? 'Must be at least "Age from"' : true
          }),
    }),
    defineField({
      name: 'minutes',
      type: 'number',
      group: 'shared',
      description: 'Typical play time for one round. Drives the "Minutes" filter and the "10 min" badge.',
      validation: (r) => r.required().integer().min(1).max(120),
    }),
    defineField({
      name: 'players',
      type: 'array',
      group: 'shared',
      of: [defineArrayMember({ type: 'string' })],
      options: { list: [...PLAYERS], layout: 'grid' },
      validation: (r) => r.required().min(1).unique(),
    }),
    defineField({
      name: 'cost',
      type: 'string',
      group: 'shared',
      options: { list: [...COSTS], layout: 'radio' },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'offline',
      title: 'Works offline',
      type: 'boolean',
      group: 'shared',
      initialValue: false,
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'noReading',
      title: 'No reading needed',
      type: 'boolean',
      group: 'shared',
      description: 'Can a non-reader play it?',
      initialValue: false,
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'platforms',
      type: 'array',
      group: 'shared',
      description: 'Not shown yet; kept for future filters',
      of: [defineArrayMember({ type: 'string' })],
      options: { list: [...PLATFORMS], layout: 'grid' },
      validation: (r) => r.unique(),
    }),
    defineField({
      name: 'skills',
      title: 'Skills it builds',
      type: 'array',
      group: 'shared',
      description: '1 to 3 skills. Shown as the "Builds …" line.',
      of: refList('skill'),
      validation: (r) => r.required().min(1).max(3).unique(),
    }),
    defineField({
      name: 'feelsLike',
      title: 'Feels like',
      type: 'string',
      group: 'shared',
      options: { list: [...FEELS], layout: 'radio' },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'partner', type: 'string', group: 'shared', description: 'Who makes it. Not shown yet.' }),
    defineField({ name: 'notes', type: 'text', rows: 3, group: 'shared', description: 'For editors only. Never shown on the site.' }),
    defineField({
      name: 'hidden',
      type: 'boolean',
      group: 'shared',
      description: 'Keep the game but take it off the site, for both audiences',
      initialValue: false,
    }),

    defineField({ name: 'teachers', type: 'teacherSettings', group: 'teachers', initialValue: { show: true } }),
    defineField({ name: 'parents', type: 'parentSettings', group: 'parents', initialValue: { show: true } }),
  ],
  orderings: [{ title: 'Name', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] }],
  preview: {
    select: { title: 'name', subtitle: 'subtitle', media: 'image', hidden: 'hidden', teachers: 'teachers.show', parents: 'parents.show' },
    prepare: ({ title, subtitle, media, hidden, teachers, parents }) => {
      const on = [teachers && 'Teachers', parents && 'Parents'].filter(Boolean).join(' + ') || 'nowhere'
      return { title: hidden ? `${title} (hidden)` : title, subtitle: `${on} · ${subtitle || ''}`, media }
    },
  },
})

const moment = defineType({
  name: 'moment',
  title: 'Teacher moment',
  type: 'document',
  description: 'An accordion section on the Teachers page. Its games list sets which games show and in what order.',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'blurb', type: 'string' }),
    defineField({ name: 'order', type: 'number', description: 'Lower numbers show first' }),
    defineField({
      name: 'games',
      type: 'array',
      description: 'The games under this moment, in the order they show. Drag to reorder. Only games that are on the Teachers page can be added.',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'game' }], options: { filter: 'teachers.show == true' } })],
      validation: (r) => r.unique(),
    }),
  ],
  orderings: [{ title: 'Order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'title', subtitle: 'blurb' } },
})

const skill = defineType({
  name: 'skill',
  title: 'Skill',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'order', type: 'number', description: 'Lower numbers show first' }),
  ],
  orderings: [{ title: 'Order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'title' } },
})

const whenOption = defineType({
  name: 'whenOption',
  title: 'When option (parents)',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'order', type: 'number', description: 'Lower numbers show first' }),
  ],
  orderings: [{ title: 'Order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'title' } },
})

export const schemaTypes = [seo, link, challenge, siteSettings, homePage, teachersPage, parentsPage, teacherSettings, parentSettings, game, moment, skill, whenOption]
