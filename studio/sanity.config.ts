import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {workflowsPlugin} from '@sanity-labs/sanity-plugin-workflows'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'Faux Pas Atlas',
  projectId: 'dh2oc30x',
  dataset: 'production',
  plugins: [structureTool(), visionTool(), workflowsPlugin()],
  schema: {
    types: schemaTypes,
  },
})
