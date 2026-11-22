# Community resource page

Public presentation route: `/resources/community`. The resource layout supplies
the shared header, locale switcher, white background, skip link and temporary
noindex policy. This page does not mount the authenticated community application.

## Composition

- `community-page.tsx` composes presentation, overview, modules and FAQ.
- `community-content.ts` owns typed fact/FAQ keys and the three module IDs/codes.
- `community-presentation.tsx` reuses `ResourcePresentation` and `ResourceFacts`.
  Titles retain the shared 40px scale and the existing GSAP character reveal.
- `community-preview.tsx` composes a foreground team photo/chat note and a larger
  platform screenshot behind it. Its isolated CSS keeps the standard 447px
  frame, 20px corners, 25px caption padding and 629 × 427 SVG coordinate system.
  It reuses the shared blue backdrop and paints the full-width white veil last,
  above the foreground. It has no live messaging, fake interactive controls or
  independent animation loop. Presentation entrance comes from the shared wrapper.
  The caption uses the same caption-relative dissolve as Simulation, completing
  its transition to white 10px before the title at every responsive width.
- `community-preview-geometry.ts` owns the composition. The 568-unit-wide panel
  starts at x=156 and extends right beyond the stage (opposite Simulation's
  left-extending table). The screenshot itself is not mirrored. Its asset is
  `/images/landing/5454875482823.avif` (1674 × 909), kept at its original aspect
  ratio inside a rounded clip by `community-preview-platform.tsx`. The panel is
  lifted to y=72. The original image is fitted directly with `xMinYMin meet`,
  without zoom, a source-region crop or a nested SVG viewport.
  The foreground uses `/images/landing/5443656432312391.avif` and the original
  photo/note coordinates from Surgical Planning. `ResourcePreviewPhoto` is now
  shared by both pages, including clipping, soft lighting and the small note.
- `community-overview.tsx` reuses `ResourceOverview`: the same photo as the LP,
  followed by a 22px lead and smaller supporting paragraphs. The shared GSAP
  wrapper handles the image entrance and cascading title/copy reveal.
- `community-modules.tsx` composes three `ResourceModuleCard` instances, with
  `ResourceSketchFrame` and separate native SVG scenes in `sketches/`.
- `community-faq.tsx` feeds four localized entries into `FaqSection` with
  `variant="resource"`. All answers start closed; entry animation, accordion
  behavior and blue hover indicators remain shared.

## Sketches

`sketches/community-sketches.tsx` supplies localized labels and wraps each scene
in `ResourceSketchMotion`. Scenes use the established 240 × 150 viewBox, shared
grid/line colors and `data-a`, `data-t`, `data-d` drawing vocabulary:

1. `connections-scene.tsx`: abstract profile connected to a direct conversation.
2. `shared-case-scene.tsx`: selected case references entering a discussion.
3. `discussion-scene.tsx`: exchanging observations in a conversation.

No second animation engine is introduced. Scroll activation, fine-pointer replay,
visibility pausing, cleanup and reduced-motion/static fallback remain in the
shared sketch engine. Text is intentionally sparse to keep the sketches abstract.

## Content and integration

`i18n/messages/{pt-BR,en}/resource-community.json` is composed under
`resourcePages.community`. It is separate from the authenticated product's
existing `community.json`. Copy presents the feature as planned, consistent with
the LP, without promising an implemented sharing or permissions system.

`data/resource-routes.ts` supplies the LP link and canonical URL.
`data/resource-media.ts` supplies `/images/landing/0003243231123564.avif` for both
the accordion and the overview. The page is composed of server components;
client-side behavior comes from existing shared GSAP and FAQ boundaries.

Verification is manual at the user's request. No tests, typechecks, builds,
servers or browser automation are run for this delivery.
