import type {ClaimStage} from './stages'

const LABEL: Record<ClaimStage, string> = {
  proposed: 'Proposed',
  attesting: 'Attesting',
  canon: 'Canon',
  contested: 'Contested',
  retired: 'Retired',
}

/**
 * The audit entry the workflows plugin reads. Written the same way the Studio
 * and the Functions write it, so a moderator's ruling appears in the same
 * Audit Trail inspector as everything else.
 */
export function statusEntry(to: ClaimStage, reason: string, userId: string) {
  return {
    _type: 'workflow.setStatus',
    _key: `board-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    statusLabel: LABEL[to],
    statusSlug: to,
    completedAt: new Date().toISOString(),
    completedBy: {_type: 'workflow.user', userId},
    reason,
  }
}

/**
 * Patch operations that move a claim to another stage and record why.
 *
 * `editDocument` takes patch operations, not an updater function: the updater
 * form belongs to `useEditDocument`. Appending rather than rewriting the array
 * matters, because two moderators acting at once must not drop each other's
 * history entries.
 */
export function moveTo(to: ClaimStage, reason: string, userId: string) {
  return {
    set: {status: to},
    setIfMissing: {statuses: []},
    insert: {after: 'statuses[-1]', items: [statusEntry(to, reason, userId)]},
  }
}
