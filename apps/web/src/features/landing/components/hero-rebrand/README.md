# Hero rebrand

The landing page now imports `HeroSection` from this directory. The previous
`../hero/hero-section.tsx`, its stylesheet, mockup, and assets remain untouched
and inactive. To restore that version, change the import in `../landing-page.tsx`
back to `./hero/hero-section`. Its original translation keys are also preserved.

A pre-change snapshot of the original Hero directory, landing page, and both
translation dictionaries is saved at `tmp/hero-before-rebrand-2026-11-19.zip`
at the repository root.

## Reference dimensions

- Shell: 1440px including 64px padding on each side; centered.
- No announcement bar. Header: 64px (104px below 640px). Shell top inset:
  header + 48px.
- Brand: 24px high, intrinsic aspect ratio (approximately 120px wide for our
  logo). The reference HTML explicitly gives its own logo as 99 × 24px;
  its button/link styles are inferred from the reference image because the
  attachment contains HTML without the corresponding CSS.
- Header links: 14/20px, weight 400. Actions are language → login → register;
  there is no demo action. Login/register: 32px high, 16px effective horizontal
  padding, 8px gaps, ghost/solid variants. The language trigger is 40px high,
  with a circular flag, PT-BR/EN code, and chevron. It reuses the existing
  locale cookie action and router refresh. The legal header keeps its original
  icon-only variant. Below 640px the language code and chevron are hidden, and
  actions use a second row so login and register remain available at 320px.
- Desktop row: two equal columns, minimum height 594px.
- Heading: 40/38px, weight 400, tracking -0.02em.
- Description: maximum width 397.573px, 16/21px, project gray `--color-pewter`.
- Primary action: 48px high, pill radius, 1.04 hover scale on its background.
- Visual: animated blue SVG ribbons, extends to the right viewport edge and
  behind the header, with a 140px white-to-transparent top veil.
- Product composition: a responsive 861 × 568px stage with an inset 918 × 591px
  dashboard at scale 0.865188. Sidebar and static workspace are populated.
- At 991px and below: one column, 48px row gap, 32px shell padding,
  heading 28/28px with -0.01em tracking, description 14/18px.

The project uses Geist Sans; the reference's GT Standard font was not supplied.
The icons use the existing Lucide system, with subtle fill and depth, and can
be replaced with custom illustrations later. The cycler holds each word for
2000ms, exits in 120ms, and enters in 220ms. It pauses when offscreen or the
document is hidden and shows a static title for reduced motion preferences.
The single accessible H1 remains stable throughout the decorative animation.

## Product frame — structural stage

`hero-product-frame.tsx` is a server-rendered, decorative frame with a small
client motion boundary. Its optional
`sidebar` and `workspace` React node props are the two extension points for the
next stages. `HeroProductSidebar` fills the sidebar slot and
`HeroProductWorkspace` fills the workspace slot. The legacy Hero remains untouched.

The layers have distinct responsibilities:

1. `viewport`: responsive dimensions and placement in the right-hand visual.
2. `stage`: fixed 861 × 568px coordinates, scaled using
   `tan(atan2(100cqw, 861px))` with origin at the top-left.
3. `root`: composition boundary and isolated stacking context.
4. `dashboard`: 918 × 591px, positioned at (39.0003px, 16.9796px), with its own
   0.865188 scale. At full stage size it displays at 794.24 × 511.33px.
5. `frame`: 6.443px corner radius and the reference's three shadow layers.
6. `sidebar` / `workspace`: 181px fixed sidebar with a 0.537px divider;
   the workspace fills the remaining 737px. These are nominal dimensions
   before either scale is applied.

The frame permits the sidebar's future floating elements to extend outside its
edge; the outer composition defines clipping. The workspace clips its own
future image content. The mockup inherits `aria-hidden` and ignores pointer
and keyboard events while it remains a decorative product preview.

On desktop the viewport is `min(861px, 59.7917vw)`, anchored 2px above the bottom
of the visual. At 991px and below it is 139.1628% wide, with left/top offsets of
2.5861% / 2.6667%. Overflow is contained in the visual panel. `visualSizing`
retains the background's existing flow height independently of this absolute
mockup, so adding the frame does not resize the approved artwork.

## Sidebar — second stage

`hero-product-sidebar.tsx` reconstructs the previous Hero's sidebar inside the
181px slot. It preserves the top profile, case, planning stages, files, and
report order, and reuses the original SVG icons, doctor photograph, radiograph
thumbnails, PDF asset, and PT-BR/EN translation keys. It imports only the legacy
icon/asset metadata modules, not the old mockup or its workspace implementation.

Nominal measurements (before the frame's two scales):

- The frame owns sidebar width, background, divider, and 13.217px vertical inset.
- Profile: 39.651px high, 29.077px avatar, 10.904px avatar corner radius,
  10.8px name and 9.5px clinic label.
- Groups: 13.217px gap, 6.608px horizontal inset, 22.04px heading row.
- Navigation rows: 26.169px high, 13.739px corner radius, 0.537px border,
  11.45px type, 13.217px icons, and 6.608px column gaps.
- File rows: the same row height, 22 × 17.45px thumbnails and 10.8px labels.

Images and calibration are marked completed; measurements starts unselected
and is activated by the virtual cursor; simulation and report remain pending.
Translations remain on the server, and there are no application requests. Both
sidebar and workspace continue to scale as a single composition.

## Workspace — product composition

`HeroProductWorkspace` is the server-rendered composition inside the 737 × 591px workspace.
The 48px browser-style header contains back/forward, reload, and search controls
on the left, the case name centered independently of those controls, and case
information (clipboard), minimize, appearance (sun), and close on the right.
Equal outer grid tracks keep the title on the workspace's true centerline.
The header and workspace share one white background with no divider.

A 12px inset surrounds the black viewer. `HeroProductViewer` uses
`/images/landing/img_lp_mck_1.avif` (1046 × 1504px), keeping the complete image
centered with `object-fit: contain`. The legacy radiographs and sidebar file
thumbnails remain unchanged. The upper pan/zoom viewing toolbar has been removed
so the measurement tools are the viewer's single focal control group. The
browser-style header above the viewer remains unchanged.

`HeroProductTools` is a compact bottom-centered dock with distance, angle, circle,
TPA, and TPLO simulation icons, with a subtle divider before the planning tools.
TPA and simulation reuse the platform's Crosshair and Scissors icons.
Its Figma-inspired white container uses the reference's
nominal scale: 26.169px controls, 13.217px black icons, 3.304px padding and gaps,
an 8px outer radius, and a 0.537px border with one subtle shadow. The complete
dock is approximately 158.888 × 33.851px before scaling, or 137.47 × 29.29px at
the full-size dashboard's 0.865188 scale. Tool names remain available as
screen-reader text and titles. The
`data-active="true"` style provides the project-blue selection tile and white
icon; all tools start neutral and hidden until the sidebar click.
Symmetric image insets keep the radiograph centered horizontally and vertically.
The 68px vertical clearance leaves room for the dock without covering the image.

The case list, workspace, sidebar, tools, annotations, report, and cursor artwork render
on the server. The header and viewer controls are visual representations within
the inert frame. The TPA construction uses four presentation landmarks and the
project's annotation palette. The two main segments end at their clicked points;
their previews follow the cursor. A derived perpendicular guide and compact
numeric angle appear only when the finite segments meet. There is no large TPA
caption or extra start-marking action.

## Product choreography

`HeroProductMotion` provides React state and Motion for React (`motion/react`).
Server-rendered copy, images, and icons pass through client scene wrappers.
React owns phases, selection, saved status, and completion; Motion Values own
continuous cursor, surface, and SVG updates without per-frame React renders.
The decorative frame remains inert and aria-hidden. There are no user-facing
pause or replay controls. The demo runs once and returns to the case list.

Maintenance entry points:

- `hero-product-demo-state.ts`: pure reducer and presentation derived from phases.
- `hero-product-choreography.ts`: relative, awaitable script, with durations in
  seconds. Editing an early step no longer requires shifting later timestamps.
- `hero-product-animation-session.ts`: scoped Motion animations, cancellation,
  and automatic visibility suspension. It does not implement a custom frame loop.
- `hero-product-motion-values.ts`: surface channels and resize-aware cursor path.
- `use-hero-product-geometry.ts`: layout reads and image readiness only; no writes.
- `hero-product-demo-elements.tsx`: React-owned scene/nav/control presentation.
- `hero-product-live-annotations.tsx`: SVG attributes bound to derived Motion Values.

Scenes stay mounted with controlled visibility so hidden targets retain measurable
layout. Motion drives their transforms/opacity; this does not require mounting and
unmounting scenes with AnimatePresence. At rest, scene transforms resolve to none.

The supplied animation study is the behavioral reference: 45% intersection
starts the scene, quadratic Bézier motion uses 29 samples with cubic easing,
and menu entry uses cubic-bezier(.22, 1, .36, 1) over 380ms. The initial 700ms
hold follows the approved script. The first move uses the reference's 935ms
travel, 187ms hover, and 408ms interval between click and next movement.

| Time | Scene |
| --- | --- |
| 0–700ms | Initial case list; the current sidebar remains unchanged. |
| 700–1822ms | Cursor approaches and clicks Luna's OV-0248 case. |
| 1822–2142ms | The list exits in 320ms. |
| 2142–2522ms | The case viewer enters in 380ms. |
| 2842–3964ms | Cursor activates measurements in the existing sidebar. |
| 3964–4372ms | Tools reveal with fade and 8px upward motion. |
| 4372–5579ms | Cursor moves to and selects TPA. |

After selecting TPA, the cursor moves directly to the four landmark clicks;
intersections generate the reference/angle during the live preview. The complete
23.105s sequence and presentation anchors are documented in
`hero-product-choreography-plan.md`. The report uses a borderless layout with
the annotated image, numeric measurement, clinical note, and professional.
After marking, a compact X/check dock appears. The cursor confirms, waits for
the scoped success notification, and only then moves to the report.
After a 2.5s reading hold the cursor clicks “Concluir caso”; the report exits
and the case list returns with Luna marked Ready. The radiograph stays stationary.
The script waits for its image to load. Motion animations suspend automatically
outside the viewport or when the document is hidden, including reading holds.
Unmounting or changing reduced motion cancels the active sequence and its animations.
Reduced motion shows the final report
statically with no cursor or animation loop. This static preview remains the
report even though the full-motion sequence ends on the case list.

`HeroProductCases` mirrors the platform's case-page heading, new-case action,
status filters/counts, collapsed search action, thumbnail rows, patient/profile,
status, and date, without a trailing divider or result-count footer. The new-case
action uses a pill shape. Its four sample cases are local presentation
data. After completion, IN_PLANNING changes from 2 to 1 and READY from 1 to 2;
the terminal list retains these values. This stage does not redesign the sidebar.
List, viewer, and report target measurements remove each scene's own transforms
before conversion to dashboard coordinates, including the image contain fit.
All three scenes use native DOM text and the workspace font. Their transition
transforms become `none` at rest, retaining only the reference's two frame scales.
The case list retains its original compact typography.

ResizeObserver and client rects map targets into the dashboard's 918 × 591
coordinates, including both CSS scales, the dock reveal offset, and the image's
contain-fit letterboxing. SVG overlays use the original 1046 × 1504 matrix;
the report and viewer share the same final geometry. `hero-product-tpa.ts`
uses the platform's `distanceIntersections` on finite segments. Its angle is
checked against the pure `landmarksValuesPreview` helper. The arc and degree
label mirror DistanceOverlay sizing, project colors, native label placement,
and `formatAngleDegrees` formatting in PT-BR/EN. The report uses the same data.
Live case hooks and APIs are not imported.
TPA construction receives placed-point count and pointer coordinates, independent
of the choreography clock. There is no parallel legacy RAF/DOM-mutation engine.
The previous controller-specific tests were retired; the existing pure Bézier/TPA
geometry tests were adapted to the new input model. No tests, typechecks, builds,
or browser checks were run for this migration, per the user's manual-validation preference.

## Vector background

`hero-background.tsx` keeps the SVG artwork on the server. Only the lightweight
`HeroBackgroundMotion` wrapper is interactive: it starts the scene on an animation
frame once visible, adds `hero-js` / `hero-in` to `<html>`, and pauses the
animations outside the viewport and when the document is hidden. It cancels
pending frames and removes the classes it added when unmounted.

`hero-background-data.ts` contains the exact seven distinct paths, view boxes,
gradient coordinates, positions, sizes, and motion parameters from the complete
HTML reference. Each ribbon renders in one continuous SVG viewport. Its Gaussian
blur uses the reference's relative bounds (-20%, -20%, 140%, 140%), allowing the
blur to extend around the geometry without internal tile seams.

The scene has a white base. Fill: `#95C5FF` at 0 → `#2C8BFF` at 0.62 → transparent
white at 0.75. Light stroke: 9.905 units with its own gradient per ribbon.
Ribbon blur: 21.4 units. Stroke paths explicitly use `fill="none"` so the default
SVG black fill cannot cover their gradient-filled counterparts. There is no
additional blurred rectangular frame.

The positioned parent handles the 2.4s entrance with
`cubic-bezier(0.16, 1, 0.3, 1)` and backwards fill; its direct child handles drift
simultaneously. Per-ribbon entrance offsets: (-3%, -6%), (3.5%, -7%),
(-4.5%, -8%), (5.5%, -9%), (-7%, -10%), (8%, -11%), (-9.5%, -12%).
Drift delays: 0s, -4s, -6s, -2.5s, -7s, -4.5s, -1.5s. There is no shared
entrance delay on drift, so each ribbon starts at a distinct cycle phase.

The complete reference has no polygonal cutout. Only the outer right-column
boundary clips the scene; it stays continuous throughout entrance and drift.
The bottom-right glow uses the reference's 55% width, 70% height, 0.85 opacity,
and radial gradient centered at 100% 100%. It retains the previously requested
0.5s fade after a 0.3s delay. The 140px top veil is above both ribbons and glow.

At 899px and below, SVG art and its animations are disabled in favor of the
supplied CSS gradient without clipping or animation. Reduced motion preferences
show the final static artwork and corner light immediately.
