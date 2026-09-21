// Removes what e2e-functions.ts created. Deleting the attestations also
// exercises the recompute function's delete path.
import {getCliClient} from 'sanity/cli'
const client = getCliClient({apiVersion: '2026-04-12'})
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
async function main() {
  const tx = client.transaction()
  for (const h of ['e2e-lisboeta', 'e2e-portuense', 'e2e-algarvia']) tx.delete(`attestation-e2e-${h}`).delete(`attester-${h}`)
  tx.delete('claim-portugal-e2e-tipping-five-to-ten-percent')
  await tx.commit()
  await sleep(6000)
  const c = await client.fetch(`*[_id == "claim-portugal-tipping-5-10-at-a-restaurant"][0]{status, "n": count(*[_type=="attestation" && claim._ref==^._id]), "last": statuses[-1]{statusSlug, reason}}`)
  console.log('after cleanup:', JSON.stringify(c))
}
main().catch((e) => { console.error(e); process.exit(1) })
