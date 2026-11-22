# Measurement tools resource page

Route: `/resources/measurement-tools`. The LP's Measurements capability links here.
Copy is a starting draft. The preview layers a radiograph window behind a compact
measurement panel, on the shared blue backdrop and white veil.
Distance, Angle and Circle have GSAP sketches using the shared playback controller.

## Ownership

- The App Router page owns metadata and the canonical URL. It inherits the public
  resource layout, minimal navigation and temporary noindex policy.
- `measurement-tools-page.tsx` composes presentation, editorial overview,
  resource modules and FAQ as independent server sections.
- `measurement-tools-faq.tsx` adapts five localized questions about calibration,
  distances, angles, circles and reviewing references. It uses the shared FAQ's
  `resource` variant below the sketches: no divider lines, closed answers, blue
  hover dots and the shared GSAP entrance. Stable FAQ keys live in the content
  module, and PT/EN copy lives under `resourcePages.measurementTools.faq`.
- `measurement-tools-presentation.tsx` supplies the shared presentation and facts
  components with localized content. `measurement-tools-preview.tsx` renders a
  447px white card with 20px corners, 25px padding, the original subtle shadow
  and an absolute 629 × 427 SVG. `../resource-preview-backdrop.tsx` shares the
  exact blue gradient, 21.4 blur, light wave and full-width white veil with Cases.
  `measurement-preview-viewer.tsx` draws a window at (34,34), 332 × 308, with the
  supplied `img_lp_mck_1.avif` at its native aspect ratio inside a black viewport.
  A single illustrative distance stays left of the overlapping panel; a leader
  connects its midpoint to the local result label.
  `measurement-preview-tools-panel.tsx` draws the foreground at (289,89), 300 × 237:
  three tool choices, Distance selected, 42.6mm, two reference points, calibrated
  scale and a pill-shaped confirmation. It is decorative SVG rather than working UI.
  The shared sky veil paints behind the windows, retaining its original values
  without washing out their contents. Separate foreground veils follow Cases'
  painter-order technique: viewer → viewer veil → panel → panel veil.
  The viewer fade only affects the viewport's last 24 units (y=292–316), fully
  hiding its footer afterwards. The panel fade starts at y=312, below the button
  label, and ends at y=340, dissolving only its lower edge and shadow. Stops at
  35%/10% opacity and 70%/58% opacity keep the onset light. Both veils stay white
  through y=427, leaving a clean caption area. Panel contents and the black
  confirmation button retain their contrast above that final strip.
  A separate lower copy layer uses
  the same scoped Inter/Jakarta typography as Cases via `resource-preview-fonts.ts`.
  `measurement-preview-geometry.ts` owns the composition, image placement and
  illustrative values. It has no dependencies on authenticated viewer or Hero logic.
  The preview's accessible summary, both visible values and field labels share
  localized data. The whole composition inherits the presentation's GSAP entrance;
  no additional choreography or input behavior is introduced at this layout stage.
- `measurement-tools-overview.tsx` supplies the shared editorial layout with the
  same AVIF as the LP capability. The source lives in `data/resource-media.ts`.
- `measurement-tools-modules.tsx` supplies three shared module cards and a typed
  sketch registry. Distances, angles and circles use stable IDs and MT-01/02/03
  stage codes from `measurement-tools-content.ts`. Every module has its own scene;
  the complete registry requires a sketch for each module ID.
- `sketches/` owns localized scene adapters and native SVGs, starting with
  Distance, Angle and Circle adapters/scenes. Angle and Circle also own geometry
  modules deriving their points and shapes from the illustrative measurement.
  All three consume the shared GSAP
  sketch controller and stage primitives. See `sketches/README.md` for the sequence.
- Copy and metadata live in separate `i18n/messages/{pt-BR,en}/measurement-tools.json`
  files, composed into `resourcePages.measurementTools` by the locale indexes.

## Shared behavior

Headings retain the page-wide 40px typography and the same GSAP character entrance.
Image/copy entrance, module reveal, reduced motion and the pre-hydration visibility
guard are supplied by the shared resource components. No new animation engine,
clinical API calls or authenticated product dependencies belong to this scaffold.

The next stage can refine or animate the preview's foreground without changing
the route, navigation, shared layout or the Cases and patients page.

The user will perform manual testing; no automated checks were run.
