// Registers the generated schema types with the App SDK.
//
// Without this every document action is typed against an empty schema, so
// `createDocument(handle, {...})` rejects each field with "not assignable to
// type undefined". The SDK reads the schema off an augmented `groq` interface
// keyed by `<projectId>.<dataset>`. The types themselves come from
// `sanity typegen generate`, which runs against the Studio's schema, so the
// board cannot drift from the real shape of a claim.

import type {
  Attestation,
  Attester,
  Claim,
  Context,
  Dispute,
  Place,
  Ruling,
} from '@atlas/shared/sanity.types'

declare module 'groq' {
  interface SanitySchemas {
    'dh2oc30x.production': Attestation | Attester | Claim | Context | Dispute | Place | Ruling
  }
}
