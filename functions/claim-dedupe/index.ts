import {createClient} from '@sanity/client'
import {documentEventHandler} from '@sanity/functions'
import {transition} from '../lib/workflow'

interface Data {
  _id: string
  statement: string
  detail?: string
  placeId?: string
  contextId?: string
}

interface Candidate {
  _id: string
  statement: string
  status: string
}

interface Verdict {
  genuine: boolean
  duplicateOf: string[]
  reasoning: string
}

/**
 * One Agent Action per proposal, two questions: is this a real etiquette
 * claim at all, and does it duplicate one already filed? Anything that fails
 * either stays Proposed for a moderator. Only a clean pass reaches the atlas.
 */
export const handler = documentEventHandler<Data>(async ({context, event}) => {
  const {_id, statement, detail, placeId, contextId} = event.data
  const client = createClient({...context.clientOptions, apiVersion: '2026-04-12', useCdn: false})
  // Agent Actions live behind the experimental "vX" API version; a dated
  // version gets a 400 "only available on apiVersion vX".
  const agent = createClient({...context.clientOptions, apiVersion: 'vX', useCdn: false})

  const candidates = await client.fetch<Candidate[]>(
    `*[_type == "claim" && _id != $id && place._ref == $placeId && context._ref == $contextId
      && status in ["attesting", "canon", "contested"]]{_id, statement, status}`,
    {id: _id, placeId: placeId ?? '', contextId: contextId ?? ''},
  )

  const now = new Date().toISOString()
  const hold = (status: 'needs-review' | 'possible-duplicate', notes: string, related: string[] = []) =>
    client
      .patch(_id)
      .set({
        dedupe: {
          status,
          checkedAt: now,
          notes,
          ...(related.length ? {related: related.map((id) => ({_type: 'reference', _ref: id, _key: id}))} : {}),
        },
      })
      .commit()

  let verdict: Verdict
  try {
    // Prompt is the one Agent Action that needs no schemaId: it returns free
    // JSON rather than writing into a document.
    verdict = (await agent.agent.action.prompt({
      format: 'json',
      temperature: 0,
      instruction: [
        'You are the gatekeeper for a community etiquette atlas. Each entry is one behaviour, in one place, in one social situation, phrased as a thing a person might do, e.g. "Tipping at a restaurant".',
        'A visitor has proposed a new entry. Judge it on two points.',
        '1. GENUINE: is it a real, specific social behaviour whose politeness locals could have an opinion about? Reject test text, gibberish, spam, advertising, insults, anything about a named real person, anything sexual or hateful, and statements that are not behaviours (questions, opinions, facts).',
        '2. DUPLICATE: does it describe the SAME behaviour as any existing entry listed below? Different wording of the same act is a duplicate. A narrower, broader or different act is not.',
        'Proposed statement: "$statement"',
        'Proposed detail (may be empty): "$detail"',
        'Existing entries for the same place and situation, as JSON (may be empty):',
        '$candidates',
        'Return JSON only: {"genuine": boolean, "duplicateOf": string[] of existing _id values it duplicates (empty if none), "reasoning": one sentence}.',
      ].join('\n'),
      instructionParams: {
        statement,
        detail: detail ?? '',
        candidates: JSON.stringify(candidates.map((c) => ({_id: c._id, statement: c.statement}))),
      },
    })) as unknown as Verdict
  } catch (error) {
    // If the model is unavailable, do not block the claim forever: flag it for
    // a human instead of guessing.
    console.error('agent action failed', error)
    await hold('needs-review', 'Automatic check failed; needs a human look.')
    return
  }

  if (verdict.genuine === false) {
    await hold('needs-review', verdict.reasoning || 'Did not read as an etiquette claim.')
    console.log(`claim ${_id}: held for review (${verdict.reasoning})`)
    return
  }

  const related = (verdict.duplicateOf ?? []).filter((id) => candidates.some((c) => c._id === id))

  if (related.length > 0) {
    // Likely duplicate: stays Proposed, a moderator merges or lets it through.
    await hold('possible-duplicate', verdict.reasoning, related)
    console.log(`claim ${_id}: possible duplicate of ${related.join(', ')}`)
    return
  }

  await client
    .patch(_id)
    .set({dedupe: {status: 'unique', checkedAt: now, notes: verdict.reasoning}})
    .commit()
  await transition(client, _id, 'attesting', 'Passed the content and duplicate check.', 'function:claim-dedupe')
  console.log(`claim ${_id}: genuine and unique → attesting`)
})
