import {trackRecord, type Locality, type RecordEntry, type Stance} from '@atlas/shared/consensus'
import {ATTESTER_TRACK_RECORDS} from '@atlas/shared/groq'
import {useQuery} from '@sanity/sdk-react'
import {Badge, Box, Card, Flex, Stack, Text} from '@sanity/ui'
import {LOCALITY_LABEL, pct, STANCE_LABEL, STANCE_TONE} from '../lib/stages'
import type {Attestation} from '../types'

interface AttesterRecord {
  _id: string
  handle: string
  homePlaces?: {name: string}[]
  attestations: RecordEntry[]
}

const ORDER: Record<Locality, number> = {local: 0, 'lived-there': 1, visitor: 2}

function trustTone(score: number | null): 'positive' | 'caution' | 'critical' | 'default' {
  if (score === null) return 'default'
  if (score >= 0.7) return 'positive'
  if (score >= 0.4) return 'caution'
  return 'critical'
}

/**
 * Who is behind the numbers. For each person who answered this claim: how they
 * answered, and how often their past answers landed on the side the locals
 * eventually settled on. Nothing here is stored on the attester; it is
 * recomputed from their attestations every time, like every other verdict.
 */
export function TrustPanel({attestations}: {attestations: Attestation[]}) {
  const ids = [...new Set(attestations.map((a) => a.attesterId).filter((id): id is string => !!id))]
  const {data} = useQuery<AttesterRecord[]>({
    query: ATTESTER_TRACK_RECORDS,
    params: {ids},
  })

  const byId = new Map((data ?? []).map((r) => [r._id, r]))

  const rows = attestations
    .flatMap((a) => {
      const record = a.attesterId ? byId.get(a.attesterId) : undefined
      return record ? [{a, record, trust: trackRecord(record.attestations)}] : []
    })
    .sort(
      (x, y) =>
        ORDER[x.a.locality] - ORDER[y.a.locality] || (y.trust.score ?? -1) - (x.trust.score ?? -1),
    )

  if (rows.length === 0) return null

  return (
    <Stack gap={3}>
      <Flex align="center" justify="space-between">
        <Text size={1} weight="semibold">
          Who is behind the numbers
        </Text>
        <Text size={0} muted>
          {rows.length} named voice{rows.length === 1 ? '' : 's'}
        </Text>
      </Flex>
      <Stack gap={1}>
        {rows.map(({a, record, trust}) => (
          <Card key={record._id} padding={2} radius={2} border>
            <Flex align="center" gap={3}>
              <Box style={{width: 140, flexShrink: 0}}>
                <Stack gap={1}>
                  <Text size={1} weight="medium" textOverflow="ellipsis">
                    {record.handle}
                  </Text>
                  <Text size={0} muted textOverflow="ellipsis">
                    {LOCALITY_LABEL[a.locality]}
                    {record.homePlaces?.length
                      ? ` · ${record.homePlaces.map((p) => p.name).join(', ')}`
                      : ''}
                  </Text>
                </Stack>
              </Box>
              <Badge tone={STANCE_TONE[a.stance as Stance]} fontSize={0}>
                {STANCE_LABEL[a.stance]}
              </Badge>
              <Box flex={1} />
              <Stack gap={1}>
                <Flex justify="flex-end">
                  <Badge tone={trustTone(trust.score)} fontSize={0}>
                    {trust.score === null ? 'Too new to judge' : `${pct(trust.score)} with the locals`}
                  </Badge>
                </Flex>
                <Text size={0} muted align="right">
                  {trust.total} vote{trust.total === 1 ? '' : 's'}, {trust.judged} on settled claims
                </Text>
              </Stack>
            </Flex>
          </Card>
        ))}
      </Stack>
      <Text size={0} muted>
        Trust is how often a person&apos;s past answers matched what locals later settled on. It is
        computed here, not stored on the person, and says nothing about whether they are right
        this time.
      </Text>
    </Stack>
  )
}
