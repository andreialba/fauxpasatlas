# Faux Pas Atlas — build plan

14 days: Sat 2026-09-20 → Sat 2026-10-04 (deadline). Evenings plus two weekends.
Read CLAUDE.md first for the concept, schema, judging criteria and Free-plan
limits. This file is the order of work and the checkpoints.

Principle: **something demoable at the end of every phase.** If time runs out,
we ship what exists and write honestly about what was cut.

## Repo layout

```
faux-pas-atlas/
  studio/        Sanity Studio v6 + workflows plugin + schema
  web/           Astro site (@sanity/astro)
  dispute-board/ App SDK app (React) deployed to Sanity Dashboard
  functions/     Sanity Functions via Blueprints
  scripts/       seed + GROQ helpers
  docs/
    build-log.md prompt log, started at the first prompt
    seed/        claim seed data (JSON/YAML per place)
  README.md      setup, project ID, public dataset URL
```

Single git repo, public on GitHub. pnpm workspaces. Node 22.12+ (required by
the workflows plugin and the JS client v8).

## Phase 0 — Setup

- [x] Verify Node ≥ 22.12, pnpm, git (Node 24.14, pnpm 10.33, git 2.53). GitHub repo: not yet created.
- [x] `docs/build-log.md` created. **Every** Claude Code prompt from here on
      gets a line: date, prompt (trimmed), outcome, course-correction.
- [x] Sanity project `dh2oc30x` created on **Free** in the web UI (2026-09-20). Studio scaffolded by hand in `studio/` because the CLI was not logged in; CLI login done afterwards.
      Studio v6, TypeScript, clean schema. Dataset `production`, public.
      Decide on the `lwj` coupon: default **no**, stay on plain Free unless a
      hard blocker appears.
- [ ] Request Workflows engine early access (form on the Workflows docs page).
      Not blocking; we build on the plugin.
- [x] Install `@sanity-labs/sanity-plugin-workflows` 0.8.0, register it. `sanity build` and `sanity dev` run. **Still to confirm in the browser:**
      Studio boots on a Free project. **Checkpoint: stage field and "Move to
      next stage" button appear on a test document.** If it does not work on
      Free, fall back to a plain `stage` string field + our own Functions and
      note it in the build log.
- [x] Claude Code session is the transcript source (this session, 2026-09-20).

## Phase 1 — Schema + seed 

- [x] Schema types written 2026-09-20: `place`, `context`, `claim`, `attestation`, `dispute`,
      `ruling`, `attester` (see CLAUDE.md table). `claim` has **no verdict field**.
- [x] Workflow definitions seeded by script (`studio/scripts/seed-workflows.ts`, run with `sanity exec --with-user-token`): claim (Proposed → Attesting → Canon,
      side stage Contested), dispute (Opened → Evidence → Ruling → Closed).
- [x] GROQ projections + consensus rule in `shared/` (`@atlas/shared/groq`, `@atlas/shared/consensus`): verdict + spread for a claim, quiz set for a place,
      attester trust score. Reused by web, functions and the board.
- [x] `sanity schema extract` + `sanity typegen generate` from `studio/` (config `studio/sanity-typegen.json`) → `shared/src/sanity.types.ts`, 36 schema types (2026-09-21).
- [x] Seed script `studio/scripts/seed-content.ts` (2026-09-20): 8 places, 8 contexts, 66 claims, 30 attesters, 451 attestations; stage derived from the consensus rule (39 canon, 24 attesting, 3 contested). **Claims still need a human review.** Target was 10–15 places, 8–12 claims each, 3–8 attestations per claim
      with mixed locality so spreads look real. Author the claims yourself; do
      not let the model invent "facts" about cultures unchecked. Mark uncertain
      ones as Contested on purpose.
- [x] **Checkpoint:** Studio shows seeded claims with stages; `studio/scripts/query-check.ts` proves a GROQ query
      Vision returns a verdict computed from attestations.

## Phase 2 — Astro site 

- [x] Astro 7 + plain CSS in `web/`, Cloudflare adapter, static output.
      **Changed from the plan:** skipped `@sanity/astro` (it pulls React, Studio
      and styled-components in as peers just for Visual Editing) and used
      `@sanity/client` directly. Visual Editing moves to the cut list.
- [x] Design v1 borrowed an existing accent-and-pills system
      (Space Grotesk + IBM Plex Mono self-hosted, acid accent, `light-dark()`
      tokens, blurred hero backdrop, reveal-on-scroll) and the `verdict` theme
      for the structure of the verdict panel and the score breakdown.
- [x] Pages: home, `/atlas`, `/atlas/[place]`, `/claim/[slug]`, `/quiz/[place]`,
      `/propose`, `/disputes`, `/about`. 87 pages build.
- [x] Islands: the quiz, the attest form (works without JS too), stance meters.
- [x] Server endpoints: `POST /api/attest`, `/api/dispute`, `/api/propose`,
      all `prerender = false`. Attester identity is a pseudonym, or a hash of
      the IP when none is given; one attestation per person per claim by
      deterministic id, so a second submission edits rather than stuffs.
- [ ] Deploy to Cloudflare Pages. Add a GROQ webhook (Free has 2) to rebuild
      when a claim reaches canon.
- [ ] **Checkpoint:** a stranger can open the URL, take the Lisbon quiz, click
      "I'm from here and that's wrong", and see the attestation land in Studio.
      *Local half is done; needs the deploy and a write token.*

## Phase 3 — Functions

Blueprints in `functions/`, Stack `faux-pas-atlas` promoted to organization
scope (scheduled functions require it). Test locally with
`npx sanity functions test <name> --project-id dh2oc30x --dataset production --with-user-token`.

- [x] `claim-dedupe`: on a proposed claim with `dedupe.status == "pending"`, one
      Agent Actions `prompt` call (JSON, temperature 0) compares it with claims
      for the same place + context. Unique → Attesting. Likely duplicate → stays
      Proposed with `dedupe.related` set for a moderator. The filter guarantees it
      never re-runs, so it is one credit per proposal.
- [x] `recompute-agreement`: on any attestation create/update/delete, recompute
      with `@atlas/shared/consensus`, move between Attesting / Canon / Contested,
      append a `workflow.setStatus` audit entry. Threshold: ≥5 voices, ≥3 local,
      ≥70% agreement; <55% → Contested.
- [x] `expiry-sweep`: daily 06:00 Europe/Bucharest; Canon claims with no
      attestation in 12 months go back to Attesting.
- [x] **Checkpoint:** three local attestations written through the API
      flipped a claim from Attesting to Canon in under 5 s, with the function's
      audit entry in the claim's history. A near-duplicate proposal was flagged
      by the Agent Action with the right related claim in under 5 s. Deleting the
      test attestations moved the claim back to Attesting. AI credits used: 2.

## Phase 4 — App SDK Dispute Board (deployed 2026-09-21, completed 2026-09-21)

Lives at https://www.sanity.io/@o60vjezz4/application/l0ldaubt5keoci87irpg861e
(app id pinned in `dispute-board/sanity.cli.ts`; deploy with `npx sanity deploy`).

- [x] Scaffolded from the official `app-sanity-ui` template, then upgraded from
      the template's App SDK 2.20 / Sanity UI 3 to SDK 3.3 / UI 4.2.
- [x] Queue: one `useQuery` on `BOARD_QUEUE` (in `@atlas/shared`), live. Written
      disputes outrank a bare statistical split; within each group, most split first.
- [x] Spread view: weighted bar plus a breakdown by locality, so a moderator can
      see whether five visitors or three locals are driving the number.
- [x] Ruling pane: keep / split / retire in **one transaction** via
      `useApplyDocumentActions`. A split creates narrower claims that inherit the
      place and context and enter as `proposed` with `dedupe.status = pending`,
      so they go through the same Agent Action check as a public proposal.
      A claim with no written dispute gets one opened in the same transaction,
      so every ruling answers a dispute and the audit chain is unbroken.
- [x] Presence: `useReportPresence` + `usePresenceForDocument` warn when another
      moderator is on the same claim.
- [x] History: the claim's `workflow.setStatus` trail, with function decisions
      labelled, next to the moderator's own.
- [x] Attester trust panel: for every named voice on the selected claim, how they
      answered and how often their past answers matched what locals later settled
      on. Derived in `@atlas/shared/consensus` (`trackRecord`), never stored.
- [x] Proposals queue (added 2026-09-21 after a live test showed "A test claim"
      reaching the atlas): everything the content-and-duplicate check held back,
      with let-in / reject. The dedupe Function now also judges whether the text
      is a genuine etiquette claim, same single credit.
- [x] **Checkpoint:** `studio/scripts/e2e-ruling.ts` files a ruling with the
      board's exact transaction shape and polls the live claim page. Exposed a
      real bug: the Worker kept serving a retired claim because Cloudflare cached
      the Sanity CDN subrequest. See build log 2026-09-21. Ruling in the
      Dashboard UI itself: done by hand, see the screenshots.

## Phase 5 — Polish, content, submission

- [x] Content pass (2026-09-21): 106 claims across 11 places, 12 new, one moved to
      the right situation, details added where the quiz review screen benefits,
      accents stripped from slugs, stale seed documents removed on re-run. Every
      place now has 6+ settled claims so every quiz has questions.
- [x] README: setup, env vars, project ID, public dataset query URL, screenshots.
- [x] Screenshots in `docs/screenshots` (the template accepts video **or**
      screenshots; no video). Site shots taken with headless Chrome; the Dashboard
      and Studio shots need a logged-in browser: see the DEV post draft.
- [x] Curated into `docs/dev-post.md`, the full post draft from the Path 2 template.
- [ ] Upload agent session at https://dev.to/agent_sessions/new, scrub secrets,
      **Make Public**.
- [ ] Cover image 1000×420.
- [ ] Publish DEV post from the Path 2 template with `#sanitychallenge`.
      Do this on **Fri 3 Oct**, not the deadline day.

## Cut list, in order, if behind

1. Attester trust panel in the App SDK app.
2. `expiry-sweep` Function (describe it in the post as designed, not shipped).
3. Presence in the Dispute Board.
4. `/propose` page (moderators seed claims instead; attest/dispute stay).
5. Visual Editing overlays.

Never cut: quiz, attest button, `recompute-agreement`, Dispute Board with
spread view, build log, project ID in the post.

## Risks to watch

- Workflows plugin behaviour on Free (Phase 0 checkpoint).
- Functions local dev and Blueprints deploy friction; budget a full evening.
- App SDK v3 + Sanity UI v4 + React 19 peer-dependency mismatches.
- Seed content quality. This is the thing judges actually see first.
- Free-plan hard stops: watch AI credits and API requests in Manage.
