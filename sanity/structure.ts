import type { StructureResolver } from 'sanity/structure'
import { SINGLETONS } from './schemas'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      ...SINGLETONS.map(({ type, title }) =>
        S.listItem().title(title).id(type).child(S.document().schemaType(type).documentId(type).title(title)),
      ),
      S.divider(),
      S.documentTypeListItem('game').title('Games'),
      S.documentTypeListItem('brand').title('Brands we support'),
      S.documentTypeListItem('moment').title('Teacher moments'),
      S.documentTypeListItem('skill').title('Skills'),
      S.documentTypeListItem('whenOption').title('When options (parents)'),
    ])
