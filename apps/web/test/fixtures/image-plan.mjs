import { readFileSync } from "node:fs"
import { isDeepStrictEqual } from "node:util"
import { clinicalUpload } from "./clinical-upload.mjs"

const evidence = JSON.parse(readFileSync(new URL("../../../../docs/testing/calibration-contract-fixtures-2026-10-23.json", import.meta.url), "utf8"))
const example = id => structuredClone(evidence.cases.find(item => item.id === id))
const horizontal = example("horizontal")

function imagePlanFixture() {
  const upload = clinicalUpload()
  const document = { schema_version: 1, calibration: null, tplo: null, tplo_landmarks: null,
    tplo_measurement: null, clinical_validation: null, objects: [] }
  const initial = { image_id: upload.identity.imageId, revision: 0, document, updated_at: null }
  return { ...upload,
    readyImage: { ...upload.rawImage, status: "READY", width_px: 2000, height_px: 1000,
      preview_available: true, preview_width_px: 1600, preview_height_px: 800 },
    initial,
    line: horizontal.input.calibration,
    circle: example("circle-horizontal").input.calibration,
    publicPlan: raw => ({ imageId: raw.image_id, revision: raw.revision, document: raw.document, updatedAt: raw.updated_at }),
    persist: input => {
      const calibration = input.document.calibration
      const recorded = calibration === null ? null : evidence.cases.find(item => item.widthPx === 2000 && item.heightPx === 1000
        && isDeepStrictEqual(item.input.calibration, calibration))
      if (calibration !== null && !recorded) throw new Error("Missing actual backend calibration example")
      return { image_id: upload.identity.imageId, revision: input.base_revision + 1, updated_at: "2026-10-23T19:00:00Z",
        document: { ...structuredClone(input.document), calibration: calibration === null ? null : structuredClone(recorded.output.calibration) } }
    },
  }
}

function populatedDocument(f) {
  return { ...structuredClone(f.initial.document),
    tplo: { laterality: "RIGHT", projection: "MEDIOLATERAL", image_quality: "ACCEPTABLE", eligibility: "ELIGIBLE",
      eligibility_reasons: [], current_slope_degrees: 24, target_slope_degrees: 6, notes: "Synthetic plan notes" },
    tplo_landmarks: { method: "MEDIAL_CONDYLE_CRANIAL_CRUCIATE_FULL_AXIS_V1", plateau_cranial: { x: 0.2, y: 0.2 },
      plateau_caudal: { x: 0.5, y: 0.2 }, intercondylar_midpoint: { x: 0.4, y: 0.3 }, talus_center: { x: 0.4, y: 0.9 } },
    tplo_measurement: { method: "MEDIAL_CONDYLE_CRANIAL_CRUCIATE_FULL_AXIS_V1", status: "CALCULATED", tpa_degrees: 24,
      plateau_length_mm: null, tibial_axis_length_mm: null, calibration_id: null, clinically_validated: false },
    clinical_validation: { status: "DRAFT", orientation_confirmed: true, image_quality_confirmed: true,
      calibration_confirmed: false, anatomical_references_confirmed: true, required_measurements: ["TPA"],
      reviewer_notes: "Keep this review", rejection_reason: null },
    objects: [
      { id: "00000000-0000-4000-8000-000000000900", type: "LINE", start: { x: 0.2, y: 0.3 }, end: { x: 0.4, y: 0.3 },
        label: "Existing line", measurement: { status: "CALIBRATION_REQUIRED", values: {}, units: {} } },
      { id: "00000000-0000-4000-8000-000000000901", type: "TPLO", center: { x: 0.5, y: 0.5 }, edge: { x: 0.5625, y: 0.5 },
        rotation_degrees: 10, label: "Existing fragment", fragment: { points: [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.5, y: 0.6 }], label: "Contour" },
        measurement: { status: "CALIBRATION_REQUIRED", values: {}, units: {} }, simulation: { status: "CALIBRATION_REQUIRED" } },
    ],
  }
}

// Synthetic payloads following the OpenAPI captured on 27/10. Geometry results
// still come from the separately preserved, pinned backend evidence above.
function publishedEmptyDocument(f) {
  return { ...structuredClone(f.initial.document), radiographic_quality: null,
    additional_measurements_input: { landmarks: {}, reference_values: {} }, additional_measurements: [] }
}

function publishedPopulatedDocument(f) {
  const previous = populatedDocument(f)
  return { ...previous,
    radiographic_quality: { true_lateral: "PASS", femoral_condyles_superimposed: "PASS", stifle_and_tarsus_included: "PASS",
      tibial_axis_centered: "PASS", tibial_plateau_visible: "PASS", notes: "Synthetic quality notes" },
    additional_measurements_input: { landmarks: { custom_start: { x: 0.1, y: 0.2 }, custom_end: { x: 0.6, y: 0.7 } },
      reference_values: { custom_reference: 23.5 } },
    additional_measurements: [{ id: "CUSTOM_ANGLE", status: "CALCULATED", value: 24, units: "degrees",
      details: { landmarks: ["custom_start", "custom_end"], accepted: true, reference: null } }],
    tplo_measurement: { ...previous.tplo_measurement, reference_tpa_degrees: 23.5, tpa_absolute_error_degrees: 0.5,
      tpa_max_absolute_error_degrees: 1.5, acceptance: "PASS", clinical_protocol_version: "synthetic-protocol-1" },
    clinical_validation: { ...previous.clinical_validation, required_measurements: ["TPA", ...Array.from({ length: 11 }, (_, i) => `CUSTOM_${i}`)],
      audit: [{ decision: "APPROVED", actor_id: "00000000-0000-4000-8000-000000000777", reviewed_at: "2026-10-27T10:00:00-03:00",
        protocol_version: "synthetic-protocol-1", measurement_method: previous.tplo_measurement.method, calibration_id: "c".repeat(64) }] },
  }
}

export { imagePlanFixture, populatedDocument, publishedEmptyDocument, publishedPopulatedDocument }
