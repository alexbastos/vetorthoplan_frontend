# Visual simulation sketches

All three scenes are implemented:

- VS-01 (`fragment`): implemented, manually define the proximal fragment.
- VS-02 (`rotation`): implemented, illustrate an entered rotation around the cut center.
- VS-03 (`review`): compare the original/result contours and confirm saving.

Use the existing `ResourceSketchFrame`, `ResourceSketchMotion` and primitive
styles/timeline from `../../sketches/`. Keep 240 × 150 native SVG scenes, scoped
IDs, the existing blue palette, abstract supporting UI and concise labels.
Follow the established GSAP viewport entry, delayed-point hiding, cleanup,
offscreen pause and static reduced-motion/no-JavaScript fallback.

The approved anatomy and decorative geometry from `../../surgical-planning/sketches/`
are available as a reference for the next stage. Keep contours and landmarks in
the same coordinate space. Rotation should move only the selected fragment;
preserve the original outline and distal anatomy as the stable reference.
Do not import the authenticated case editor or treat these drawings as clinical
results. New foreground scenes should plug into the existing card composition.

## Fragment scene

- `fragment-sketch.tsx` loads the localized Fragment label on the server and
  composes the established `ResourceSketchMotion` playback wrapper.
- `fragment-scene.tsx` owns scoped clip/route IDs and the foreground sequence.
- `simulation-sketch-canvas.tsx` keeps the same transparent 240 × 150 window,
  guides, abstract toolbar and gray anatomy as the approved resource sketches.
  The 1.9× close-up centers the proximal tibia at (102,72) and clips the descending
  shaft inside the window. Gray stroke width compensates for the extra zoom.
- `simulation-sketch-geometry.ts` projects the shared tibial outline/cut geometry
  into that same close-up. Nine explicit vertices trace the proximal tibia, the
  caudal cut exit, the radius handle and the closing segment to the cranial entry.
  The manual cut boundary uses straight chords, as the product's polygon editor
  does; there is no automatic segmentation, curve fitting or clinical result.

All vertices, outline segments, selection fill and cursor route derive from that
single polygon. Segment start/duration and point-arrival times follow cumulative
edge lengths. The cursor's `data-path-stops` explicitly includes each vertex in
the shared controller's samples so it reaches the point at the same time as the
drawn segment. Small transient rings mark placement and final closure.

The cursor starts at .46 and traces for .92 normalized scene units (one unit is
3.6 seconds). Fill starts .04 units after closure at 12% opacity, followed by a
small Fragment label/check. That check indicates a completed selection, not a
saved simulation; saving belongs to VS-03. The no-JavaScript/reduced-motion view
shows the completed polygon, soft fill and label, with cursor/click rings hidden.

Planning's anatomy renderer gained an optional stroke width with its existing
.8 default retained; its other cards keep their rendering. No authenticated
workspace code, backend call, React animation loop or new motion controller is
imported here. The sheet/table preview has its own case-cycle controller outside these scenes.

## Rotation scene

- `rotation-sketch.tsx` loads the localized rotation readout (15°) on the server.
- `rotation-sketch-geometry.ts` derives the resulting points, radius spoke,
  handle arc, final transform and callout anchor from the existing Fragment
  polygon and cut center. The value is illustrative, not a recommended rotation.
- `rotation-scene.tsx` keeps the original gray anatomy and dashed original
  polygon stationary. The selected polygon, soft blue fill, tibial outline
  clipped to that polygon, and circular handle rotate as one group. The femur,
  patella, fibula and distal tibia do not belong to that moving layer.

The local pivot is the same (102,72) cut center used by the shared close-up geometry.
Rotation applies a view-only translation of (4,6) to the background anatomy,
original outline, rotating fragment, handle, cursor route and pivot reference.
This places the diagram lower/right within the window while preserving all
relative geometry. The result pill stays fixed and its leader includes the offset.
The original isolated solid blue dot is replaced by a small gray pivot crosshair.
The handle follows the product's center-to-edge direction, offset 5 × the shared
zoom beyond the drawing's cut radius (9.5 SVG units at 1.9×). The reduced close-up
is about 21% smaller than the initial 2.4× layout; anatomy, cut, selection and
handle distance scale together, while toolbar/readout dimensions stay fixed.
A 15° circular path and the fragment transform
use the same .64 start, .5 duration and linear easing. GSAP's shared rotate action
interpolates `rotate(angle 102 72)` directly through AttrPlugin, avoiding automatic
CSS/SVG-origin offsets from the initial final-pose transform. The cursor follows
the matching handle arc in the same translated local space. The readout
appears only after the movement completes and its leader uses the transformed
vertex position. A 64-unit pill fits both Portuguese and English, retaining the
existing result height/right edge/check and 52-unit default for other sketches.

No React frame updates or separate animation controller are used. The default
SVG transform is the final 15° pose, preserving static/no-JavaScript/reduced-motion
fallback. The original outline remains visible as a reference. Center/radius,
drawn arc, result polygon and cursor share one coordinate system. Rotation is
not a change to the TPA value, and no correction target or clinical approval is
implied by the completion check.

The anatomy primitive now optionally filters bone paths, with all bones retained
by default. The first Fragment card and other resource-page sketches keep their
default anatomy and result dimensions. The sheet/table preview remains independent.

## Review scene

- `review-sketch.tsx` supplies the localized Origin, Result, Save and Saved labels.
- `review-sketch-geometry.ts` owns the thumbnail framing, save control, pointer
  curve and the shared timestamps for pointer arrival, click and confirmation.
- `review-scene.tsx` reuses the window canvas with its automatic anatomy layer
  disabled. Its own clipped thumbnail contains the shared anatomical drawing,
  dashed original polygon and the same final 15-degree result as Rotation.
  A uniform .8 thumbnail transform maps all these layers together; the fragment
  is not resized independently. Only the selected tibial anatomy is copied into
  the transformed fragment. Supporting document strokes remain abstract.

The blue result outline appears after the original reference; the two concise
legend rows match those styles. A pointer follows a scoped Bezier path into the
Save control, arriving before its click compression. The control then changes
to Saved with a small blue check. This represents persistence of the simulation,
not clinical approval. All controls are decorative SVG, not interactive buttons.

The default drawing shows the finished result and Saved state; transient Save
and pointer layers are hidden without motion/JavaScript. IDs are per instance.
The scene uses the existing GSAP actions and playback lifecycle without changing
the shared timeline or adding a React animation loop. All three module identifiers
now require a sketch component in the registry.

The user performs manual testing. No tests, typechecks, builds or browser/visual
automation were run.
