import type {SanityClient} from '@sanity/client'

export type ClaimStage = 'proposed' | 'attesting' | 'canon' | 'contested' | 'retired'

const LABEL: Record<ClaimStage, string> = {
  proposed: 'Proposed',
  attesting: 'Attesting',
  canon: 'Canon',
  contested: 'Contested',
  retired: 'Retired',
}

/**
 * Move a claim to another stage the same way the Studio plugin does: set
 * `status` and append a `workflow.setStatus` entry, so the Audit Trail
 * inspector shows the function's decision next to the human ones.
 */
export async function transition(
  client: SanityClient,
  claimId: string,
  to: ClaimStage,
  reason: string,
  actor: string,
) {
  return client
    .patch(claimId)
    .set({status: to})
    .setIfMissing({statuses: []})
    .append('statuses', [
      {
        _type: 'workflow.setStatus',
        _key: `${actor}-${Date.now().toString(36)}`,
        statusLabel: LABEL[to],
        statusSlug: to,
        completedAt: new Date().toISOString(),
        completedBy: {_type: 'workflow.user', userId: actor},
        reason,
      },
    ])
    .commit()
}
