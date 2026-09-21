import {PROPOSAL_QUEUE} from '@atlas/shared/groq'
import {useQuery} from '@sanity/sdk-react'
import {Box, Card, Container, Flex, Heading, Stack, Tab, TabList, TabPanel, Text} from '@sanity/ui'
import {Suspense, useState} from 'react'
import type {Case} from '../types'
import {CaseDetail} from './CaseDetail'
import {ProposalQueue} from './ProposalQueue'
import {Queue} from './Queue'

function ProposalCount() {
  const {data} = useQuery<{_id: string}[]>({query: PROPOSAL_QUEUE})
  const n = data?.length ?? 0
  return <>{n > 0 ? ` (${n})` : ''}</>
}

function Loading({label}: {label: string}) {
  return (
    <Card padding={4} radius={2} tone="transparent">
      <Text size={1} muted>
        {label}
      </Text>
    </Card>
  )
}

export function DisputeBoard() {
  const [selected, setSelected] = useState<Case | undefined>()
  const [tab, setTab] = useState<'disputes' | 'proposals'>('disputes')

  return (
    <Container width={5} padding={4}>
      <Stack gap={5}>
        <Stack gap={2}>
          <Heading size={4}>Dispute board</Heading>
          <Text size={1} muted>
            Claims the atlas will not call on its own. The site shows the split to
            readers; this is where someone decides what to do about it.
          </Text>
        </Stack>

        <TabList gap={1}>
          <Tab
            id="tab-disputes"
            aria-controls="panel-disputes"
            label="Disputes"
            selected={tab === 'disputes'}
            onClick={() => setTab('disputes')}
          />
          <Tab
            id="tab-proposals"
            aria-controls="panel-proposals"
            label={
              <>
                Proposals
                <Suspense fallback={null}>
                  <ProposalCount />
                </Suspense>
              </>
            }
            selected={tab === 'proposals'}
            onClick={() => setTab('proposals')}
          />
        </TabList>

        <TabPanel id="panel-proposals" aria-labelledby="tab-proposals" hidden={tab !== 'proposals'}>
          <Stack gap={3}>
            <Text size={1} muted>
              What the public proposed and the automatic check would not wave through. Nothing here is
              on the site until you let it in.
            </Text>
            <Suspense fallback={<Loading label="Loading proposals…" />}>
              <ProposalQueue />
            </Suspense>
          </Stack>
        </TabPanel>

        <TabPanel id="panel-disputes" aria-labelledby="tab-disputes" hidden={tab !== 'disputes'}>
        <Flex gap={4} align="flex-start" wrap="wrap">
          <Box style={{width: 360, flexShrink: 0, minWidth: 280}}>
            <Suspense fallback={<Loading label="Loading the queue…" />}>
              <Queue
                selectedId={selected?._id}
                onSelect={(item) => setSelected(item)}
              />
            </Suspense>
          </Box>

          <Box flex={1} style={{minWidth: 360}}>
            {selected ? (
              <CaseDetail key={selected._id} item={selected} />
            ) : (
              <Card padding={5} radius={2} border tone="transparent">
                <Text size={1} muted align="center">
                  Pick a claim from the queue.
                </Text>
              </Card>
            )}
          </Box>
        </Flex>
        </TabPanel>
      </Stack>
    </Container>
  )
}
