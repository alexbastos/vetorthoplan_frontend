# Surgical planning resource page

Route: `/resources/surgical-planning`, linked from the LP's Surgical planning
capability (`methods`). The page now focuses on axes/references, joint orientation
and osteotomy planning, with three animated sketches and localized editorial copy.

## Boundaries

- The App Router page owns localized metadata and its canonical URL. The existing
  resources layout supplies the minimal header, skip link, main landmark and
  temporary noindex policy, just as on the other two resource pages.
- `surgical-planning-page.tsx` composes independent presentation, editorial
  overview, resource modules and FAQ. Each section loads its own localized copy on
  the server and supplies the established shared resource components.
- `surgical-planning-faq.tsx` supplies five localized questions about references,
  TPA, cut geometry, simulation and review. It reuses the universal FAQ's
  resource variant below the sketches, with shared GSAP entrance, no dividers,
  initially closed answers and blue hover dots.
- `surgical-planning-content.ts` owns the fact/FAQ keys and stable SP-01/02/03
  module identifiers. Visible copy stays out of this file.
- `surgical-planning-presentation.tsx` composes the shared heading/facts layout
  with `surgical-planning-preview.tsx`. The preview supplies the shared blue SVG
  backdrop and white veil, followed by the supplied photo/panel composition.
  Its own stylesheet retains the 447px card height, 20px corners, 25px padding,
  subtle shadow and 629 × 427 SVG space used by the established previews.
  No previous page's inner mockup, patient data or clinical viewer is imported.
  Its localized label and description use the same preview fonts, 16px type,
  20/22px line heights and bottom positioning as the completed resource cards.
  `surgical-preview-geometry.ts` owns the supplied reference's exact coordinates;
  `surgical-preview-defs.tsx` owns its clips, gradients and filter bounds.
  `surgical-preview-panel.tsx` owns the tall back panel and planning summary;
  `surgical-preview-photo.tsx` owns the foreground image frame and abstract note.
  The supplied team photo is `/images/landing/5443656432312390.avif`, set in
  `geometry.photo.src`; the existing clip and centered cover crop preserve its
  fixed dimensions.
  The foreground has no controls, client state or internal animation.
- `surgical-planning-overview.tsx` reuses the shared editorial layout and the LP's
  supplied AVIF through `data/resource-media.ts` (`surgicalPlanningImage`).
- `surgical-planning-modules.tsx` connects a complete typed sketch registry to
  axes, orientation and osteotomy cards. Stage geometry, card typography and
  description treatment are inherited, not duplicated.
- `sketches/` owns the three native SVG scenes and server-localized adapters.
  Their shared canvas supplies the same outer paths from `tibia-tpa-card.svg`,
  with one shared transform for the anatomy and its projected reference points.
  Orientation derives its axis, plateau, perpendicular and TPA arc together;
  osteotomy derives its circle, cortical cut endpoints and radius handle from
  one center. The shared
  GSAP controller remains responsible for playback and cleanup.
- Separate `i18n/messages/{pt-BR,en}/surgical-planning.json` files compose into
  `resourcePages.surgicalPlanning` through the locale indexes.

## Shared behavior

The page inherits the existing 40px headings, character entrance, photo/copy
entrance, card reveal, mobile layout, reduced motion and pre-hydration guard.
There is no separate animation engine, authenticated workspace dependency or
clinical API integration. Building a preview or sketch next does not require
changing routing, navigation, translations loading or the completed pages.

## Editorial scope

The VPOP research informed the three concrete subjects, while the product's
`cases/lib/landmarks-preview.ts` and `cases/lib/tplo-geometry.ts` informed what
the Orthovet copy and illustrations describe. The first sketch highlights tibial
reference points with rings and connects them with an axis. Joint orientation
shows TPA against a perpendicular to that axis. Osteotomy shows a circular cut
reference with center, edge, radius and D1. The displayed TPA is derived from the
illustrative drawing's projected landmarks; the osteotomy radius remains R15mm.
The sketches do not recommend a clinical target, cut position or blade size.
The upper preview follows the user's pasted SVG reference, with its original
629 × 427 coordinate system. Key dimensions are preserved in SVG units:

- Back panel: (205,63), 408 × 530, radius 22; inner panel: (215,73), 388 × 504,
  radius 17.8264. It deliberately continues below the visible canvas.
- Photo: (51.5156,42.5879), 211.984 × 211.984, clip radius 22. Its white edge
  uses the original 216.312-square stroke and Gaussian blur 4.95.
- Abstract foreground note: the original path at (30.2578,145.58) and the two
  exact gray bar rectangles; its shadow retains dy=4, blur=8.85 and alpha=.02.
- Panel and photo groups each translate (-6,0); panel body content also keeps
  the original (0,-16) translation. The veil has no such translation.
- Panel veil: (188.32,303), 440.68 × 124, transparent white at y=303 to opaque
  white at y=427. It paints after the back panel and before the photo/note.

The reference omitted the CSS for its text/animation classes and did not include
the actual photo file. Coordinates, paths, radii, clipping, gradient vectors and
filters come from the pasted SVG; text uses the existing scoped Inter/Jakarta
fonts. Project branding replaces the reference's AI badge with TPLO and its
brand mark with a review check at the same 15.2-unit footprint. Only the final
static note is rendered; the reference's transient typing dots are deferred.

Painting order: shared sky → shared outer veil → translated back panel → supplied
panel veil → translated photo/note. All foreground layers share the original
rounded 629 × 427 viewport clip. The blue background is project-owned, since the
supplied SVG defines only the foreground composition.
The existing card size, bottom typography and other resource-page previews are
unchanged. The composition is server-rendered and static; choreography is a
separate future step. The existing section entrance still wraps the whole card.

The user performs manual testing. No automated checks were run.

## Team photo

The user supplied `5443656432312390.avif` for the upper preview. The pending
photo reminder is resolved; the original photo frame and cover crop are retained.
