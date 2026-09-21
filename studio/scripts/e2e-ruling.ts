// End-to-end check of the Phase 4 checkpoint without a browser: file a ruling
// with the same transaction shape the Dispute Board uses, then confirm the
// live site stops showing the claim. Creates its own claim and cleans up.
// Run from studio/:  npx sanity exec scripts/e2e-ruling.ts --with-user-token
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2026-04-12'})
const ref = (_ref: string) => ({_type: 'reference' as const, _ref})
const SITE = 'https://faux-pas-atlas.xocoweb.workers.dev'

const SLUG = 'italy-e2e-ruling-check'
const CLAIM = `claim-${SLUG}`
const DISPUTE = `dispute-${SLUG}`
const RULING = `ruling-${SLUG}`

async function status(path: string) {
  // A fresh query string sidesteps the one-minute edge cache.
  const res = await fetch(`${SITE}${path}?v=${Date.now()}`, {redirect: 'manual'})
  return res.status
}

async function main() {
  const me = await client.request<{id: string}>({url: '/users/me'})

  // A contested claim: four locals split two against two.
  const setup = client.transaction().createOrReplace({
    _id: CLAIM,
    _type: 'claim',
    statement: 'E2E: ruling check, ignore',
    slug: {_type: 'slug', current: SLUG},
    place: ref('place-italy'),
    context: ref('context-dining'),
    status: 'contested',
    dedupe: {status: 'unique', notes: 'e2e'},
  })
  ;['rude', 'fine', 'rude', 'fine'].forEach((stance, i) =>
    setup.createOrReplace({
      _id: `attestation-${SLUG}-${i}`,
      _type: 'attestation',
      claim: ref(CLAIM),
      stance,
      locality: 'local',
      confidence: 2,
      attester: ref('attester-marco'),
      source: 'seed',
    }),
  )
  setup.createOrReplace({
    _id: DISPUTE,
    _type: 'dispute',
    claim: ref(CLAIM),
    reason: 'E2E dispute so the ruling has something to answer.',
    status: 'opened',
  })
  await setup.commit()

  const before = await status(`/claim/${SLUG}/`)
  console.log(`claim page before ruling: HTTP ${before}`)

  // Same shape as RulingPane.submit with outcome "retire".
  const now = new Date().toISOString()
  await client
    .transaction()
    .createOrReplace({
      _id: RULING,
      _type: 'ruling',
      dispute: ref(DISPUTE),
      outcome: 'retire',
      summary: 'E2E: retired by the checkpoint script.',
      moderator: me.id,
    })
    .patch(DISPUTE, (p) => p.set({status: 'closed'}))
    .patch(CLAIM, (p) =>
      p
        .set({status: 'retired'})
        .setIfMissing({statuses: []})
        .insert('after', 'statuses[-1]', [
          {
            _type: 'workflow.setStatus',
            _key: `e2e-${Date.now().toString(36)}`,
            statusLabel: 'Retired',
            statusSlug: 'retired',
            completedAt: now,
            completedBy: {_type: 'workflow.user', userId: me.id},
            reason: 'E2E: retired by the checkpoint script.',
          },
        ]),
    )
    .commit()

  // The site reads through the Sanity CDN, which lags a few seconds.
  let after = 0
  for (let i = 0; i < 12; i++) {
    after = await status(`/claim/${SLUG}/`)
    console.log(`t+${i * 5}s claim page after ruling: HTTP ${after}`)
    if (after === 404) break
    await new Promise((r) => setTimeout(r, 5000))
  }

  const trail = await client.fetch(`*[_id == $id][0]{status, "last": statuses[-1].statusSlug}`, {id: CLAIM})
  console.log('claim in the dataset:', JSON.stringify(trail))

  // Clean up in dependency order: referrers first.
  await client.transaction().delete(RULING).delete(DISPUTE).commit()
  const cleanup = client.transaction()
  for (let i = 0; i < 4; i++) cleanup.delete(`attestation-${SLUG}-${i}`)
  cleanup.delete(CLAIM)
  await cleanup.commit()
  console.log('cleaned up')

  if (before !== 200 || after !== 404) {
    console.error('CHECKPOINT FAILED')
    process.exit(1)
  }
  console.log('CHECKPOINT PASSED: a ruling removes the claim from the live site.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
