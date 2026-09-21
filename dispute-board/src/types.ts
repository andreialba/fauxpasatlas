import type {AttestationLike} from '@atlas/shared/consensus'

export interface Attestation extends AttestationLike {
  note?: string
  handle?: string
  attesterId?: string
}

export interface Dispute {
  _id: string
  status: string
  reason: string
  _createdAt: string
  openedBy?: string
  evidence?: {_key: string; url?: string; note?: string}[]
}

export interface HistoryEntry {
  statusSlug?: string
  statusLabel?: string
  completedAt?: string
  reason?: string
  by?: string
}

export interface Case {
  _id: string
  statement: string
  slug: string
  status: string
  detail?: string
  place: {_id: string; name: string; iso?: string; flag?: string; slug: string}
  context: {_id: string; title: string}
  attestations: Attestation[]
  disputes: Dispute[]
  history?: HistoryEntry[]
}

export type Outcome = 'keep' | 'split' | 'retire'
