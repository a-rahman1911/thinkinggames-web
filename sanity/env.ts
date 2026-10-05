export const apiVersion = '2025-01-01'
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || ''

if (!projectId && typeof window === 'undefined') {
  console.warn('NEXT_PUBLIC_SANITY_PROJECT_ID is not set. Copy .env.example to .env.local.')
}
