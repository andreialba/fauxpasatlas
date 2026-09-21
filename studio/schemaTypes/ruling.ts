import {defineField, defineType} from 'sanity'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'

export const ruling = defineType({
  name: 'ruling',
  title: 'Ruling',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: 'dispute',
      type: 'reference',
      to: [{type: 'dispute'}],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'outcome',
      type: 'string',
      options: {
        list: [
          {title: 'Keep the claim', value: 'keep'},
          {title: 'Split into narrower claims', value: 'split'},
          {title: 'Retire the claim', value: 'retire'},
        ],
        layout: 'radio',
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'resultingClaims',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'claim'}]}],
      hidden: ({document}) => document?.outcome !== 'split',
    }),
    defineField({name: 'summary', type: 'text', rows: 3, validation: (r) => r.required()}),
    defineField({
      name: 'moderator',
      type: 'string',
      description: 'Sanity user id of the moderator who ruled. Set by the Dispute Board.',
      readOnly: true,
    }),
  ],
  preview: {
    select: {outcome: 'outcome', claim: 'dispute.claim.statement', summary: 'summary'},
    prepare: ({outcome, claim, summary}) => ({
      title: `${outcome ?? '?'} · ${claim ?? ''}`,
      subtitle: summary,
    }),
  },
})
