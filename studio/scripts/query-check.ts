// Sanity-check the shared GROQ + consensus rule against live data.
// Run from studio/:  npx sanity exec scripts/query-check.ts --with-user-token
import {getCliClient} from 'sanity/cli'
import {CLAIMS_FOR_PLACE} from '@atlas/shared/groq'
import {spread, verdict, decideStage, type AttestationLike} from '@atlas/shared/consensus'

const client = getCliClient({apiVersion: '2026-04-12'})

type Card = {
  statement: string
  status: string
  attestations: AttestationLike[]
  openDisputes: number
  place: {name: string}
  context: {title: string}
}

async function main() {
  const place = process.argv[2] ?? 'portugal'
  const cards = await client.fetch<Card[]>(CLAIMS_FOR_PLACE, {place})
  console.log(`${cards.length} visible claims for ${place}\n`)
  for (const c of cards) {
    const s = spread(c.attestations)
    const line = [
      c.status.padEnd(10),
      verdict(s).padEnd(9),
      `${Math.round(s.agreement * 100)}%`.padStart(4),
      `n=${s.total} locals=${s.locals}`.padEnd(16),
      decideStage(s) === c.status ? '' : `(rule says ${decideStage(s)})`,
      c.statement,
    ]
    console.log(line.join('  '))
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
