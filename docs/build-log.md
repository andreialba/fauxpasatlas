# Build log

What actually happened while building the Faux Pas Atlas with Claude Code,
including the wrong turns. One entry per decision or bug, newest at the bottom.

## 2026-09-20

**Setup.** Sanity project created on the Free plan in the web UI, dataset
`production`, public. The CLI in the agent's shell was not logged in, and
unattended login needs `--provider`, so the Studio was scaffolded by hand
(package.json, sanity.config.ts, sanity.cli.ts, empty schema) with Studio 6.15,
React 19.3 and the workflows plugin registered from the start. `sanity build`
passed without a login, so the plugin bundles fine.

- Pinned TypeScript 5.x rather than 7.x to stay off the bleeding edge for
  typegen.
- The CLI warned that `autoUpdates` moved under `deployment`; fixed.

**Schema.** Seven types: place, context, claim, attestation, dispute, ruling,
attester. Deliberate absences: `claim` has no verdict field and `attester` has
no stored trust score. Both are derived in GROQ from attestations.

- Dead end: writing seven files in one shell heredoc batch failed with
  "unexpected EOF while looking for matching quote". Long scripts go in files.
- `@sanity/icons` had to be added explicitly; pnpm's strict node_modules does
  not expose transitive dependencies.

**Workflow definitions by script.** Instead of clicking through Studio, read
the workflows plugin's compiled schema and workflow-kit's `WORKFLOW_QUERY` to
learn the exact document shape, then seeded two `workflow.definition`
documents with `sanity exec --with-user-token`. No API token needed.

- Learned: the plugin injects `status`, `assignments`, `statuses` and
  `pendingTransitionReason` on every document type but hides them in the UI
  for types with no definition. No exclusion config needed.
- Learned: `status` is a plain string holding the stage slug. Functions can
  patch it and append `workflow.setStatus` audit entries themselves.
- Design change: Contested and Retired are plugin off-ramps rather than
  stages, because the transition button only moves forward. Contested keeps
  publishing on so the site can flag it; Retired unpublishes on entry.
- Dead end: after seeding, the public API returned `count(*) == 0` while the
  CLI saw both documents. The dataset was public. Cause: Sanity hides
  documents whose `_id` contains a dot from unauthenticated reads. Harmless
  for the definitions, but content ids must never contain dots.

**Shared package and seed.** `shared/` holds the GROQ projections and the
consensus rule (`spread`, `verdict`, `decideStage`, `THRESHOLD`) so the
Functions, the site and the Dispute Board compute the same numbers. The seed:
8 places, 8 contexts, 66 claims, 30 pseudonymous attesters, 451 attestations
with deterministic pseudo-random spreads, stage computed from the rule.

- The claims were drafted by Claude from common travel-etiquette knowledge
  and are flagged in the file for human review before anything is called
  settled. Arguable ones are marked `split` so they seed a contested spread.
- More claims landed in Attesting than expected because the rule wants three
  locals and the generator only makes four to nine attestations. Left as is;
  it makes the site look alive rather than finished.
- `@sanity/client` deprecated `uri` in favour of `url`; `sanity exec` scripts
  need `@types/node` to typecheck `process`.

**Studio error: `@sanity/icons` "does not provide an export named PinIcon".**
First guess was a stale Vite cache, because the package had been added after
the dev server pre-bundled its deps. Clearing the cache did not fix it. Real
cause: icons 5.x no longer exports named icons from the package root, only a
lazy `icons` map; each icon lives at a subpath (`@sanity/icons/Pin`). The
first guess looked right because a grep of the `.d.ts` matched the icon-name
map. A type-level grep is not proof that a runtime export exists.

## 2026-09-21

**The Astro site.** Astro 7, plain CSS, Cloudflare adapter, static output with
three write endpoints (`/api/attest`, `/api/dispute`, `/api/propose`) opted
out of prerendering. 87 pages build from the live dataset.

- Decision: no `@sanity/astro`. It wants React, `sanity` and styled-components
  as peers just for Visual Editing overlays. `@sanity/client` directly.
  Visual Editing goes on the cut list.
- Decision: Cloudflare adapter. Known cost: secrets live on
  `locals.runtime.env` in production rather than `import.meta.env`, so the
  write client takes the env as an argument and falls back to the Vite env in
  dev.
- Dead end: 500 on every page that touched Sanity; the one static page worked,
  which pointed at the data layer. The workerd dev runtime could not load
  `@sanity/client` from Vite's pre-bundled deps. The error text named its own
  fix: `vite.optimizeDeps.exclude`. Production builds were never affected.
- Design bug caught by reading rendered HTML: a contested claim still showed a
  confident "Rude" badge, because a 50/50 split still has a mathematical
  leader. Added `shownVerdict()`: contested claims get "Split" and the spread,
  never a stance.

**Design, three rounds.** The first pass reused a bold accent-colour system
with pill buttons and monospaced labels. Feedback: it looked generated. Second
pass went monochrome: paper and ink, hairlines, one red that only means
"rude", real flag icons (circle-flags, MIT) driven by a new `iso` field on
`place`, and Open Doodles (CC0) recoloured to grey. Third pass on request:
the serif display face swapped for Geist, every horizontal divider removed
except the ones between the four stats, the hero flag row dropped, dotted
leaders added to the places list, and underlines kept only for links inside
running text.

- Dead end: a 90-line `node -e` codemod inside a shell command failed to
  parse. Same lesson as day one; it went into a file and ran fine.
- Old colour tokens lingered in page-scoped styles after the global rewrite;
  one regex pass mapped them, then `astro check` found three missing `iso`
  types, fixed in one place.

**Functions.** `blueprints init` created a project-scoped Stack. Three
functions: `recompute-agreement` (on any attestation write, recompute the
claim's agreement and move it between Attesting, Canon and Contested),
`claim-dedupe` (on a newly proposed claim, one Agent Actions `prompt` call
comparing it with existing claims for the same place and situation; the GROQ
filter keeps it to claims never checked, so it is one credit per proposal and
never re-runs), and `expiry-sweep` (daily, reopen settled claims with no
attestation in a year). All three write `workflow.setStatus` audit entries so
their decisions show up in the plugin's Audit Trail next to the human ones.

- `client.agent.action.prompt` takes no `schemaId`, unlike Generate and
  Transform. The schema was deployed anyway; nothing needed it yet.
- Dead end: `functions test` failed with "`dataset` must be provided". The
  local emulator does not fill `clientOptions` unless `--project-id` and
  `--dataset` are passed. For the scheduled function there is no document to
  borrow a dataset from at all, so the handler falls back to the project's
  own ids.
- `blueprints plan` refused the scheduled function: "must be attached to an
  organization scoped stack". `blueprints promote` moved the Stack to the
  organization. The command is interactive; piping a `y` into it worked.

**Functions verified in production.** Three local "fine" votes written through
the API took a claim from Attesting to Canon in under five seconds, with the
function's own entry in the workflow audit trail. Deleting them moved it back.

- Dead end: the dedupe function ran but the Agent Action returned 400 "Agent
  Actions are only available on apiVersion vX". A dated API version is fine
  for queries and mutations, not for the agent endpoints. The function now
  keeps a second client on `vX` just for the prompt call. After redeploy, a
  near-duplicate proposal was flagged with the correct related claim and a
  one-sentence reason. Two AI credits spent so far.
- The fallback path proved its worth by accident: when the action failed, the
  claim was marked "needs a human look" instead of being waved through.

**Live on Cloudflare.** First deploy from the local machine, then the repo was
connected to Workers Builds so every push to `main` redeploys.

- Dead end: `pnpm deploy` did nothing useful. It is pnpm's own command for
  copying a workspace package, and without a filter it prints "No project was
  selected for deployment". The script is called `ship` now.
- Dead end: the adapter refused a hand-written `main` in `wrangler.jsonc`
  because the file did not exist yet at build time. The adapter writes its own
  complete config next to the built worker; `wrangler deploy --config
  dist/server/wrangler.json` is the deploy step, and the root config keeps only
  name and compatibility settings.
- Dead end: the first live vote failed with "Astro.locals.runtime.env has been
  removed in Astro v6". The write token is now read from the
  `cloudflare:workers` env module, with the Vite env as the dev fallback.
- Decision reversed: the data pages are no longer prerendered. A reader who
  adds a vote reloads the claim page and must see it counted, which a static
  build cannot do until the next deploy. Home, atlas, place, claim and the
  board render on request with a one-minute edge cache. Quiz, about and the
  proposal form stay static.
- The Sanity write token was minted through the management API with the CLI
  login and piped straight into `wrangler secret put`, so it never appeared
  on screen or on disk outside the ignored `.env`.

**The Dispute Board (App SDK).** Scaffolded from the official `app-sanity-ui`
template, which also ships a Claude skill describing the SDK's hook patterns.
The template pins App SDK 2.20 and Sanity UI 3; upgraded both to 3.3 and 4.2
so the app matches the Studio.

- Sanity UI 4 is a bigger break than the changelog line suggests. `space` is
  gone in favour of `gap` and is typed `never`, so the error reads "Type
  'number' is not assignable to type 'undefined'" rather than anything about
  a renamed prop. `useToast`, `ToastProvider` and `Grid`'s `columns` are the
  same story; the toast exports moved to the `@sanity/ui/toast` subpath and
  the root ones are `never` stubs. A codemod fixed the prop rename in one
  pass.
- Real bug, not a types quibble: `editDocument` takes **patch operations**,
  while `useEditDocument` takes an **updater function**. The first version
  passed an updater to `editDocument`. The fix also made the audit trail
  safer, because `insert: {after: 'statuses[-1]'}` appends instead of
  rewriting the array, so two moderators acting at once cannot drop each
  other's history.
- Dead end: every `createDocument` initial value typed as `undefined`. Cause:
  the SDK resolves document types through an experimental Typegen
  registration, and with nothing registered the lookup collapses to `never`.
  Tried registering the generated types through the documented `groq` module
  augmentation, including installing `groq` so the augmentation could resolve.
  It did not take. Settled for one cast behind a single helper with the reason
  written next to it, and kept the real types at the call sites via
  `Partial<Claim>` and friends.
- The ruling is one transaction: the ruling document, the dispute it answers,
  any claims a split creates, and the claim's new stage. A half-applied ruling
  would leave the atlas asserting something no moderator decided.
- Nice chain: a split creates claims with `dedupe.status = pending`, so the
  duplicate-check function picks them up exactly as if a visitor had proposed
  them.

Process note, third time: a long `node -e` script inside a shell command
mangled backticks in Markdown again. Scripts go in files; Markdown edits go
through the editor.

**Every deploy was wiping the write token.** Found while answering a question
about tampering. `wrangler deploy` deletes all vars before applying the ones
in the config unless `--keep-vars` is set, and the config the Astro adapter
generates carries an empty `vars` block. So the first deploy after
`wrangler secret put` worked, and every deploy after it silently broke all
three write endpoints with "SANITY_WRITE_TOKEN is not set". Fixed by putting
`keep_vars: true` in the project's wrangler config, which the adapter copies
into the generated one. Verified: redeploy, secret still listed, live write
succeeds.

**Three more countries and real disputes.** Norway, France and Spain added to
the seed, plus `seed-disputes.ts`: five written disputes in different stages,
each arguing that one verdict for a whole country is the wrong shape. They
give the moderator board and the public disputes page something real to show,
and they exercise the part of the workflow that a statistical split does not.

- The flag on a place page was vertically centred against the whole header
  block, so it floated next to the claim count instead of the country name.
  Moved it onto the title line and dropped the dead CSS left behind when
  emoji flags were replaced by the flag component.
- Dataset now: 11 places, 94 claims, 643 attestations, 5 contested, 5 open
  disputes.

**Phase 4 closed: trust panel and a real checkpoint.** The attester trust
panel came off the cut list. For every named voice on the selected claim the
board shows how they answered and how often their past answers matched what
locals later settled on. One GROQ query takes the attester ids and returns
each person's attestations with the full spread of their claim; `trackRecord`
in the shared package does the arithmetic. Nothing is stored on the attester.

- The checkpoint "rule in the Dashboard, watch the site update" became a
  script, `e2e-ruling.ts`: it files a ruling with the board's exact
  transaction shape and polls the live claim page. It failed. The claim was
  retired in the dataset, the Sanity CDN returned nothing for it, and the site
  kept serving the page for minutes. Cause: Cloudflare caches a Worker's
  subrequests according to the origin's headers, and apicdn sends
  `s-maxage=60` with stale-while-revalidate. The read client now uses the live
  API, which sends no cache headers. A checkpoint done by eye in the Dashboard
  would have passed and missed this.

**A moderation gate, because a live test reached the atlas.** The author
posted "A test claim" through the public form. The duplicate check found no
duplicate, which is true, and promoted it. A duplicate check is not a content
check. Fix in the same Function, same single credit: the prompt now also
answers whether the text is a genuine etiquette claim, and anything that fails
stays Proposed with `dedupe.status = needs-review`. The Dispute Board grew a
second tab, Proposals, listing everything the check held back with let-in and
reject. The site's proposal endpoint gained a honeypot field and refuses
one-word statements and links. Sent the test claim back through: held in five
seconds, reason "test text rather than a real, specific social behaviour".

- Process note, fourth time: a Node patch script with nested template literals
  inside template literals is as fragile as a heredoc. Plain string
  concatenation for the parts that contain backticks.
- Process note: `sanity debug --secrets` was blocked by the agent's permission
  classifier, correctly. `sanity debug` without the flag was enough to confirm
  the login.

**Content pass.** Every seeded claim reread. Twelve added so no place has fewer
than eight, one moved from "visiting a home" to "public spaces" (mowing on a
Sunday is the neighbours' problem, not the host's), details added where the
quiz review screen benefits, and the spread generator bumped so each place has
at least six settled claims and therefore a quiz worth taking. Slugs strip
accents now, so "bon appétit" stops becoming `bon-app-tit`. The seed deletes
its own stale documents on a re-run, which it needed the moment a statement
changed and took its slug with it. Dataset after: 106 claims, 783 attestations,
72 settled, 10 contested, 5 written disputes.

**Screenshots taken, then left out of the post.** The template accepts video
or screenshots. Site shots come from headless Chrome with
`--force-prefers-reduced-motion` and a virtual time budget, because the
reveal-on-scroll animation left the first attempt blank. The Dashboard and
Studio are behind login, so the author took those by hand. Then the author
decided the post should send judges to the live site rather than show pictures
of it, and cut the images from the draft. They stay in `docs/screenshots` for
the README and for anyone who cannot log in to see the Dispute Board.

**Rewording the writeup.** The first draft of "My Build Process" read as if
the agent's research had picked the direction: it said nobody in Path 2 had
used the App SDK or Workflows, so the bonus was uncontested. That is a true
finding from day one, but it was not why the author chose them. The author
came in wanting both bonus features and an app where nobody types the answer,
and the research confirmed the field rather than setting the course. The
paragraph was rewritten to say so. Worth logging because the judging criteria
put honesty of the writeup first, and a writeup that gives the model credit
for the author's decision is inaccurate in the other direction.

**The hosted Studio was never deployed.** `sanity deploy` in `studio/` had
been failing with "No studio hostname configured", and the agent reported it
as done because it only read the exit code, not the output. Set
`studioHost: 'faux-pas-atlas'` and pinned the returned `appId`; it now lives at
https://faux-pas-atlas.sanity.studio. Lesson for the log: a background task
that exits 0 still has to be read.

**Colour for the three stances.** The quiz asked "rude / depends / fine" with
three identical outline buttons, which made the reader parse text to find the
choice. The three stances already had tokens, but `--fine` was plain ink and
`--depends` grey, so only "rude" had a colour. Gave fine a muted forest green
and depends an ochre, both dialled down to sit on the warm paper rather than
shout over it. Because every stance display reads the same three tokens, the
spread bars, badges and verdict panels went traffic-light in the same commit,
which is the point: one concept, one colour, everywhere. Any `.chip` that
declares `data-stance` now wears its tone, so the attest bar on a claim page
and the quiz options got it from one rule.

- Caught while checking the result: the post's demo walkthrough linked to the
  Italy cappuccino claim as an example of a split, but the content pass had
  reseeded it to 60% rude. Relinked to a claim that is actually contested and
  verified all four demo links return 200. A hardcoded example of live data
  goes stale the moment the data moves.

**The situation chips did nothing.** Reported by the author: clicking a
situation on the atlas page, or one on the home page, changed nothing. Two
separate causes for the same dead end. On the atlas page they were
`<span class="chip">` elements, never links, and `.chip` sets
`cursor: pointer`, so they looked live. On the home page they linked to
`/atlas/#business`, an anchor that never existed, so the browser loaded the
atlas and scrolled nowhere.

Browsing by situation was in the concept from the start and never got built.
Rather than delete the chips, built the page they implied: `CLAIMS_FOR_CONTEXT`
in the shared package, the mirror of `CLAIMS_FOR_PLACE`, and
`/atlas/situation/[context]/` grouping every claim for that situation by place.
Grouped by place rather than by stage, because the reason to read a situation
across the whole atlas is comparison: the same act, country by country. Tipping
now reads as one page, Italy's "no tip is fine" next to the United States' "no
tip is rude", which is the argument the site exists to make.

- Judgement call the author pushed back on first, and rightly: was the page
  needed at all? Kept it because `context` is a document type with a slug, an
  icon and a description, and nothing in the app browsed by it. A schema that
  models something the interface never uses is hard to defend under a
  "thoughtfulness of the schema" criterion.
- `CONTEXTS` gained a claim count so the chips say how much is behind each one.
  `ClaimCard` gained `showContext`, off on a situation page where nineteen
  cards would otherwise all repeat "Money & tipping".
- A claim page's breadcrumb now links its situation instead of printing it.
- Checked: three situation routes return 200, an invented one 404s, and the
  place routes are untouched. `/atlas/[place]` is one segment, so the new
  two-segment route cannot shadow it.

**The four numbers broke on a phone.** In the two-column layout the third
cell, "voices", carried a left border and 20px of left padding, so the second
row sat indented under the first with a divider hanging off its left edge.
The stylesheet already had the fix, `div:nth-child(3) { border-left: 0 }`
inside the mobile media query, and it had never once applied.

Cause: Astro scopes component styles by appending an attribute selector to
every compound. `.numbers div + div` becomes
`.numbers[data-astro-cid-x] div[data-astro-cid-x] + div[data-astro-cid-x]`,
which carries three attribute selectors and two element selectors. The
override becomes `.numbers[...] div[...]:nth-child(3)`, two attributes and one
element. Both sit at four in the class column, so the tie breaks on element
count and the rule being overridden wins. Scoped CSS quietly changed which of
two rules was more specific. Rewritten so each breakpoint declares its own
dividers and nothing is set then unset: on a phone, column two draws a left
rule and row two draws a top rule. Only one `nth-child` in the codebase, so
nothing else was silently dead.

**A false alarm worth recording.** Checking that fix, every screenshot at
390px looked as though the page overflowed horizontally: cards ran past the
right edge and sentences were sliced mid-word. Two rounds of reading grid
tracks for the classic image-blows-out-the-grid bug found nothing wrong.
Stopped guessing and injected a probe into a local copy of the live HTML that
reported `clientWidth`, `scrollWidth` and every element extending past the
viewport. It answered `vw=500 scrollW=500 offenders=0`.

Headless Chrome on Windows will not give a window narrower than 500 CSS
pixels. `--window-size=390` renders the page at 500 and crops the screenshot
to 390, which looks exactly like overflow and is not. Asking for 780 gave 764,
so the floor is real. All four main pages report zero offenders, so the site
does not overflow; the tool did. Two lessons: a screenshot is not a
measurement, and `--force-device-scale-factor` changes the image resolution,
not the CSS viewport. A true 390px check needs a real device or the DevTools
protocol, so the phone layout below 500px is still unverified by anything but
a human with a phone.

- The probe itself failed twice first. Injected inline, the `\n` in its source
  became a real newline and left an unterminated string. Moved to a file and
  referenced with `<script src="probe.js">`, which the `<base>` tag pointing at
  the live site then resolved to a 404. Fixed with an absolute `file:///` src.
  Fourth instance of the same lesson: scripts belong in files, and a tool that
  silently does nothing is worse than one that errors.
