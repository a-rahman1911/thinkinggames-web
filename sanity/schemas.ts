import { defineArrayMember, defineField, defineType } from 'sanity'
import { ALL_GROUPS } from './groups'

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

const game = defineType({
  name: 'game',
  title: 'Game',
  type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'tagline', type: 'string' }),
    defineField({ name: 'builds', type: 'string', description: 'Skills, separated by " · "' }),
    defineField({
      name: 'image',
      type: 'image',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string' })],
    }),
    defineField({ name: 'url', title: 'Game URL', type: 'url', validation: (r) => r.required() }),
    defineField({
      name: 'badges',
      type: 'array',
      description: 'Small tags on the card, e.g. Free, Solo, 5 min. The first one is highlighted.',
      of: [defineArrayMember({ type: 'string' })],
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'audience',
      title: 'Show on',
      type: 'array',
      description: 'Parents Library lists every game ticked "parents". Teachers see games through Moments.',
      of: [defineArrayMember({ type: 'string' })],
      options: { list: ['teachers', 'parents'], layout: 'grid' },
      initialValue: ['teachers', 'parents'],
    }),
    defineField({
      name: 'filters',
      type: 'array',
      description: 'Which filter options this game matches',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'filterOption' }] })],
    }),
  ],
  preview: { select: { title: 'name', subtitle: 'tagline', media: 'image' } },
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
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'game' }] })],
    }),
  ],
  orderings: [{ title: 'Order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'title', subtitle: 'blurb' } },
})

const filterOption = defineType({
  name: 'filterOption',
  title: 'Filter option',
  type: 'document',
  fields: [
    defineField({ name: 'label', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'group', type: 'string', options: { list: ALL_GROUPS }, validation: (r) => r.required() }),
    defineField({ name: 'order', type: 'number' }),
  ],
  orderings: [{ title: 'Group, then order', name: 'groupOrder', by: [{ field: 'group', direction: 'asc' }, { field: 'order', direction: 'asc' }] }],
  preview: {
    select: { title: 'label', group: 'group' },
    prepare: ({ title, group }) => ({ title, subtitle: ALL_GROUPS.find((g) => g.value === group)?.title }),
  },
})

export const schemaTypes = [seo, link, challenge, siteSettings, homePage, teachersPage, parentsPage, game, moment, filterOption]
