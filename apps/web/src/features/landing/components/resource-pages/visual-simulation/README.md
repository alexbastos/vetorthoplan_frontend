# Visual simulation resource page

Public route: `/resources/visual-simulation`. The LP's fourth capability,
`simulation`, links through `data/resource-routes.ts`. The route stays in English;
Portuguese and English copy load from `resourcePages.visualSimulation`.

## Structure

- `visual-simulation-page.tsx` composes presentation, overview, modules and FAQ.
- `visual-simulation-faq.tsx` adapts four localized questions about setup,
  rotation, original/result comparison and saved parameters to the shared FAQ.
  Its `resource` variant appears below the sketches, without divider lines,
  with all answers initially closed, blue hover dots and the shared GSAP entrance.
- `visual-simulation-presentation.tsx` supplies the shared breadcrumb, heading,
  tagline and four facts. It uses the same minimal resource layout/navbar.
- `visual-simulation-content.ts` owns stable fact/module/FAQ identifiers and VS codes.
- `visual-simulation-preview.tsx` composes a blue background, native HTML planning
  sheet, overlaid table and foreground white veil. It loads scene copy on the
  server for all three cases. The card retains 447px height, 20px corners and
  25px caption padding; its existing GSAP section entrance is retained.
- `simulation-preview-geometry.ts` owns the supplied 616 × 503 stage (maximum
  scale 1.25), paper bounds and table dimensions. The 399.163px paper remains at
  (108.418,61.311), with minimum height 640.139px. The 1070.51px table starts at
  x=-491.194 and preserves 22.645px corners, 20.587px padding and 57.643px rows.
  Its reference y=228.898 is lifted 49.898px to y=179 to fit the existing caption.
  No nonuniform scaling is applied. Scene values are exposed as CSS properties;
  the container-width ratio uses the reference's tan/atan2 formula.
- `simulation-preview-paper.tsx` owns the sheet's metadata, compact patient
  identity, plan summary and parameters. Its header groups Case alone at the
  left and Planning/Projection together at the right, rather than equal thirds.
  The summary uses `/icons/icon-strategy.svg` at 24px without
  a colored background. Each case has a localized focus: Toti shows TPLO/Proximal
  fragment, Luke Osteotomy/Circular cut and Luna Rotation/Fragment adjustment.
  The header and queue retain TPLO as the procedure; these are three presentation
  focuses within that implemented scope. There is no radiograph thumbnail.
  Two clipped shadow layers preserve the
  supplied paper-contact/elevation treatment. Toti's name, avatar, age and case ID
  come from the existing shared patient data.
- `simulation-preview-table.tsx` owns the native table. Its first two columns
  extend beyond the viewport, preserving the reference's lateral bleed; the
  visible columns identify the patient/case, cut radius, rotation and save state.
  The five reference shadows are retained. Each row represents one case's TPLO
  plan, allowing the current case to enter above the preceding cases as a real
  queue. The sheet follows the new top row. Three slots remain visible; earlier
  cases stay mounted and move down instead of being replaced by another block.
- `simulation-preview-cases.ts` owns the illustrative Toti, Luke and Luna cases,
  their patient metadata, localized summary identifiers and plan values. Toti reuses the shared presentation
  data. Luke uses `/images/landing/3422243535333126.avif` and Luna uses
  `/images/landing/3422243535333125.avif`, supplied as their individual avatars.
  The sheet and queue row share each case's localized values from the server.
  The removed radiograph component and its masking/fragment coordinates are no
  longer part of this preview. The three module sketches remain independent.
- `simulation-preview-copy.ts` keeps the paper/table copy and row types together.
- `simulation-preview-scene.tsx` is the client playback boundary. All three sheets
  are mounted with scoped avatar IDs; one fixed table surface stays above them.
  The table mounts two copies of the case sequence, six stable keyed rows total.
  This permits a returning case to enter while its previous occurrence still
  leaves through the bottom. A clipped viewport contains those movements.
  React owns the active case, queue step and editing/saved phase. GSAP owns motion.
- `visual-simulation-overview.tsx` uses the shared photo-left/editorial-copy-right
  layout. `visualSimulationImage` is shared with the LP, using the existing
  `/images/landing/0003243231123562.avif` asset.
- `visual-simulation-modules.tsx` supplies three module cards and a complete typed
  sketch registry for Fragment, Rotation and Review. Their body text,
  spacing, grid/scale markers and GSAP card reveal come from the shared components.
- `sketches/` owns the three scenes, their geometry and the shared window canvas.
  All scenes reuse the existing playback controller.
- `i18n/messages/{pt-BR,en}/visual-simulation.json` owns all page copy, including
  metadata. Both locale indexes compose the same namespace.

The App Router file owns localized metadata and the canonical address. The
existing resources layout retains its temporary noindex policy; this page is not
added to the public sitemap. No authentication, case data or product API changes
are part of this scaffold.

## Existing standards

The page reuses 40px headings, character-based title entrance, image entrance
from the left, cascading editorial copy, inline black/gray description emphasis,
the responsive layout, reduced motion and the pre-hydration visibility guard.
All section entrance behavior comes from the existing GSAP hooks. Fragment also
uses the shared sketch timeline: point placement, segment drawing, closure, fill
and selected label. Rotation uses that same controller for a rigid fragment
transform and synchronized handle/cursor. Review shows the original/result
contours in a thumbnail and a cursor-driven save confirmation. The main preview
now loops through Toti → Luke → Luna → Toti. It uses the existing GSAP packages,
native DOM text and the same uniform scene scale, without rasterizing the UI.
The backdrop and foreground veil use separate SVG layers. The exported shared
veil-gradient primitive keeps both the definition and its full-width 629 × 427
coordinates identical to the other previews. The veil overlays the DOM scene;
the caption stays above the veil and scene. A local caption veil is anchored to
the actual text block: it begins 64px above it, reaches solid white after 54px
and continues behind the full label/description. This ensures that the table
and paper disappear 10px before the title, independently of the scaled SVG stage
height or paragraph wrapping. It affects this preview only.
All illustration content is
decorative and exposes one localized image description, without focusable controls.

## Content boundaries

The initial copy follows the existing TPLO functionality documented in
`docs/tplo-simulation-implementation-plan.md`: define the fragment, enter its
rotation, view the origin/result contours, save and reopen the simulation.
It does not claim automated recommendations, biomechanics, implant selection,
clinical approval or support for procedures beyond the current TPLO scope.
Texts and sketch subjects can be refined one at a time in the next visual step.
The sheet/table is an illustrative workspace, not an interactive case editor.
Its displayed values belong to the preview and do not alter product data or the
three module sketches. They are not clinical recommendations. The current product
scope is TPLO; the table does not imply support for other procedures or duplicate
TPLO plans to fill the scene.
The save badge demonstrates a local presentation state, not a product API call.

## Case cycle

- `animations/simulation-preview-timing.ts` records the supplied reference values:
  2.11s editing hold, .24s save transition, 1.1s from save-state change to row shift
  (including the badge transition), .48s row translation,
  .384s row opacity, 181.587px paper pre-position, .65s paper movement after a
  .16s entry delay, .87s outgoing-paper visibility boundary and .755s shadow fade.
  Lens uses (.23,1,.32,1); row displacement uses (.77,0,.175,1).
- `animations/simulation-preview-timeline.ts` prepares and reuses one paused,
  repeating timeline. Each case changes Editing → Saved in one shared grid cell.
  Both status layers stay mounted, so their different badge heights do not move
  the row. At insertion, only one new row enters from y=-57.643 to 0. The three
  existing rows move from slots 0/1/2 to 1/2/3 with the exact same .48s curve.
  Existing rows do not fade. The bottom row is hidden only after it is completely
  outside the clipped viewport. Only the incoming row uses the .384s opacity
  transition. No full table or case-sized block is crossfaded or remounted.
  The outgoing sheet remains stationary at y=0 and z=1. The incoming sheet rises
  from y=181.587 at z=2, below the fixed table at z=3, after .16s. The old sheet
  hides at .87s, after the incoming sheet has fully covered it at .81s.
  The incoming shadow layers fade linearly over .755s.
  The source did not supply intermediate paper-shadow keyframes, so this opacity
  treatment reconstructs that part rather than claiming an exact keyframe copy.
- A case takes 4.125s, so the visible three-case loop lasts 12.375s. The prepared
  timeline contains two rounds (24.75s) to close the six-row ring in the exact
  initial slot positions. It never reseeds the visible list at a repeat boundary.
  React state
  changes only at semantic boundaries; there are no per-frame React updates,
  setTimeout chains or additional timelines created per cycle. Transforms and
  temporary will-change is cleared at rest. Paper transforms are cleared; queue
  rows keep absolute 2D slot translations with force3D=false for native text.
- `animations/use-simulation-preview-cycle.ts` owns viewport entry at 45%, pause
  offscreen/document-hidden, reduced-motion gating and context/listener cleanup.
  Media or component cleanup reverts the prepared timeline and its ScrollTriggers.
  Without JavaScript, the first case stays visible. Reduced motion shows a static
  selected case; no user-facing replay/pause controls or live announcements are added.

The background, caption, foreground veil and caption-anchored fade remain fixed
throughout the cycle. No authenticated viewer, clinical state or API is imported.

## Follow-up reminder

- Remind the user about creating the **medical team planning photo** for the
  Surgical planning page at the next resource-page visual review. The user asked
  to create it later and to keep that frame blank for now.
- Its insertion point is `../surgical-planning/surgical-preview-geometry.ts`,
  `photo.src`, currently `null`. The supplied reference's crop and dimensions
  are already fixed; adding the eventual asset must preserve that geometry.

The user performs manual testing. No tests, build, browser or screenshots were run.
