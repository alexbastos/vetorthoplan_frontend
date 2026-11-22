# Routine benefits

`RoutineBenefitsSection` follows the capabilities accordion in `LandingPage`.
It presents the practical benefits of efficiency, flexibility, references,
planning, documentation and collaboration. Community remains explicitly planned
in the sentence itself; the cards do not suggest it is available today.

## Ownership

- `routine-benefits-section.tsx`: server-side composition and localized copy.
- `routine-benefits-content.ts`: six stable IDs and the product's native SVG
  icons, exposed by `landing-platform-icons.tsx`. Cases/Community come directly
  from app navigation; measurements/simulation/documents reuse sidebar glyphs.
  The device glyph follows their 24-unit viewBox, 20px size, currentColor,
  1.5px rounded stroke convention.
- `routine-benefit-card.tsx`: a decorative icon and one short paragraph, with
  two authored line segments. No secondary heading, badge, button or link.
- `routine-benefits-section.module.css`: the white page background, soft gray
  cards, white icon tiles, 12px gaps and shared 28/36/40px heading scale.
- `i18n/messages/{pt-BR,en}/orthovet-landing.json`: `routineBenefits` contains
  all section text, including line segments in both languages.

The desktop grid has three columns and two rows, with 208px minimum card height.
Below 1024px it uses two columns from 640px, and one on narrower screens. Text can
wrap further when required; there is no clipping, forced nowrap or line clamp.
The section shares the 1352px LP shell and retains the existing page grid rails.
`LandingSectionDivider` starts the section with the same horizontal hairline and
two 3px intersection dots/white halos used above the capabilities section.
There is a 10px gap between the preceding gray surface and this divider,
matching the reference section's surface-to-divider spacing.

## Motion

`RoutineBenefitsEntrance` and `useRoutineBenefitsEntrance` apply the project's
GSAP/useGSAP/matchMedia pattern to the header and each of the six cards. Each
element receives a 700ms opacity-only fade, with `power2.out`, triggered once at
its own `top 85%`. This prevents lower rows from completing their entrance while
still below the viewport, especially in the stacked mobile layout. There is no
translation or scale. Completed targets are tracked across media reconfiguration.
The pending CSS guard is released only after GSAP prepares the initial states.
Reduced-motion and no-JavaScript content stays visible; useGSAP/matchMedia own
cleanup of all tweens and ScrollTriggers.

The user handles manual validation. No tests, typechecks, builds, servers or
browser automation are run for this implementation.
