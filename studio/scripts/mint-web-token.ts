// Creates an Editor API token for the site's write endpoints and prints ONLY
// the token to stdout so it can be piped straight into `wrangler secret put`.
import {getCliClient} from 'sanity/cli'
const client = getCliClient({apiVersion: '2026-04-12'})
async function main() {
  const res = await client.request<{key: string}>({
    url: '/projects/dh2oc30x/tokens',
    method: 'POST',
    body: {label: `faux-pas-atlas-web-${new Date().toISOString().slice(0, 10)}`, roleName: 'editor'},
  })
  process.stdout.write(res.key)
}
main().catch((e) => { console.error(e?.message ?? e); process.exit(1) })
