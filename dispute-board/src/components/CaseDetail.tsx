import {usePresenceForDocument, useReportPresence} from '@sanity/sdk-react'
import {Badge, Box, Card, Flex, Heading, Inline, Stack, Text} from '@sanity/ui'
import {Suspense} from 'react'
import {LOCALITY_LABEL, STANCE_LABEL, STANCE_TONE} from '../lib/stages'
import type {Case} from '../types'
import {RulingPane} from './RulingPane'
import {SpreadView} from './SpreadView'
import {TrustPanel} from './TrustPanel'

/** Two moderators ruling on the same claim at once would race. Show who else is here. */
function Presence({documentId}: {documentId: string}) {
  const handle = {documentId, documentType: 'claim'}
  useReportPresence(handle)
  const {presence} = usePresenceForDocument(handle)

  if (presence.length === 0) return null
  return (
    <Badge tone="caution" fontSize={0}>
      {presence.length} other moderator{presence.length === 1 ? '' : 's'} here
    </Badge>
  )
}

export function CaseDetail({item}: {item: Case}) {
  const notes = item.attestations.filter((a) => a.note)

  return (
    <Stack gap={5}>
      <Stack gap={3}>
        <Flex align="center" gap={2} wrap="wrap">
          {item.place?.iso && (
            <img
              src={`https://hatscripts.github.io/circle-flags/flags/${item.place.iso}.svg`}
              alt=""
              width={20}
              height={20}
            />
          )}
          <Text size={1} muted>
            {item.place?.name} · {item.context?.title}
          </Text>
          <Badge tone={item.status === 'contested' ? 'caution' : 'default'} fontSize={0}>
            {item.status}
          </Badge>
          <Presence documentId={item._id} />
        </Flex>

        <Heading size={3}>{item.statement}</Heading>
        {item.detail && (
          <Text size={1} muted>
            {item.detail}
          </Text>
        )}
      </Stack>

      <Card padding={4} radius={2} border>
        <SpreadView attestations={item.attestations} />
      </Card>

      <Suspense
        fallback={
          <Text size={0} muted>
            Looking up who answered…
          </Text>
        }
      >
        <TrustPanel attestations={item.attestations} />
      </Suspense>

      {item.disputes.length > 0 && (
        <Stack gap={3}>
          <Text size={1} weight="semibold">
            Written disputes
          </Text>
          {item.disputes.map((dispute) => (
            <Card key={dispute._id} padding={3} radius={2} border tone="caution">
              <Stack gap={3}>
                <Inline gap={2}>
                  <Badge fontSize={0}>{dispute.status}</Badge>
                  {dispute.openedBy && (
                    <Text size={0} muted>
                      {dispute.openedBy}
                    </Text>
                  )}
                </Inline>
                <Text size={1}>{dispute.reason}</Text>
                {dispute.evidence?.map((e) => (
                  <Text key={e._key} size={0}>
                    <a href={e.url} target="_blank" rel="noreferrer">
                      {e.note || e.url}
                    </a>
                  </Text>
                ))}
              </Stack>
            </Card>
          ))}
        </Stack>
      )}

      {notes.length > 0 && (
        <Stack gap={3}>
          <Text size={1} weight="semibold">
            What people wrote
          </Text>
          <Stack gap={2}>
            {notes.map((note, i) => (
              <Card key={i} padding={3} radius={2} border tone={STANCE_TONE[note.stance]}>
                <Stack gap={2}>
                  <Text size={0} weight="medium">
                    {STANCE_LABEL[note.stance]} · {LOCALITY_LABEL[note.locality]}
                    {note.handle ? ` · ${note.handle}` : ''}
                  </Text>
                  <Text size={1}>{note.note}</Text>
                </Stack>
              </Card>
            ))}
          </Stack>
        </Stack>
      )}

      <RulingPane item={item} />

      {item.history && item.history.length > 0 && (
        <Stack gap={3}>
          <Text size={1} weight="semibold">
            History
          </Text>
          <Stack gap={2}>
            {[...item.history].reverse().map((entry, i) => (
              <Flex key={i} gap={3} align="flex-start">
                <Box style={{width: 96, flexShrink: 0}}>
                  <Text size={0} muted>
                    {entry.completedAt?.slice(0, 10)}
                  </Text>
                </Box>
                <Stack gap={1} flex={1}>
                  <Text size={0} weight="medium">
                    {entry.statusLabel ?? entry.statusSlug}
                  </Text>
                  <Text size={0} muted>
                    {entry.reason}
                    {entry.by?.startsWith('function:') ? ` (${entry.by})` : ''}
                  </Text>
                </Stack>
              </Flex>
            ))}
          </Stack>
        </Stack>
      )}
    </Stack>
  )
}
