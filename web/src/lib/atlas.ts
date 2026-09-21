// Types the site works with, plus the labels that turn a stance into words.
// The arithmetic itself lives in @atlas/shared/consensus so the Function, the
// Dispute Board and this site can never disagree about a verdict.

import type {AttestationLike, Spread, Stance, Verdict} from '@atlas/shared/consensus'

export type {Spread, Stance, Verdict}

export interface PlaceRef {
  _id?: string
  name: string
  flag?: string
  iso?: string
  slug?: string
  kind?: string
}

export interface ContextRef {
  _id?: string
  title: string
  icon?: string
  slug?: string
  description?: string
  claimCount?: number
}

export interface ClaimCard {
  _id: string
  statement: string
  slug: string
  status: string
  detail?: string
  place: PlaceRef
  context: ContextRef
  attestations: AttestationLike[]
  openDisputes: number
}

export const STANCE_LABEL: Record<Verdict, string> = {
  rude: 'Rude',
  fine: 'Fine',
  depends: 'Depends',
  undecided: 'Not settled',
}

/** The sentence under the badge on a claim page. */
export const STANCE_MEANING: Record<Verdict, string> = {
  rude: 'Locals say don’t. You will be noticed, and not kindly.',
  fine: 'Locals say go ahead. Nobody will blink.',
  depends: 'Locals say it turns on the situation. Read the detail.',
  undecided: 'Not enough local voices yet. Add yours.',
}

export const STAGE_LABEL: Record<string, string> = {
  proposed: 'Proposed',
  attesting: 'Gathering opinions',
  canon: 'Settled',
  contested: 'Contested',
  retired: 'Retired',
}

export const LOCALITY_LABEL: Record<string, string> = {
  local: 'From here',
  'lived-there': 'Lived there',
  visitor: 'Visitor',
}

/** 0.42 → "42%" */
export const pct = (n: number) => `${Math.round(n * 100)}%`

/**
 * A claim is only presented as an answer once it is settled. Anything else
 * gets a hedge in the interface, which is the whole point of the site.
 */
export const isSettled = (status: string) => status === 'canon'

export const claimHref = (slug: string) => `/claim/${slug}/`
export const placeHref = (slug: string) => `/atlas/${slug}/`
export const quizHref = (slug: string) => `/quiz/${slug}/`
export const contextHref = (slug: string) => `/atlas/situation/${slug}/`

/**
 * What the interface is allowed to show. A contested claim never gets a stance
 * badge, however the arithmetic leans: printing "Rude" on a claim locals are
 * split over would undo the one promise this site makes.
 */
export const shownVerdict = (status: string, v: Verdict): Verdict =>
  status === 'contested' ? 'undecided' : v

export const shownLabel = (status: string): string | undefined =>
  status === 'contested' ? 'Split' : undefined

export const CONTESTED_MEANING =
  'Locals answered and did not agree. The Atlas will not pick a side, so here is the split.'
