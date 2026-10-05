'use client'

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes, SINGLETONS } from './sanity/schemas'
import { structure } from './sanity/structure'
import { apiVersion, dataset, projectId } from './sanity/env'

const singletonTypes = new Set(SINGLETONS.map((s) => s.type))

export default defineConfig({
  basePath: '/studio',
  title: 'Thinking Games',
  projectId,
  dataset,
  schema: {
    types: schemaTypes,
    // Singletons can't be created or duplicated from the "New" menu.
    templates: (templates) => templates.filter(({ schemaType }) => !singletonTypes.has(schemaType)),
  },
  document: {
    actions: (input, ctx) =>
      singletonTypes.has(ctx.schemaType)
        ? input.filter(({ action }) => action && ['publish', 'discardChanges', 'restore'].includes(action))
        : input,
  },
  plugins: [structureTool({ structure }), visionTool({ defaultApiVersion: apiVersion })],
})
