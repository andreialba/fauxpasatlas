import {spread, WEIGHT, type Locality} from '@atlas/shared/consensus'
import {Box, Card, Flex, Grid, Stack, Text} from '@sanity/ui'
import {LOCALITY_LABEL, pct, STANCE_LABEL, STANCE_TONE, STANCES} from '../lib/stages'
import type {Attestation} from '../types'

/**
 * The split, shown twice: once as the weighted bar the site displays, and once
 * broken down by how well each voice knows the place. A moderator needs the
 * second view, because five visitors agreeing is a different thing from three
 * locals agreeing.
 */
export function SpreadView({attestations}: {attestations: Attestation[]}) {
  const s = spread(attestations)
  const total = s.total || 1

  const localities: Locality[] = ['local', 'lived-there', 'visitor']

  return (
    <Stack gap={4}>
      <Stack gap={3}>
        <Flex align="center" justify="space-between">
          <Text size={1} weight="medium">
            Weighted split
          </Text>
          <Text size={1} muted>
            {pct(s.agreement)} to the leading answer
          </Text>
        </Flex>

        <Flex style={{height: 10, overflow: 'hidden', borderRadius: 3}}>
          {STANCES.map((stance) => {
            const share = s.byStance[stance] / total
            if (share === 0) return null
            return (
              <Card
                key={stance}
                tone={STANCE_TONE[stance]}
                style={{width: `${share * 100}%`}}
                title={`${s.byStance[stance]} ${STANCE_LABEL[stance]}`}
              >
                <Box style={{height: 10, background: 'currentColor', opacity: 0.85}} />
              </Card>
            )
          })}
        </Flex>

        <Grid style={{gridTemplateColumns: 'repeat(3, minmax(0, 1fr))'}} gap={2}>
          {STANCES.map((stance) => (
            <Card key={stance} tone={STANCE_TONE[stance]} padding={3} radius={2} border>
              <Stack gap={2}>
                <Text size={0} weight="semibold" muted>
                  {STANCE_LABEL[stance]}
                </Text>
                <Text size={4} weight="semibold">
                  {s.byStance[stance]}
                </Text>
                <Text size={0} muted>
                  {s.localByStance[stance]} local
                </Text>
              </Stack>
            </Card>
          ))}
        </Grid>
      </Stack>

      <Stack gap={3}>
        <Text size={1} weight="medium">
          Who is saying it
        </Text>
        <Stack gap={2}>
          {localities.map((locality) => {
            const rows = attestations.filter((a) => a.locality === locality)
            if (rows.length === 0) return null
            return (
              <Flex key={locality} align="center" gap={3}>
                <Box style={{width: 100, flexShrink: 0}}>
                  <Text size={1} muted>
                    {LOCALITY_LABEL[locality]}
                  </Text>
                </Box>
                <Flex flex={1} gap={1}>
                  {STANCES.map((stance) => {
                    const n = rows.filter((r) => r.stance === stance).length
                    if (n === 0) return null
                    return (
                      <Card
                        key={stance}
                        tone={STANCE_TONE[stance]}
                        padding={1}
                        radius={1}
                        style={{width: `${(n / rows.length) * 100}%`}}
                      >
                        <Text size={0} align="center" weight="medium">
                          {n}
                        </Text>
                      </Card>
                    )
                  })}
                </Flex>
                <Box style={{width: 64, flexShrink: 0}}>
                  <Text size={0} muted align="right">
                    ×{WEIGHT[locality]}
                  </Text>
                </Box>
              </Flex>
            )
          })}
        </Stack>
      </Stack>
    </Stack>
  )
}
