import {spread, verdict} from '@atlas/shared/consensus'
import type {Claim, Dispute as DisputeDoc, Ruling} from '@atlas/shared/sanity.types'
import {
  createDocumentHandle,
  editDocument,
  publishDocument,
  useApplyDocumentActions,
  useCurrentUser,
} from '@sanity/sdk-react'
import {Button, Card, Flex, Radio, Stack, Text, TextArea, TextInput} from '@sanity/ui'
import {useToast} from '@sanity/ui/toast'
import {useState} from 'react'
import {createDoc} from '../lib/actions'
import {moveTo} from '../lib/workflow'
import type {Case, Outcome} from '../types'

const OUTCOMES: {value: Outcome; title: string; blurb: string}[] = [
  {
    value: 'keep',
    title: 'Keep it',
    blurb: 'The leading answer stands. The claim goes back to settled.',
  },
  {
    value: 'split',
    title: 'Split it',
    blurb: 'Locals disagree because it is really two situations. Name them below.',
  },
  {
    value: 'retire',
    title: 'Retire it',
    blurb: 'Badly framed or no longer true. It leaves the atlas but keeps its history.',
  },
]

const ref = (_ref: string) => ({_type: 'reference' as const, _ref})

/**
 * One transaction per ruling: the ruling document, the dispute it answers, the
 * claim's new stage, and any claims a split creates all land together or not
 * at all. A half-applied ruling would leave the atlas asserting something no
 * moderator decided.
 */
export function RulingPane({item}: {item: Case}) {
  const apply = useApplyDocumentActions()
  const user = useCurrentUser()
  const toast = useToast()

  const [outcome, setOutcome] = useState<Outcome>('keep')
  const [summary, setSummary] = useState('')
  const [splits, setSplits] = useState<string[]>(['', ''])
  const [busy, setBusy] = useState(false)

  const s = spread(item.attestations)
  const leading = verdict(s)
  const openDispute = item.disputes[0]

  const splitStatements = splits.map((t) => t.trim()).filter(Boolean)
  const canSubmit =
    summary.trim().length >= 10 && (outcome !== 'split' || splitStatements.length >= 2) && !busy

  async function submit() {
    if (!canSubmit) return
    setBusy(true)

    const userId = user?.id ?? 'unknown'
    const stamp = Date.now().toString(36)
    const reason = summary.trim()

    const claim = createDocumentHandle({documentId: item._id, documentType: 'claim'})
    const dispute = createDocumentHandle({
      documentId: openDispute?._id ?? `dispute-board-${item.slug}-${stamp}`,
      documentType: 'dispute',
    })
    const ruling = createDocumentHandle({
      documentId: `ruling-${item.slug}-${stamp}`,
      documentType: 'ruling',
    })
    const splitHandles = splitStatements.map((_, i) =>
      createDocumentHandle({
        documentId: `claim-${item.place.slug}-split-${stamp}-${i}`,
        documentType: 'claim',
      }),
    )

    const actions = []

    // Every ruling answers a dispute. A claim that is only split by the numbers
    // has none, so the board opens one and rules on it in the same transaction,
    // which keeps the audit chain unbroken.
    if (!openDispute) {
      const opened: Partial<DisputeDoc> = {
        claim: ref(item._id),
        reason: `Opened from the moderator board: attestations split, leading answer at ${Math.round(
          s.agreement * 100,
        )}% over ${s.total} voices.`,
      }
      actions.push(createDoc(dispute, {...opened, status: 'ruling'}), publishDocument(dispute))
    }

    if (outcome === 'split') {
      splitHandles.forEach((handle, i) => {
        const child: Partial<Claim> = {
          statement: splitStatements[i],
          slug: {_type: 'slug', current: handle.documentId.replace(/^claim-/, '')},
          place: ref(item.place._id),
          context: ref(item.context._id),
          parent: ref(item._id),
          // Pending hands the new claims to the duplicate-check function,
          // exactly like a claim proposed from the site.
          dedupe: {status: 'pending'},
        }
        actions.push(createDoc(handle, {...child, status: 'proposed'}), publishDocument(handle))
      })
    }

    const filed: Partial<Ruling> = {
      dispute: ref(dispute.documentId),
      outcome,
      summary: reason,
      moderator: userId,
      ...(outcome === 'split'
        ? {resultingClaims: splitHandles.map((h) => ({...ref(h.documentId), _key: h.documentId}))}
        : {}),
    }
    actions.push(createDoc(ruling, filed), publishDocument(ruling))

    // The dispute closes either way.
    actions.push(
      editDocument(dispute, {set: {status: 'closed'}}),
      publishDocument(dispute),
      editDocument(claim, moveTo(outcome === 'keep' ? 'canon' : 'retired', reason, userId)),
      publishDocument(claim),
    )

    try {
      await apply(actions)
      toast.push({
        status: 'success',
        title:
          outcome === 'keep' ? 'Claim kept' : outcome === 'split' ? 'Claim split' : 'Claim retired',
        description:
          outcome === 'split'
            ? `${splitStatements.length} narrower claims are now in the duplicate check.`
            : undefined,
      })
      setSummary('')
      setSplits(['', ''])
    } catch (error) {
      toast.push({
        status: 'error',
        title: 'The ruling did not go through',
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card padding={4} radius={2} border>
      <Stack gap={4}>
        <Stack gap={2}>
          <Text size={2} weight="semibold">
            Rule on this
          </Text>
          <Text size={1} muted>
            The numbers lean {leading} at {Math.round(s.agreement * 100)}%. You are deciding what
            the atlas says, so say why.
          </Text>
        </Stack>

        <Stack gap={3}>
          {OUTCOMES.map((option) => (
            <Card
              key={option.value}
              as="label"
              padding={3}
              radius={2}
              border
              tone={outcome === option.value ? 'primary' : 'default'}
              style={{cursor: 'pointer'}}
            >
              <Flex align="flex-start" gap={3}>
                <Radio
                  checked={outcome === option.value}
                  name="outcome"
                  onChange={() => setOutcome(option.value)}
                  value={option.value}
                />
                <Stack gap={2}>
                  <Text size={1} weight="medium">
                    {option.title}
                  </Text>
                  <Text size={0} muted>
                    {option.blurb}
                  </Text>
                </Stack>
              </Flex>
            </Card>
          ))}
        </Stack>

        {outcome === 'split' && (
          <Stack gap={3}>
            <Text size={1} weight="medium">
              The narrower claims
            </Text>
            {splits.map((value, i) => (
              <TextInput
                key={i}
                value={value}
                placeholder={
                  i === 0
                    ? 'Ordering a cappuccino at breakfast'
                    : 'Ordering a cappuccino after dinner'
                }
                onChange={(e) => {
                  const next = [...splits]
                  next[i] = e.currentTarget.value
                  setSplits(next)
                }}
              />
            ))}
            <Flex gap={2}>
              <Button
                mode="ghost"
                fontSize={1}
                text="Add another"
                onClick={() => setSplits([...splits, ''])}
              />
            </Flex>
            <Text size={0} muted>
              Each one inherits {item.place.name} and {item.context.title}, enters as proposed, and
              goes through the same duplicate check as a public proposal.
            </Text>
          </Stack>
        )}

        <Stack gap={2}>
          <Text size={1} weight="medium">
            Why
          </Text>
          <TextArea
            rows={3}
            value={summary}
            placeholder="This reads as settled to locals in the north and contested in the south."
            onChange={(e) => setSummary(e.currentTarget.value)}
          />
        </Stack>

        <Flex gap={2} align="center">
          <Button
            text={busy ? 'Filing…' : 'File the ruling'}
            tone="primary"
            disabled={!canSubmit}
            onClick={submit}
          />
          {summary.trim().length < 10 && (
            <Text size={0} muted>
              A sentence of reasoning is required.
            </Text>
          )}
        </Flex>
      </Stack>
    </Card>
  )
}
