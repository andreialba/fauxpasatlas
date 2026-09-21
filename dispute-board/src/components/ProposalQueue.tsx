import {PROPOSAL_QUEUE} from '@atlas/shared/groq'
import {
  createDocumentHandle,
  editDocument,
  publishDocument,
  useApplyDocumentActions,
  useCurrentUser,
  useQuery,
} from '@sanity/sdk-react'
import {Badge, Box, Button, Card, Flex, Stack, Text} from '@sanity/ui'
import {useToast} from '@sanity/ui/toast'
import {useState} from 'react'
import {moveTo} from '../lib/workflow'

interface Proposal {
  _id: string
  statement: string
  detail?: string
  _createdAt: string
  place?: {name: string; iso?: string}
  context?: {title: string}
  proposedBy?: string
  dedupe?: {status?: string; notes?: string; related?: {_id: string; statement: string; status: string}[]}
}

const HOLD_LABEL: Record<string, string> = {
  pending: 'Being checked',
  'needs-review': 'Held: did not read as etiquette',
  'possible-duplicate': 'Held: possible duplicate',
  unique: 'Passed, waiting',
}

const HOLD_TONE: Record<string, 'default' | 'caution' | 'critical' | 'positive'> = {
  pending: 'default',
  'needs-review': 'critical',
  'possible-duplicate': 'caution',
  unique: 'positive',
}

/**
 * Everything the public proposed that the duplicate-and-sense check did not
 * wave through. A moderator lets it in (it opens for attestation like any
 * other claim) or rejects it (retired, history kept, never shown). Nothing here
 * is on the site.
 */
export function ProposalQueue() {
  const {data} = useQuery<Proposal[]>({query: PROPOSAL_QUEUE})
  const apply = useApplyDocumentActions()
  const user = useCurrentUser()
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)

  async function decide(p: Proposal, approve: boolean) {
    setBusy(p._id)
    const userId = user?.id ?? 'unknown'
    const claim = createDocumentHandle({documentId: p._id, documentType: 'claim'})
    const reason = approve
      ? `Let in by a moderator after the automatic check held it (${p.dedupe?.status}).`
      : `Rejected by a moderator: ${p.dedupe?.notes ?? 'not an etiquette claim.'}`
    try {
      await apply([
        editDocument(claim, moveTo(approve ? 'attesting' : 'retired', reason, userId)),
        publishDocument(claim),
      ])
      toast.push({
        status: 'success',
        title: approve ? 'Opened for attestation' : 'Rejected',
        description: p.statement,
      })
    } catch (error) {
      toast.push({
        status: 'error',
        title: 'That did not go through',
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setBusy(null)
    }
  }

  const rows = data ?? []

  if (rows.length === 0) {
    return (
      <Card padding={4} radius={2} tone="positive" border>
        <Text size={1}>Nothing proposed is waiting. The automatic check has let everything through or nobody has proposed anything.</Text>
      </Card>
    )
  }

  return (
    <Stack gap={3}>
      {rows.map((p) => {
        const hold = p.dedupe?.status ?? 'pending'
        return (
          <Card key={p._id} padding={4} radius={2} border>
            <Stack gap={3}>
              <Flex align="center" gap={2} wrap="wrap">
                {p.place?.iso && (
                  <img
                    src={`https://hatscripts.github.io/circle-flags/flags/${p.place.iso}.svg`}
                    alt=""
                    width={16}
                    height={16}
                  />
                )}
                <Text size={0} muted>
                  {p.place?.name ?? 'No place'} · {p.context?.title ?? 'No situation'}
                  {p.proposedBy ? ` · by ${p.proposedBy}` : ' · anonymous'} · {p._createdAt.slice(0, 10)}
                </Text>
                <Box flex={1} />
                <Badge tone={HOLD_TONE[hold] ?? 'default'} fontSize={0}>
                  {HOLD_LABEL[hold] ?? hold}
                </Badge>
              </Flex>

              <Text size={2} weight="semibold">
                {p.statement}
              </Text>
              {p.detail && (
                <Text size={1} muted>
                  {p.detail}
                </Text>
              )}

              {p.dedupe?.notes && (
                <Card padding={3} radius={2} tone="transparent" border>
                  <Stack gap={2}>
                    <Text size={0} muted>
                      What the check said
                    </Text>
                    <Text size={1}>{p.dedupe.notes}</Text>
                    {p.dedupe.related?.map((r) => (
                      <Text key={r._id} size={0} muted>
                        Looks like: “{r.statement}” ({r.status})
                      </Text>
                    ))}
                  </Stack>
                </Card>
              )}

              <Flex gap={2}>
                <Button
                  text="Let it in"
                  tone="positive"
                  fontSize={1}
                  disabled={busy !== null || hold === 'pending'}
                  onClick={() => decide(p, true)}
                />
                <Button
                  text="Reject"
                  tone="critical"
                  mode="ghost"
                  fontSize={1}
                  disabled={busy !== null || hold === 'pending'}
                  onClick={() => decide(p, false)}
                />
                {hold === 'pending' && (
                  <Text size={0} muted>
                    The check has not run yet. It usually takes a few seconds.
                  </Text>
                )}
              </Flex>
            </Stack>
          </Card>
        )
      })}
    </Stack>
  )
}
