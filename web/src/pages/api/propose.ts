import type {APIRoute} from 'astro'
import {writeClient} from '../../lib/sanity'

export const prerender = false

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

/**
 * A proposed claim enters at stage `proposed` and is invisible to the site
 * until the dedupe Function has looked at it. Nothing the public submits goes
 * straight into the atlas.
 */
export const POST: APIRoute = async ({request}) => {
  const form = await request.formData()
  const statement = String(form.get('statement') ?? '').trim()
  const place = String(form.get('place') ?? '')
  const context = String(form.get('context') ?? '')
  const detail = String(form.get('detail') ?? '').trim()
  const handle = String(form.get('handle') ?? '').trim()
  const honeypot = String(form.get('website') ?? '')
  const wantsJson = request.headers.get('accept')?.includes('application/json')

  const fail = (status: number, error: string) =>
    wantsJson
      ? new Response(JSON.stringify({error}), {status, headers: {'content-type': 'application/json'}})
      : new Response(error, {status})

  // Bots fill every field. Humans never see this one. Pretend it worked.
  if (honeypot) return new Response(null, {status: 303, headers: {location: '/propose/?sent=1'}})

  if (statement.length < 6) return fail(400, 'Say what the behaviour is')
  if (statement.length > 140) return fail(400, 'Keep it under 140 characters')
  if (!/^[^\s]+(\s+[^\s]+){1,}$/.test(statement)) return fail(400, 'Describe the behaviour in a few words')
  if (/https?:\/\/|www\./i.test(statement + detail)) return fail(400, 'No links, please')
  if (detail.length > 400) return fail(400, 'Keep the detail under 400 characters')
  if (!place) return fail(400, 'Pick a place')
  if (!context) return fail(400, 'Pick a situation')

  try {
    const client = writeClient()
    const placeSlug = place.replace('place-', '')
    const slug = `${placeSlug}-${slugify(statement)}`

    const existing = await client.fetch<string | null>(
      `*[_type == "claim" && slug.current == $slug][0]._id`,
      {slug},
    )
    if (existing) return fail(409, 'Someone already proposed that one')

    const id = `claim-${slug}`
    const tx = client.transaction()

    if (handle) {
      tx.createIfNotExists({
        _id: `attester-${slugify(handle).slice(0, 32)}`,
        _type: 'attester',
        handle,
      })
    }

    tx.create({
      _id: id,
      _type: 'claim',
      statement,
      slug: {_type: 'slug', current: slug},
      place: {_type: 'reference', _ref: place},
      context: {_type: 'reference', _ref: context},
      ...(detail ? {detail} : {}),
      ...(handle
        ? {proposedBy: {_type: 'reference', _ref: `attester-${slugify(handle).slice(0, 32)}`}}
        : {}),
      status: 'proposed',
      dedupe: {status: 'pending'},
    })

    await tx.commit()

    if (wantsJson) {
      return new Response(JSON.stringify({ok: true, id}), {
        headers: {'content-type': 'application/json'},
      })
    }
    return new Response(null, {status: 303, headers: {location: '/propose/?sent=1'}})
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save that'
    return fail(500, message)
  }
}
