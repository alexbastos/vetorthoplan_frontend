# Surgical planning sketches

All three `ResourceSketchFrame` stages now have animated native SVG scenes:

- SP-01: axes and references (`axes`).
- SP-02: joint orientation (`orientation`).
- SP-03: osteotomy planning (`osteotomy`).

## Shared structure

- Each `*-sketch.tsx` server adapter loads its localized labels.
- Each `*-scene.tsx` owns its foreground and per-instance IDs.
- `planning-sketch-canvas.tsx` supplies the transparent 240 × 150 window,
  guides, tool icon and the shared anatomical contour for all three cards.
- `planning-tibia-contours.tsx` retains the five outer anatomical paths from
  `public/images/cases/tibia-tpa-card.svg`, without radiographic fills/textures.
  The same component supplies all three cards; there is no older contour fallback.
- `planning-tibia-geometry.ts` owns their placement and projects the
  four plateau/axis landmarks into the same coordinates.
- `planning-tpa-geometry.ts` derives the intersection, perpendicular, angle arc
  and displayed TPA from those projected landmarks.
- `planning-sketch-result.tsx` supplies the result pill and completion check.
- `planning-sketch-geometry.ts` derives the osteotomy circle, radius handle,
  cortical intersections and D1 reference from the same projected anatomy.
- `../../sketches/resource-sketch-motion.tsx` owns GSAP playback and cleanup.
- `../../sketches/resource-sketch-timeline.ts` interprets scene action metadata.

Reuse the existing primitive styles, blue accent, stage spacing, viewport entry,
offscreen pause, completed-scene replay, reduced motion and hydration guard.
See `../../sketches/README.md` for supported actions and timing conventions.

## Scenes

Axes first draws the source SVG's femur, patella, tibia, fibula and talus as light
gray outlines. It then highlights proximal and distal reference points with
rings and joins their centers with a tibial axis. Rings highlight landmarks;
this illustrates the product's point-based axis construction. Anatomy and points
share one placement. The sketch is widened 65% around its proximal reference
to separate the cortical contours from the blue axis while retaining its height.
The cursor and axis share the same linear path, and a localized axis label appears
at the end. The label connector meets the slanted axis at the same height.

Joint orientation reuses the widened anatomy and the axes scene's proximal/distal
references. Its four illustrative source landmarks are the cranial plateau
(244,132), caudal plateau (318,169), intercondylar midpoint (262,163) and talus
center (222,942). The plateau markers are placed on the proximal articular contour,
rather than the cranial tibial tuberosity. These are drawing coordinates, not a
patient measurement or a clinically validated annotation of the source asset.

Placement follows the product's sequence: cranial/caudal plateau, then proximal
and distal axis points. The lines and their cursors share their respective paths.
The plateau is drawn to its final reference length in that first pass; there is
no later self-extending segment. Its caudal anatomical handle appears as the
cursor passes that point. The displayed proximal axis handle is lifted 7 SVG
units along the same axis to separate it from the plateau handles, while the
original anatomical points still define the axis direction and TPA. The full
axis is also drawn in one pass, without an additional extension afterward.
Only after both lines are complete do the perpendicular and TPA appear.
The perpendicular is normal to the slanted tibial axis at its intersection
with the plateau, rather than a hardcoded horizontal line. The arc and localized
readout use the same projected geometry and dot/cross definition as the product's
`landmarks-preview.ts`; the previous fixed 22° value is removed. No clinical
workspace code is imported into the public page.

The TPA arc uses the darker `--color-electric-iris` accent and a 1.6-unit stroke;
the result pill reads `TPA {value}°`. The perpendicular remains a thin reference
line without a square right-angle marker.

Source for the construction: [VPOP PRO TPLO guide](https://support.vpop-pro.com/portal/en/kb/articles/how-to-plan-a-tplo-in-vpop-pro),
steps 2–3. Orthovet's `landmarks-editor.ts`, `landmarks-preview.ts` and localized
placement instructions define the four-point order and plateau references.

Osteotomy uses the same contour placement as the first two cards. Its center is
the shared proximal tibial reference. The cranial entry is source point (182,224)
on the tibial cortex, and its distance from the center defines the circle radius.
The opposite cortical exit is derived by intersecting that circle with the source
caudal cortical cubic (277,299) → (269,422), using its original control points
and a bounded 24-step bisection. The highlighted arc therefore terminates on the
bone, rather than at an arbitrary polar angle beyond the cortex.

The product's two-handle construction is preserved: center first, then a radius
handle on the circle at 120°. A subtle full circular template starts drawing at
that same handle; the lower cut arc is then emphasized in `--color-electric-iris`.
Both cursors follow the exact respective radius/cut paths. No extra endpoint
handles compete with the two product-style handles. The D1 bracket connects the
source tuberosity reference (185,174) and the cranial entry, and the radius label's
leader exits from the caudal cortex without crossing the shaft.

The R15mm readout is illustrative, not a calibrated measurement of this drawing.
The circle is sized to fit the SVG anatomy; its radius and edge remain consistent
in SVG space. No clinical API, patient data or live calibration is involved.
The scene depicts the cut reference; fragment movement belongs to Simulation.

Construction references: [VPOP PRO TPLO guide](https://support.vpop-pro.com/portal/en/kb/articles/how-to-plan-a-tplo-in-vpop-pro),
steps 4–5, and [Rita Leibinger's saw blade radius section](https://leibinger.vet/tplo/tplo-surgical-technique/).
The clinical product's `tplo-geometry.ts` and `tplo-overlay.tsx` define the
center/edge radius and circular template represented by this decorative scene.

All three keep the static completed SVG as their no-JavaScript/reduced-motion
fallback. Transient cursors remain hidden then. No action was added to the shared
engine, and existing resource-page sketches retain their behavior.

The user performs manual testing. No automated checks were run.
