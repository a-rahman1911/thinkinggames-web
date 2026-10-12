import { defineArrayMember, defineField, defineType } from 'sanity'
import { COSTS, FEELS, PLATFORMS, PLAYERS, SHOW_ON } from '../lib/derive'

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

type GameDoc = { ageFrom?: number; showOn?: string[] }

const refList = (type: string) => [defineArrayMember({ type: 'reference', to: [{ type }] })]

const game = defineType({
  name: 'game',
  title: 'Game',
  type: 'document',
  groups: [
    { name: 'basics', title: 'Basics', default: true },
    { name: 'facts', title: 'Facts' },
    { name: 'placement', title: 'Where it shows' },
    { name: 'internal', title: 'Internal' },
  ],
  fields: [
    defineField({ name: 'name', type: 'string', group: 'basics', validation: (r) => r.required() }),
    defineField({
      name: 'subtitle',
      type: 'string',
      group: 'basics',
      description: 'One short line under the name',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'url', title: 'Game URL', type: 'url', group: 'basics', validation: (r) => r.required() }),
    defineField({
      name: 'image',
      type: 'image',
      group: 'basics',
      description: 'Card picture. Landscape 16:10, at least 800 x 500.',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (r) => r.required() })],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'icon',
      type: 'image',
      group: 'basics',
      description: 'Square logo or icon, at least 256 x 256. Used where a picture is too big.',
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string' })],
    }),

    defineField({
      name: 'ageFrom',
      title: 'Age from',
      type: 'number',
      group: 'facts',
      description: 'Youngest age it suits. Drives the Parents "Age" and Teachers "Grade" filters.',
      validation: (r) => r.required().integer().min(3).max(14),
    }),
    defineField({
      name: 'ageTo',
      title: 'Age to',
      type: 'number',
      group: 'facts',
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
      group: 'facts',
      description: 'Typical play time for one round. Drives the "Minutes" filter and the "10 min" badge.',
      validation: (r) => r.required().integer().min(1).max(120),
    }),
    defineField({
      name: 'players',
      type: 'array',
      group: 'facts',
      of: [defineArrayMember({ type: 'string' })],
      options: { list: [...PLAYERS], layout: 'grid' },
      validation: (r) => r.required().min(1).unique(),
    }),
    defineField({
      name: 'cost',
      type: 'string',
      group: 'facts',
      options: { list: [...COSTS], layout: 'radio' },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'offline',
      title: 'Works offline',
      type: 'boolean',
      group: 'facts',
      initialValue: false,
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'noReading',
      title: 'No reading needed',
      type: 'boolean',
      group: 'facts',
      description: 'Can a non-reader play it?',
      initialValue: false,
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'platforms',
      type: 'array',
      group: 'facts',
      description: 'Not shown yet; kept for future filters',
      of: [defineArrayMember({ type: 'string' })],
      options: { list: [...PLATFORMS], layout: 'grid' },
      validation: (r) => r.unique(),
    }),
    defineField({
      name: 'skills',
      title: 'Skills it builds',
      type: 'array',
      group: 'facts',
      description: '1 to 3 skills. Shown as the "Builds …" line.',
      of: refList('skill'),
      validation: (r) => r.required().min(1).max(3).unique(),
    }),
    defineField({
      name: 'feelsLike',
      title: 'Feels like',
      type: 'string',
      group: 'facts',
      options: { list: [...FEELS], layout: 'radio' },
      validation: (r) => r.required(),
    }),

    defineField({
      name: 'showOn',
      title: 'Show on',
      type: 'array',
      group: 'placement',
      of: [defineArrayMember({ type: 'string' })],
      options: { list: [...SHOW_ON], layout: 'grid' },
      initialValue: [...SHOW_ON],
      validation: (r) => r.required().min(1).unique(),
    }),
    defineField({
      name: 'when',
      title: 'When (parents)',
      type: 'array',
      group: 'placement',
      description: 'When families would play it. Required when shown on Parents.',
      of: refList('whenOption'),
      validation: (r) =>
        r.unique().custom((v, ctx) => {
          const show = (ctx.document as GameDoc | undefined)?.showOn
          return show?.includes('parents') && !v?.length ? 'Required when the game is shown on Parents' : true
        }),
    }),
    defineField({
      name: 'moments',
      title: 'Teacher moments',
      type: 'array',
      group: 'placement',
      description: 'Which lesson moments it appears under. Required when shown on Teachers.',
      of: refList('moment'),
      validation: (r) =>
        r.unique().custom((v, ctx) => {
          const show = (ctx.document as GameDoc | undefined)?.showOn
          return show?.includes('teachers') && !v?.length ? 'Required when the game is shown on Teachers' : true
        }),
    }),
    defineField({ name: 'featured', type: 'boolean', group: 'placement', description: 'Pin to the top of the list', initialValue: false }),
    defineField({ name: 'hidden', type: 'boolean', group: 'placement', description: 'Keep the game but take it off the site', initialValue: false }),

    defineField({ name: 'partner', type: 'string', group: 'internal', description: 'Who makes it. Not shown yet.' }),
    defineField({ name: 'notes', type: 'text', rows: 3, group: 'internal', description: 'For editors only. Never shown on the site.' }),
  ],
  orderings: [{ title: 'Name', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] }],
  preview: {
    select: { title: 'name', subtitle: 'subtitle', media: 'image', hidden: 'hidden' },
    prepare: ({ title, subtitle, media, hidden }) => ({ title: hidden ? `${title} (hidden)` : title, subtitle, media }),
  },
})

const moment = defineType({
  name: 'moment',
  title: 'Teacher moment',
  type: 'document',
  description: 'Games appear under a moment through the "Teacher moments" field on the game.',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'blurb', type: 'string' }),
    defineField({ name: 'order', type: 'number', description: 'Lower numbers show first' }),
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

export const schemaTypes = [seo, link, challenge, siteSettings, homePage, teachersPage, parentsPage, game, moment, skill, whenOption]
