import type {APIRoute} from 'astro'
import {decideStage, spread, type AttestationLike} from '@atlas/shared/consensus'
import {writeClient} from '../../lib/sanity'

export const prerender = false

const STANCES = new Set(['rude', 'fine', 'depends'])
const LOCALITIES = new Set(['local', 'lived-there', 'visitor'])

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)

/** Stable pseudonymous id from handle + IP, so one person is one attester. */
async function attesterId(handle: string, ip: string) {
  if (handle) return `attester-${slugify(handle)}`
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`atlas:${ip}`))
  const hex = [...new Uint8Array(digest)]
    .slice(0, 6)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `attester-anon-${hex}`
}

export const POST: APIRoute = async ({request, clientAddress}) => {
  const form = await request.formData()
  const claimId = String(form.get('claim') ?? '')
  const stance = String(form.get('stance') ?? '')
  const locality = String(form.get('locality') ?? '')
  const handle = String(form.get('handle') ?? '').trim()
  const note = String(form.get('note') ?? '').trim()
  const wantsJson = request.headers.get('accept')?.includes('application/json')

  const fail = (status: number, error: string) =>
    wantsJson
      ? new Response(JSON.stringify({error}), {status, headers: {'content-type': 'application/json'}})
      : new Response(error, {status})

  if (!claimId) return fail(400, 'Missing claim')
  if (!STANCES.has(stance)) return fail(400, 'Pick rude, fine or depends')
  if (!LOCALITIES.has(locality)) return fail(400, 'Say how you know this place')

  try {
    const client = writeClient()

    const claim = await client.fetch<{_id: string; status: string; slug: string} | null>(
      `*[_type == "claim" && _id == $id][0]{_id, status, "slug": slug.current}`,
      {id: claimId},
    )
    if (!claim) return fail(404, 'No such claim')

    const ip = clientAddress ?? request.headers.get('cf-connecting-ip') ?? 'unknown'
    const attester = await attesterId(handle, ip)

    // One attestation per person per claim: a stable id makes a second
    // submission an edit rather than ballot stuffing.
    const attestationId = `attestation-${claim.slug}-${attester.replace('attester-', '')}`

    await client
      .transaction()
      .createIfNotExists({_id: attester, _type: 'attester', handle: handle || 'anonymous'})
      .createOrReplace({
        _id: attestationId,
        _type: 'attestation',
        claim: {_type: 'reference', _ref: claim._id},
        stance,
        locality,
        confidence: 2,
        source: 'web',
        attester: {_type: 'reference', _ref: attester},
        ...(note ? {note} : {}),
      })
      .commit()

    // Recompute here as well as in the Function: the reader should see the
    // consequence of their own click straight away, and the Function is the
    // backstop for everything that does not come through this endpoint.
    const attestations = await client.fetch<AttestationLike[]>(
      `*[_type == "attestation" && claim._ref == $id]{stance, locality, confidence}`,
      {id: claim._id},
    )
    const next = decideStage(spread(attestations))
    const stageChanged = next !== claim.status && claim.status !== 'proposed'
    if (stageChanged) await client.patch(claim._id).set({status: next}).commit()

    if (wantsJson) {
      return new Response(JSON.stringify({ok: true, status: next, stageChanged}), {
        headers: {'content-type': 'application/json'},
      })
    }

    const redirect = String(form.get('redirect') ?? `/claim/${claim.slug}/`)
    return new Response(null, {status: 303, headers: {location: redirect}})
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not record that'
    return fail(500, message)
  }
}
