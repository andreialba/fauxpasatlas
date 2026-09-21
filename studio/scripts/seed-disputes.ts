// Seeds written disputes so the board and /disputes have something real in
// them. A dispute is someone saying the atlas has it wrong and explaining why,
// which is a different signal from a claim that is merely split.
//
// Run from studio/:  npx sanity exec scripts/seed-disputes.ts --with-user-token

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2026-04-12'})
const ref = (_ref: string) => ({_type: 'reference' as const, _ref})

type DisputeSeed = {
  claimSlug: string
  by: string
  status: 'opened' | 'evidence' | 'ruling'
  reason: string
  evidence?: {url: string; note: string}[]
}

const disputes: DisputeSeed[] = [
  {
    claimSlug: 'norway-tipping-at-a-restaurant',
    by: 'katja',
    status: 'evidence',
    reason:
      'This is being answered by people who visited Oslo. Outside the capital, rounding up is normal and nobody reads it as an insult. The claim needs splitting by city rather than one verdict for the whole country.',
    evidence: [
      {
        url: 'https://www.sanity.io/',
        note: 'Placeholder link: seeded example, not a real source.',
      },
    ],
  },
  {
    claimSlug: 'norway-asking-someone-what-they-earn',
    by: 'lea',
    status: 'opened',
    reason:
      'Tax records being public does not make asking someone directly comfortable. Looking it up is fine; asking over dinner is a different act, and the claim conflates the two.',
  },
  {
    claimSlug: 'france-splitting-the-bill-item-by-item',
    by: 'louis',
    status: 'opened',
    reason:
      'Among people under thirty this is completely ordinary and usually done in an app before anyone leaves the table. The verdict reads like it was written twenty years ago.',
  },
  {
    claimSlug: 'spain-wearing-beachwear-away-from-the-beach',
    by: 'beatriz',
    status: 'ruling',
    reason:
      'True in most towns and actually fined in several, but on the Canary and Balearic coasts nobody blinks a street back from the sand. One verdict for the whole country is wrong here.',
  },
  {
    claimSlug: 'japan-eating-while-walking-down-the-street',
    by: 'jun',
    status: 'opened',
    reason:
      'Depends entirely on where you are. At a festival stall it is the whole point; on a commuter train platform it is not. The claim should say which.',
  },
]

async function main() {
  const tx = client.transaction()
  let made = 0
  const missing: string[] = []

  for (const d of disputes) {
    const claim = await client.fetch<{_id: string} | null>(
      `*[_type == "claim" && slug.current == $slug][0]{_id}`,
      {slug: d.claimSlug},
    )
    if (!claim) {
      missing.push(d.claimSlug)
      continue
    }

    tx.createOrReplace({
      _id: `dispute-seed-${d.claimSlug}`,
      _type: 'dispute',
      claim: ref(claim._id),
      reason: d.reason,
      status: d.status,
      openedBy: ref(`attester-${d.by}`),
      ...(d.evidence
        ? {
            evidence: d.evidence.map((e, i) => ({
              _type: 'evidenceItem',
              _key: `e${i}`,
              url: e.url,
              note: e.note,
            })),
          }
        : {}),
    })
    made++
  }

  await tx.commit()
  console.log(`seeded ${made} disputes`)
  if (missing.length) console.log('claims not found (run seed-content first):', missing.join(', '))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
