import {createClient, type ClientConfig} from '@sanity/client'
import {transition} from '../lib/workflow'

const MONTHS = 12

/**
 * Settled claims with no attestation in the last year go back to Attesting.
 * They keep their attestations; they just have to be confirmed again before
 * the site states them plainly.
 */
export const handler = async ({context}: {context: {clientOptions: ClientConfig}}) => {
  // A scheduled run has no document to borrow a dataset from, and the local
  // emulator hands over an empty config, so fall back to the project's own.
  const client = createClient({
    projectId: 'dh2oc30x',
    dataset: 'production',
    ...context.clientOptions,
    apiVersion: '2026-04-12',
    useCdn: false,
  })

  const since = new Date()
  since.setMonth(since.getMonth() - MONTHS)

  const stale = await client.fetch<{_id: string; statement: string}[]>(
    `*[_type == "claim" && status == "canon"
      && count(*[_type == "attestation" && claim._ref == ^._id && _createdAt > $since]) == 0
    ]{_id, statement}`,
    {since: since.toISOString()},
  )

  for (const claim of stale) {
    await transition(
      client,
      claim._id,
      'attesting',
      `No attestation in ${MONTHS} months. Reopened for confirmation.`,
      'function:expiry-sweep',
    )
    console.log(`reopened: ${claim.statement}`)
  }

  console.log(`expiry sweep: ${stale.length} claim(s) reopened`)
}
