import type {APIRoute} from 'astro'
import {writeClient} from '../../lib/sanity'

export const prerender = false

/**
 * Opening a dispute does not change the claim's verdict. It flags it for a
 * moderator and makes the challenge visible on the claim page, which is the
 * honest thing to do while the argument is unresolved.
 */
export const POST: APIRoute = async ({request}) => {
  const form = await request.formData()
  const claimId = String(form.get('claim') ?? '')
  const reason = String(form.get('reason') ?? '').trim()
  const evidenceUrl = String(form.get('evidence') ?? '').trim()
  const wantsJson = request.headers.get('accept')?.includes('application/json')

  const fail = (status: number, error: string) =>
    wantsJson
      ? new Response(JSON.stringify({error}), {status, headers: {'content-type': 'application/json'}})
      : new Response(error, {status})

  if (!claimId) return fail(400, 'Missing claim')
  if (reason.length < 20) return fail(400, 'Say why, in a sentence or two')

  try {
    const client = writeClient()
    const claim = await client.fetch<{_id: string; slug: string} | null>(
      `*[_type == "claim" && _id == $id][0]{_id, "slug": slug.current}`,
      {id: claimId},
    )
    if (!claim) return fail(404, 'No such claim')

    await client.create({
      _type: 'dispute',
      claim: {_type: 'reference', _ref: claim._id},
      reason,
      status: 'opened',
      ...(evidenceUrl
        ? {evidence: [{_type: 'evidenceItem', _key: 'first', url: evidenceUrl}]}
        : {}),
    })

    if (wantsJson) {
      return new Response(JSON.stringify({ok: true}), {
        headers: {'content-type': 'application/json'},
      })
    }
    return new Response(null, {status: 303, headers: {location: `/claim/${claim.slug}/?disputed=1`}})
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not open that dispute'
    return fail(500, message)
  }
}
