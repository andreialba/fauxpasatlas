import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'dh2oc30x',
    dataset: 'production',
  },
  // Hosted at https://faux-pas-atlas.sanity.studio; deploy with `npx sanity deploy`.
  studioHost: 'faux-pas-atlas',
  deployment: {autoUpdates: true, appId: 'ckhm7rfu7r7mwaistqmedu4i'},
})
