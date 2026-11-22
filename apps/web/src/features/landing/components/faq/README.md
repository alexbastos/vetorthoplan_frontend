# Shared FAQ section

`FaqSection` is a server-rendered, content-independent section for the landing
and resource pages. It accepts a unique `id`, localized `eyebrow` and `title`,
and readonly `items` with stable IDs, questions and answers. Answers may contain
inline rich text or links. Load copy in each page's adapter, not in this component.
Use `variant="resource"` for LP resource-detail pages: no horizontal hairlines,
intersection dots or vertical rails, with the first question aligned to the
first title line on desktop. The default variant retains the reference dividers
and uses the same first-question/title alignment, with 76px top padding on the
question column at desktop sizes.

The supplied reference is kept in `faq-section.module.css`: 1352px maximum
width, 24px/64px shell padding, a 423px sticky heading column above 1024px,
19px separators, 1px rails, 3px intersection dots and 16px item corners.
Shared `LandingSectionDivider` renders the hairlines. Its dot color can be
scoped with `--landing-divider-dot-color`; the default elsewhere is unchanged.
Inter and Plus Jakarta Sans come from `landing-reference-fonts.ts`, the same
font instances used by the resource previews. Tokens are scoped to the section.

Native `details`/`summary` provide keyboard activation and disclosure state.
All items start closed; the section ID gives its `name` group a unique
identity, so separate sections do not close each other's answers. No React
state or click interceptor controls the accordion. A single client boundary
handles only the viewport entrance, retaining the server-rendered content.

## Viewport entrance

`FaqEntrance` delegates to `use-faq-entrance.ts`, using the established scoped
`useGSAP`, `gsap.matchMedia` and ScrollTrigger pattern. At `top 85%`, once per
mount, the eyebrow rises 12px with a 700ms fade. `ResourceTitle` and
`addResourceHeadingEntrance` reuse the exact shared title treatment: .18em rise,
650ms duration, 18ms character stagger and `power2.out`, starting at 120ms.
Questions enter from 12px below with 700ms fades, 100ms stagger, starting at
240ms. The grid and sticky heading container are never transformed.

A local pre-hydration visibility guard reserves layout until initial GSAP
states are ready, avoiding a visible-then-hidden flash. No JavaScript or reduced
motion preserves visible content. Completed inline styles are cleared; media
contexts and scroll triggers are reverted on cleanup. All consumers
inherit the animation without page-specific hooks or repeated controllers.

## Accordion transitions

The reference's CSS easing is `.22,1,.36,1`: 320ms intrinsic height, 240ms icon,
300ms hover-dot width/margin/scale and 200ms opacity/background/color. The hover
dot uses the project's electric-iris blue. Height
transitions are feature-gated on `interpolate-size` and `::details-content`.
Other browsers keep native disclosure behavior without animation; the optional
JS polyfill from the reference is intentionally unnecessary for functionality.
Reduced motion removes all transitions. Content remains available without JS.

## Example

```tsx
<FaqSection id="measurement-faq" eyebrow={t("eyebrow")} title={t("title")} variant="resource"
  items={questionKeys.map(id => ({
    id,
    question: t(`items.${id}.question`),
    answer: t(`items.${id}.answer`),
  }))} />
```

## Landing-page adapter

`landing-faq.tsx` is the LP's server-side adapter. It follows Routine Benefits
in `LandingPage` and uses the default variant, including the reference's horizontal
hairlines, intersection dots, white spacing and vertical rails. Its stable public
anchor is `#faq`; the shared component derives unique disclosure and heading IDs.

`landing-faq-content.ts` owns six ordered question keys. All localized questions
and answers live under `orthovetLanding.faq` in the PT/EN dictionaries. Topics are
browser access, accepted image formats, calibration, saving, tools and the
professionals the platform supports. Supported radiograph extensions follow
`features/cases/lib/image-upload-policy.ts`; copy does not promise report export
or availability of the planned features. Layout, closed initial state, native
interaction and GSAP entrance stay in the shared component, with no LP-specific
animation controller or duplicated accordion implementation.

Do not place the component inside a narrow resource container: it owns its
responsive shell and optional full-width hairlines. AI Assistants, Cases and
Patients, Visual Simulation, Measurement Tools and Surgical Planning have their own content
adapters; add others as their FAQ copy is defined.
The user performs
manual testing; no tests, builds or browser checks were run for this change.
