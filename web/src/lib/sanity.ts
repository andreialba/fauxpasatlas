import {createClient, type SanityClient} from '@sanity/client'
import {env as workerEnv} from 'cloudflare:workers'
import {site} from '../config/site'

const API_VERSION = '2026-04-12'

/**
 * Read-only, no token. The dataset is public.
 *
 * Not through the Sanity CDN: Cloudflare caches a Worker's subrequests by the
 * origin's Cache-Control, and apicdn sends `s-maxage=60`, so a retired claim
 * kept rendering for minutes after it left the dataset. The live API sends no
 * cache headers. Traffic is far below the Free plan's request budget.
 */
export const sanity: SanityClient = createClient({
  projectId: site.projectId,
  dataset: site.dataset,
  apiVersion: API_VERSION,
  useCdn: false,
  perspective: 'published',
})

/**
 * Write client for the API routes. The token never reaches the browser.
 *
 * On Cloudflare the secret is only reachable through the `cloudflare:workers`
 * env module (Astro 6+ removed `locals.runtime.env`). In `astro dev` and at
 * build time that module is a stub, so fall back to the Vite env from .env.
 */
export function writeClient(): SanityClient {
  const fromWorker = (workerEnv as Record<string, unknown> | undefined)?.SANITY_WRITE_TOKEN as
    | string
    | undefined
  const token = fromWorker ?? import.meta.env.SANITY_WRITE_TOKEN

  if (!token) throw new Error('SANITY_WRITE_TOKEN is not set')

  return createClient({
    projectId: site.projectId,
    dataset: site.dataset,
    apiVersion: API_VERSION,
    useCdn: false,
    token,
  })
}
