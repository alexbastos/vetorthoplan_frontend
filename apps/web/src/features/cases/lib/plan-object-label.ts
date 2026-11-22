import type { ImagePlan } from "../schemas/image-plan.schema"

function nextPlanObjectLabel(objects: ImagePlan["document"]["objects"], type: "LINE" | "ANGLE" | "CIRCLE" | "TPLO", name: (index: number) => string): string | null {
  const labels = new Set<string>()
  let listedIndex = 0
  for (const object of objects) {
    const listed = object.type === type && object.visible !== false
    if (listed) listedIndex += 1
    const label = object.label?.trim() || (listed ? name(listedIndex) : null)
    if (label) labels.add(label.toLowerCase())
  }
  for (let index = 1; index <= objects.length + 1; index += 1) {
    const candidate = name(index)
    if (!labels.has(candidate.trim().toLowerCase())) return candidate
  }
  return null
}

export { nextPlanObjectLabel }
