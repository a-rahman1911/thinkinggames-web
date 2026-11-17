import { defineArrayMember, defineField, defineType } from 'sanity'
import { BADGE_KINDS, COSTS, FEELS, GRADES, MINUTES, PLATFORMS, PLAYERS } from '../lib/derive'

export const SINGLETONS = [
  { type: 'siteSettings', title: 'Site settings' },
  { type: 'homePage', title: 'Welcome pop-up' },
  { type: 'teachersPage', title: 'Teachers page' },
  { type: 'parentsPage', title: 'Parents page' },
  { type: 'ideasPage', title: 'Ideas section' },
  { type: 'privacyPage', title: 'Privacy policy' },
  { type: 'tracking', title: 'Tracking and cookie banner' },
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
    // The design dropped the "Copy link" button. Kept hidden so the stored value raises no "unknown field" warning.
    defineField({ name: 'shareUrl', title: '"Copy link" URL', type: 'url', hidden: true }),
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
    defineField({
      name: 'missionLabel',
      title: 'Footer label',
      type: 'string',
      description: 'The small orange line above the footer statement, on every page.',
    }),
    defineField({
      name: 'mission',
      title: 'Footer statement',
      type: 'text',
      rows: 3,
      description: 'The large headline in the footer, on every page.',
    }),
    defineField({
      name: 'missionHighlight',
      title: 'Footer statement: words in orange',
      type: 'string',
      description: 'Words from the footer statement to show in orange. Must match the statement text exactly.',
    }),
    defineField({ name: 'footerLinks', type: 'array', of: [defineArrayMember({ type: 'link' })] }),
    // Saved list (test, round 8). No initial value: missing or false means off. See "Saved list" in docs/STATUS.md.
    defineField({
      name: 'savedList',
      title: 'Saved list (test)',
      type: 'boolean',
      description: 'Lets visitors save games to a list in their browser and share it. Off by default.',
    }),
  ],
  preview: { prepare: () => ({ title: 'Site settings' }) },
})

// The welcome pop-up shown on a first visit to the site's address. The type name and document id are still
// "homePage", from when this content was the home page, so the stored content carries over.
const homePage = defineType({
  name: 'homePage',
  title: 'Welcome pop-up',
  type: 'document',
  fields: [
    defineField({
      name: 'enabled',
      title: 'Show the welcome pop-up',
      type: 'boolean',
      initialValue: true,
      description: 'When off, no pop-up is shown and first-time visitors go straight to the Parents page.',
    }),
    defineField({
      name: 'label',
      type: 'string',
      description: 'The small capital line above the headline in the pop-up. Leave empty to hide it.',
    }),
    defineField({
      name: 'headline',
      type: 'string',
      description: 'The large heading at the top of the pop-up.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'highlight',
      type: 'string',
      description: 'Words from the headline to highlight in the pop-up. Must match the headline text exactly.',
    }),
    defineField({ name: 'subline', title: 'Intro', type: 'text', rows: 2, description: 'The paragraph under the headline in the pop-up.' }),
    defineField({
      name: 'panels',
      title: 'Choices',
      type: 'array',
      description: 'The two choices in the middle of the pop-up, one for teachers and one for parents.',
      validation: (r) => r.max(2),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'panel',
          fields: [
            defineField({
              name: 'persona',
              type: 'string',
              description: 'Which page this choice leads to, and its colour and mascot.',
              options: { list: ['teachers', 'parents'], layout: 'radio' },
              validation: (r) => r.required(),
            }),
            defineField({ name: 'eyebrow', title: 'Label', type: 'string', description: 'The small capital line at the top of the choice.' }),
            defineField({ name: 'title', title: 'Heading', type: 'string', description: 'The heading inside the choice.' }),
            defineField({
              name: 'cta',
              title: 'Button label',
              type: 'string',
              description: 'The button at the bottom of the choice. The arrow is added for you.',
            }),
          ],
          preview: { select: { title: 'title', subtitle: 'persona' } },
        }),
      ],
    }),
    defineField({ name: 'note', type: 'string', description: 'The small line under the choices, at the bottom of the pop-up.' }),
  ],
  preview: { prepare: () => ({ title: 'Welcome pop-up' }) },
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
    defineField({
      name: 'momentsSub',
      type: 'string',
      initialValue: 'Open one to see its games. Narrow them all at once with the filters.',
    }),
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
    description: `Only if different for ${audience}. Card picture. Upload landscape 16:10, 1600×1000. Cards show the middle square of it: set the hotspot if the important part is off-centre.`,
    options: { hotspot: true },
    fields: [altIfImage],
  }),
  defineField({
    name: 'icon',
    type: 'image',
    hidden: whenShown,
    description: `Only if different for ${audience}. Square picture, at least 512 × 512. If set, cards show this instead of a crop of the picture above. Use it when a square crop would cut the picture, such as a wide logo.`,
    fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string' })],
  }),
  defineField({
    name: 'minutes',
    type: 'string',
    hidden: whenShown,
    description: `Only if a round is a different length for ${audience}. Drives the badge and the Minutes filter.`,
    options: { list: [...MINUTES], layout: 'radio' },
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
      description: 'When families would play it. Not shown on the site at the moment: the Parents "When" filter is switched off. The values are kept.',
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
      name: 'site',
      title: 'Site name',
      type: 'string',
      group: 'shared',
      description:
        "Where the game lives, for example PBS KIDS. Shown above the game's name: 'On PBS KIDS'. Leave empty to work it out from the game's URL.",
    }),
    defineField({
      name: 'image',
      type: 'image',
      group: 'shared',
      description: 'Card picture. Upload landscape 16:10, 1600×1000. Cards show the middle square of it: set the hotspot if the important part is off-centre.',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (r) => r.required() })],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'icon',
      type: 'image',
      group: 'shared',
      description: 'Square picture, at least 512 × 512. If set, cards show this instead of a crop of the picture above. Use it when a square crop would cut the picture, such as a wide logo.',
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
      type: 'string',
      group: 'shared',
      description: 'Typical play time for one round. Drives the "Minutes" filter and the "10 min" badge.',
      options: { list: [...MINUTES], layout: 'radio' },
      validation: (r) => r.required(),
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
      description: '1 to 3 skills. Shown under the game, in this order. Also the Parents "Thinking skill" filter.',
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

type BrandDoc = { showOnTeachers?: boolean; showOnParents?: boolean }

/**
 * A chip in the "Brands we support" carousel under the Challenge banner. Each page has its own switch and order.
 * A brand shows once it is switched on for the page and has a URL; without a logo the chip shows its name.
 */
const brand = defineType({
  name: 'brand',
  title: 'Brand',
  type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'logo',
      type: 'image',
      description:
        "Shown up to 44px tall and about 180px wide, on white. Crop the file tightly to the logo. With no logo, the brand's name is shown as text.",
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'url',
      description: 'Opens in a new tab',
      validation: (r) => r.required().uri({ scheme: ['http', 'https'] }),
    }),
    defineField({ name: 'showOnTeachers', title: 'On Teachers page', type: 'boolean', initialValue: false }),
    defineField({
      name: 'teachersOrder',
      title: 'Order on Teachers page',
      type: 'number',
      description: 'Lower numbers show first',
      hidden: ({ document }) => !(document as BrandDoc | undefined)?.showOnTeachers,
    }),
    defineField({ name: 'showOnParents', title: 'On Parents page', type: 'boolean', initialValue: false }),
    defineField({
      name: 'parentsOrder',
      title: 'Order on Parents page',
      type: 'number',
      description: 'Lower numbers show first',
      hidden: ({ document }) => !(document as BrandDoc | undefined)?.showOnParents,
    }),
  ],
  orderings: [{ title: 'Name', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] }],
  preview: {
    select: { title: 'name', media: 'logo', teachers: 'showOnTeachers', parents: 'showOnParents' },
    prepare: ({ title, media, teachers, parents }) => ({
      title,
      subtitle: [teachers && 'Teachers', parents && 'Parents'].filter(Boolean).join(' + ') || 'nowhere',
      media,
    }),
  },
})

// ---- Ideas (round 11): an editorial section, switched off by default. See "Ideas" in docs/STATUS.md. ----

// The one switch. No document, or `enabled` not true, means the section does not exist on the site.
const ideasPage = defineType({
  name: 'ideasPage',
  title: 'Ideas section',
  type: 'document',
  fields: [
    defineField({
      name: 'enabled',
      title: 'Show the Ideas section',
      type: 'boolean',
      description:
        'Off: no header link, no strips on Teachers and Parents, and /ideas and every article answer "not found". Articles can be written and published while this is off.',
    }),
    defineField({
      name: 'navLabel',
      title: 'Name in the header',
      type: 'string',
      description: 'The link in the header, and the heading of the strips ("Ideas for teachers"). Empty shows "Ideas". The address is always /ideas.',
    }),
    defineField({
      name: 'headline',
      type: 'string',
      description: 'The large heading at the top of /ideas. Empty shows "Ideas for getting more out of thinking games."',
    }),
    defineField({
      name: 'highlight',
      type: 'string',
      description: 'Words from the headline to highlight on /ideas. Must match the headline text exactly.',
    }),
    defineField({ name: 'intro', type: 'text', rows: 3, description: 'The paragraph under the heading on /ideas.' }),
    defineField({ name: 'seo', type: 'seo', description: 'The browser tab title and search description of /ideas.' }),
  ],
  preview: { prepare: () => ({ title: 'Ideas section' }) },
})

const IDEA_AUDIENCES = [
  { title: 'Teachers', value: 'teachers' },
  { title: 'Parents', value: 'parents' },
  { title: 'Both', value: 'both' },
]

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// The body of an article. This list is the whole menu: writers cannot style anything else.
const articleBody = defineField({
  name: 'body',
  type: 'array',
  description: 'Text, headings and lists, and from the "+" menu: Game, Tip, Quote, Picture.',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        { title: 'Text', value: 'normal' },
        { title: 'Heading', value: 'h2' },
        { title: 'Small heading', value: 'h3' },
      ],
      lists: [
        { title: 'Bulleted', value: 'bullet' },
        { title: 'Numbered', value: 'number' },
      ],
      marks: {
        decorators: [
          { title: 'Bold', value: 'strong' },
          { title: 'Italic', value: 'em' },
        ],
        annotations: [
          {
            name: 'link',
            title: 'Link',
            type: 'object',
            fields: [
              defineField({
                name: 'href',
                title: 'URL',
                type: 'url',
                validation: (r) => r.required().uri({ allowRelative: true, scheme: ['http', 'https', 'mailto'] }),
              }),
            ],
          },
        ],
      },
    }),
    defineArrayMember({
      name: 'gameCard',
      title: 'Game',
      type: 'object',
      fields: [
        defineField({
          name: 'game',
          type: 'reference',
          to: [{ type: 'game' }],
          // Weak, so a game that an article mentions can still be deleted. The article then leaves it out.
          weak: true,
          description: 'Shown as the same card the library uses. A hidden or deleted game is left out of the article.',
          validation: (r) => r.required(),
        }),
      ],
      preview: {
        select: { title: 'game.name', media: 'game.icon', image: 'game.image' },
        prepare: ({ title, media, image }) => ({ title: title || 'Choose a game', subtitle: 'Game', media: media || image }),
      },
    }),
    defineArrayMember({
      name: 'tip',
      title: 'Tip',
      type: 'object',
      fields: [
        defineField({ name: 'label', type: 'string', initialValue: 'Tip', description: 'The small capital line above the text.' }),
        defineField({ name: 'text', type: 'text', rows: 3, validation: (r) => r.required() }),
      ],
      preview: { select: { title: 'text', subtitle: 'label' }, prepare: ({ title, subtitle }) => ({ title, subtitle: subtitle || 'Tip' }) },
    }),
    defineArrayMember({
      name: 'quote',
      title: 'Quote',
      type: 'object',
      fields: [
        defineField({ name: 'text', type: 'text', rows: 3, validation: (r) => r.required() }),
        defineField({ name: 'source', type: 'string', description: 'Who said it. Optional.' }),
      ],
      preview: { select: { title: 'text', source: 'source' }, prepare: ({ title, source }) => ({ title, subtitle: source ? `Quote, ${source}` : 'Quote' }) },
    }),
    defineArrayMember({
      name: 'picture',
      title: 'Picture',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description: 'What the picture shows, for people who cannot see it.',
          validation: (r) => r.required(),
        }),
        defineField({ name: 'caption', type: 'string', description: 'A small line under the picture. Optional.' }),
      ],
      preview: { select: { title: 'alt', subtitle: 'caption', media: 'asset' }, prepare: ({ title, subtitle, media }) => ({ title: title || 'Picture', subtitle: subtitle || 'Picture', media }) },
    }),
  ],
})

const article = defineType({
  name: 'article',
  title: 'Article',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title', maxLength: 80 },
      description: 'The address of the article: /ideas/{slug}. Press Generate to make it from the title.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'audience',
      type: 'string',
      options: { list: IDEA_AUDIENCES, layout: 'radio' },
      description: 'Decides the label, the colour, and where the article is listed. Both: listed for teachers and for parents.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'summary',
      type: 'text',
      rows: 3,
      description: 'On cards, under the title on the article, and as the search description. 160 characters at most.',
      validation: (r) => r.required().max(160),
    }),
    defineField({
      name: 'cover',
      type: 'image',
      options: { hotspot: true },
      description: "Optional. With none, the cover is built from the pictures of the first three games in the article.",
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string', description: 'What the picture shows.' })],
    }),
    defineField({ name: 'author', type: 'string', description: 'Shown as "By …". Left out when empty.' }),
    defineField({
      name: 'publishedAt',
      title: 'Date',
      type: 'date',
      initialValue: today,
      description: 'Shown on the article and used for ordering, newest first. It does not schedule anything.',
      validation: (r) => r.required(),
    }),
    articleBody,
    defineField({ name: 'seo', type: 'seo' }),
  ],
  orderings: [
    { title: 'Newest first', name: 'dateDesc', by: [{ field: 'publishedAt', direction: 'desc' }] },
    { title: 'Title', name: 'titleAsc', by: [{ field: 'title', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'title', audience: 'audience', date: 'publishedAt', media: 'cover' },
    prepare: ({ title, audience, date, media }) => ({
      title,
      subtitle: [IDEA_AUDIENCES.find((a) => a.value === audience)?.title, date].filter(Boolean).join(' · '),
      media,
    }),
  },
})
// ---- end Ideas ----

// ---- Privacy policy (round 13): the text of /privacy. No document, or an empty body, means /privacy answers "not found". ----
const privacyPage = defineType({
  name: 'privacyPage',
  title: 'Privacy policy',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', description: 'The page heading. Shows "Privacy policy" when empty.' }),
    defineField({
      name: 'updated',
      title: 'Last updated',
      type: 'date',
      description: 'Shown under the heading as "Last updated 16 November 2026". Left out when empty.',
    }),
    defineField({
      name: 'body',
      type: 'array',
      description: 'Text, headings, bulleted lists, bold, italic and links. While this is empty, /privacy answers "not found".',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Text', value: 'normal' },
            { title: 'Heading', value: 'h2' },
            { title: 'Small heading', value: 'h3' },
          ],
          lists: [{ title: 'Bulleted', value: 'bullet' }],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
            ],
            annotations: [
              {
                name: 'link',
                title: 'Link',
                type: 'object',
                fields: [
                  defineField({
                    name: 'href',
                    title: 'URL',
                    type: 'url',
                    validation: (r) => r.required().uri({ allowRelative: true, scheme: ['http', 'https', 'mailto'] }),
                  }),
                ],
              },
            ],
          },
        }),
      ],
    }),
    defineField({ name: 'seo', type: 'seo', description: 'The browser tab title and search description of /privacy.' }),
  ],
  preview: { prepare: () => ({ title: 'Privacy policy' }) },
})

// Tracking and the cookie banner (round 14). The one switch. No document, or `enabled` not true, means off:
// no banner, no "Cookie settings" link, no PostHog. The banner cannot be off while tracking is on: they are one switch.
const tracking = defineType({
  name: 'tracking',
  title: 'Tracking and cookie banner',
  type: 'document',
  fields: [
    defineField({
      name: 'enabled',
      title: 'Turn on tracking and the cookie banner',
      type: 'boolean',
      description:
        'Off: no cookie banner, no "Cookie settings" link in the footer and no analytics. On: visitors are asked once, and analytics runs only for those who accept.',
    }),
    defineField({
      name: 'text',
      title: 'Banner text',
      type: 'text',
      rows: 3,
      description:
        'A "Privacy policy" link is added after it. Empty shows "We use cookies to see how this site is used and to measure our advertising. You can change your choice at any time."',
    }),
    defineField({ name: 'acceptLabel', title: 'Accept button', type: 'string', description: 'Empty shows "Accept".' }),
    defineField({ name: 'declineLabel', title: 'Decline button', type: 'string', description: 'Empty shows "Decline".' }),
    defineField({
      name: 'gpcText',
      title: 'Text for browsers that ask not to be tracked',
      type: 'text',
      rows: 3,
      description:
        'Shown in "Cookie settings" when the browser sends Global Privacy Control. Empty shows "Your browser asks websites not to track you (Global Privacy Control), so tracking is off."',
    }),
  ],
  preview: { prepare: () => ({ title: 'Tracking and cookie banner' }) },
})

export const schemaTypes = [seo, link, challenge, siteSettings, homePage, teachersPage, parentsPage, teacherSettings, parentSettings, game, moment, skill, whenOption, brand, ideasPage, article, privacyPage, tracking]
