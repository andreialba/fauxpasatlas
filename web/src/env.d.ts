/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SANITY_WRITE_TOKEN?: string
}

// The Workers runtime provides this module; the adapter stubs it in dev and
// at build time. Declared loosely so the site does not need the full
// @cloudflare/workers-types package.
declare module 'cloudflare:workers' {
  export const env: Record<string, unknown>
}
