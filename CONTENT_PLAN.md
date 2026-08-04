# SpecPort website content plan

Status: proposed replacement content system

Scope: the whole public one-page website, including message hierarchy, page
sequence, draft copy, proof requirements, voice, and what should move to docs.

This plan is intentionally narrower than the full SpecPort vision. A homepage
must earn the next minute of attention before it explains the full lifecycle.

## 1. The decision

SpecPort should lead with one useful, current job:

> Catch files that escaped the approved review or scope before they are merged.

The first visitor is a developer or maintainer who approves AI-assisted changes
before they reach a conventional, final hosted-PR gate. They may be using a
local review tool, handing work between agents, or approving an explicit file
scope. The trigger is not "I need a portable spec." The trigger is:

> The coding agent says it is done. I need to know whether the exact branch I am
> about to merge is still the branch and scope that somebody actually reviewed.

The site should therefore position SpecPort as:

> A local CLI that makes AI-assisted changes reviewable before merge.

Portable `SPEC.md` files are the strategic product story. They explain why a
user may keep SpecPort after the first coverage check: intent, acceptance,
evidence, and open decisions survive between agents, sessions, and
repositories. They are not the first thing a cold visitor should have to decode.

## 2. First-principles adoption case

### Who is it for?

The primary user is the person who owns the merge decision after an AI coding
agent has changed a real repository, and whose approval object lives outside a
fresh final-commit review in GitHub or another forge. They are comfortable with
Git and a CLI. They care more about avoiding a missed file or lost requirement
than about adding another AI tool.

Secondary users are agencies and small teams handing work between multiple
agents or between an agent and a human reviewer.

Do not try to address a generic "builder," every software team, spec authors,
marketplace users, and future catalog contributors in the same first screen.

### What goes wrong today?

The prompt, the intended scope, the implementation, the tests, and the review
live in different places. A review can cover one tree while the branch keeps
moving. A final summary can sound complete while one path was never reviewed.
Tests can pass without proving that the reviewer saw the exact final tree.

The default workaround is manual:

- skim the diff again;
- trust the agent's summary;
- replay old chat context for the next agent;
- maintain an ad hoc checklist or PR description;
- discover scope drift after merge.

### What is in it for the user?

After adopting SpecPort, the user should be able to say:

- I can see which final paths were covered and which were not.
- Weak or mismatched identity is reported as unknown, not quietly passed.
- I can hand the next reviewer a plain-file receipt instead of replaying the
  whole conversation.
- For longer work, the intended outcome and acceptance criteria remain beside
  the code in a versioned `SPEC.md`.

The benefit is not "better specs" in the abstract. It is less blind review,
less re-explaining, fewer silent additions, and a cleaner merge decision.

### Why use SpecPort instead of Git, CI, or a PR checklist?

Git can list what changed. CI can prove that checks ran. A protected pull
request can require fresh approval on the final commit. SpecPort is useful in
the gap those tools do not own: when approval happened before or outside the
final hosted PR gate, and the user needs to prove that a pinned local review or
explicit approved scope still covers the exact merge candidate.

SpecPort binds the repository, base commit, comparison source, and final tree
into one fail-closed result. A path-set coincidence or weak identity is not
quietly promoted to complete. The result can travel as a readable receipt.

That is a more rigorous version of a workflow many teams handle with `git diff`
and a checklist; it is not universally necessary. If branch protection already
forces a fresh, complete review on every final commit, plain Git, CI, and the
forge may be enough. The homepage should say who needs SpecPort rather than
pretend every repository does.

For the target workflow, the adoption reasons are concrete:

- **Exact comparison:** it relates the final candidate to a named approval
  source, not only to a base branch.
- **Deterministic:** it reports evidence from explicit inputs instead of asking
  another model for an opinion.
- **Local by default:** no hosted account and no source upload to a SpecPort
  service.
- **Agent-neutral:** the artifacts can be read by a human, Codex, Claude, or a
  future tool.
- **Plain artifacts:** Markdown and JSON can be reviewed, diffed, versioned, and
  removed without platform lock-in.
- **Fail-closed:** missing identity or incomplete comparison remains unknown or
  review-required.

### What makes adoption hard today?

The site must not hide these frictions:

- A bare `coverage` run is an inventory. It becomes a proof only when the user
  supplies an approved scope or a pinned receiver review.
- The vocabulary (`receiver`, `identity-bound`, `guard`, `cover`, `remix`) is
  expensive before the user has seen one useful result.
- The full lifecycle requires more ceremony than a one-off diff review.
- There is not yet customer evidence, a public spec corpus, or a catalog.

The website should answer those objections through a real example and a staged
workflow. It should not answer them with more slogans or disclaimers.

## 3. The message hierarchy

Every layer should earn the next one:

1. **Pain:** an AI agent can finish after the reviewed scope has gone stale.
2. **Outcome:** catch the uncovered path before merge.
3. **Mechanism:** compare the exact final Git tree with an approved scope or
   pinned review.
4. **First action:** run the published npm CLI in the current repository.
5. **Proof:** show one real fixture where a late file is flagged.
6. **Retention value:** keep the intended job, acceptance, and evidence in a
   versioned `SPEC.md`.
7. **Trust:** local, deterministic, open source, no runtime dependencies, and
   explicit boundaries.
8. **Future:** discovery, cover/remix, and a network of reusable specs after a
   real corpus exists.

The homepage currently tries to start at layers 6 and 8. That is why the reader
has to understand the product's worldview before knowing whether it helps.

## 4. Why the current site feels AI-generated and immature

The problem is not simply that the visuals are bold. It is that the design and
copy keep announcing intention instead of demonstrating value.

### 4.1 The headline is a mood, not a useful outcome

"Keep the decisions close to the code" could describe many developer tools.
It does not name the failure, the user, or the result. The explanatory sentence
then asks the reader to absorb `SPEC.md`, repository evidence, contracts, and
handoffs before they have a reason to care.

### 4.2 Two products compete for the hero

The deployed page leads with final-tree coverage. The current local rewrite
leads with the portable spec lifecycle. The first is the clearest shipped wedge;
the second is the strategic platform story. Giving both equal weight makes the
site feel undecided.

### 4.3 Every section is written like a campaign line

Patterns such as these repeat through the page:

- "A small contract loop. A clearer handoff."
- "Run it beside the repository."
- "What is useful now."
- "A future network starts with a good artifact."
- "The package surface stays honest."
- "Evidence stays close to the project."

The repeated short-sentence cadence is a common generated-copy signature. A
production tool page needs functional headings that answer reader questions,
not seven equally polished taglines.

### 4.4 Labels do work that evidence should do

`LOCAL-FIRST / HUMAN-OWNED`, numbered kickers, `SHIPPING` chips, `BOUNDARY`,
`PROOF, NOT AUTHORITY`, and `ROADMAP BOUNDARY` create label noise. Repeating the
boundary makes the site sound anxious about its own claims. A real output,
source link, release record, and precise one-line limitation are stronger.

### 4.5 The visual centerpiece is a designed prop

The large `SPEC.md` panel is not a real, linked example. It looks like an
artifact invented to fill a hero layout. Replace it with a committed fixture or
real CLI output that the visitor can inspect in GitHub.

### 4.6 Everything receives equal visual weight

Four lifecycle cards, four shipping cards, three roadmap cards, three trust
items, and three release cards create a page assembled from repeated component
patterns. The user cannot tell that `coverage` is the reason to try the product,
that `SPEC.md` is the retention story, and that the catalog is future work.

### 4.7 The page explains the ontology before the payoff

Terms such as `observed`, `inferred`, `unknown`, `receiver`, `human-owned`,
`identity-bound`, `bounded`, `lock`, and `handoff` appear before a concrete
failure story. They are valid documentation terms. In marketing sequence, they
feel like generated pseudo-precision.

### 4.8 The page is too long for the amount of proof

The current local page is roughly 8,200 pixels tall at a 390 by 844 viewport.
The visitor sees an oversized editorial headline, two CTAs, a four-word process
rail, and a stylized artifact before seeing the real payoff. Length without a
customer story, real output, or adoption evidence reads like a manifesto.

### 4.9 The design uses a familiar "AI-designed developer tool" recipe

The oversized editorial serif, graph-paper background, monospace uppercase
labels, acid accent, dark terminal panel, and hard blue offset shadow are each
valid choices. Used together, they resemble a generated design prompt more than
a mature utility. Content hierarchy should carry the personality; the visual
system should stop competing with the command and evidence.

### 4.10 The release truth is stale

Both the deployed page and current local release data say `NOT-PUBLISHED`.
`@specport/specport@0.1.0` was published to npm on 2026-08-03, and an exact
public-package smoke run returned version `0.1.0` and CLI help successfully.
A maturity claim fails immediately when the status bar is wrong.

## 5. Replacement one-page architecture

The page should have five primary sections, one small roadmap note, and one
final action. `SPEC.md` belongs inside the workflow section as the option for a
longer job; it should not become a second homepage narrative.

| Order | Section | Reader question | Content job |
| --- | --- | --- | --- |
| 1 | Hero | What does this do for me? | Name the AI-review failure, the payoff, one command, and the inventory-versus-proof boundary. |
| 2 | The gap it catches | Is that a real problem? | Show one committed before/after fixture with a late unreviewed path. |
| 3 | Quick start | Can I use it now? | Give the published install path and explain inventory versus proof. |
| 4 | Workflows available today | What exactly ships, and why would I keep it? | Lead with coverage; group secondary commands by user outcome; keep the longer-job `SPEC.md` story short. |
| 5 | Why and when to adopt | Does this add something to my existing Git/CI gate? | Name the off-PR approval use case, local boundary, and cases where existing controls are enough. |
| 6 | Roadmap note | Where is this going? | One paragraph and a link; no cards or fake catalog. |
| 7 | Final CTA | What should I do next? | Repeat the command and link to the first real example. |

### Primary navigation

Use reader tasks, not the author's model:

- How it helps
- Quick start
- Workflows
- Docs
- GitHub

Do not put Roadmap in the primary navigation. Do not use "What ships" as a
marketing label when "Workflows" or "Commands" is clearer.

## 6. Draft copy deck

This copy is a direction ready for implementation refinement. Any visible CLI
output must be replaced with output generated from a committed fixture before
publication.

### Metadata

**Title**

> SpecPort - catch AI review gaps before merge

**Description**

> A local CLI that compares your final Git tree with the scope or review you
> approved, flags uncovered files, and leaves a verifiable handoff receipt.

### Hero

**Product label**

> SpecPort / local CLI

**Headline**

> Your coding agent says it's done. Check the final tree.

**Subhead**

> Git tells you what changed. SpecPort verifies whether the scope or pinned
> review you approved still covers the exact tree you are about to merge. It
> flags uncovered paths and weak identity before an AI-assisted change moves on.

**Primary action**

```bash
npx --yes @specport/specport@latest coverage
```

> Starts as a final-tree inventory. Add an approved scope or pinned review for
> a coverage verdict.

Button label: `Copy command`

**First-run qualifier**

> This command inventories the final tree. Add an approved scope or pinned
> review to turn the inventory into a fail-closed coverage check.

**Secondary action**

> See the review gap it catches

**Trust line**

> v0.1.0 / Node 20+ / MIT / no runtime dependencies / local by default

Do not place a mock `SPEC.md`, roadmap, or philosophy statement in the hero.
The command, its qualifier, and a real coverage example are the visual anchor.

### Section 2: The gap it catches

**Headline**

> Tests can pass while the review is incomplete.

**Body**

> An agent changes eight files. You review them. During cleanup it adds one
> more. The tests still pass and the final summary still says "done."
> SpecPort compares the exact final tree with the review source and flags the
> file that was never covered.

**Proof object**

Show a real committed fixture with these facts visible:

- final paths;
- reviewed or approved paths;
- the uncovered path;
- the exact comparison identity;
- `partial`, `unknown`, or `complete` status;
- the next action;
- a link to the fixture, test, and generated receipt.

Do not invent a terminal screenshot. Generate it in CI or from a committed
fixture and label it `Example output`.

**Outcome line**

> Review the gap, not the entire story again.

### Section 3: Quick start

**Headline**

> Run it in the repository you are about to merge.

**Install**

```bash
npm install --save-dev @specport/specport
npx --no-install specport coverage
```

**Important first-run truth**

> The first run inventories the final tree. To prove coverage, compare it with
> an approved-scope file or a pinned GitHuman review. SpecPort does not infer
> what you meant to approve.

Links:

- Compare with an approved scope
- Compare with a GitHuman review
- Read all coverage options

This distinction should be next to the command, not hidden in a later boundary
section.

### Section 4: Workflows available today

**Headline**

> Start with one check. Add the rest only when the work needs it.

Use stacked rows, not equal-weight cards.

#### Catch review gaps

> Compare the final Git tree with an approved scope or pinned review. Report
> complete, partial, or unknown without silently upgrading weak evidence.

Commands: `coverage`

#### For longer jobs, keep a spec with the code

> Turn notes or repository evidence into a reviewable `SPEC.md` so outcome,
> constraints, acceptance, and unresolved decisions can survive between agents
> and sessions. This is optional workflow depth, not the reason to run the first
> coverage check.

Commands: `spec create`, `spec discover`, `spec check`, `spec bundle`

#### Detect drift and prepare the handoff

> Lock the spec and repository identity, detect later change, and produce a
> merge-readiness receipt from explicit evidence.

Commands: `spec lock`, `spec drift`, `spec guard`

#### Reuse without erasing the source

> Pull one licensed spec at an exact Git ref and prepare cover, remix, or build
> handoffs with provenance. These commands produce plans and handoffs; they do
> not generate or ship code.

Commands: `pull`, `spec cover`, `spec remix`, `spec build`

#### Use the same protocol with an agent

> Export the included repository-to-spec and spec-to-production playbooks for a
> supported agent environment.

Commands: `skill list`, `skill export`

CTA: `Open the complete command reference`

### Section 5: Why and when to adopt

**Headline**

> Add a receipt where approval happens outside the final PR gate.

**Body**

> Git already lists changed files. CI already runs checks. SpecPort adds value
> when a local review, agent handoff, or explicit scope was approved before the
> branch stopped moving. It verifies whether that approval source still matches
> the exact merge candidate and refuses to call weak identity complete.

> If the repository already requires a fresh, complete review on every final
> commit, SpecPort may be redundant. The site should earn trust by saying so.

**Adoption properties**

- Runs locally against Git.
- Uploads no source, prompt, transcript, or credential to a SpecPort service.
- Contacts only a receiver URL you request or the exact GitHub ref used by
  `pull`.
- Stores readable Markdown and JSON beside the project when you choose.
- Works without a hosted account and has no runtime dependencies.
- Reports missing identity and unstable state instead of guessing.

**One boundary sentence**

> SpecPort proves relationships between artifacts and review evidence. It does
> not decide whether the product is correct, tasteful, secure, or ready to ship.

State this once. Remove all other `BOUNDARY`, `PROOF, NOT AUTHORITY`, and
`HUMAN-OWNED` callouts from the homepage.

### Section 6: Roadmap note

**Label**

> Future, not shipped

**Copy**

> The longer-term direction is a GitHub-native network for finding, covering,
> remixing, and evaluating reusable specs with source and license intact. The
> public catalog and reputation layer will appear only after there is a real
> corpus and verified external use.

CTA: `Read the roadmap`

This should be one restrained paragraph near the footer. No `NOW / NEXT /
AFTER` cards and no roadmap item in the primary navigation.

### Final CTA

**Headline**

> Before the next AI-assisted merge, check the branch - not the summary.

```bash
npx --yes @specport/specport@latest coverage
```

Links:

- See a real coverage report
- Read the docs
- Inspect the source

### Footer

Keep the footer functional:

- GitHub
- Documentation
- Changelog
- Security
- Contributing
- MIT license
- npm package

Do not add another product slogan after the final action.

## 7. Keep, cut, merge, and move

| Current content | Decision | Reason |
| --- | --- | --- |
| Giant editorial hero slogan | Replace | It expresses mood before utility. |
| `SPEC.md` hero mock | Cut | It is not real proof and leads with the retention story. |
| `WRITE / CHECK / LOCK / HAND OFF` rail | Cut | It repeats the lifecycle without showing a payoff. |
| Four-card model section | Move to docs | It explains internal taxonomy before first value. |
| Source-checkout quick start | Replace | The public npm package is now available. Keep source install in docs. |
| Shipping proof cards | Merge into outcome rows | Equal chips flatten the value hierarchy. |
| Full-screen roadmap | Demote to one paragraph | Future work should not compete with the current product. |
| Release Truth section | Condense and move up | Version and install state should support the first action. |
| Three-part trust section | Rewrite as concrete bullets | Remove repeated philosophical boundaries. |
| Repeated human-authority caveats | Keep once | Repetition reads defensive and generated. |
| GitHub and docs links | Keep and strengthen | They are the real proof surface. |

## 8. Voice system

### Posture

A senior engineer explaining one useful check to another senior engineer.
Specific, calm, and willing to omit. The site should sound like someone who has
used the failure mode, not a brand describing its philosophy.

### Rules

1. A headline names a problem, outcome, or task. It is not a mood line.
2. A claim should name a command, artifact, input, output, or observable result.
3. Explain a boundary once, next to the claim it limits.
4. Use the reader's words first: branch, file, review, scope, merge, command.
5. Introduce product vocabulary only after a concrete example requires it.
6. A CTA describes the next ten seconds: copy, run, see, inspect, read.
7. Roadmap language is visibly future and shorter than current-product copy.
8. If a sentence could describe Linear, Notion, or any AI tool, delete it.

### Avoid on the homepage

- portable, versioned, inspectable as an adjective stack;
- human-owned as a badge;
- evidence surface;
- the next surface;
- bounded handoff;
- identity-bound before the mechanism is explained;
- a small loop / a clearer handoff cadence;
- numbered editorial kickers;
- all-caps philosophical labels;
- decorative `SHIPPING` chips;
- `NOW / NEXT / AFTER` roadmap cards;
- repeated arrows attached to non-link slogans.

These terms may remain in technical documentation where precision is useful.

## 9. Proof requirements

The rewrite is not mature until the content is backed by observable artifacts.

### Product-thesis gate

Copy cannot manufacture demand. Before treating this as the final marketing
direction, put the wedge in front of at least five maintainers who approve
AI-assisted changes outside a fresh final-commit PR review. Ask for the last
real incident, the current workaround, and whether they would maintain an
approved scope or pin a review source.

Continue with the coverage-led homepage only if multiple users can recall the
failure without being coached and judge the fail-closed receipt more useful
than `git diff` plus their current gate. If they cannot, revisit the product
wedge before polishing the website.

### Artifact and release proof

- Publish one small fixture repository or committed fixture directory where a
  path is added after the review source.
- Generate the visible coverage output from that fixture in CI.
- Link the output to the exact fixture, test, and package version.
- Read package version, Node engine, license, tarball, and publication state
  from the release data; never hard-code a stale `NOT-PUBLISHED` badge.
- Link each workflow row to current CLI help, README usage, a schema, a skill, or
  a test.
- Do not show customer quotes, usage counts, ratings, stars, or a public catalog
  until the evidence exists.
- If a static test count is shown, generate it from the release workflow. A
  manually maintained number will go stale.
- Verify the exact published package in a clean consumer before making the npm
  command primary.

Current verification on 2026-08-03:

- `@specport/specport@0.1.0` is present on npm with the expected tarball.
- A clean public-package smoke run returned version `0.1.0` and completed a
  real `coverage <repository> --json` inventory with exit code `0`.
- The local aggregate package gate passed with 93 tests and the package smoke.
- The website's `release.json` now records `PUBLISHED`, the exact registry
  version and tarball, Node requirement, license, and canonical public source.
- The visible partial-coverage receipt is generated from the committed fixture
  by the real built coverage engine. The Pages workflow regenerates it and
  verifies the deployed page, release metadata, and receipt after publication.

## 10. Content acceptance criteria

The replacement content is ready to implement when all of these are true:

- A cold visitor can state what SpecPort prevents after reading the first two
  sentences.
- The first screen answers why it is useful, what changes for the user, why it
  is worth adopting, and how to run it now.
- The published npm command appears before any lifecycle or roadmap explanation.
- Inventory-only behavior is distinguished from proof against a scope or
  review in the hero and next to the quick start.
- One real fixture demonstrates the review gap; no fake terminal output appears.
- `coverage` is visibly the entry wedge, `SPEC.md` is optional depth for longer
  jobs, and the catalog is visibly future work.
- The homepage uses no more than one boundary callout and one roadmap paragraph.
- The command surface is grouped by user outcome; the complete flag reference
  lives in documentation.
- Desktop and mobile first screens show the headline, payoff, current install
  path, and proof link without an oversized mock artifact pushing them down.
- Package status matches the live registry and deployed release receipt.
- Every visible claim has a current source.

## 11. The shortest possible strategy

If the team remembers only five lines, use these:

1. Lead with the merge failure, not the spec format.
2. Show the one file that escaped review.
3. Let the user run the real npm package immediately.
4. Say when existing Git/CI review controls are already enough.
5. Keep `SPEC.md` as optional depth, and replace self-declared polish with proof.
