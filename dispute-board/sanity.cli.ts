import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  app: {
    organizationId: 'o60vjezz4',
    entry: './src/App.tsx',
    title: 'Dispute Board',
  },
  deployment: {
    // Set by the first `sanity deploy --create`. Keeping it here means later
    // deploys update this app instead of creating another one.
    appId: 'l0ldaubt5keoci87irpg861e',
  },
})
