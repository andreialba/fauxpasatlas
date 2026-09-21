import {spread} from '@atlas/shared/consensus'
import {BOARD_QUEUE} from '@atlas/shared/groq'
import {useQuery} from '@sanity/sdk-react'
import {Badge, Box, Card, Flex, Stack, Text} from '@sanity/ui'
import {pct} from '../lib/stages'
import type {Case} from '../types'

interface Props {
  selectedId?: string
  onSelect: (item: Case) => void
}

/**
 * Everything waiting on a moderator, most split first. A written dispute
 * outranks a bare statistical split, because someone took the trouble to
 * explain why the atlas is wrong.
 */
export function Queue({selectedId, onSelect}: Props) {
  const {data} = useQuery<Case[]>({query: BOARD_QUEUE})

  const rows = [...(data ?? [])]
    .map((item) => ({item, s: spread(item.attestations)}))
    .sort((a, b) => {
      const disputes = b.item.disputes.length - a.item.disputes.length
      if (disputes !== 0) return disputes
      return a.s.agreement - b.s.agreement
    })

  if (rows.length === 0) {
    return (
      <Card padding={4} radius={2} tone="positive" border>
        <Text size={1}>Nothing waiting. Every claim is either settled or still gathering.</Text>
      </Card>
    )
  }

  return (
    <Stack gap={2}>
      {rows.map(({item, s}) => {
        const selected = item._id === selectedId
        return (
          <Card
            key={item._id}
            as="button"
            padding={3}
            radius={2}
            border
            pressed={selected}
            tone={selected ? 'primary' : 'default'}
            onClick={() => onSelect(item)}
            style={{cursor: 'pointer', textAlign: 'left', width: '100%'}}
          >
            <Stack gap={3}>
              <Flex align="center" gap={2}>
                {item.place?.iso && (
                  <img
                    src={`https://hatscripts.github.io/circle-flags/flags/${item.place.iso}.svg`}
                    alt=""
                    width={16}
                    height={16}
                  />
                )}
                <Text size={0} muted>
                  {item.place?.name} · {item.context?.title}
                </Text>
              </Flex>

              <Text size={1} weight="medium">
                {item.statement}
              </Text>

              <Flex align="center" gap={2}>
                <Badge tone={item.disputes.length > 0 ? 'caution' : 'default'} fontSize={0}>
                  {item.disputes.length > 0 ? `${item.disputes.length} disputed` : 'Split'}
                </Badge>
                <Box flex={1} />
                <Text size={0} muted>
                  {s.total} voices · {s.locals} local · {pct(s.agreement)}
                </Text>
              </Flex>
            </Stack>
          </Card>
        )
      })}
    </Stack>
  )
}
