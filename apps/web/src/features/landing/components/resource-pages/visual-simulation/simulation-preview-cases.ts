import { casePreviewPatient as toti } from "../cases-patients/cases-preview-patient-data"
import type { SimulationPreviewPatient } from "./simulation-preview-copy"
import type { SimulationPreviewPlan } from "./simulation-preview-geometry"

type SimulationPreviewSummary = "fragment" | "osteotomy" | "rotation"

// Illustration data only. Each case owns its patient avatar and plan values.
const simulationPreviewCases = [
  {
    id: "toti",
    summary: "fragment",
    patient: { name: toti.name, caseId: toti.caseId, age: toti.age, avatarSrc: toti.avatarSrc },
    plan: { radius: 15, fragmentPoints: 8, rotation: 15 },
  },
  {
    id: "luke",
    summary: "osteotomy",
    patient: { name: "Luke", caseId: "OV-0249", age: 5, avatarSrc: "/images/landing/3422243535333126.avif" },
    plan: { radius: 18, fragmentPoints: 9, rotation: 12 },
  },
  {
    id: "luna",
    summary: "rotation",
    patient: { name: "Luna", caseId: "OV-0250", age: 4, avatarSrc: "/images/landing/3422243535333125.avif" },
    plan: { radius: 15, fragmentPoints: 8, rotation: 10 },
  },
] as const satisfies readonly { id: string; summary: SimulationPreviewSummary; patient: SimulationPreviewPatient; plan: SimulationPreviewPlan }[]

export { simulationPreviewCases }
