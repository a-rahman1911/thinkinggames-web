// Ideas (round 11): the "Preview" action on an article in Studio. It opens the article on the site in
// preview, drafts included, whether or not the Ideas section is switched on. See app/api/preview/route.ts.

import { createPreviewSecret } from '@sanity/preview-url-secret/create-secret'
import { useState } from 'react'
import { type DocumentActionComponent, useClient, useCurrentUser } from 'sanity'
import { apiVersion } from './env'

export const PreviewAction: DocumentActionComponent = ({ draft, published, onComplete }) => {
  const client = useClient({ apiVersion })
  const user = useCurrentUser()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const slug = ((draft || published)?.slug as { current?: string } | undefined)?.current

  return {
    label: busy ? 'Opening preview…' : 'Preview',
    title: !slug
      ? 'Give the article a slug first'
      : failed
        ? 'The preview could not be opened. Try again.'
        : 'Open this article on the site in preview. Only your browser sees it.',
    tone: failed ? 'critical' : 'default',
    disabled: !slug || busy,
    onHandle: async () => {
      // Opened before the wait, so the browser does not treat it as a pop-up.
      const tab = window.open('', '_blank')
      setBusy(true)
      setFailed(false)
      try {
        // A one-time secret, valid for an hour, stored as a private document that only signed-in editors
        // and the site's read token can see. Expired ones are deleted on the next preview.
        const { secret } = await createPreviewSecret(client, 'thinkinggames-web', window.location.href, user?.id)
        const url = `/api/preview?sanity-preview-secret=${encodeURIComponent(secret)}&sanity-preview-pathname=${encodeURIComponent(`/ideas/${slug}`)}`
        if (tab) tab.location.href = url
        else window.location.href = url
      } catch (err) {
        console.error('Preview failed', err)
        tab?.close()
        setFailed(true)
      } finally {
        setBusy(false)
        onComplete()
      }
    },
  }
}
