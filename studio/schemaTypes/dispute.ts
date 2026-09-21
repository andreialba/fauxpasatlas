import {defineField, defineType} from 'sanity'
import {WarningOutlineIcon} from '@sanity/icons/WarningOutline'

export const dispute = defineType({
  name: 'dispute',
  title: 'Dispute',
  type: 'document',
  icon: WarningOutlineIcon,
  fields: [
    defineField({
      name: 'claim',
      type: 'reference',
      to: [{type: 'claim'}],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'reason',
      type: 'text',
      rows: 3,
      validation: (r) => r.required().min(20),
    }),
    defineField({
      name: 'evidence',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'evidenceItem',
          fields: [
            defineField({name: 'url', type: 'url'}),
            defineField({name: 'note', type: 'string'}),
          ],
          preview: {select: {title: 'note', subtitle: 'url'}},
        },
      ],
    }),
    defineField({
      name: 'openedBy',
      type: 'reference',
      to: [{type: 'attester'}],
    }),
  ],
  preview: {
    select: {claim: 'claim.statement', place: 'claim.place.name', reason: 'reason'},
    prepare: ({claim, place, reason}) => ({
      title: [claim, place].filter(Boolean).join(' · '),
      subtitle: reason,
    }),
  },
})
