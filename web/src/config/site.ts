export const site = {
  name: 'Faux Pas Atlas',
  short: 'Faux Pas',
  url: 'https://faux-pas-atlas.xocoweb.workers.dev',
  tagline: 'Is it rude here?',
  description:
    'Etiquette answered by the people who live there. Every verdict is the consensus of local attestations, never one editor’s opinion.',
  accent: '#C8FF00',
  repo: 'https://github.com/andreialba/fauxpasatlas',
  projectId: 'dh2oc30x',
  dataset: 'production',
} as const

export const nav = [
  {href: '/atlas/', label: 'Atlas'},
  {href: '/disputes/', label: 'Disputes'},
  {href: '/about/', label: 'How it works'},
] as const
