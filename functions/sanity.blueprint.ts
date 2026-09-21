import {defineBlueprint, defineDocumentFunction, defineScheduledFunction} from '@sanity/blueprints'

// Three functions, one job each. All of them import the consensus rule from
// @atlas/shared so they can never disagree with the site about a verdict.
export default defineBlueprint({
  resources: [
    // Someone answered. Recompute the claim's agreement and move it between
    // Attesting, Canon and Contested. Fires on every attestation write, which
    // is cheap: one GROQ query and at most one patch.
    defineDocumentFunction({
      name: 'recompute-agreement',
      src: 'recompute-agreement',
      event: {
        on: ['create', 'update', 'delete'],
        filter: '_type == "attestation"',
        projection: '{_id, "claimId": claim._ref}',
      },
      timeout: 30,
    }),

    // A new claim was proposed. One Agent Action compares it with the claims
    // already filed for the same place and situation. The filter keeps it to
    // claims that have never been checked, so it costs one credit per proposal
    // and never re-runs.
    defineDocumentFunction({
      name: 'claim-dedupe',
      src: 'claim-dedupe',
      event: {
        on: ['create', 'update'],
        filter: '_type == "claim" && status == "proposed" && dedupe.status == "pending"',
        projection: '{_id, statement, detail, "placeId": place._ref, "contextId": context._ref}',
      },
      timeout: 60,
    }),

    // Manners drift. Once a day, settled claims nobody has attested to in a
    // year go back to Attesting and have to earn their place again.
    defineScheduledFunction({
      name: 'expiry-sweep',
      src: 'expiry-sweep',
      event: {expression: 'every day at 6am'},
      timezone: 'Europe/Bucharest',
      timeout: 60,
    }),
  ],
})
