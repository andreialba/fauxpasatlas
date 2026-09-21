export type ClaimStage = 'proposed' | 'attesting' | 'canon' | 'contested' | 'retired'

export const STANCES = ['rude', 'depends', 'fine'] as const

export const STANCE_LABEL: Record<string, string> = {
  rude: 'Rude',
  depends: 'Depends',
  fine: 'Fine',
}

export const LOCALITY_LABEL: Record<string, string> = {
  local: 'From here',
  'lived-there': 'Lived there',
  visitor: 'Visitor',
}

/** Sanity UI tones, one per stance. Grey for the ones nobody has settled. */
export const STANCE_TONE: Record<string, 'critical' | 'caution' | 'positive' | 'default'> = {
  rude: 'critical',
  depends: 'caution',
  fine: 'positive',
  undecided: 'default',
}

export const pct = (n: number) => `${Math.round(n * 100)}%`
