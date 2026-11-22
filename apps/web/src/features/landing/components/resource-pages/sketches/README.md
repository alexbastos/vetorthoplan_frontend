# Resource sketches

Patient details, Images/documents, Search/progress and Measurement tools' Distance,
Angle and Circle scenes use the same module body, stage and playback controller.
Surgical planning's Axes, Joint orientation and Osteotomy scenes reuse that engine
and stylesheet, with their own shared canvas and anatomical-reference geometry.
Visual simulation's Fragment, Rotation and Review scenes use the same primitives
and playback lifecycle. Their local README describes the shared fragment geometry,
rigid rotation and thumbnail/save composition; no separate controller is added.

## Structure

`ResourceSketchFrame` remains the stage: module code, artwork slot, scale marker.
The populated artwork slot uses an 8px inset and preserves the SVG's 240 × 150
viewBox; empty slots retain their original padding. No raster screenshot or
canvas is used for these drawings.

- `resource-sketch.module.css`: shared line, paper, guide, accent, text and check
  styles, using the project fonts and blue accent. The supplied SVG snapshots
  did not include their stylesheet, so these are project styles, not claimed
  exact copies of the reference's missing CSS.
- `resource-sketch-timeline.ts`: reads the reference-style `data-a`, `data-t`,
  `data-d`, `data-out` and `data-out-o` metadata into a paused GSAP timeline.
  Supported actions are draw, fade, pop, slide, rotate, wipe, caret, click and follow. Add other actions
  only when a scene actually needs them. SVG geometry lengths drive drawing;
  the measured text length synchronizes input wipes with caret movement.
  Follow actions sample the scoped SVG path at equal arc-length intervals;
  GSAP interpolates the point's x/y keyframes without per-frame React renders.
  Optional `data-path-stops` adds comma-separated arc-length fractions for exact
  polygon vertices. Those stops augment the usual 33 samples, and keyframe
  durations follow each fraction's distance. Paths without stops keep the same
  sampling and timing. This keeps the Fragment cursor aligned with its points.
  Paths use per-instance IDs and remain local to their sketch's playback scope.
  Rotate uses `data-origin="x y"`, `data-from` and `data-to` to animate the SVG
  `transform` attribute through GSAP's AttrPlugin: `rotate(angle x y)`.
  The pivot stays in local coordinates, avoiding CSS/SVG-origin conversion or
  bounding-box drift. The SVG supplies its final transform for static fallback;
  initialization sets that same attribute to the declared start angle.
  A parent fade can reveal the selected object before its rotation begins.
  Traveling points start at opacity zero and use a timeline set at their data-t.
  Drawn shapes and carets use the same boundary so zero-length rounded stroke
  caps do not appear before their start. GSAP's AttrPlugin animates clip widths;
  CustomEase preserves the .23,1,.32,1 lens curve.
  Draw actions may opt into `data-ease="none"` to stay synchronized with a
  linearly traveling cursor, as in the Distance scene. Existing scenes retain
  their original easing when the attribute is absent.
- `resource-sketch-motion.tsx`: `useGSAP`, `gsap.matchMedia`, and ScrollTrigger
  own viewport entry at 45%, playback/cleanup, pause
  while off-screen or the document is hidden, and fine-pointer hover replay
  after completion. A scene never restarts while already running. No per-frame
  React state, app state, clinical APIs or globally queried SVG IDs. Replays
  restart the same prepared timeline; media/context cleanup restores SVG styles,
  transforms and clip attributes. Visibility/pointer listeners are removed.
- `../cases-patients/sketches/patient-details-sketch.tsx`: server localization.
  The compact saved name-and-age summary comes from the shared presentation data in
  `../cases-patients/cases-preview-patient-data.ts`, avoiding a second copy.
- `../cases-patients/sketches/patient-details-scene.tsx`: native SVG scene with
  per-instance clip IDs. Its two-panel layout and save/update sequence adapt the
  supplied CMS reference. The later automation example supplies the same stage
  and action metadata conventions, not a change to this scene's subject.
  The scene stays abstract: one input (Toti · 6 years) and the Save label are the only form
  text. The second input, headings and supporting information are strokes. The
  output preserves the reference's thick title stroke, thin supporting strokes,
  the same saved summary in the accent outline and an empty pill outline. There is no
  profile avatar, extra metadata, saved label or check badge. Transparent panel
  interiors let the stage grid remain visible, as in the reference.
- `../cases-patients/sketches/files-documents-sketch.tsx`: localized labels for
  the second scene, using the same playback wrapper.
- `../cases-patients/sketches/files-documents-scene.tsx`: adapts the supplied
  automation diagram's 240 × 150 geometry. A case on the left connects through
  an add/association hub to three records: radiograph, PDF and note. Cards,
  branches, traveling points and checks retain the original sequence marks.
  Icons and short labels change the subject from automation to case attachments;
  this illustration does not promise automatic clinical processing. The drawing
  stays abstract and transparent, with the grid visible through the outlines.
- `../cases-patients/sketches/case-tracking-sketch.tsx`: localized status and
  patient name from the same illustrative patient data as the other previews.
- `../cases-patients/sketches/case-tracking-scene.tsx`: adapts the booking
  reference's window, cursor curve and floating detail card into a case list.
  A search field reveals Toti, the pointer follows the original Bézier path to
  the selected row, and the side card slides into place with the planning status.
  Other rows, headings and metadata remain abstract strokes. The check means the
  case was found/selected, not that clinical planning is complete. This is a
  decorative sequence, not a working search field or a calendar feature.

## Timing and fallback

The reference's normalized timing marks are retained; one scene unit is 3.6s.
This scale and lens easing are explicit project choices because the original
animation controller was not supplied. Imported runtime matrices, opacity-zero
snapshots and calculated dash arrays are not copied into the canonical drawing.

The static SVG shows its completed state. Reduced motion and no JavaScript keep
that state, with transient placeholders, caret, connectors and traveling points hidden.
The second scene's permanent file connections remain visible. The third scene
keeps its selected row and detail card visible, with its virtual cursor hidden.
The stage is
decorative; its meaning is conveyed by the adjacent module heading and copy.
The drawn Save control is not an interactive form button.

Before hydration, the page's scripting-aware `data-resource-motion="pending"`
guard hides the scene root. `useGSAP` prepares every draw/point/clip state before
marking it ready. This prevents a completed scene from flashing before playback.

The user will test manually. No tests, typechecks, builds, browser or screenshot
automation are run for this delivery.
