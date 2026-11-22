# Hero product choreography — TPA

Status: implemented. The central area starts with the case list, opens Luna's
OV-0248 case, then runs the existing planning/save/report sequence. The full
approximately 23.1s sequence returns to the case list with an updated status.
Motion for React owns the animations; React owns the phases. There are no
user-facing pause/replay controls and no automatic repeat.
The sidebar's design/content remains unchanged in this stage.

## Case list

The server-rendered list follows the real CasesPage/CasesList/CaseCard structure:
heading/description, New Case, five status filters with counts, the collapsed
search action, and four thumbnail rows with case/patient/profile/status/date.
There is no trailing divider or total-count footer; New Case uses a pill shape.
Sample data is local; no case-list queries or router requests
are introduced. The list uses the same 737px workspace and dashboard scale.
Its original compact type sizes remain. Like the report, it uses native DOM
text and the workspace font; scene transforms are removed at rest and applied
only during transitions, preserving the reference's two frame scales.

The cursor clicks Luna's case title and the central list exits in 320ms; the
viewer enters in 380ms. A 2142ms prefix is added to every existing case-phase
timestamp in the original study, preserving its intervals. The implementation
now expresses these intervals as relative awaited Motion steps instead of
absolute timestamps. On return, Luna changes IN_PLANNING → READY
and filter counts update from 2/1 to 1/2.
The central header switches between Cases and the case name.

## Native annotation behavior

The plateau and mechanical axis are finite segments, bounded exactly by each
pair of clicked points. After the first point of a pair is placed, a dashed
preview connects it to the actual virtual cursor position. The second click
commits the same endpoints as a solid line. Point dots remain visible in the
finished drawing, following the platform's anatomy annotation style.

`distanceIntersections` tests the actual current segments, including the moving
preview. When they touch or cross, the illustration derives the perpendicular
TPA reference through that crossing. A second finite-segment intersection
between plateau and reference supplies the actual TPA arc and degree value.
There is no timer that reveals an angle before the lines meet.

The helper `hero-product-angle-marker.ts` follows DistanceOverlay's 22px radius,
16px right-angle corner, available-segment clipping, 11px degree label, and label
position search. It reuses `placeOverlayLabel` and `formatAngleDegrees` from the
platform. The axis/plateau use `--radiograph-mark-anatomy`, the automatic guide
uses `--radiograph-mark-interest`, and the arc/value use
`--radiograph-mark-comparison`. The large “TPA” caption is removed.

The reference image informs the construction, while project styles govern its
appearance. The live case hooks and persistence APIs are not invoked.

## Geometry and responsive coordinates

The current image is `img_lp_mck_1.avif`, 1046 × 1504px. Presentation anchors:

1. Plateau cranial: (0.4084, 0.20864).
2. Plateau caudal: (0.61, 0.268).
3. Proximal axis point: (0.51, 0.205).
4. Distal axis point: (0.47, 0.875).

The plateau segment is 12% longer than the original presentation, extending
its first endpoint. The proximal axis point is raised so its dot clears the
automatic guide by more than 10 nominal screen pixels. No main line is extended
beyond its input points. Angle calculations use
original image pixels and agree with `landmarksValuesPreview`. The displayed
value is derived from the presentation geometry; it is not an official case result.

The image stays fixed. SVG overlays share its contain-fit placement. Cursor
coordinates account for letterboxing, nested dashboard scales, and dock entry.
Arc, labels, and point sizes use the same image-pixel/screen-pixel relationship
as the platform. The viewer and report share final data and locale formatting.

## Timeline

| Time | Scene |
| --- | --- |
| 0–1822ms | Show the case list; cursor approaches and clicks Luna's case. |
| 1822–2522ms | List exits, then the case viewer enters. |
| 2842–5579ms | Activate measurements, reveal the dock, select TPA. |
| 5992–6979ms | Place the first plateau point. |
| 7342–8179ms | Preview and commit the second plateau point. |
| 8542–9379ms | Place the proximal axis point. |
| 9742–10779ms | Preview and commit the distal point; generate the intersection angle. |
| 10959–11279ms | X/check dock enters above the lower toolbar. |
| 11279–12401ms | Curve to the check, hover, and confirm. |
| 12401–12761ms | Dock closes; brief save interval. |
| 12761–15561ms | Success notification for 2800ms. |
| 15761–16883ms | Approach and open the report. |
| 16883–17583ms | Viewer exits; report enters. |
| 17583–20083ms | Hold the report for reading. |
| 20083–21205ms | Approach and click “Concluir caso”. |
| 21205–21525ms | Report exits. |
| 21525–21905ms | Return to the case list with Luna Ready and updated counts. |
| 21905–23105ms | Hold the returned list, then finish without playback controls. |

The 29-sample Bézier cursor, cubic deceleration, 187ms hover, click compression,
45% visibility trigger, automatic visibility suspension, image-ready gate, and
reduced motion behavior remain. Timings are nominal: Motion completion advances
the awaited sequence. There is no preliminary start-marking button; selecting
TPA still leads directly to the first landmark.

## Confirmation and save feedback

`HeroProductSaveActions` follows the platform's X-left/check-right action order.
It uses the lower dock's white surface, 0.537px border, 3.304px gaps/padding,
26.169px controls, and 13.217px icons. Its entry translation is removed from
the measured check target so cursor alignment stays correct after resize.

`HeroProductSavedToast` stays inside the inert mockup at its top right. It uses
the shared `NotificationStatusIcon`, toast surface/border/title/description/
shadow tokens, and localized title/description. It does not publish events to
the application's global notification store or invoke persistence APIs.

React phases control visibility and confirmation state; Motion animates entry,
exit, and press feedback. The save interval and toast duration suspend with the
rest of the sequence. Reduced motion keeps the static report without these steps.

## Report and completion

The report container has no card border, background, shadow, or nested page
frame. The heading/status, annotated image/caption, numeric measurement,
short clinical note, professional identity, and footer action sit directly on
the workspace background. Content is localized in PT-BR/EN.
The note describes the illustrated planning activity without adding a diagnosis.

“Concluir caso” is a virtual product action inside the inert demonstration;
it does not close a real case or invoke APIs. Its rest position is measured
by undoing the report's entry/exit transform, so cursor targeting remains
correct before entry, after resizing, and while the scene is transitioning.
At the return boundary, all points/lines/angle and tool selection reset while
the viewer stays hidden. The central list enters with the case's updated status.
Resting-target measurements undo the transforms of list, viewer, and report,
so case clicks and image-point alignment survive resizing during transitions.
Reduced motion holds the annotated report instead
of playing the completion/return sequence.

## Validation preference

The user will validate the case-list and choreography changes manually and report
any issues. No automated tests, typechecks, or render checks were run for this
addition, following that preference. Earlier automated coverage is retained.

## Motion architecture

The pure reducer in `hero-product-demo-state.ts` defines the phase/presentation
contract. `hero-product-choreography.ts` advances phases through awaited Motion
animations. `hero-product-animation-session.ts` cancels pending steps on unmount
and suspends active animations while hidden. There is no custom RAF loop, global
timeline offset, queue of setTimeout calls, or frame-by-frame setAttribute pass.

The cursor's progress and path are Motion Values. Its position derives from
the existing 29-sample eased quadratic Bézier and the current measured geometry,
so resizing updates targets without restarting a step. Live SVG endpoints,
guide, arc, and numeric label derive from those same coordinates. React updates
placed-point count only on virtual clicks. `heroTpaConstruction` stays pure and
does not depend on time or Motion. The report keeps its server-rendered final SVG.

Scenes remain mounted to support measurements of hidden targets. Their wrappers
bind Motion Values declaratively; React owns all data/visibility attributes.
Static copy, translation fetching, images, icons, dimensions, and background
remain in the existing server components and styles.
