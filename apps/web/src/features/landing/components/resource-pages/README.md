# Public resource pages

Resource pages include `/resources/cases-and-patients`, `/resources/measurement-tools`,
`/resources/surgical-planning`, `/resources/visual-simulation` and `/resources/ai-assistants`.
Routes stay in English;
visible copy and metadata follow the existing Portuguese/English locale selection.
Their corresponding LP cards link to these pages. Community's action remains
visual until its page is defined. AI Assistants retains its planned marker.

## Boundaries

- App Router files under `app/(public)/(resources)/resources` own public routing,
  metadata and the shared layout. They contain no presentation or product logic.
- `resource-page-layout.tsx` mounts `ResourceHeader` once, together with the skip
  link and main landmark, for every route below `/resources`.
- `resource-header.tsx` is the single resource-pages navbar: logo, locale selector
  and plain Create account link. `resource-header.module.css` owns its layout,
  spacing, responsive rules and link styles. Edit these two files to update all
  resource pages. Individual pages must not mount or copy their own navbar.
  It reuses the shared locale-switcher behavior and translation strings.
  `landing-header.tsx` now serves the LP only; its former resource variant has
  been extracted. Resource navbar structure/styles can evolve independently.
- `cases-patients/cases-patients-page.tsx` owns this page's composition and ordered
  resource identifiers. It loads localized copy on the server.
  `cases-patients/cases-patients-faq.tsx` supplies four questions about patient
  context, linked files, search and status below the sketches. Copy lives in
  `resource-pages.json` under `casesPatients.faq` for both PT and EN; the shared
  FAQ's `resource` variant supplies the same layout and behavior as AI Assistants.
- `measurement-tools/` owns the second page's independent composition, section
  adapters, visual slot and stable resource identifiers. Its three module sketches
  are implemented. Its blue preview layers a radiograph window and measurement
  panel; see `measurement-tools/README.md` for the boundaries.
- `surgical-planning/` owns the third page's independent section adapters, content
  identifiers, a static photo/panel preview and three sketches (axes,
  orientation, osteotomy). The preview uses the user's supplied SVG coordinates
  and uses the supplied team photo `5443656432312390.avif`; its choreography is deferred.
  Its own README records the content and visual boundaries. Copy is composed
  from separate `surgical-planning.json` files under `resourcePages.surgicalPlanning`.
- `visual-simulation/` owns the fourth page's presentation, editorial overview,
  preview surface and three sketch stages: fragment, rotation and review.
  It shares the LP's simulation image and the resource GSAP/layout primitives.
  Its independent `visual-simulation.json` files compose as
  `resourcePages.visualSimulation`. Fragment uses manual point placement and a
  closed selection; Rotation moves the selected region around the cut center.
  Review compares the original/result contours in a thumbnail and confirms saving.
  The main preview uses a native HTML planning sheet behind a laterally cropped
  queue of TPLO case records, over the shared blue background and under a white veil.
  Its caption-anchored fade completes before the title at every card width.
  It retains the reference's uniform stage scaling, paper shadows and table depth.
  React/GSAP coordinate a repeating Toti/Luke/Luna case cycle with a save badge,
  persistent one-row insertion and a new paper rising over the stationary old one.
  Its local timing module records the
  supplied reference values; the page's other animations remain independent.
- `ai-assistants/` owns the fifth page's separate presentation, editorial overview,
  horizontal workflow preview and three implemented sketches: report assistant, case assistant
  and custom workflows. It shares the LP's assistant image and the standard
  resource layout/GSAP components. Dedicated PT/EN JSON files compose as
  `resourcePages.aiAssistants`. Copy, the facts note and the FAQ make its future/planned
  scope explicit; there are no functional agents or automation integrations.
  The upper preview reuses the shared sky/veil and original `/agents/*.svg`
  fallbacks inside five horizontal workflow nodes. The official `open-bot-avatar` engine
  animates local JSON definitions through `../agents/agent-avatar.tsx`, preserving
  layer order with SVG foreignObject hosts. Its GSAP cycle joins two parallel
  tasks into a draft and ends at professional review. Phone layouts keep the
  horizontal graph with lateral scrolling. This replaces the desktop mockup;
  the current composition no longer requires a platform screenshot.
- `resource-preview-backdrop.tsx` shares the original sky, blurred wave and
  full-width white veil across the resource previews. Gradient stops,
  filter bounds and veil coordinates are defined once; a per-preview ID prefix
  isolates SVG references. Its exported veil-gradient primitive also supports
  a foreground SVG over a native HTML scene. Cases retains its foreground panels and local summary
  veil; Measurement tools puts the shared sky veil behind its windows and fades
  each foreground window separately, preserving its confirmation button.

- `resource-preview-fonts.ts` re-exports the scoped Inter/Jakarta font instances
  from `../landing-reference-fonts.ts`, also used by the universal FAQ.
  Resource illustration body text and display labels retain their existing
  family, size and weight while the rest of the page uses the project fonts.
- `../faq/faq-section.tsx` owns the universal, native details/summary FAQ with
  reference dimensions, sticky heading, hairlines and CSS transitions. Individual
  page adapters supply localized questions for AI Assistants, Cases and Patients,
  Visual Simulation, Measurement Tools and Surgical Planning, with the shared viewport entrance
  and resource variant.
- Presentation, overview and modules are separate composable server components.
  `ResourceModuleCard` accepts its visual as children; artwork does not become
  another page-wide configuration option.
  Below the stage, its body follows the reference's h3 + paragraph structure,
  without a footer or Add button. Description uses 14px relaxed text (1.625);
  title uses the project's 24px/28px display treatment.
- `resource-overview.tsx` uses an editorial image-left/copy-right composition.
  Cases reuses the LP's supplied AVIF via `data/resource-media.ts`; that source
  is also consumed by the Cases capability card, keeping the asset in one place.
  The image retains its original encoding, has a 1024:1365 cover crop on desktop,
  and a 4:3 crop when stacked below 992px. It is decorative, as on the LP.
  The right column is capped at 456px on desktop and contains a dedicated
  40px display heading, a 22px/33px black opening paragraph, and three
  17px/27.625px gray supporting paragraphs. On narrow screens
  the body uses an 18px/16px hierarchy while the heading stays at 40px. The overview
  does not change the module heading or sketch/card styles.
- `resource-title.tsx` renders accessible h1/h2 headings with decorative
  character spans, keeping complete words together. All three section headings
  use `animations/resource-heading-entrance.ts`: .18em rise, 650ms duration,
  18ms character stagger and `power2.out` easing. Section controllers insert this
  shared animation into their own scroll timeline before releasing the guard.
  `resource-presentation-motion.tsx` delegates the first title's entrance,
  the tagline/facts and the preview animation to the scoped GSAP hook
  `animations/use-resource-presentation-entrance.ts`. The preview's ring,
  percentage, summary rows and fills share that timeline rather than CSS keyframes.
- `resource-overview-motion.tsx` keeps the editorial content server-rendered and
  delegates its entrance to `animations/use-resource-overview-entrance.ts`.
  The hook follows the project's GSAP pattern: `useGSAP`, scoped selectors,
  `gsap.matchMedia` and a timeline with `power2.out`. ScrollTrigger starts once
  at `top 85%`: the image enters from -40px on X; the shared heading animation
  starts at 160ms. Paragraphs enter from 16px on Y, beginning at 280ms with a
  120ms stagger. Image and paragraph tweens last 700ms.
  Completed transforms are cleared; media contexts and triggers are reverted
  on cleanup. Reduced motion leaves the original, visible markup untouched.
- `resource-reveal.tsx` is the shared GSAP client boundary for the
  module heading and module cards. It retains server-rendered children
  and semantic header/list elements. `animations/use-resource-reveal.ts` triggers
  the 12px rise once at `top 85%`, with 700ms duration and `power2.out` easing.
  The module heading uses the shared character animation; its accompanying copy
  follows at 120ms. That copy uses the LP intro's inline strong treatment:
  20px/1.4 text, -.025em tracking, a 500-weight black opening and gray remainder.
  Narrow screens use 18px/1.5. Rich text stays localized through next-intl.
  Module cards use 100ms increments. Every entrance initializes inside `useGSAP`
  and `gsap.matchMedia`; the media context restores source styles on cleanup.
- Entrances and sketches render with `data-resource-motion="pending"`. The same
  CSS hydration guard used by Home hides pending roots only when scripting is
  enabled and reduced motion is not requested. Each controller releases its
  guard after preparing all start states, preventing visible HTML from flashing
  before GSAP hides it. No JavaScript and reduced motion retain the static markup.
- `resource-facts.tsx` renders localized facts as a semantic definition list.
  The presentation accepts facts as a composition slot. Cases supplies patient,
  files, clinical notes and planning status, plus a brief note. There are no
  presentation action buttons. The title uses the available column width with
  a 40px font size, avoiding a forced two-line heading; its lead is capped at
  36ch. Fact values use 19px type. This keeps the supplied service-page hierarchy
  compact without pricing or FAQ content.
- `resource-sketch-frame.tsx` provides a decorative vector stage for each module.
  Patient details has an animated two-panel SVG, Images/documents has a connected
  records SVG, and Search/progress has a search/selection SVG. The shared primitives and
  GSAP controller live under `sketches/`,
  with the scene under `cases-patients/sketches/`. See `sketches/README.md` for
  timing, metadata and reduced-motion behavior. These frames
  belong to the resource cards. The presentation's optional visual slot currently
  holds `cases-patients/cases-preview-card.tsx`, not a sketch.
- `resource-pages.module.css` owns responsive geometry and typography. It shares
  the LP's white surface, gray text tokens and fonts. This page does not render
  the LP's vertical guides or dotted section dividers.
- Shared and Cases copy belongs to `i18n/messages/{pt-BR,en}/resource-pages.json`.
  Measurement tools copy has its own `measurement-tools.json` in each locale,
  composed into `resourcePages.measurementTools` by the locale index. Public
  detail paths belong to `features/landing/data/resource-routes.ts`.

## Scope

The page contains presentation, a brief explanation and three resources: patient
details, images/documents, and search/progress. No FAQ, pricing, module selection,
clinical API requests, authentication requirements or new client state is added.
The preview combines patient details, case progress and a case summary in the
case. The outer label is Clinical context, with localized copy about identification,
images and notes. These are illustrative data,
not live product API responses. The supplied module geometry remains fixed.

`cases-preview-patient.tsx` owns the horizontal note's content: Toti and the case
ID in the header, followed by age, birth date, weight, breed, sex and species in
a three-column, two-row layout. The supplied patient avatar uses
`/images/landing/3422243535333124.avif`, retaining the Hero's 29.077 × 29.077
dimensions and 10.904 corner radius, rendered as a clipped SVG image with cover
fit. Dates and numeric weight use the active locale via next-intl.
The illustrative values live in `cases-preview-patient-data.ts`. The Patient
details sketch reuses name and age in one brief string; Search/progress reuses
the name in its search and result. Other sketch information remains abstract.
The old suggestion text and highlight have been removed from this note only;
its 383 × 117 bounds, position, outline, divider and shadow are unchanged.

`cases-preview-progress.tsx` defines four illustrative steps: patient, examination,
reports (completed), and case completion (pending). Percentage, caption and accessible
summary all derive from these steps: 75%, 3 of 4. Three equal completed arcs retain
the original blue, violet and green, with the pending quarter in gray and small
gaps between segments. The HTML percentage counter stays anchored to the same
SVG center. Arcs and counter share their delay and duration. The inner caption
uses 8px type, reduced from 9px to keep clear of the ring.

`cases-preview-summary.tsx` owns Case overview and its illustrative values. Files
uploaded shows a blue fill calculated from 5 of 7 (71.43%). Reports created shows
a count of 4 in a blue badge; no report target or percentage is invented. The
examination is complete, with a full blue bar. Each row uses the same existing
278 × 25 content area and stays under the original fades. Counts, file ratio and
the accessible summary share the same data. Only determinate bars animate their
fill; report count remains a count. Labels and values are localized.

`cases-preview-geometry.ts` owns the fixed module geometry supplied in the TXT.
Do not adapt these bounds to fit new copy. The outer card stays 447px tall with
20px corners and 25px padding; the SVG keeps a 629 × 427 coordinate space.

- White dashboard: x=211, y=35, 380 × 452, rx=16. Its outline is x=210, y=34,
  382 × 454, rx=17, white stroke=2. It deliberately extends beyond the SVG base.
- Floating note (`patient` geometry key): x=40, y=68, 383 × 117. Its 1px black outline at 4% opacity is
  x=40.5, y=68.5, 382 × 116, rx=13.5. The divider is at y=112.553 with 0.82px
  stroke. The supplied 38.48 × 21.3 badge keeps its reference coordinates.
- Donut card (`progress` geometry key): x=442.05, y=68.18, height=116.06. Its width=126 and rx=18 are
  retained values, as the TXT does not specify them. Content/counter move together.
- Case overview (`summary` geometry key): x=240.8, y=203.97. Width=320, height=154 and rx=18 remain unchanged
  because the supplied TXT gives its origin only.
- Aurora: the five supplied capsule rectangles, colors and fill opacities, each
  blurred at 40.05, clipped to the panel. The filter buffer avoids truncating the
  blur; the visible panel clip remains exactly the supplied geometry.
- `cases-preview-shadows.tsx`: panel shadow blur=11.15, dy=4, black at 4%; note
  shadow blur=18.8, dy=4, black at 5%. The note paints in front of the panel.

Two white-gradient rectangles paint after the contents: the summary veil transitions between
y=253.717 and y=364.32, followed by the full-width veil between y=261.755 and
y=427. Their rectangle bounds and gradient stops match the supplied reference.
All blue background artwork now paints inside that same SVG, before the panels
and veils. There is no separate CSS blue surface. The sky uses the supplied
user-space gradient from (-354.762, -1269.4) to (-95.3934, 879.704), with stops
at 0 (#95C5FF), 0.62175 (#2C8BFF) and 0.75239 (transparent white), blurred at
21.4. It paints over the white article and dissolves before the lower copy.
The full-width veil remains the final SVG element, at x=0 with width=629;
the content geometry, two veil gradients and transparent copy wrapper remain
unchanged. The original backdrop polygon path was not supplied; its replacement
covers the existing viewBox and uses the exact supplied sky gradient.
The copy wrapper is transparent so it does not introduce a hard white edge over
the SVG. The category uses Plus Jakarta Sans at 600, 16px/20px, -0.02em; body
copy uses Inter at 400, 16px/22px, -0.01em, capped at 463px. These two font
families are loaded with next/font and scoped to the card; the rest of the page
retains the project fonts. The HTML donut counter remains anchored to its SVG
coordinates when the illustration scales.
The presentation's GSAP timeline animates the multicolor progress ring, percentage
from 0 to its target, summary rows and determinate fills only when reduced motion
is not requested. SVG geometry, fonts, card sizes and veil coordinates remain static.
The presentation is two equal columns with a 12px gap on desktop and stacks
below 992px. Artwork is isolated from the page composition and clinical features.
Resource pages remain unindexed while their content and visuals are being built,
matching the existing LP policy. Add future pages individually, reusing these
composition boundaries only where they fit.

## Surgical planning photo

The upper preview uses the supplied `/images/landing/5443656432312390.avif` in
`surgical-planning/surgical-preview-geometry.ts` → `photo.src`. The former
pending photo reminder is resolved, with the reference dimensions retained.

## Community

`community/` owns the `/resources/community` presentation page. It follows the
shared presentation/overview/modules/FAQ composition and GSAP entry patterns.
Its local preview, SVG sketch scenes and PT/EN copy are separated from the
authenticated community feature. The LP and overview share `communityImage`;
`resourcePagePaths.community` supplies navigation and canonical metadata.
See `community/README.md` for ownership and planned-feature scope.

## Verification

The user requested manual testing. No tests, typechecks, builds or browser/visual
automation are run for this delivery.
