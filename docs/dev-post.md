---
title: "Faux Pas Atlas: an etiquette guide with no verdict field"
published: false
tags: sanitychallenge, devchallenge, sanity, ai
---

*This is a submission for the [Sanity Challenge](https://dev.to/challenges/sanity-2026-09-16): Vibe-Code Something Strange.*

## What I Built

**Faux Pas Atlas** answers one question: *is it rude here?* Tipping in Japan, a cappuccino after lunch in Italy, sitting next to a stranger on a Norwegian bus. Every travel guide answers these with one writer's opinion. This one refuses to. There is no verdict field anywhere in the database.

A claim is one behaviour, in one place, in one situation. Anyone can attest to it with a single tap: rude, fine or depends, plus how they know the place. Locals count double, visitors half. A claim only reads as settled once five people have answered, three of them local, and 70% of the weighted voices agree. When locals disagree, the site shows the split instead of picking a side. Anyone can dispute a settled claim in writing, and a moderator rules on it: keep, split into narrower claims, or retire.

The hook for visitors is the quiz: *Would you survive dinner in Portugal?* Ten questions, built only from claims the locals have settled, with the review screen telling you who told us and how many of them.

It is for travellers, expats, and above all the locals who correct them. The challenge framing was "an answer it can't afford to get wrong". My take: the only honest way to be sure is to never type the answer yourself.

## Demo

**Live site:** https://faux-pas-atlas.xocoweb.workers.dev

Try it in this order:

1. Take the [Portugal quiz](https://faux-pas-atlas.xocoweb.workers.dev/quiz/portugal/).
2. Open any claim, for example [ordering a cappuccino after 11 in Italy](https://faux-pas-atlas.xocoweb.workers.dev/claim/italy-ordering-a-cappuccino-after-11-a-m/), which locals have split on. Add your voice. Reload and it is counted.
3. Look at the [contested board](https://faux-pas-atlas.xocoweb.workers.dev/disputes/), where the atlas shows what it will not call.
4. [Propose a claim](https://faux-pas-atlas.xocoweb.workers.dev/propose/). It will not appear until a Function has checked it for sense and duplicates.

The moderator side, the Dispute Board, lives in the Sanity Dashboard behind the project login, so you cannot click into it from here. The Code section below describes what it does, and the repository has screenshots of it under `docs/screenshots`.

## Code

**Repository:** https://github.com/andreialba/fauxpasatlas (MIT)

```
studio/         Sanity Studio v6: schema, workflow definitions, seed scripts
web/            Astro 7 site on Cloudflare Workers; write endpoints under /api
functions/      Three Sanity Functions and the Blueprint that deploys them
dispute-board/  App SDK moderator app, deployed to the Sanity Dashboard
shared/         GROQ projections and the consensus rule, used by all of the above
docs/           Build log, screenshots, this post
```

### The schema, briefly

Seven document types: `place`, `context`, `claim`, `attestation`, `dispute`, `ruling`, `attester`. Two deliberate absences:

- `claim` has **no verdict field**. The verdict is a GROQ projection over attestations, computed on every read. The consensus rule lives in one TypeScript file that the site, the Functions and the moderator app all import, so they can never disagree about a number.
- `attester` has **no stored trust score**. The moderator app derives it live: how often this person's past answers matched what locals later settled on.

Context splits are first-class. "Kissing hello is fine socially and rude in business" is two claims sharing a parent, not a caveat in a text field. Retired claims stay in the dataset with their whole history.

### Workflows

The `@sanity-labs/sanity-plugin-workflows` Studio plugin provides two workflows: claim (Proposed → Attesting → Canon, with Contested and Retired as off-ramps) and dispute (Opened → Evidence → Ruling → Closed). The automatic transitions are Sanity Functions:

- `recompute-agreement` runs on every attestation write and moves the claim between Attesting, Canon and Contested.
- `claim-dedupe` runs once per proposed claim. One Agent Actions `prompt` call asks two questions: is this a genuine etiquette claim, and does it duplicate one already filed for the same place and situation? A clean pass opens for attestation. Anything else waits for a moderator. One credit per proposal, and the GROQ filter guarantees it never re-runs.
- `expiry-sweep` runs daily and reopens settled claims nobody has confirmed in a year.

All three write `workflow.setStatus` entries, so their decisions show up in the plugin's Audit Trail inspector next to the human ones.

### App SDK: the Dispute Board

A React app in the Sanity Dashboard, built on `@sanity/sdk-react` 3 and Sanity UI 4. A live queue of every claim that needs a human: written disputes first, then the most split. For the selected claim: the weighted split, the breakdown by how well each voice knows the place, the written disputes, what people wrote, who is behind the numbers with each attester's track record, and a ruling pane. A ruling is **one transaction**: the ruling document, the dispute it answers, the claim's new stage, and any narrower claims a split creates. Split claims enter as proposed and go through the same Agent Action check as a public proposal. Presence warns when another moderator is on the same claim. A second tab lists proposals the automatic check held back, with let-in and reject.

Everything runs on the Free plan.

## My Build Process

**IDE:** Claude Code in VS Code, with the Fable 5.1 model, over two days (20 and 21 September), then polish. I kept a build log from the first prompt: [docs/build-log.md](https://github.com/andreialba/fauxpasatlas/blob/main/docs/build-log.md). The plan it worked against, with checkboxes and a cut list, is [PLAN.md](https://github.com/andreialba/fauxpasatlas/blob/main/PLAN.md). What follows is the honest version.

### What worked

**Decide first, then research, then a spec, then code.** Day one was no code at all. I went in with two decisions already made. The challenge framing was "an answer it can't afford to get wrong", and I wanted an app where that is literally true, where nobody is allowed to type the answer. And I wanted to go beyond Studio with both bonus features, the App SDK and Workflows, because a moderation workflow with a custom app for the people doing the moderating is the natural shape of that idea. Only then did I have the agent read the challenge page, the existing entries, the Sanity docs index, the pricing page and the workflows plugin README, and write it all into `CLAUDE.md`: judging criteria in order, what the Free plan allows, what the other Path 2 entries were doing. That research confirmed the direction rather than setting it. The concept itself, an etiquette atlas where the verdict is computed from local attestations, came from a long back-and-forth with the model about what a *contested* truth would look like as a schema, with me steering toward the version that had no verdict field.

**Reading the plugin's compiled schema instead of clicking.** Rather than set up workflows in the Studio UI, the agent read the workflows plugin's bundled schema and workflow-kit's `WORKFLOW_QUERY` to learn the exact document shape, then seeded two `workflow.definition` documents by script. Along the way it learned that `status` is a plain string and `statuses` is an array the plugin reads, which is what let the Functions and the App SDK app write to the same audit trail later.

**A checkpoint that fails is worth more than one that passes.** The Phase 4 checkpoint was "rule on a dispute in the Dashboard, watch the live site update." The agent turned that into a script that files a ruling with the board's exact transaction and polls the live page. It failed. The claim was retired, the Sanity CDN agreed, and the site kept serving the page for minutes. Cause: Cloudflare caches a Worker's outbound requests by the origin's `Cache-Control`, and Sanity's CDN sends `s-maxage=60` with stale-while-revalidate. The fix was one line, `useCdn: false`. A checkpoint done by eye in the Dashboard would have passed and shipped the bug.

**The prompt that unlocked the App SDK.** The official `app-sanity-ui` template ships with a Claude skill describing the SDK's hook patterns. Telling the agent to read that before writing a line saved most of the friction. Most, not all: see below.

### What did not

**Shell heredocs, four times.** Writing several files in one shell command with heredocs failed on day one ("unexpected EOF while looking for matching quote"). It happened again with a 90-line `node -e` codemod, again with a Markdown edit that mangled backticks, and again on the last day with a Node patch script whose template literals contained template literals. Each time the fix was the same: scripts go in files. The agent logged the lesson every time and still reached for the shortcut the next time.

**`@sanity/icons` does not export `PinIcon`.** First guess: stale Vite cache, because the package had been added after the dev server pre-bundled. Clearing it changed nothing. The real cause was that icons 5.x moved every icon to a subpath. The first guess had looked right because a grep of the `.d.ts` matched an icon-name map. Lesson written into the log: a type-level grep is not proof of a runtime export.

**Sanity UI 4 breaks in ways the error messages hide.** `space` became `gap` and is typed `never`, so the error reads "Type 'number' is not assignable to type 'undefined'" rather than anything about a renamed prop. Same for `useToast`, which moved to `@sanity/ui/toast` and left a `never` stub behind. One codemod fixed the props; the agent had to read the package's type definitions to find where the toast went.

**Two SDK functions with the same shape and different arguments.** `editDocument` takes patch operations. `useEditDocument` takes an updater function. The first ruling pane passed an updater to `editDocument` and the types did not catch it because of the Typegen registration issue below. The fix also improved the design: appending to the `statuses` array with `insert after statuses[-1]` instead of rewriting it, so two moderators acting at once cannot drop each other's history.

**Typegen registration for the App SDK did not take.** `createDocument` types its initial value against an experimental module augmentation. Registering our generated types the documented way, including installing `groq` so the augmentation could resolve, left every field typed as `never`. Settled for one cast behind a single helper with the reason written next to it.

**Agent Actions want `apiVersion: 'vX'`.** A dated API version works for queries and mutations and returns 400 for the agent endpoints. The dedupe Function now keeps a second client just for the prompt call. The fallback path proved itself by accident: when the action failed, the claim was marked "needs a human look" rather than waved through.

**Every deploy was silently deleting the write token.** `wrangler deploy` clears vars before applying the config unless `keep_vars` is set, and the Astro adapter's generated config carries an empty `vars` block. The first deploy after `wrangler secret put` worked and every one after it broke all three write endpoints. Found while answering a question about tampering, not while testing.

**A duplicate check is not a content check.** On the last day I posted "A test claim" through the public form. The Function found no duplicate, which was true, and promoted it to the atlas. The fix was to make the same Agent Action prompt answer two questions instead of one, hold anything that fails, and give the moderator app a Proposals tab. Sent the test claim back through: held in five seconds with the reason "test text rather than a real, specific social behaviour".

### What was cut, and what is honestly weak

- **Visual Editing** went first. `@sanity/astro` wanted React, `sanity` and styled-components as peers for the overlays alone; the site uses `@sanity/client` directly.
- **The Workflows engine** (early access) never entered the picture. Everything runs on the Studio plugin plus our own Functions. The App SDK app works without the engine, which was a constraint from day one.
- **Locality is self-declared.** We trust people and show the split. The trust panel in the moderator app exists so a suspicious spread can be read, not just counted.
- **One person, one vote** is enforced by a stable id per name or address. It stops the casual double vote. It does not stop someone with a script and a VPN, and the writeup should not pretend otherwise.
- **Attestation notes are published as written.** Proposals are gated by a model and a moderator. Notes are not, yet.
- **The seed content was drafted by the model** from common travel-etiquette knowledge and reviewed by hand. It is a starting point. A site whose whole premise is that locals should correct the guide can live with that.
- **Free plan roles.** Only Administrator and Viewer exist, so "moderator" is a workflow role, not a Sanity permission.

## Sanity Project Details

- **Project ID:** `dh2oc30x`
- **Dataset:** `production`, public
- **Try a query with no token:** https://dh2oc30x.api.sanity.io/v2026-04-12/data/query/production?query=*[_type=="claim"][0..4]{statement,status}
- **Dispute Board:** in the Sanity Dashboard for the project's organisation. Test access on request; the Free plan has no read-only moderator role to hand out.

## Agent Session

<!-- Upload a curated Claude Code transcript at https://dev.to/agent_sessions/new, set it PUBLIC, and embed it here. Slice to: the schema design argument, the workflows plugin seeding, the App SDK fight, the caching bug from the last day. Scrub the write token and anything from `sanity debug`. -->

Solo entry. No teammates to credit.
