# Live agent avatars

`AgentAvatar` is a decorative client adapter for the official `open-bot-avatar`
0.3.0 renderer. `use-agent-avatar.ts` owns loading and lifecycle; the library
owns body movement, depth, gaze, blinking, the shared animation clock and drawing.
GSAP continues to own the resource card's entrance; do not animate the renderer's
internal paths with a second engine.

## Assets and contract

Each instance takes a same-origin `definitionSrc`, original `fallbackSrc`, body
color and resting look direction. Definitions in `public/agents/{chat,cat,bunny}.json`
come from the official starter/gallery sources; attribution and MIT terms are in
`public/agents/LICENSE.open-bot-avatar.txt`. Original SVGs are preserved, not
rewritten. Definitions are fetched locally and passed through `validateAvatar`.
No avatars or patient content are sent to an external service at runtime.

## Runtime behavior

- The 100-by-100 static SVG remains server-rendered and visible until the live
  canvas/scene mounts; a MutationObserver switches layers without changing size.
- An IntersectionObserver with a 160px margin defers imports and definition
  fetching until nearby. The library stops redrawing distant avatars itself.
- The nearest article's fine-mouse pointer entry enables `followPointer` and
  clears the fixed look. On leave, each agent returns to its `restingLook`.
  Touch retains the resting pose and native scrolling.
- The runtime uses its default canvas renderer at depth 6, original body colors,
  neutral mood, idle state and empty decorative label. All live instances share
  the library's frame loop. Animation does not update React state per frame.
- A hidden document switches mounted instances to `still`; returning resumes.
  Reduced-motion preference prevents mounting and uses the original static SVG.
  Changing the preference at runtime aborts pending work and destroys instances.
- Unmount removes pointer/media/visibility listeners and observers, aborts the
  definition request and calls `destroy`. Async generation checks prevent stale
  imports/fetches from mounting after cleanup or React Strict Mode replay.
- Failed loading or validation retains the original SVG. The optional horizontal
  fallback mirror affects only the static image: mirroring the live canvas would
  reverse pointer following, so the live pose uses a real look direction instead.

AI Assistants places these HTML hosts in SVG `foreignObject` boxes to preserve
its existing 629-by-427 geometry, painter order and foreground fades. All agent
surfaces ignore pointer hits; the decorative card handles pointer proximity.

No automated tests, typechecks, builds, browser sessions or visual checks were
run. The user performs manual testing.
