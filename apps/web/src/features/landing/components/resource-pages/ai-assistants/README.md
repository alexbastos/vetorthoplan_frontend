# AI Assistants resource page

Public route: `/resources/ai-assistants`. The LP's `assistants` capability links
through `data/resource-routes.ts` and retains its planned/coming-soon marker.
This page presents a future product direction, not implemented agent functionality.

## Structure

- The App Router page owns localized metadata and the English canonical route.
  The existing resources layout supplies `ResourcePageLayout`/`ResourceHeader`,
  its skip link, white background and temporary noindex policy. There is no
  page-specific navbar or sitemap entry.
- `ai-assistants-page.tsx` composes presentation, overview, modules and FAQ.
- `ai-assistants-faq.tsx` adapts four localized questions to the universal
  `../../faq/faq-section.tsx` below the sketches. Availability, possible tasks,
  professional review and multiple agents remain explicitly future/planned.
  Its `resource` variant omits all divider lines, aligns the first question with
  the heading's first line and starts with every answer closed.
- `ai-assistants-content.ts` owns four fact identifiers and three stable module
  IDs/codes: Reports (AI-01), Cases (AI-02) and Workflows (AI-03).
- `ai-assistants-presentation.tsx` supplies the shared breadcrumb, 40px heading,
  tagline and facts. Its note explicitly identifies the future/planned scope.
- `ai-assistants-preview.tsx` composes the upper visual using the shared sky and
  full-width white SVG veil. It retains the other pages' 447px height, 20px
  corners, 25px caption padding and 629 × 427 SVG coordinates. The label,
  description are localized. The preview has no status badge. Its foreground is
  a five-node horizontal workflow: case, parallel context/notes agents, report
  draft, professional review. The illustrative patient is shared Toti/OV-0248.
- `assistants-workflow-data.ts` owns native 629 by 427 positions, curved paths,
  stable node IDs and timeline values. The supplied HTML reference specifies
  the 300ms trigger, 240ms connections, 700/1000ms parallel tasks and 820ms
  report task. Paths start when their upstream task finishes. Report starts at
  1.78s after both inputs arrive; review starts at 2.84s and reveals its invitation
  at 3.48s. The added reading/reset interval starts at 5.8s, lasts 350ms, then
  holds 450ms before repeating. Reset/hold values are local design choices;
  the supplied HTML did not include the original CSS animation controller.
- `assistants-workflow.tsx` paints the connectors, native HTML cards in SVG
  foreignObject boxes and shared foreground veil. Desktop uses four columns,
  with two vertically separated agents in the second column. Below 640px the
  graph keeps its horizontal layout and minimum 560px illustration width inside
  a scrollable 320px-high visual viewport. Background/caption remain fixed.
- `assistants-workflow-node.tsx` renders compact role labels, descriptions,
  pending/spinner/check states and a decorative Review draft pill. It reuses
  the live `../../agents/agent-avatar.tsx` with original chat/cat/bunny assets
  and colors; the official avatar engine owns character movement. Node controls
  are spans in an aria-hidden illustration, not real actions or approval APIs.
  Agent headers use dedicated names Maia (context), Nina (notes) and Leo (draft),
  with their original avatars and spinner-to-check status at the right. Task
  descriptions sit immediately beneath, aligned to the card's left padding.
  Standard cards are 64 units high with 8-unit padding, a 27-unit header
  (including space above its divider) and a 6-unit content gap below it;
  the review card is 94 units high to fit its invitation.
  The compact nodes align at y=188, with parallel branches centered at 136/240;
  all five connection endpoints match the updated card boundaries.
- `assistants-workflow-timeline.ts` coordinates active outlines, spinner rotation,
  completion checks and the blue edge traversal. All nodes/paths stay mounted;
  the cycle uses GSAP without per-frame React state. The sequence ends at an
  invitation to review and never auto-publishes or simulates clinical approval.
  `assistants-workflow-motion.tsx` starts at 45% of the graph entering the viewport,
  pauses offscreen/when the document is hidden and reverts its GSAP media context
  on cleanup. A pre-hydration guard prevents an initial flash. Reduced motion and
  no JavaScript keep the static completed graph with a review invitation visible.
  The existing presentation entrance continues to animate the overall card.
- `ai-assistants-overview.tsx` uses the shared photo-left/editorial-copy-right
  layout. `aiAssistantsImage` in `data/resource-media.ts` supplies the same
  `/images/landing/0003243231123563.avif` asset as the LP capability.
- `ai-assistants-modules.tsx` supplies three module cards and a typed sketch
  registry. AI-01 renders the report assistant; AI-02 renders the case assistant;
  AI-03 renders two agents preparing a document for review.
  Typography, card bodies, code/scale markers and the responsive grid come from
  the existing shared components.
- `sketches/report-assistant-sketch.tsx` localizes the report scene on the server.
  Its native SVG uses the shared SVG/GSAP sketch engine and reference timings:
  a list selection connects to a draft whose abstract text is drawn in sequence.
  The scene introduces no independent playback controller or client state.
- `sketches/case-assistant-sketch.tsx` supplies localized prompt and summary copy
  to a native SVG scene matching the conversation reference. Abstract context
  strokes lead into a request, transient typing dots and a short summary reply.
  It reuses the shared animation controller, timings and static fallback.
- `sketches/workflow-sketch.tsx` supplies three brief localized labels. Its
  scene connects an abstract document to two agents and an output for review,
  using scoped SVG IDs and transient signals on the shared GSAP timeline.
- `i18n/messages/{pt-BR,en}/ai-assistants.json` owns all page copy and metadata.
  The locale indexes compose it as `resourcePages.aiAssistants`.

## Motion and scope

The page reuses the existing GSAP heading entrance, image entrance from the left,
cascading overview text, section/card reveals, reduced-motion support and
pre-hydration visibility guard. Live agents use the official avatar engine via
one shared adapter, with no per-frame React state. Other internal preview
choreography can be designed separately.

Copy describes possible report drafts, case organization and custom workflows
with multiple specialized agents. It does not claim that these features are
available, connect a model provider, execute automations, access patient data or
promise a launch date. Professional review remains part of the proposed workflow.
There are no chat endpoints, agent tools, credentials, authenticated product
changes or functional agent controls in this presentation scaffold.

The former desktop mockup and bubble components were replaced by this workflow.
There is no platform screenshot slot or pending image needed by the current card.

The user performs manual testing. No tests, typechecks, builds, browser automation
or screenshots were run.
