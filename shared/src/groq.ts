// GROQ fragments shared by the Astro site, the Functions and the Dispute Board.
// The verdict is never stored: every query derives it from attestations.

/** Attestations for the enclosing claim, minimal fields for consensus.ts. */
export const ATTESTATIONS_FOR_CLAIM = /* groq */ `
  *[_type == "attestation" && references(^._id)]{
    stance, locality, confidence
  }
`

/** Stage-independent projection of a claim card. */
export const CLAIM_CARD = /* groq */ `{
  _id,
  statement,
  "slug": slug.current,
  status,
  detail,
  "place": place->{_id, name, flag, iso, "slug": slug.current, kind},
  "context": context->{_id, title, icon, "slug": slug.current},
  "attestations": ${ATTESTATIONS_FOR_CLAIM},
  "openDisputes": count(*[_type == "dispute" && references(^._id) && status != "closed" && status != "withdrawn"])
}`

/** All claims visible on the site: attesting, canon, contested. Never proposed or retired. */
export const VISIBLE_CLAIMS = /* groq */ `
  *[_type == "claim" && status in ["attesting", "canon", "contested"] && !(_id in path("drafts.**"))]
`

export const CLAIMS_FOR_PLACE = /* groq */ `
  ${VISIBLE_CLAIMS}[place->slug.current == $place || place->parent->slug.current == $place]
  | order(status asc, statement asc) ${CLAIM_CARD}
`

export const CLAIMS_FOR_CONTEXT = /* groq */ `
  ${VISIBLE_CLAIMS}[context->slug.current == $context]
  | order(place->name asc, statement asc) ${CLAIM_CARD}
`

export const CLAIM_BY_SLUG = /* groq */ `
  *[_type == "claim" && slug.current == $slug && !(_id in path("drafts.**"))][0] ${CLAIM_CARD}
`

/** Canon claims only, for the quiz. */
export const QUIZ_CLAIMS_FOR_PLACE = /* groq */ `
  *[_type == "claim" && status == "canon" && !(_id in path("drafts.**"))
    && (place->slug.current == $place || place->parent->slug.current == $place)]
  ${CLAIM_CARD}
`

export const PLACES = /* groq */ `
  *[_type == "place" && !(_id in path("drafts.**"))] | order(kind asc, name asc){
    _id, name, flag, iso, kind, "slug": slug.current,
    "parent": parent->{name, "slug": slug.current},
    "claimCount": count(*[_type == "claim" && references(^._id) && status in ["attesting", "canon", "contested"]])
  }
`

export const CONTEXTS = /* groq */ `
  *[_type == "context" && !(_id in path("drafts.**"))] | order(title asc){
    _id, title, icon, description, "slug": slug.current,
    "claimCount": count(*[_type == "claim" && references(^._id) && status in ["attesting", "canon", "contested"]])
  }
`

/** For the Dispute Board: contested claims with their open disputes. */
export const CONTESTED_CLAIMS = /* groq */ `
  *[_type == "claim" && status == "contested" && !(_id in path("drafts.**"))] ${CLAIM_CARD}
`

export const OPEN_DISPUTES = /* groq */ `
  *[_type == "dispute" && status in ["opened", "evidence", "ruling"] && !(_id in path("drafts.**"))]
  | order(_createdAt asc){
    _id, status, reason, evidence, _createdAt,
    "claim": claim-> ${CLAIM_CARD},
    "openedBy": openedBy->{handle}
  }
`

/** Latest rulings for the live strip on the home page. */
export const RECENT_RULINGS = /* groq */ `
  *[_type == "ruling" && !(_id in path("drafts.**"))] | order(_createdAt desc)[0...5]{
    _id, outcome, summary, _createdAt,
    "claim": dispute->claim->{statement, "slug": slug.current, "place": place->{name, flag, iso}}
  }
`

/**
 * Attester track records for the Dispute Board's trust panel. Every attestation
 * each person has made, with the full spread of its claim, so the board can ask
 * how often they landed on the side the locals eventually settled on. Trust is
 * computed from this, never stored. `$ids` is an array of attester ids.
 */
export const ATTESTER_TRACK_RECORDS = /* groq */ `
  *[_type == "attester" && _id in $ids]{
    _id,
    handle,
    "homePlaces": homePlaces[]->{name},
    "attestations": *[_type == "attestation" && attester._ref == ^._id]{
      stance, locality,
      "claimStatus": claim->status,
      "claimAttestations": *[_type == "attestation" && claim._ref == ^.claim._ref]{stance, locality, confidence}
    }
  }
`

/**
 * The moderator queue: every claim that needs a human look, either because the
 * attestations are split or because someone filed a written dispute. Returns
 * the raw attestations so the board can compute the same spread the site does.
 */
export const BOARD_QUEUE = /* groq */ `
  *[_type == "claim" && !(_id in path("drafts.**")) && (
      status == "contested" ||
      count(*[_type == "dispute" && claim._ref == ^._id && status in ["opened", "evidence", "ruling"]]) > 0
  )]{
    _id,
    statement,
    "slug": slug.current,
    status,
    detail,
    "place": place->{_id, name, iso, flag, "slug": slug.current},
    "context": context->{_id, title},
    "attestations": *[_type == "attestation" && claim._ref == ^._id]{
      stance, locality, confidence, note, "handle": attester->handle, "attesterId": attester._ref
    },
    "disputes": *[_type == "dispute" && claim._ref == ^._id && status in ["opened", "evidence", "ruling"]]
      | order(_createdAt asc){
      _id, status, reason, evidence, _createdAt, "openedBy": openedBy->handle
    },
    "history": statuses[]{statusSlug, statusLabel, completedAt, reason, "by": completedBy.userId}
  }
`

/**
 * Proposals the automatic check did not wave through, plus any still being
 * checked. Nothing here is visible on the site. Oldest first: a moderator
 * works the backlog in the order it arrived.
 */
export const PROPOSAL_QUEUE = /* groq */ `
  *[_type == "claim" && status == "proposed" && !(_id in path("drafts.**"))] | order(_createdAt asc){
    _id, statement, detail, _createdAt,
    "place": place->{name, iso},
    "context": context->{title},
    "proposedBy": proposedBy->handle,
    dedupe{status, notes, "related": related[]->{_id, statement, status}}
  }
`
