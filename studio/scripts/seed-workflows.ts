// Seeds the two workflow.definition documents the plugin reads.
// Run from studio/:  npx sanity exec scripts/seed-workflows.ts --with-user-token
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2026-04-12'})

const slug = (current: string) => ({_type: 'slug' as const, current})

const role = (label: string, key: string, projectRoles: string[]) => ({
  _type: 'workflow.role',
  _key: key,
  label,
  slug: slug(key),
  projectRoles,
})

type StageOpts = {icon: string; color: string; publish?: boolean; criteria?: string}
const stage = (label: string, key: string, o: StageOpts) => ({
  _type: 'workflow.stage',
  _key: key,
  label,
  slug: slug(key),
  icon: o.icon,
  color: o.color,
  enablePublishing: o.publish ?? false,
  enableCompletionGating: false,
  enableNotifications: false,
  ...(o.criteria ? {stageCriteria: block(o.criteria, `${key}-criteria`)} : {}),
})

type RampOpts = StageOpts & {tone: string; unpublish?: boolean}
const offRamp = (label: string, key: string, o: RampOpts) => ({
  _type: 'workflow.offRamp',
  _key: key,
  label,
  slug: slug(key),
  icon: o.icon,
  tone: o.tone,
  enablePublishing: o.publish ?? false,
  unpublishOnEntry: o.unpublish ?? false,
  enableNotifications: false,
  allowedRoles: ['moderator'],
  ...(o.criteria ? {stageCriteria: block(o.criteria, `${key}-criteria`)} : {}),
})

const block = (text: string, key: string) => [
  {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: `${key}-span`, text, marks: []}],
  },
]

// Free plan only has administrator and viewer, so every acting role maps to
// administrator. Separation of duties is a workflow concept here, not a Sanity permission.
const moderator = role('Moderator', 'moderator', ['administrator'])

const claimWorkflow = {
  _id: 'workflow.definition.claim',
  _type: 'workflow.definition',
  title: 'Claim lifecycle',
  slug: slug('claim-lifecycle'),
  documentType: 'claim',
  description:
    'A claim is proposed, gathers attestations, and becomes canon when locals agree. Contested and Retired are side exits.',
  forwardOnly: false,
  roles: [moderator],
  stages: [
    stage('Proposed', 'proposed', {
      icon: 'lightbulb',
      color: '#8b8b8b',
      criteria: 'Statement is one behaviour in one place and one context. Duplicate check has run.',
    }),
    stage('Attesting', 'attesting', {
      icon: 'users',
      color: '#3b82f6',
      publish: true,
      criteria: 'Visible on the site as "gathering opinions". Promoted to Canon automatically at the agreement threshold.',
    }),
    stage('Canon', 'canon', {
      icon: 'badge-check',
      color: '#16a34a',
      publish: true,
      criteria: 'Enough local attestations agree. Verdict shown without a warning.',
    }),
  ],
  offRamps: [
    offRamp('Contested', 'contested', {
      icon: 'flame',
      color: '#f97316',
      tone: 'caution',
      publish: true,
      criteria: 'Attestations split or a dispute is open. Still visible, flagged on the site.',
    }),
    offRamp('Retired', 'retired', {
      icon: 'archive',
      color: '#6b7280',
      tone: 'critical',
      unpublish: true,
      criteria: 'Retired by a ruling. History stays in the dataset; the site no longer shows it.',
    }),
  ],
}

const disputeWorkflow = {
  _id: 'workflow.definition.dispute',
  _type: 'workflow.definition',
  title: 'Dispute resolution',
  slug: slug('dispute-resolution'),
  documentType: 'dispute',
  description: 'Someone says a canon claim is wrong. Evidence is gathered, a moderator rules, the dispute closes.',
  forwardOnly: true,
  roles: [moderator],
  stages: [
    stage('Opened', 'opened', {icon: 'message-square-warning', color: '#f97316'}),
    stage('Evidence', 'evidence', {
      icon: 'search',
      color: '#3b82f6',
      criteria: 'At least one piece of evidence or a clear reason from a local.',
    }),
    stage('Ruling', 'ruling', {
      icon: 'scale',
      color: '#8b5cf6',
      criteria: 'A ruling document exists: keep, split, or retire.',
    }),
    stage('Closed', 'closed', {icon: 'check-circle-2', color: '#16a34a', publish: true}),
  ],
  offRamps: [
    offRamp('Withdrawn', 'withdrawn', {
      icon: 'archive',
      color: '#6b7280',
      tone: 'default',
      unpublish: true,
      criteria: 'Opened by mistake or resolved out of band.',
    }),
  ],
}

async function main() {
  const tx = client.transaction()
  tx.createOrReplace(claimWorkflow)
  tx.createOrReplace(disputeWorkflow)
  const res = await tx.commit()
  console.log('seeded workflow definitions:', res.results.map((r) => r.id).join(', '))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
