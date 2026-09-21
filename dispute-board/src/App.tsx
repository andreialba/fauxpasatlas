import {type SanityConfig} from '@sanity/sdk'
import {SanityApp} from '@sanity/sdk-react'
import {Flex, Spinner} from '@sanity/ui'
import {DisputeBoard} from './components/DisputeBoard'
import {SanityUI} from './SanityUI'

function App() {
  const sanityConfigs: SanityConfig[] = [
    {
      projectId: 'dh2oc30x',
      dataset: 'production',
    },
  ]

  function Loading() {
    return (
      <Flex justify="center" align="center" style={{minHeight: '100vh'}}>
        <Spinner />
      </Flex>
    )
  }

  return (
    <SanityUI>
      <SanityApp config={sanityConfigs} fallback={<Loading />}>
        <DisputeBoard />
      </SanityApp>
    </SanityUI>
  )
}

export default App
