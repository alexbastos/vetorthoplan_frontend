import gsap from "gsap"

// All page headings share the same glyph timing, movement and easing.
// Call inside the section's useGSAP context, before releasing its hydration guard.
function addResourceHeadingEntrance(timeline: gsap.core.Timeline, heading: HTMLElement | null, at = 0) {
  const characters = Array.from(heading?.querySelectorAll<HTMLElement>("[data-char]") ?? [])
  if (!characters.length) return

  gsap.set(characters, { autoAlpha: 0, y: ".18em" })
  timeline.to(characters, {
    autoAlpha: 1, y: 0, duration: 0.65, stagger: 0.018, ease: "power2.out",
    clearProps: "opacity,visibility,transform",
  }, at)
}

export { addResourceHeadingEntrance }
