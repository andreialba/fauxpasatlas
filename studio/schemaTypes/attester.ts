import {defineField, defineType} from 'sanity'
import {UserIcon} from '@sanity/icons/User'

// Pseudonymous. Trust is derived in GROQ from how often this person's
// attestations ended up on the canon side, never stored here.
export const attester = defineType({
  name: 'attester',
  title: 'Attester',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({
      name: 'handle',
      type: 'string',
      validation: (r) => r.required().min(2).max(32),
    }),
    defineField({
      name: 'homePlaces',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'place'}]}],
      description: 'Where they say they are from or have lived. Self-declared.',
    }),
    defineField({
      name: 'key',
      type: 'string',
      description: 'Hashed browser key from the site. Never shown publicly.',
      readOnly: true,
    }),
  ],
  preview: {select: {title: 'handle'}},
})
