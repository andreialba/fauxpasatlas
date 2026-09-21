import {defineField, defineType} from 'sanity'
import {CommentIcon} from '@sanity/icons/Comment'

// No verdict field on purpose: the verdict is a GROQ projection over
// attestations (scripts/groq). Workflow stage is injected by the plugin.
export const claim = defineType({
  name: 'claim',
  title: 'Claim',
  type: 'document',
  icon: CommentIcon,
  fields: [
    defineField({
      name: 'statement',
      type: 'string',
      description: 'Plain statement of the behaviour, e.g. "Tipping at restaurants".',
      validation: (r) => r.required().max(140),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'statement', maxLength: 80},
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'place',
      type: 'reference',
      to: [{type: 'place'}],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'context',
      type: 'reference',
      to: [{type: 'context'}],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'parent',
      type: 'reference',
      to: [{type: 'claim'}],
      description: 'Set when this claim was split off a broader one by a ruling.',
    }),
    defineField({
      name: 'detail',
      type: 'text',
      rows: 3,
      description: 'Optional nuance from the proposer. Not the verdict.',
    }),
    defineField({
      name: 'proposedBy',
      type: 'reference',
      to: [{type: 'attester'}],
    }),
    defineField({
      name: 'dedupe',
      type: 'object',
      title: 'Duplicate check',
      description: 'Written once by the claim-dedupe Function. Do not edit.',
      readOnly: true,
      fields: [
        defineField({
          name: 'status',
          type: 'string',
          options: {list: ['pending', 'unique', 'possible-duplicate', 'needs-review', 'merged']},
        }),
        defineField({name: 'checkedAt', type: 'datetime'}),
        defineField({name: 'notes', type: 'text', rows: 2}),
        defineField({
          name: 'related',
          type: 'array',
          of: [{type: 'reference', to: [{type: 'claim'}]}],
        }),
      ],
    }),
  ],
  preview: {
    select: {title: 'statement', place: 'place.name', flag: 'place.flag', context: 'context.title'},
    prepare: ({title, place, flag, context}) => ({
      title,
      subtitle: [[flag, place].filter(Boolean).join(' '), context].filter(Boolean).join(' · '),
    }),
  },
})
