// Push a claim back through the claim-dedupe Function and watch what it does.
// Run from studio/:  npx sanity exec scripts/retrigger-dedupe.ts --with-user-token -- <claim id>
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2026-04-12'})
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const ID = process.argv[process.argv.length - 1]

async function main() {
  if (!ID?.startsWith('claim-')) throw new Error('pass a claim id as the last argument')
  await client.patch(ID).set({status: 'proposed', dedupe: {status: 'pending'}}).commit()
  console.log(`${ID}: reset to proposed + pending; waiting…`)
  for (let i = 1; i <= 8; i++) {
    await sleep(5000)
    const d = await client.fetch(`*[_id == $id][0]{status, dedupe{status, notes, "related": related[]._ref}}`, {id: ID})
    console.log(`t+${i * 5}s`, JSON.stringify(d))
    if (d?.dedupe?.status !== 'pending') break
  }
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
