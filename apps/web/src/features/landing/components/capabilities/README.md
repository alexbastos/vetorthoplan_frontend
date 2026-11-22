# Platform capabilities

This section follows the three platform pillars on the landing page. Its full
surface uses `--color-paper-white`; the preceding pillars now use white.
The shared `../landing-section-divider.tsx` is used above both this section and
the platform pillars. It has two 3px dots with an 8px white halo. Its centered guide is
`min(calc(100% - 3rem), 1352px)`, changing to `100% - 8rem` at 1024px.

## Responsibilities

- `capabilities-section.tsx`: server composition, localized copy, section heading,
  boundary, and gray surface. The public anchor is `#resources`.
- `capabilities-content.ts`: ordered feature definitions, planned availability,
  and content/image types. Copy lives in `orthovetLanding.capabilities` in both dictionaries.
- `capabilities-accordion.tsx`: client composition, instance-specific ARIA IDs,
  and wiring of the cards to the interaction hook.
- `use-capabilities-accordion.ts`: local selection, reactive media subscriptions,
  pointer capability detection, and keyboard focus navigation. No global state,
  scroll listeners, timers, animation frame loop, or product API calls.
- `capability-card.tsx`: list-item/panel presentation, desktop heading, collapsed
  rail, and the mobile-only header button. The desktop card is not a button.
- `capability-media.tsx`: optional image slot. Cases uses the supplied
  `/images/landing/0003243231123567.avif` and Measurement tools uses
  `/images/landing/0003243231123569.avif`. Surgical planning uses
  `/images/landing/0003243231123561.avif` and Simulation uses
  `/images/landing/0003243231123562.avif`. AI Assistants uses
  `/images/landing/0003243231123563.avif` and Community uses
  `/images/landing/0003243231123564.avif`. All six slots now have images. The original
  AVIFs are served without re-encoding. No loading skeletons or placeholder assets.
- CSS Modules keep section geometry separate from card layout and transitions.

## Interaction and dimensions

The six areas are Cases and patients, Measurement tools, Surgical planning,
Simulation, AI Assistants, and Community. The separate Reports card was removed.
Images belong to Cases and
calibration belongs to Measurement tools. AI Assistants and Community are planned:
their cards show a clock by the number, a localized Coming soon pill when expanded,
and the same availability in the accessible header name. The pill follows the
expanded title, as in the reference. Each card has one short description and a
footer with a 12px monospaced feature caption (approximately 17.14px line height)
and a 14px semibold text action with an arrow. The footer matches the supplied
HTML: centered alignment, 20px horizontal / 8px row gaps, 16px top margin, and
a 44px minimum action height. Caption widths
follow their content rather than copying a reference price string's measured width.
The existing project font families remain in use.
The Cases action links to `/resources/cases-and-patients`; Measurement tools links
to `/resources/measurement-tools`; Surgical planning links to `/resources/surgical-planning`.
All use the shared public resource path definition and media descriptors.
The remaining actions stay disabled until their detail
pages are defined. They have no placeholder href or click handler. There is no
full-card button or invisible control over desktop content.
The panel is a full-height flex column with bottom alignment: 20px padding and
80px top clearance on mobile, 28px padding on desktop. The actual desktop h3 and
body enter separately after 300ms, over 500ms and 700ms respectively. Body width
is capped at 36ch. Text can be selected normally.

At 768px and above, the accordion is 544px high with 8px gaps and 12px card radii.
An active card uses `flex: 3.4 1 0%`; each of the other five uses `flex: 1 1 0%`.
The ratio applies after gaps and borders are accounted for by the browser.
`min-width: 0` prevents text intrinsic widths from changing that distribution.

The initial card is Cases. On desktop, pointer entry selects a card only when
`(hover: hover) and (pointer: fine)` matches and the event is not touch. A click
on a touch device selects through the list item's pointer handler. Keyboard focus
also selects the desktop card. Desktop always keeps one card open.
Below 768px, cards stack; their minimum heights are 68px closed / 352px open.
The header button toggles the active card, and the plus rotates by 45 degrees.
Hover activation is disabled on mobile, including devices with a connected mouse.

Desktop list items are focusable and support Left/Right, Home/End, Enter/Space.
Mobile uses native header buttons with Enter/Space, Up/Down, Home/End. Moving
with navigation keys focuses the matching card or header for the current layout.
Only mobile buttons carry expanded/controls; regions are named by the actual
desktop heading or mobile trigger. Inert hidden content tracks selection.

Flex and min-height transitions run for 700ms with
`cubic-bezier(0.23, 1, 0.32, 1)`. Details enter after 300ms. Card selection is not
driven by scroll progress: scrolling can change which card is under the pointer,
and pointer entry is the selection trigger. Reduced motion disables transitions.

## Adding the supplied images later

Add the supplied `{ src, alt }` to `capabilityImages`, keyed by CapabilityKey.
Decorative media uses an empty alt and remains inside an aria-hidden wrapper.
Localized descriptions stay in the translation dictionaries. The media
slot already uses Next Image with containable sizing, cover fit, inactive 40%
opacity/grayscale, full-color active state, and a lower gradient for text contrast.
Both card states use the section's `--color-paper-white` (#fafbfc) behind the
image. The active lower gradient transitions from that color through 70% opacity
to transparent. Only opacity/filter animate on the image over 700ms with the
existing lens easing; there is no blur, baked-in desaturation, or hover image swap.
Do not replace the accordion, duplicate media trees, or couple selection to assets.

## Section entrance

`CapabilitiesEntrance` aliases `animations/LandingFadeIn`, wrapping the existing
inner container without changing its layout or making the localized section a
client component. Its shared `useLandingFadeIn` hook follows GSAP/useGSAP/matchMedia
pattern: one 700ms `power2.out` fade when the container reaches 85% of the viewport,
once, with no translation or scale. It animates the shared container's autoAlpha
instead of card opacity, preserving the accordion's own visual states.

The CSS pending guard prevents a pre-hydration flash; it is released only after
GSAP sets the initial state. Reduced-motion and no-JavaScript rendering stay
visible, and matchMedia/useGSAP own cleanup of the tween and ScrollTrigger.

## Closing assurance bar

`CapabilitiesAssuranceBar` sits after the accordion, inside the same gray surface,
before Routine Benefits. Its three localized messages address reviewing markings,
preserving case context and resuming saved planning. The action is **Conheça a
plataforma**, linked to the LP's existing `#platform` presentation anchor. It does
not use a WhatsApp/demo contact.

The server component and `capabilities-assurance-content.ts` own composition and
native sidebar-style SVGs; `capabilities-assurance-bar.module.css` owns the cycle.
Messages and icons share grid cell 1/1, reserving the largest message's dimensions.
Each item uses `--i` with a 5s delay step in a 15s loop. Titles rise 8px with fade;
descriptions lag slightly and glyphs scale .85 → 1 → 1.05. The 56px icon tile has
a 20.81px-radius ring inset -5.18px. Two masked halves rotate 72 × 200px blue planes
in the first/second portions of each 5s cycle; the outline fades at 96.4–100%.

The loop is CSS-only, with no React timers or per-frame state. It pauses on fine
pointer hover and keyboard focus within the bar. Reduced motion displays the
first message/icon statically, with no animated ring. A stable screen-reader list
provides all three messages without repeated live announcements. The existing
shared GSAP fade handles only the bar's viewport entrance.

## Validation

The user will validate manually. No tests, typechecks, builds, browser checks,
or screenshot automation were run for this implementation.
