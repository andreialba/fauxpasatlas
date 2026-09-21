# Sanity Challenge (dev.to) — project notes

Research compiled 2026-09-20. No code exists yet; this file is the shared context
for anyone (human or agent) picking up the project. The phased build order,
checkpoints and cut list are in PLAN.md.

## The challenge

- Page: https://dev.to/challenges/sanity-2026-09-16
- Announcement: https://dev.to/devteam/join-the-sanity-challenge-2500-in-prizes-for-five-winners-514m
- Entries so far: https://dev.to/t/sanitychallenge
- Runs 2026-09-18 → **submissions due 2026-10-04**. Winners announced 2026-10-22.
- $2,500 total, five winners. Path 2 gets **two winners at $500** + DEV++ membership + badge.
- 18+, teams up to 4, one submission per team, English only for prizes. AI tools allowed.

### Path 2: "Vibe-Code Something Strange" (our path)

Prompt: *"Prompt your way to a working app. Any AI-native IDE, Next.js or Astro on
the front, Sanity behind it."*

Judging criteria, in the order Sanity lists them:
1. Quality **and honesty** of the build-process writeup
2. Functionality of the finished app
3. Thoughtfulness of the schema
4. Creativity and originality

Bonus points for going beyond Studio with the **App SDK** or **Workflows**.

Submission (one DEV post, tag `#sanitychallenge`, use the Path 2 template):
- Project description
- Deployed link + walkthrough (video or screenshots)
- Public code repo
- Build-process narrative (the prompts, the friction, what was cut)
- **Sanity project ID or public dataset URL** (entries without it may be marked incomplete)
- Test credentials if there is a login
- Optional: embedded agent session transcript (Claude Code, Gemini CLI, Codex, Copilot CLI, Pi)

Path 1 (for context only): build an agent against a Sanity Context MCP endpoint
backed by a Knowledge Base. Separate post if ever attempted.

### Competitive read (15 entries as of 2026-09-20)

- ~10 are Path 1, mostly "agent that refuses to answer without a source".
- Path 2 entries are content-generation toys wired to Gemini (cyberpunk world gen,
  absurdist content system, medieval monuments, commitment trackers).
- **No Path 2 entry has used App SDK or Workflows.** The bonus is uncontested.
- The challenge framing is "an answer it can't afford to get wrong". Path 2 entries
  ignore that; leaning into it is a differentiator.

## Sanity in 2026 — what matters for us

Sanity brands itself "the Content Operating System". Core: Content Lake (JSON docs),
TypeScript schemas, GROQ, Studio (React editor). The 2026 layer:

| Feature | What it is | Status |
|---|---|---|
| Functions | Serverless code on document events / GROQ filters / schedules, defined in Blueprints | GA |
| Agent Actions | Generate / Transform / Translate: schema-aware LLM ops callable from client, Functions, Studio | GA |
| App SDK | React hooks (`useDocuments`, `useDocumentProjection`, `useDocument`, `useEditDocument`, presence, comments) for custom apps deployed to the Sanity Dashboard via `sanity deploy` | GA, v3.x |
| Workflows engine | `defineWorkflow` in `sanity.workflow.ts`: stages, activities, actions, conditions, effects. Instances are Content Lake docs. Engine is deterministic; effects are queued and drained by a runtime you supply. Triggered by editors, Functions, or MCP | **Early access**, API not fully public |
| `@sanity-labs/sanity-plugin-workflows` | Studio plugin: stages, role gating, publish gating, audit trail, tasks. Definitions are Studio documents, no engine needed | Available now. Needs Studio 6.9.2+, React 19.2, @sanity/ui 4, Node 22.12+ |
| Sanity Context / Knowledge Bases | Schema-aware MCP access for agents; KBs organise facts by topic | Beta (Path 1 territory) |
| Live Content API | Real-time frontend updates without rebuilds | GA |
| Content Variants, Durable Functions, Blueprints-first setup, Resonance | Announced at Everything NYC 2026 | Closed beta / coming soon |

Recent notes from the changelog (Aug–Sep 2026): JS client v8 is ESM-only, Node 22+.
Sanity UI v4 requires an explicit stylesheet import. App SDK v3 added background
revalidation and permission hooks. MCP server v2.35 added workflow authoring.

Docs entry points:
- https://www.sanity.io/docs (index for LLMs: https://www.sanity.io/docs/llms.txt)
- Workflows: https://www.sanity.io/docs/workflows (cookbook: editorial review,
  AI content pipeline, coordinated release)
- App SDK course: https://www.sanity.io/learn/course/build-content-apps-with-sanity-app-sdk
- Workflows plugin: https://github.com/sanity-labs/sanity-plugin-workflows
- Changelog: https://www.sanity.io/docs/changelog
- Everything NYC 2026 recap: https://www.sanity.io/everything-2026-recap
- Free trial for challenge participants: https://www.sanity.io/lwj

## Concept: The Faux Pas Atlas (decided 2026-09-20)

"Is it rude to X in Y?" answered by people who are actually from Y. Every
answer is the **consensus of local attestations, never typed by an editor**.
Contested truth is the product, which is why it fits the challenge's honesty
theme and both bonus features.

Working title: Faux Pas Atlas. Unofficial, community-authored, no login needed
to attest.
### Visitor experience (Astro)

- **Atlas.** Browse by place (region hierarchy) and context (dinner, business,
  transit, home, greetings...). Each claim shows its verdict (rude / fine /
  depends), the attestation spread, and who attested (local vs visitor).
- **Quiz.** "Would you survive dinner in Lisbon?" generated from canon claims
  for that place. Score, share link. This is the hook for judges and visitors.
- **Attest / dispute.** One-tap "I'm from here and that's wrong" on any claim.
  Files an Attestation or opens a Dispute via an Astro server endpoint with a
  write token. No Studio access for the public.
- **Propose a claim.** Form → Sanity draft in stage Proposed.
- **Live islands.** Latest rulings, freshly canon claims, disputes in progress.
  Everything else is static output.
- **Visual Editing** overlays for moderators via `@sanity/astro`.

### Schema

| Type | Purpose |
|---|---|
| `place` | Country / region / city with `parent` reference, so claims inherit and can be split by region |
| `context` | Dinner, business, transit, greetings, gifts, home... |
| `claim` | The statement ("tipping is expected"), `place`, `context`, optional `parent` claim for splits, workflow stage. **No verdict field.** |
| `attestation` | `claim` ref, stance (rude / fine / depends), confidence, attester locality (local / lived-there / visitor), optional note, attester ref |
| `dispute` | `claim` ref, reason, evidence[], workflow stage |
| `ruling` | `dispute` ref, outcome (keep / split / retire), resulting claim refs, moderator |
| `attester` | Pseudonymous contributor; trust score derived from how often their attestations landed on the canon side |

Rules:
- Verdict and spread are **GROQ projections over attestations**, never stored.
- Context splits are first-class: "kissing hello is fine socially, rude in
  business" is two claims sharing a parent, not a caveat in a text field.
- Retired claims stay in the dataset with their history.

### Workflows

Run on the `@sanity-labs/sanity-plugin-workflows` Studio plugin for stages,
publish gating and audit trail (works on Free; stage tasks no-op without the
Growth comments dataset, not needed). Automatic transitions are our own
Functions. Port to the Workflows engine if early access lands in time.

- **Claim:** Proposed → Attesting → Canon, with Contested as a side stage.
  - Function on entry to Attesting: one Agent Action checks the claim against
    existing claims for the same place/context and merges obvious duplicates.
    Result is written onto the document so it never re-runs.
  - Function on new attestation: recompute agreement; promote to Canon at the
    threshold, drop to Contested when the spread splits.
- **Dispute:** Opened → Evidence → Ruling → Closed. Ruling = keep, split, or
  retire.
- **Expiry:** daily scheduled Function flags canon claims with no attestation
  in 12 months and reopens them for confirmation.

### App SDK: "Dispute Board" (Sanity Dashboard)

- **Board.** Live list of Contested claims ordered by how split they are
  (`useDocuments`).
- **Spread view.** Attestation distribution as bars (rude / fine / depends),
  broken down by region and locality. This is the screenshot.
- **Ruling pane.** Keep / split / retire, writes the ruling and advances the
  stage in one action (`useEditDocument` + document actions). Presence shows
  other moderators on the same dispute.
- **Attester trust panel.** Track record per attester.

### Free-plan budget

- One Agent Action per new claim, none per attestation → well under 1,000
  credits/mo. Cache results on the document.
- Scheduled Functions: 1 (expiry) of 5. Event Functions: 2.
- Public dataset is fine; nothing here is secret.
- Attesters need no Sanity seats.

### Known weaknesses to state honestly in the writeup

- Locality is self-declared. We trust people and show the spread.
- Free plan has only Administrator/Viewer roles, so moderator vs council is a
  workflow role, not a Sanity permission.
- Seed content is the real work: 10–15 places with 8–12 claims each so the quiz
  is fun in the first minute.

### Build order (rough, evenings)

1. Sanity project on Free, schema, workflows plugin, seed script.
2. Astro site: atlas, claim page, quiz, attest/propose endpoints.
3. Functions: duplicate check, agreement recompute, expiry.
4. App SDK Dispute Board.
5. Seed content pass, walkthrough video, DEV post with prompt log.

Parked alternative: community-authored interactive fiction engine (scenes,
choices, items, flags; Proposed → Playtested → Canon; DM's desk in App SDK).

## Submission post: what we must be able to fill in

The DEV post uses Sanity's Path 2 template. Every heading below is a section of
that template. Collect the material **during** the build, not at the end.

| Template section | What we need | How we capture it |
|---|---|---|
| **What I Built** | 2–3 paragraphs: what the Atlas does, who it is for (travellers, expats, and the locals who correct them), why consensus-not-editor is the point | Write from the Concept section above |
| **Demo** | Public deployed URL + a 2–3 min video walkthrough and 4–6 screenshots | Deploy Astro site (Netlify/Vercel/Cloudflare free tier). Record: quiz → claim page → attest → Dispute Board ruling → site updates live. Screenshots of Studio schema, workflow stage field, Dispute Board spread view |
| **Code** | Public GitHub repo, MIT licence, README with setup and project ID | Repo public from day one or flipped before posting. No tokens committed; `.env.example` only |
| **My Build Process** (the heart of the submission) | Which AI IDE (Claude Code in VS Code). Prompts that worked, prompts that failed, where the model got stuck, how we course-corrected. Specifically how App SDK and Workflows went | Keep `docs/build-log.md` from the first prompt: date, prompt (verbatim or trimmed), outcome, what we changed. Log every dead end, especially around the workflows plugin, Functions local dev, App SDK hooks, Free-plan limits. Honest > flattering |
| **Sanity Project Details** (required) | Project ID and public dataset URL | Dataset is public on Free. Put `projectId` and `https://<projectId>.api.sanity.io/v2025-01-01/data/query/production?query=*[_type=="claim"][0..5]` style link in the post and README |
| **Agent Session** (optional, encouraged) | Curated Claude Code transcript embedded in the post | Upload at https://dev.to/agent_sessions/new. Slice to the interesting parts (schema design, workflow plugin fight, App SDK). **Scrub tokens and project secrets first. Set Make Public before publishing** or judges cannot open it |
| Cover image | 1000×420 image | Screenshot of the atlas or the spread view, with the title |
| Tags / footer | `#sanitychallenge` plus `#devchallenge`, `#sanity`, `#astro` | Team: solo, no teammates to credit |

Deadline: post published on DEV **before 2026-10-04** (check the exact UTC cutoff
on the challenge page the week before).
## Cost constraint: zero spend

The author will not pay for Sanity. Everything must fit the Free plan or the
challenge trial. Free plan as of 2026-09-20 (https://www.sanity.io/pricing):

| Included on Free | Limit |
|---|---|
| Seats | 20 (Administrator and Viewer roles only) |
| Datasets | 2, **public only** |
| Documents / attributes | 10,000 / 2,000 unique attributes per dataset |
| API | 250k API + 1M CDN requests/mo, 100 GB bandwidth, 100 GB assets |
| Webhooks | 2 GROQ-powered |
| Functions | 500k invocations/mo, 20k GB-seconds, **5 scheduled (daily)** |
| AI | Agent Actions + Agent Context, **1,000 AI credits/mo** (~500 actions), 500 embeddings queries |
| Studio | hosting, live preview, Visual Editing, presence, 3-day history |
| App SDK, Live Content API, GROQ/GraphQL | included |

Overages on Free are a **hard stop**, not a bill. So no surprise charges, but
plan the demo so it does not exhaust AI credits (cache Agent Action results on
the document, do not re-run on every save).

**Growth-only features we might be tempted by:** private datasets, Editor /
Contributor roles, **Comments and Tasks**, scheduled drafts, 90-day history.
Content Releases are Enterprise.

**Confirmed from the plugin README:** `@sanity-labs/sanity-plugin-workflows`
"core workflow works on every Sanity plan". Stage transitions, publish gating
and the audit trail (`statuses` array) work on Free. Only **stage tasks and
completion gating** need the `-comments` addon dataset (a Growth feature); without
it they "silently no-op" with a console warning. Role mapping is also limited
since Free only has Administrator and Viewer roles. Acceptable for the demo.

**Challenge trial:** `npm create sanity@latest -- --coupon=lwj` gives a 60-day
trial of paid features (https://www.sanity.io/lwj). Plan tier and whether a card
is required are not stated on the page. It would cover the whole challenge
window and unlock Tasks and private datasets. Decide whether to use it; if yes,
confirm no card is required and that it downgrades to Free, not to a charge.

Two datasets on Free is enough: `production` plus a `workflows` dataset if the
Workflows engine is used (it wants its own dataset).

## Decisions and constraints

- **Frontend is Astro.** Decided 2026-09-20; the author is an Astro developer.
  Use `@sanity/astro` with Visual Editing, Live Content API islands for
  time-sensitive content, static output for the rest.
- **Zero Sanity spend.** See section above.
- **Build on the Workflows Studio plugin first** (if it works on Free). Request
  engine early access in parallel; upgrade only if it lands well before Oct 4.
  The App SDK app must work without the engine.
- Keep a **prompt log from day one**. The writeup's honesty is criterion #1; save
  failed prompts, wrong turns, and cuts as you go (e.g. `docs/build-log.md`).
- Record Claude Code sessions for the optional transcript embed.
- Sanity project ID goes in the README and the DEV post. Datasets are public on
  Free anyway, which suits the judges.
- Repo must be public before submitting.

## Open questions

- Attestation threshold for Canon (count and agreement %).
- Use the `lwj` coupon or stay on plain Free?
- Has early access to the Workflows engine been requested? Response time?
