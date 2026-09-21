import {defineField, defineType} from 'sanity'
import {TagIcon} from '@sanity/icons/Tag'

export const context = defineType({
  name: 'context',
  title: 'Context',
  type: 'document',
  icon: TagIcon,
  description: 'The situation a claim applies to: dinner, business, transit...',
  fields: [
    defineField({name: 'title', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'title'},
      validation: (r) => r.required(),
    }),
    defineField({name: 'description', type: 'text', rows: 2}),
    defineField({name: 'icon', type: 'string', description: 'Emoji shown in the atlas.'}),
  ],
  preview: {
    select: {title: 'title', icon: 'icon', subtitle: 'description'},
    prepare: ({title, icon, subtitle}) => ({
      title: [icon, title].filter(Boolean).join(' '),
      subtitle,
    }),
  },
})
