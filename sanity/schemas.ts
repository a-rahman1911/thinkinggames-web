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

type AudienceObj = { show?: boolean }

const refList = (type: string) => [defineArrayMember({ type: 'reference', to: [{ type }] })]
const altField = () => defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (r) => r.required() })

/** Hide a field inside an audience object until that audience's "show" switch is on. */
const untilShown = ({ parent }: { parent?: unknown }) => !(parent as AudienceObj | undefined)?.show

/** The values an audience tab can override. Blank means "use the Shared value". */
const overrideFields = (audience: 'Teachers' | 'Parents') => {
  const only = `Only if different for ${audience.toLowerCase()}. Blank uses the Shared value.`
  return [
    defineField({ name: 'url', title: 'URL', type: 'url', description: only, hidden: untilShown }),
    defineField({ name: 'subtitle', type: 'string', description: only, hidden: untilShown }),
    defineField({ name: 'image', type: 'image', description: only, options: { hotspot: true }, fields: [altField()], hidden: untilShown }),
    defineField({ name: 'icon', type: 'image', description: only, fields: [altField()], hidden: untilShown }),
    defineField({
      name: 'minutes',
      type: 'number',
      description: `${only} Drives this page's Minutes filter and badge.`,
      hidden: untilShown,
      validation: (r) => r.integer().min(1).max(120),
    }),
    defineField({ name: 'skills', title: 'Skills it builds', type: 'array', description: only, of: refList('skill'), hidden: untilShown, validation: (r) => r.max(3).unique() }),
    defineField({
      name: 'feelsLike',
      title: 'Feels like',
      type: 'string',
      description: only,
      options: { list: [...FEELS], layout: 'dropdown' },
      hidden: untilShown,
    }),
    defineField({
      name: 'badges',
      type: 'array',
      description: 'Which badges to show on this page. Leave empty to show all.',
      of: [defineArrayMember({ type: 'string' })],
      options: { list: [...BADGE_KINDS], layout: 'grid' },
      hidden: untilShown,
      validation: (r) => r.unique(),
    }),
    defineField({
      name: 'featured',
      type: 'boolean',
      description: audience === 'Teachers' ? 'Show first in Teachers search results' : 'Pin to the top of the Library',
      initialValue: false,
      hidden: untilShown,
    }),
  ]
}

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
      description: 'Card picture. Landscape 16:10, at least 800 x 500.',
      options: { hotspot: true },
      fields: [altField()],
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
      description: 'Youngest age it suits. Drives the Parents "Age" filter.',
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
            const from = (ctx.document as { ageFrom?: number } | undefined)?.ageFrom
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
      description: 'Keep the game but take it off the site, on both pages',
      initialValue: false,
    }),

    defineField({
      name: 'teachers',
      title: 'Teachers',
      type: 'object',
      group: 'teachers',
      description: 'Which moments it sits under, and in what order, is set on each Teacher moment.',
      initialValue: { show: true },
      fields: [
        defineField({ name: 'show', title: 'Show on Teachers page', type: 'boolean', initialValue: true, validation: (r) => r.required() }),
        defineField({
          name: 'grades',
          type: 'array',
          description: 'Grades it suits. Drives the Teachers "Grade" filter. Required when shown.',
          of: [defineArrayMember({ type: 'string' })],
          options: { list: [...GRADES], layout: 'grid' },
          hidden: untilShown,
          validation: (r) =>
            r.unique().custom((v, ctx) => ((ctx.parent as AudienceObj | undefined)?.show && !v?.length ? 'Required when shown on Teachers' : true)),
        }),
        ...overrideFields('Teachers'),
      ],
    }),
    defineField({
      name: 'parents',
      title: 'Parents',
      type: 'object',
      group: 'parents',
      initialValue: { show: true },
      fields: [
        defineField({ name: 'show', title: 'Show on Parents page', type: 'boolean', initialValue: true, validation: (r) => r.required() }),
        defineField({
          name: 'when',
          title: 'When',
          type: 'array',
          description: 'When families would play it. Drives the Parents "When" filter. Required when shown.',
          of: refList('whenOption'),
          hidden: untilShown,
          validation: (r) =>
            r.unique().custom((v, ctx) => ((ctx.parent as AudienceObj | undefined)?.show && !v?.length ? 'Required when shown on Parents' : true)),
        }),
        ...overrideFields('Parents'),
      ],
    }),
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
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'blurb', type: 'string' }),
    defineField({ name: 'order', type: 'number', description: 'Lower numbers show first' }),
    defineField({
      name: 'games',
      type: 'array',
      description: 'The games under this moment, in the order they appear on the page. Drag to reorder. Only games shown on Teachers can be picked.',
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

export const schemaTypes = [seo, link, challenge, siteSettings, homePage, teachersPage, parentsPage, game, moment, skill, whenOption]
