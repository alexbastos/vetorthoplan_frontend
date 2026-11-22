# Measurement sketches

MT-01 (distance), MT-02 (angle) and MT-03 (circle) are implemented. All three
reuse the same module body, stage, primitive stylesheet and GSAP controller.
`measurement-image-contours.tsx` supplies the exact same gray image contours to
all three scenes: shared paths, 28% opacity and .2/.24 drawing timestamps.

## Distance

- `distance-sketch.tsx`: server localization of the illustrative 42.6mm value.
  ICU number formatting follows the active locale; it is not a patient measurement.
- `distance-scene.tsx`: a transparent 240 × 150 viewing window, abstract image
  contours, a small ruler, two blue handles and one measured segment. The value
  and small completion check are the only result details; there is no working UI.
- The segment and both handles share their endpoint coordinates. Its scoped
  per-instance ID is also the cursor's path, so movement and drawing share the
  same geometry and normalized .36/.22 start/duration. `data-ease="none"` makes
  the line linear like the cursor; other scene primitives retain the lens curve.
- The first point appears at .34, the second at .58, the value at .64 and the
  completion check at .76/.8. One scene unit remains 3.6s. Delayed points and
  rounded stroke caps stay hidden until their action starts.
- The existing GSAP controller supplies entry at 45%, offscreen/hidden-tab pause,
  completed-scene hover replay, cleanup, reduced motion and the hydration guard.
  The static fallback shows the completed measurement with its cursor hidden.

## Angle

- `angle-sketch.tsx`: server localization of the illustrative degree value.
- `angle-sketch-geometry.ts`: the 45° value determines the upper endpoint and
  22-unit arc, centered on the shared vertex. Two 84-unit rays form one continuous
  cursor/drawing path. All handles use those same coordinates.
- `angle-scene.tsx`: the same transparent 240 × 150 window and abstract contour
  treatment as Distance. The first point appears at .32, the first ray is drawn
  from .34 to .5, and the second from .5 to .66. A single cursor follows that
  combined path with linear easing, avoiding a pointer swap at the vertex.
- After the third point, the angle arc draws from .68 to .77. The 45° result
  follows at .78, then the completion check at .86/.9. No other labels or UI
  controls are introduced. This is a decorative diagram, not a clinical result.
- Playback, pause, replay, hydration protection and the completed static fallback
  reuse `ResourceSketchMotion` without adding actions to the shared engine.

## Circle

- `circle-sketch.tsx`: server localization of the illustrative radius, R 14.2mm.
  The R symbol matches the platform's radius mode; ICU formats the locale's decimal.
- `circle-sketch-geometry.ts`: one center and illustrative scale derive both the
  radius and its edge handle. The 14.2mm example maps to 28.4 SVG units. The SVG
  circle, radius segment and pointer share these coordinates.
- `circle-scene.tsx`: the same 240 × 150 window, minimal header and light contours.
  The center appears at .32; the pointer and radius draw together from .34 to .5.
  The edge appears at .5. A native circle outline then draws from .52 to .74,
  starting at that same edge; the pointer fades away rather than orbiting it.
- The value appears at .78, followed by the completion check at .86/.9. There
  are no added labels or controls. The sketch does not call product or clinical APIs.
- The shared controller already supports native circle geometry: no new engine
  action was needed. Completed-scene hover replay, pause, reduced motion and the
  static fallback stay identical to the other two scenes.

Follow the same split for subsequent drawings:

- A server adapter loads its localized copy.
- A native SVG scene owns the drawing and per-instance IDs.
- `../../sketches/resource-sketch-motion.tsx` owns GSAP playback and cleanup.
- `../../sketches/resource-sketch-timeline.ts` interprets the action metadata.

See `../../sketches/README.md` for the supported actions and timing conventions.
