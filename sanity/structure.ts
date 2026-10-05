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
      S.documentTypeListItem('moment').title('Teacher moments'),
      S.documentTypeListItem('game').title('Games'),
      S.documentTypeListItem('filterOption').title('Filter options'),
    ])
