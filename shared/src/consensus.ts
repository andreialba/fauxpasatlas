// One place for the rule that turns attestations into a verdict. Used by the
// recompute Function (to move a claim between stages), the Astro site and the
// Dispute Board (to display the same numbers). Change the threshold here only.

export type Stance = 'rude' | 'fine' | 'depends'
export type Locality = 'local' | 'lived-there' | 'visitor'

export interface AttestationLike {
  stance: Stance
  locality: Locality
  confidence?: number
}

export interface Spread {
  total: number
  locals: number
  byStance: Record<Stance, number>
  localByStance: Record<Stance, number>
  /** Share of weighted votes held by the leading stance, 0..1. */
  agreement: number
  leading: Stance | null
}

export const THRESHOLD = {
  minAttestations: 5,
  minLocals: 3,
  minAgreement: 0.7,
  /** Below this the claim is considered split and drops to Contested. */
  contestedBelow: 0.55,
} as const

// Locals count double, visitors count half. Confidence nudges 0.5..1.5.
export const WEIGHT: Record<Locality, number> = {
  local: 2,
  'lived-there': 1.5,
  visitor: 0.5,
}

const empty = (): Record<Stance, number> => ({rude: 0, fine: 0, depends: 0})

export function spread(attestations: AttestationLike[]): Spread {
  const byStance = empty()
  const localByStance = empty()
  const weighted = empty()
  let locals = 0

  for (const a of attestations) {
    byStance[a.stance] += 1
    if (a.locality === 'local') {
      locals += 1
      localByStance[a.stance] += 1
    }
    const conf = Math.min(3, Math.max(1, a.confidence ?? 2)) / 2
    weighted[a.stance] += WEIGHT[a.locality] * conf
  }

  const totalWeight = weighted.rude + weighted.fine + weighted.depends
  let leading: Stance | null = null
  let agreement = 0
  if (totalWeight > 0) {
    leading = (Object.keys(weighted) as Stance[]).reduce((best, s) =>
      weighted[s] > weighted[best] ? s : best,
    )
    agreement = weighted[leading] / totalWeight
  }

  return {total: attestations.length, locals, byStance, localByStance, agreement, leading}
}

export type Verdict = 'rude' | 'fine' | 'depends' | 'undecided'

export function verdict(s: Spread): Verdict {
  if (s.total === 0 || !s.leading) return 'undecided'
  return s.leading
}

export type StageDecision = 'canon' | 'contested' | 'attesting'

/** Which stage the attestations justify. Callers decide whether to move. */
export function decideStage(s: Spread): StageDecision {
  const enough = s.total >= THRESHOLD.minAttestations && s.locals >= THRESHOLD.minLocals
  if (!enough) return 'attesting'
  if (s.agreement >= THRESHOLD.minAgreement) return 'canon'
  if (s.agreement < THRESHOLD.contestedBelow) return 'contested'
  return 'attesting'
}

export interface RecordEntry extends AttestationLike {
  claimStatus?: string
  claimAttestations: AttestationLike[]
}

export interface TrackRecord {
  /** Every attestation this person has made. */
  total: number
  /** Of those, how many sit on claims the locals have settled. */
  judged: number
  /** Of the judged ones, how many match the settled answer. */
  agreed: number
  /** agreed / judged, or null with fewer than three judged votes. */
  score: number | null
}

/** How often a person's attestations landed on the side that became settled. */
export function trackRecord(entries: RecordEntry[]): TrackRecord {
  let judged = 0
  let agreed = 0
  for (const e of entries) {
    if (e.claimStatus !== 'canon') continue
    const leading = spread(e.claimAttestations).leading
    if (!leading) continue
    judged += 1
    if (leading === e.stance) agreed += 1
  }
  return {total: entries.length, judged, agreed, score: judged >= 3 ? agreed / judged : null}
}
