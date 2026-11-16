import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })
const { pickDistanceLine, distanceMarkerFromKeyboard } = await import("../src/features/cases/lib/distance-line-interaction.ts")
const dimensions = { widthPx: 2000, heightPx: 1000 }
const rect = { left: 100, top: 100, width: 1000, height: 500 }
const line = (id, y) => ({ id, start: { x: 0.2, y }, end: { x: 0.8, y } })
const key = (key, shiftKey = false, altKey = false) => ({ key, shiftKey, altKey })

test("canvas picks the nearest line with screen-pixel tolerances rather than document order", () => {
  const a = line("a", 0.5), b = line("b", 0.51)
  for (const lines of [[a, b], [b, a]]) assert.equal(pickDistanceLine({ x: 600, y: 355 }, lines, null, rect, dimensions).id, "b")
  assert.equal(pickDistanceLine({ x: 600, y: 358 }, [a], null, rect, dimensions).part, "body")
  assert.equal(pickDistanceLine({ x: 600, y: 359 }, [a], null, rect, dimensions), null)
  assert.equal(pickDistanceLine({ x: 99, y: 350 }, [a], null, rect, dimensions), null)
})

test("selected endpoints win over closer bodies, and equal-distance ties keep selection then UUID order", () => {
  const a = line("a", 0.5), b = line("b", 0.51)
  assert.equal(pickDistanceLine({ x: 300, y: 355 }, [b, a], "a", rect, dimensions).id, "a")
  assert.equal(pickDistanceLine({ x: 600, y: 350 }, [line("b", 0.5), a], null, rect, dimensions).id, "a")
  assert.equal(pickDistanceLine({ x: 600, y: 350 }, [a, line("b", 0.5)], "b", rect, dimensions).id, "b")
})

test("canvas hit tolerances remain in screen pixels across zoomed and non-square rectangles", () => {
  const a = line("a", 0.5)
  for (const width of [500, 1000, 2000]) {
    const displayed = { left: 80, top: 60, width, height: width / 2 }
    const start = { x: displayed.left + 0.2 * width, y: displayed.top + displayed.height / 2 }
    assert.equal(pickDistanceLine({ x: start.x - 12, y: start.y }, [a], "a", displayed, dimensions).part, "start")
    assert.equal(pickDistanceLine({ x: start.x - 13, y: start.y }, [a], "a", displayed, dimensions), null)
  }
})

test("keyboard adjusts either endpoint independently, with explicit selection taking priority over Alt", () => {
  const marker = { kind: "line", start: { x: 400, y: 200 }, end: { x: 1200, y: 600 } }
  const start = distanceMarkerFromKeyboard(marker, "start", key("ArrowRight", true, true), dimensions, false)
  assert.deepEqual(start, { ...marker, start: { x: 410, y: 200 } })
  assert.deepEqual(distanceMarkerFromKeyboard(marker, "end", key("ArrowUp"), dimensions, false), { ...marker, end: { x: 1200, y: 599 } })
  assert.deepEqual(distanceMarkerFromKeyboard(marker, "body", key("ArrowUp", false, true), dimensions, false), { ...marker, end: { x: 1200, y: 599 } })
  assert.deepEqual(marker.start, { x: 400, y: 200 })
})

test("keyboard respects mirroring, contains the whole segment and refuses coincident endpoints", () => {
  const marker = { kind: "line", start: { x: 5, y: 2 }, end: { x: 105, y: 102 } }
  const moved = distanceMarkerFromKeyboard(marker, "body", key("ArrowRight", true), dimensions, true)
  assert.deepEqual(moved, { kind: "line", start: { x: 0, y: 2 }, end: { x: 100, y: 102 } })
  assert.equal(distanceMarkerFromKeyboard({ kind: "line", start: { x: 0, y: 0 }, end: { x: 1, y: 0 } }, "start", key("ArrowRight"), dimensions, false), null)
  assert.equal(distanceMarkerFromKeyboard({ kind: "line", start: { x: 0, y: 0 }, end: { x: 2, y: 0 } }, "start", key("ArrowRight"), dimensions, false), null)
  assert.equal(distanceMarkerFromKeyboard({ kind: "line", start: { x: 0, y: 0 }, end: { x: 1, y: 0 } }, "body", key("ArrowRight"), dimensions, false).end.x, 2)
  assert.equal(distanceMarkerFromKeyboard(marker, "start", key("Tab"), dimensions, false), null)
  assert.equal(distanceMarkerFromKeyboard(marker, "start", key("ArrowUp", true), dimensions, false).start.y, 0)
})
