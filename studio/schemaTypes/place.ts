import {defineField, defineType} from 'sanity'
import {PinIcon} from '@sanity/icons/Pin'

export const place = defineType({
  name: 'place',
  title: 'Place',
  type: 'document',
  icon: PinIcon,
  fields: [
    defineField({name: 'name', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'name'},
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'kind',
      type: 'string',
      options: {list: ['country', 'region', 'city'], layout: 'radio'},
      initialValue: 'country',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'parent',
      type: 'reference',
      to: [{type: 'place'}],
      description: 'Region or country this place belongs to. Claims cascade down from here.',
      hidden: ({document}) => document?.kind === 'country',
    }),
    defineField({
      name: 'iso',
      title: 'ISO 3166-1 alpha-2 code',
      type: 'string',
      description: 'Two letters, lower case, e.g. jp. Drives the flag icon. Countries only.',
      validation: (r) => r.regex(/^[a-z]{2}$/, {name: 'two lower-case letters'}),
      hidden: ({document}) => document?.kind !== 'country',
    }),
    defineField({
      name: 'flag',
      type: 'string',
      description: 'Emoji flag or short glyph shown in lists.',
    }),
    defineField({name: 'blurb', type: 'text', rows: 2}),
  ],
  preview: {
    select: {title: 'name', kind: 'kind', flag: 'flag', parent: 'parent.name'},
    prepare: ({title, kind, flag, parent}) => ({
      title: [flag, title].filter(Boolean).join(' '),
      subtitle: [kind, parent].filter(Boolean).join(' · '),
    }),
  },
})
