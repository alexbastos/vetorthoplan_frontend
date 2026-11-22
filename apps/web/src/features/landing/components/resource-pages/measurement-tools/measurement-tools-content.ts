const measurementFactKeys = ["calibration", "distance", "angle", "circle"] as const
const measurementFaqKeys = ["calibration", "distance", "angle", "circle", "review"] as const

// Stable identifiers and stage codes; localized copy belongs to i18n messages.
const measurementModules = [
  { id: "distance", code: "MT-01" },
  { id: "angle", code: "MT-02" },
  { id: "circle", code: "MT-03" },
] as const

type MeasurementModuleId = typeof measurementModules[number]["id"]

export { measurementFactKeys, measurementFaqKeys, measurementModules }
export type { MeasurementModuleId }
