// @ts-check
import {defineConfig} from 'astro/config'
import cloudflare from '@astrojs/cloudflare'
import {site} from './src/config/site.ts'

// Static by default: the atlas is a catalogue and should be served as files.
// Only the write endpoints under /api and the pages that must never be stale
// opt out with `export const prerender = false`.
export default defineConfig({
  site: site.url,
  output: 'static',
  adapter: cloudflare({imageService: 'compile'}),
  build: {
    // One stylesheet, inlined: no render-blocking CSS request and the
    // @font-face rules are visible on first paint.
    inlineStylesheets: 'always',
  },
  vite: {
    // The workerd dev runtime cannot load @sanity/client out of Vite's
    // pre-bundled deps directory. Production builds are fine; this only
    // affects `astro dev`.
    optimizeDeps: {exclude: ['@sanity/client']},
  },
})
