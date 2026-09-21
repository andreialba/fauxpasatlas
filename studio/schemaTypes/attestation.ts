import {defineField, defineType} from 'sanity'
import {CheckmarkCircleIcon} from '@sanity/icons/CheckmarkCircle'

export const STANCES = [
  {title: 'Rude', value: 'rude'},
  {title: 'Fine', value: 'fine'},
  {title: 'Depends', value: 'depends'},
]

export const LOCALITIES = [
  {title: 'Local (from here)', value: 'local'},
  {title: 'Lived there', value: 'lived-there'},
  {title: 'Visitor', value: 'visitor'},
]

export const attestation = defineType({
  name: 'attestation',
  title: 'Attestation',
  type: 'document',
  icon: CheckmarkCircleIcon,
  fields: [
    defineField({
      name: 'claim',
      type: 'reference',
      to: [{type: 'claim'}],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'stance',
      type: 'string',
      options: {list: STANCES, layout: 'radio', direction: 'horizontal'},
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'confidence',
      type: 'number',
      description: '1 = not sure, 3 = certain.',
      options: {list: [1, 2, 3], layout: 'radio', direction: 'horizontal'},
      initialValue: 2,
      validation: (r) => r.required().min(1).max(3),
    }),
    defineField({
      name: 'locality',
      type: 'string',
      options: {list: LOCALITIES, layout: 'radio'},
      validation: (r) => r.required(),
    }),
    defineField({name: 'note', type: 'text', rows: 2}),
    defineField({
      name: 'attester',
      type: 'reference',
      to: [{type: 'attester'}],
    }),
    defineField({
      name: 'source',
      type: 'string',
      options: {list: ['web', 'seed', 'studio']},
      initialValue: 'studio',
      readOnly: true,
    }),
  ],
  preview: {
    select: {stance: 'stance', locality: 'locality', claim: 'claim.statement', note: 'note'},
    prepare: ({stance, locality, claim, note}) => ({
      title: `${stance ?? '?'} · ${locality ?? '?'}`,
      subtitle: [claim, note].filter(Boolean).join(' / '),
    }),
  },
})
