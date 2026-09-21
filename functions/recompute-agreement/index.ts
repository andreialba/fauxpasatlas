import {createClient} from '@sanity/client'
import {documentEventHandler} from '@sanity/functions'
import {decideStage, spread, type AttestationLike} from '@atlas/shared/consensus'
import {transition, type ClaimStage} from '../lib/workflow'

interface Data {
  _id: string
  claimId?: string
}

/** Stages this function is allowed to move a claim between. Never out of
 *  Proposed (that is the dedupe check's job) and never out of Retired. */
const MOVABLE: ClaimStage[] = ['attesting', 'canon', 'contested']

export const handler = documentEventHandler<Data>(async ({context, event}) => {
  const claimId = event.data.claimId
  if (!claimId) {
    console.log('attestation without a claim, nothing to do')
    return
  }

  const client = createClient({...context.clientOptions, apiVersion: '2026-04-12', useCdn: false})

  const claim = await client.fetch<{status: ClaimStage; attestations: AttestationLike[]} | null>(
    `*[_type == "claim" && _id == $id][0]{
      status,
      "attestations": *[_type == "attestation" && claim._ref == ^._id]{stance, locality, confidence}
    }`,
    {id: claimId},
  )

  if (!claim) {
    console.log(`claim ${claimId} not found`)
    return
  }
  if (!MOVABLE.includes(claim.status)) {
    console.log(`claim ${claimId} is ${claim.status}, leaving it alone`)
    return
  }

  const s = spread(claim.attestations)
  const next = decideStage(s)

  if (next === claim.status) {
    console.log(`claim ${claimId} stays ${claim.status} (${s.total} voices, ${Math.round(s.agreement * 100)}%)`)
    return
  }

  await transition(
    client,
    claimId,
    next,
    `${s.total} attestations, ${s.locals} local, ${Math.round(s.agreement * 100)}% agreement.`,
    'function:recompute-agreement',
  )
  console.log(`claim ${claimId}: ${claim.status} → ${next}`)
})
