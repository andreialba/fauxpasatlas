import {createDocument, type DocumentHandle} from '@sanity/sdk-react'

/**
 * `createDocument` types its initial value against the SDK's experimental
 * Typegen registration. Registering our generated types through the documented
 * `groq` module augmentation did not take effect (the integration is marked
 * beta), which leaves every field typed as `undefined`. Rather than scatter
 * casts through the ruling logic, the cast lives here, once, behind a
 * signature that still demands a document handle and a plain object.
 *
 * The values are not unchecked: they are built from `@atlas/shared/sanity.types`
 * shapes at the call sites.
 */
export function createDoc(handle: DocumentHandle, values: Record<string, unknown>) {
  return createDocument(handle, values as never)
}
