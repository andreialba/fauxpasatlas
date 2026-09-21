// End-to-end check of the deployed Functions. Adds three local "fine" votes to
// a claim that is one step from settled, proposes a near-duplicate claim, then
// watches what the Functions do to both.
// Run from studio/:  npx sanity exec scripts/e2e-functions.ts --with-user-token
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2026-04-12'})
const ref = (_ref: string) => ({_type: 'reference' as const, _ref})
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const CLAIM = 'claim-portugal-tipping-5-10-at-a-restaurant'
const DUPE = 'claim-portugal-e2e-tipping-five-to-ten-percent'

async function main() {
  const before = await client.fetch(`*[_id == $id][0]{status, "n": count(*[_type=="attestation" && claim._ref==^._id])}`, {id: CLAIM})
  console.log('before:', before)

  const tx = client.transaction()
  for (const h of ['e2e-lisboeta', 'e2e-portuense', 'e2e-algarvia']) {
    tx.createOrReplace({_id: `attester-${h}`, _type: 'attester', handle: h})
    tx.createOrReplace({
      _id: `attestation-e2e-${h}`,
      _type: 'attestation',
      claim: ref(CLAIM),
      stance: 'fine',
      locality: 'local',
      confidence: 3,
      attester: ref(`attester-${h}`),
      source: 'web',
    })
  }
  tx.createOrReplace({
    _id: DUPE,
    _type: 'claim',
    statement: 'Tipping five to ten percent at restaurants',
    slug: {_type: 'slug', current: 'portugal-e2e-tipping-five-to-ten-percent'},
    place: ref('place-portugal'),
    context: ref('context-money'),
    status: 'proposed',
    dedupe: {status: 'pending'},
  })
  await tx.commit()
  console.log('wrote 3 attestations and 1 proposed claim; waiting for the Functions…')

  for (let i = 1; i <= 8; i++) {
    await sleep(5000)
    const [claim, dupe] = await Promise.all([
      client.fetch(`*[_id == $id][0]{status, "last": statuses[-1]{statusSlug, reason, "by": completedBy.userId}}`, {id: CLAIM}),
      client.fetch(`*[_id == $id][0]{status, dedupe{status, notes, "related": related[]._ref}}`, {id: DUPE}),
    ])
    console.log(`t+${i * 5}s`, JSON.stringify({claim, dupe}))
    if (claim?.status === 'canon' && dupe?.dedupe?.status !== 'pending') break
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
