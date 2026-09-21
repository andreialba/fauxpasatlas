// Seeds places, contexts, claims, attesters and attestations.
// Run from studio/:  npx sanity exec scripts/seed-content.ts --with-user-token
//
// REVIEW BEFORE PUBLISHING: the claims below are a first draft written by
// Claude from common travel-etiquette knowledge. A human reviews every line and
// fixes or removes anything doubtful. Doubtful-on-purpose ones are marked
// `split: true` so the seed produces a contested spread rather than a verdict.
//
// Ids never contain dots: Sanity hides dotted ids from the public API.

import {getCliClient} from 'sanity/cli'
import {decideStage, spread, type Locality, type Stance} from '@atlas/shared/consensus'

const client = getCliClient({apiVersion: '2026-04-12'})

const slug = (current: string) => ({_type: 'slug' as const, current})
const ref = (_ref: string) => ({_type: 'reference' as const, _ref})
const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

// ---------- contexts ----------

const contexts = [
  ['dining', 'Dining', '🍽️', 'Restaurants, cafés, eating with others.'],
  ['greetings', 'Greetings', '👋', 'Meeting, introductions, small talk.'],
  ['business', 'Business', '💼', 'Meetings, colleagues, work etiquette.'],
  ['transit', 'Transit', '🚇', 'Trains, buses, queues, the street.'],
  ['home-visit', 'Visiting a home', '🏠', 'Being a guest in someone’s house.'],
  ['gifts', 'Gifts', '🎁', 'Giving, receiving, what to bring.'],
  ['public-space', 'Public spaces', '🏙️', 'Streets, parks, shops, noise.'],
  ['money', 'Money & tipping', '💶', 'Tips, bills, talking about money.'],
] as const

type ContextSlug = (typeof contexts)[number][0]

// ---------- places ----------

const places = [
  ['japan', 'Japan', '🇯🇵', 'jp'],
  ['portugal', 'Portugal', '🇵🇹', 'pt'],
  ['germany', 'Germany', '🇩🇪', 'de'],
  ['united-states', 'United States', '🇺🇸', 'us'],
  ['united-kingdom', 'United Kingdom', '🇬🇧', 'gb'],
  ['italy', 'Italy', '🇮🇹', 'it'],
  ['south-korea', 'South Korea', '🇰🇷', 'kr'],
  ['romania', 'Romania', '🇷🇴', 'ro'],
  ['norway', 'Norway', '🇳🇴', 'no'],
  ['france', 'France', '🇫🇷', 'fr'],
  ['spain', 'Spain', '🇪🇸', 'es'],
] as const

type PlaceSlug = (typeof places)[number][0]

// ---------- claims ----------
// [statement, context, expected stance, options]
type ClaimSeed = [string, ContextSlug, Stance, {split?: boolean; detail?: string}?]

const claims: Record<PlaceSlug, ClaimSeed[]> = {
  japan: [
    ['Tipping at a restaurant', 'money', 'rude', {detail: 'Staff will often chase you to return it.'}],
    ['Slurping your noodles', 'dining', 'fine'],
    ['Sticking chopsticks upright in a bowl of rice', 'dining', 'rude', {detail: 'Resembles a funeral offering.'}],
    ['Pouring your own drink at a group dinner', 'dining', 'rude', {detail: 'Fill the glasses around you; someone will fill yours.'}],
    ['Talking on the phone on a train', 'transit', 'rude', {detail: 'Texting is fine. Talking is for the platform.'}],
    ['Blowing your nose in public', 'public-space', 'rude'],
    ['Eating while walking down the street', 'public-space', 'depends', {split: true}],
    ['Wearing shoes inside someone’s home', 'home-visit', 'rude'],
    ['Arriving five minutes late to a business meeting', 'business', 'rude'],
  ],
  portugal: [
    ['Tipping 5–10% at a restaurant', 'money', 'fine', {detail: 'Appreciated, not expected.'}],
    ['Eating the bread and olives brought to the table unasked', 'dining', 'depends', {detail: 'The couvert is charged if you touch it.'}],
    ['Arriving 15 minutes late to dinner at a friend’s', 'home-visit', 'fine'],
    ['Greeting a friend with a kiss on each cheek', 'greetings', 'fine'],
    ['Speaking Spanish to locals and assuming they understand', 'greetings', 'rude'],
    ['Ordering a cappuccino after dinner', 'dining', 'depends', {split: true}],
    ['Asking to take leftovers home', 'dining', 'depends', {split: true}],
    ['Splitting the bill item by item', 'money', 'fine'],
    ['Saying “bom dia” to the whole shop when you walk in', 'greetings', 'fine', {detail: 'Silence on entry is what gets noticed.'}],
    ['Asking for salt before tasting the food', 'dining', 'depends', {split: true}],
  ],
  germany: [
    ['Being ten minutes late', 'business', 'rude'],
    ['Crossing the road on a red light in front of children', 'transit', 'rude'],
    ['Making small talk with the cashier', 'public-space', 'depends', {split: true}],
    ['Rounding the bill up by about 10% as a tip', 'money', 'fine'],
    ['Starting to eat before everyone says “Guten Appetit”', 'dining', 'rude', {detail: 'Wait for it, say it, then eat.'}],
    ['Using “du” with a stranger your own age', 'greetings', 'depends', {split: true}],
    ['Putting rubbish in the wrong recycling bin', 'public-space', 'rude'],
    ['Mowing the lawn or drilling on a Sunday', 'public-space', 'rude', {detail: 'Ruhezeit. Your neighbours know the bylaw by heart.'}],
    ['Taking a loud phone call on the train', 'transit', 'rude'],
  ],
  'united-states': [
    ['Leaving no tip at a sit-down restaurant', 'money', 'rude'],
    ['Asking someone what they earn', 'money', 'rude'],
    ['Arriving exactly on time to a house party', 'home-visit', 'depends', {split: true}],
    ['Taking your shoes off unasked in someone’s home', 'home-visit', 'depends', {split: true}],
    ['Making small talk with strangers in a queue', 'public-space', 'fine'],
    ['Asking for tap water at a restaurant', 'dining', 'fine'],
    ['Splitting the bill evenly', 'money', 'fine'],
    ['Hugging someone you have just met', 'greetings', 'depends'],
    ['Asking to take leftovers home', 'dining', 'fine', {detail: 'Portions assume you will.'}],
    ['Seating yourself at a restaurant without waiting for the host', 'dining', 'rude'],
  ],
  'united-kingdom': [
    ['Jumping the queue', 'public-space', 'rude'],
    ['Not buying a round when it is your turn at the pub', 'money', 'rude'],
    ['Telling colleagues how much you earn', 'business', 'rude'],
    ['Answering “You alright?” with an actual account of how you are', 'greetings', 'depends', {detail: 'It is a greeting, not a question.'}],
    ['Standing on the left side of a London escalator', 'transit', 'rude', {detail: 'Stand on the right, walk on the left.'}],
    ['Tipping 10–12.5% at a restaurant', 'money', 'fine'],
    ['Giving blunt, direct feedback in a meeting', 'business', 'depends', {split: true}],
    ['Starting a conversation with a stranger on the Tube', 'transit', 'depends', {split: true}],
    ['Ordering at the bar without a “please”', 'dining', 'rude'],
    ['Complaining about the weather to a stranger', 'public-space', 'fine', {detail: 'It is how conversations start.'}],
  ],
  italy: [
    ['Ordering a cappuccino after 11 a.m.', 'dining', 'depends', {split: true, detail: 'Locals find it odd rather than offensive.'}],
    ['Asking for parmesan on seafood pasta', 'dining', 'rude'],
    ['Cutting spaghetti with a knife', 'dining', 'rude'],
    ['Leaving no tip at a restaurant', 'money', 'fine', {detail: 'Service is usually included as coperto.'}],
    ['Arriving 15 minutes late to dinner at a friend’s', 'home-visit', 'fine'],
    ['Eating a sandwich while walking', 'public-space', 'depends'],
    ['Wearing beachwear in the town centre', 'public-space', 'rude'],
    ['Ordering a “latte” and expecting coffee', 'dining', 'fine', {detail: 'You will get a glass of milk.'}],
    ['Asking for the bill instead of waiting for it', 'dining', 'fine', {detail: 'It will not come until you ask. Lingering is the default.'}],
    ['Dipping bread in olive oil before the meal', 'dining', 'depends', {split: true, detail: 'Common abroad, rarer at home.'}],
  ],
  'south-korea': [
    ['Pouring your own drink', 'dining', 'rude'],
    ['Receiving something from an elder with one hand', 'greetings', 'rude'],
    ['Writing a living person’s name in red ink', 'business', 'rude'],
    ['Starting to eat before the eldest person at the table', 'dining', 'rude'],
    ['Blowing your nose at the table', 'dining', 'rude'],
    ['Tipping at a restaurant', 'money', 'depends', {split: true}],
    ['Wearing shoes inside a home', 'home-visit', 'rude'],
    ['Sitting in the priority seats on the subway when they are empty', 'transit', 'rude', {detail: 'Empty means reserved, not available.'}],
    ['Calling an older colleague by their first name', 'business', 'rude'],
    ['Splitting the bill equally after a group dinner', 'money', 'depends', {split: true, detail: 'Older tables expect the senior person to pay.'}],
  ],
  romania: [
    ['Arriving empty-handed when invited to someone’s home', 'home-visit', 'rude'],
    ['Keeping your shoes on inside someone’s home', 'home-visit', 'rude', {detail: 'Hosts will offer slippers.'}],
    ['Refusing food or drink the host offers', 'home-visit', 'depends', {split: true}],
    ['Tipping about 10% at a restaurant', 'money', 'fine'],
    ['Giving an even number of flowers', 'gifts', 'rude', {detail: 'Even numbers are for funerals.'}],
    ['Arriving 10–15 minutes late to a social gathering', 'greetings', 'fine'],
    ['Toasting without making eye contact', 'dining', 'rude'],
    ['Two men greeting with a kiss on the cheek', 'greetings', 'depends'],
    ['Toasting with a glass of water', 'dining', 'depends', {split: true}],
    ['Bringing a bottle of wine when invited for dinner', 'gifts', 'fine'],
  ],
  norway: [
    ['Sitting next to a stranger on a half-empty bus', 'transit', 'rude'],
    ['Taking your shoes off inside someone’s home', 'home-visit', 'fine', {detail: 'Expected, not merely allowed.'}],
    ['Tipping at a restaurant', 'money', 'depends', {split: true, detail: 'Service is paid properly; rounding up is common, a percentage is not.'}],
    ['Talking to strangers at a bus stop', 'public-space', 'depends', {split: true}],
    ['Praising your own achievements at a dinner party', 'dining', 'rude', {detail: 'Janteloven is softer than outsiders think, but it is not nothing.'}],
    ['Arriving exactly on time when invited for dinner', 'home-visit', 'fine'],
    ['Asking someone what they earn', 'money', 'fine', {detail: 'Tax returns are a matter of public record.'}],
    ['Skipping the queue for the ski lift', 'public-space', 'rude'],
    ['Bringing your own drinks to a house party', 'gifts', 'fine'],
    ['Working late and emailing colleagues after 16:00', 'business', 'depends', {split: true}],
  ],
  france: [
    ['Saying “bonjour” before anything else in a shop', 'greetings', 'fine', {detail: 'Skipping it is the actual faux pas.'}],
    ['Splitting the bill item by item', 'money', 'rude'],
    ['Asking for ketchup with steak', 'dining', 'rude'],
    ['Starting to eat before the host says “bon appétit”', 'dining', 'rude'],
    ['Tipping 15% at a restaurant', 'money', 'depends', {detail: 'Service is included; a few euros is plenty.'}],
    ['Discussing money at a dinner party', 'dining', 'rude'],
    ['Arriving exactly on time for a dinner invitation', 'home-visit', 'depends', {split: true}],
    ['Greeting colleagues with la bise at the office', 'business', 'depends', {split: true}],
    ['Speaking English without attempting French first', 'greetings', 'depends'],
  ],
  spain: [
    ['Eating dinner at 7pm', 'dining', 'depends', {detail: 'Kitchens often are not open yet.'}],
    ['Asking for a paella at dinner rather than lunch', 'dining', 'depends', {split: true}],
    ['Tipping more than small change at a bar', 'money', 'depends'],
    ['Arriving 20 minutes late to meet friends', 'greetings', 'fine'],
    ['Phoning someone during the afternoon rest', 'public-space', 'depends', {split: true}],
    ['Splitting the bill evenly rather than taking turns', 'money', 'depends'],
    ['Greeting with two kisses when meeting a friend', 'greetings', 'fine'],
    ['Wearing beachwear away from the beach', 'public-space', 'rude'],
    ['Talking loudly in a restaurant', 'dining', 'fine'],
  ],
}

// ---------- attesters ----------

const handles = [
  'mara', 'kenji', 'ines', 'lukas', 'priya', 'tomasz', 'sofia', 'jun', 'andrei', 'elena',
  'marco', 'hana', 'oliver', 'beatriz', 'felix', 'yuna', 'diego', 'anouk', 'sam', 'chiara',
  'noor', 'george', 'lea', 'minho', 'rui', 'katja', 'ada', 'louis', 'ioana', 'taro',
]

// ---------- deterministic randomness so re-runs are stable ----------

let seedState = 20260920
const rand = () => {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296
  return seedState / 4294967296
}
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]
const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1))

const OTHER_STANCES: Record<Stance, Stance[]> = {
  rude: ['depends', 'fine'],
  fine: ['depends', 'rude'],
  depends: ['rude', 'fine'],
}

function generateAttestations(claimId: string, expected: Stance, split: boolean) {
  const n = split ? between(6, 9) : between(5, 10)
  const out: {stance: Stance; locality: Locality; confidence: number; attester: string}[] = []
  const used = new Set<string>()
  for (let i = 0; i < n; i++) {
    let handle = pick(handles)
    while (used.has(handle)) handle = pick(handles)
    used.add(handle)

    const r = rand()
    const locality: Locality = r < 0.6 ? 'local' : r < 0.82 ? 'lived-there' : 'visitor'

    let stance: Stance
    if (split) {
      // roughly half and half between expected and one alternative
      stance = rand() < 0.5 ? expected : OTHER_STANCES[expected][0]
    } else {
      stance = rand() < 0.82 ? expected : pick(OTHER_STANCES[expected])
    }
    out.push({stance, locality, confidence: between(1, 3), attester: `attester-${handle}`})
  }
  return out
}

// ---------- build documents ----------

async function main() {
  const me = await client.request<{id: string}>({url: '/users/me'})
  const now = new Date().toISOString()
  const tx = client.transaction()

  for (const [s, title, icon, description] of contexts) {
    tx.createOrReplace({_id: `context-${s}`, _type: 'context', title, slug: slug(s), icon, description})
  }
  for (const [s, name, flag, iso] of places) {
    tx.createOrReplace({_id: `place-${s}`, _type: 'place', name, slug: slug(s), flag, iso, kind: 'country'})
  }
  for (const h of handles) {
    tx.createOrReplace({_id: `attester-${h}`, _type: 'attester', handle: h})
  }

  let claimCount = 0
  const keepAtts = new Set<string>()
  let attCount = 0
  const stageTally: Record<string, number> = {}

  for (const [placeSlug, list] of Object.entries(claims) as [PlaceSlug, ClaimSeed[]][]) {
    for (const [statement, ctx, expected, opts] of list) {
      const claimSlug = `${placeSlug}-${slugify(statement)}`
      const claimId = `claim-${claimSlug}`
      const atts = generateAttestations(claimId, expected, opts?.split ?? false)
      const decision = decideStage(spread(atts))
      const status = decision // 'canon' | 'contested' | 'attesting'
      stageTally[status] = (stageTally[status] ?? 0) + 1

      tx.createOrReplace({
        _id: claimId,
        _type: 'claim',
        statement,
        slug: slug(claimSlug),
        place: ref(`place-${placeSlug}`),
        context: ref(`context-${ctx}`),
        ...(opts?.detail ? {detail: opts.detail} : {}),
        status,
        statuses: [
          {
            _type: 'workflow.setStatus',
            _key: `seed-${status}`,
            statusLabel: status[0].toUpperCase() + status.slice(1),
            statusSlug: status,
            completedAt: now,
            completedBy: {_type: 'workflow.user', userId: me.id},
            reason: 'Seeded with attestations; stage derived from consensus rule.',
          },
        ],
        dedupe: {status: 'unique', checkedAt: now, notes: 'Seed data, not checked by the Function.'},
      })
      claimCount++

      atts.forEach((a, i) => {
        keepAtts.add(`attestation-${claimSlug}-${i}`)
        tx.createOrReplace({
          _id: `attestation-${claimSlug}-${i}`,
          _type: 'attestation',
          claim: ref(claimId),
          stance: a.stance,
          locality: a.locality,
          confidence: a.confidence,
          attester: ref(a.attester),
          source: 'seed',
        })
        attCount++
      })
    }
  }

  // A re-run with a changed statement would otherwise leave the old claim
  // and its attestations behind under the old slug.
  const keepClaims = new Set<string>()
  for (const [placeSlug, list] of Object.entries(claims) as [PlaceSlug, ClaimSeed[]][]) {
    for (const [statement] of list) keepClaims.add(`claim-${placeSlug}-${slugify(statement)}`)
  }
  const stale = await client.fetch<{claims: string[]; atts: string[]}>(
    `{
      "claims": *[_type == "claim" && dedupe.notes == "Seed data, not checked by the Function."]._id,
      "atts": *[_type == "attestation" && source == "seed"]._id
    }`,
  )
  const staleAtts = stale.atts.filter((id) => !keepAtts.has(id))
  const staleClaims = stale.claims.filter((id) => !keepClaims.has(id))
  for (const id of staleAtts) tx.delete(id)
  for (const id of staleClaims) tx.delete(id)

  await tx.commit()
  console.log(`removed ${staleAtts.length} stale attestations, ${staleClaims.length} stale claims`)
  console.log(
    `seeded ${contexts.length} contexts, ${places.length} places, ${handles.length} attesters, ${claimCount} claims, ${attCount} attestations`,
  )
  console.log('claim stages:', stageTally)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
