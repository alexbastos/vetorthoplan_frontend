import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.(?:[cm]?[jt]s|json)$/.test(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context)
      } catch {
        // Let Node report the canonical resolution error below.
      }
    }

    return nextResolve(specifier, context)
  },
})

const { parseCasesListResponse, parseCreateCaseInput } = await import(
  "../src/features/cases/schemas/cases.schema.ts"
)
const { createFrontendOnlyCasesAdapter } = await import(
  "../src/features/cases/services/frontend-only-cases-adapter.ts"
)
const { createInMemoryCasesAdapter } = await import(
  "../src/features/cases/services/in-memory-cases-adapter.ts"
)
const { sanitizeUnsignedDecimal, sanitizeUnsignedInteger } = await import(
  "../src/features/cases/lib/numeric-input.ts"
)
const { CASE_FILE_MAX_SIZE, validateCaseFile } = await import(
  "../src/features/cases/lib/case-file-policy.ts"
)
const { calculateManualPixelSpacing } = await import(
  "../src/features/cases/lib/calculate-manual-calibration.ts"
)
const { mapClientPointToImage } = await import(
  "../src/features/cases/lib/image-coordinate-map.ts"
)
const { hitTestLineMarker, moveLineMarker, resizeLineMarker } = await import(
  "../src/features/cases/lib/line-marker-interaction.ts"
)
const { hitTestCircleMarker, moveCircleMarker, resizeCircleMarker } = await import(
  "../src/features/cases/lib/circle-marker-interaction.ts"
)
const { getPatientAgeYears } = await import(
  "../src/features/cases/lib/patient-age.ts"
)
const { parseCaseWorkspaceResponse } = await import(
  "../src/features/cases/schemas/case-workspace.schema.ts"
)

const validInput = {
  clinicalNotes: "Claudicação no membro pélvico direito.",
  patient: {
    age: { kind: "approximate-years", years: 4 },
    breed: "Labrador Retriever",
    name: "Luna",
    sex: "female",
    species: "Canina",
    weightKg: 32.5,
  },
  title: "Avaliação ortopédica — joelho direito",
}

test("validates the internal create-case contract", () => {
  assert.deepEqual(parseCreateCaseInput(validInput), validInput)
  assert.equal(parseCreateCaseInput({ ...validInput, title: "" }), undefined)
  assert.equal(
    parseCreateCaseInput({
      ...validInput,
      patient: { ...validInput.patient, age: { kind: "approximate-years", years: -1 } },
    }),
    undefined,
  )
})

test("calculates age from the patient's birthday", () => {
  const age = { birthDate: "2020-10-07", kind: "birth-date" }
  assert.equal(getPatientAgeYears(age, new Date(2026, 9, 6)), 5)
  assert.equal(getPatientAgeYears(age, new Date(2026, 9, 7)), 6)
  assert.equal(getPatientAgeYears({ kind: "approximate-years", years: 4 }), 4)
  assert.equal(getPatientAgeYears(null), null)
})

test("sanitizes the numeric case fields before validation", () => {
  assert.equal(sanitizeUnsignedInteger("3a4", 2), "34")
  assert.equal(sanitizeUnsignedInteger("343", 2), "34")
  assert.equal(sanitizeUnsignedDecimal("sd32,323"), "32,32")
  assert.equal(sanitizeUnsignedDecimal("12.3.4"), "12.34")
  assert.equal(sanitizeUnsignedDecimal(",5"), "0,5")
})

test("accepts clinical file formats and enforces the 50 MB limit", () => {
  const file = (name, size) => ({ name, size })

  for (const extension of ["dcm", "jpeg", "jpg", "png", "pdf", "mp4"]) {
    assert.deepEqual(validateCaseFile(file(`exam.${extension}`, CASE_FILE_MAX_SIZE)), { ok: true })
  }

  assert.deepEqual(validateCaseFile(file("exam.pdf", CASE_FILE_MAX_SIZE + 1)), { error: "too-large", ok: false })
  assert.deepEqual(validateCaseFile(file("exam.txt", 100)), { error: "unsupported-type", ok: false })
  assert.deepEqual(validateCaseFile(file("exam.pdf", 0)), { error: "empty", ok: false })
})

test("validates and projects case-list responses", () => {
  const response = parseCasesListResponse({
    cases: [
      {
        createdAt: "2026-09-25T12:00:00.000Z",
        extra: "discarded",
        id: "case-1",
        patient: { breed: null, name: "Luna", species: "Canina" },
        status: "draft",
        title: "Joelho direito",
        updatedAt: "2026-09-25T12:00:00.000Z",
      },
    ],
  })

  assert.equal(response?.length, 1)
  assert.equal(response?.[0].id, "case-1")
  assert.equal("extra" in response[0], false)
  assert.equal(parseCasesListResponse({ cases: [{ id: "incomplete" }] }), undefined)
})

test("keeps development cases in memory without exposing mutable state", async () => {
  const repository = createInMemoryCasesAdapter()
  const initial = await repository.listCases()
  assert.deepEqual(initial, { data: [], ok: true })

  const created = await repository.createCase(validInput)
  assert.equal(created.ok, true)

  if (!created.ok) return

  assert.equal(created.data.patient.name, "Luna")
  assert.equal(created.data.patient.sex, "female")
  assert.deepEqual(created.data.patient.age, validInput.patient.age)
  assert.equal(created.data.patient.weightKg, validInput.patient.weightKg)
  assert.equal(created.data.clinicalNotes, validInput.clinicalNotes)
  assert.equal(created.data.status, "draft")

  const workspace = await repository.getCaseWorkspace(created.data.id)
  assert.equal(workspace.ok, true)
  if (workspace.ok) {
    assert.equal(workspace.data.case.patient.weightKg, validInput.patient.weightKg)
    assert.equal(workspace.data.case.clinicalNotes, validInput.clinicalNotes)
  }

  const listed = await repository.listCases()
  assert.equal(listed.ok, true)

  if (!listed.ok) return

  assert.equal(listed.data.length, 1)
  assert.notEqual(listed.data[0], created.data)
  assert.notEqual(listed.data[0].patient, created.data.patient)
  assert.notEqual(listed.data[0].patient.age, created.data.patient.age)
})

test("links imported files to an existing development case", async () => {
  const repository = createInMemoryCasesAdapter()
  const created = await repository.createCase(validInput)

  assert.equal(created.ok, true)
  if (!created.ok) return

  const imported = await repository.importFiles({
    caseId: created.data.id,
    files: [{ lastModified: 0, name: "joelho-direito.dcm", size: 2_048, type: "application/dicom" }],
  })

  assert.equal(imported.ok, true)
  if (!imported.ok) return

  assert.equal(imported.data.length, 1)
  assert.equal(imported.data[0].name, "joelho-direito.dcm")
  assert.notEqual(imported.data[0].id, "")
  assert.ok(Number.isFinite(Date.parse(imported.data[0].uploadedAt)))

  const listed = await repository.listCases()
  assert.equal(listed.ok, true)
  if (!listed.ok) return

  assert.equal(listed.data[0].fileCount, 1)
  assert.equal(listed.data[0].thumbnailUrl, null)

  const workspace = await repository.getCaseWorkspace(created.data.id)
  assert.equal(workspace.ok, true)
  if (!workspace.ok) return
  assert.equal(workspace.data.files[0].kind, "image")
  assert.equal(workspace.data.files[0].format, "dicom")
  assert.equal(workspace.data.files[0].file.uploadedAt, imported.data[0].uploadedAt)
  assert.deepEqual(workspace.data.files[0].rendering, {
    status: "unavailable", reason: "renderer-unavailable",
  })
  assert.deepEqual(await repository.saveImageCalibration({
    caseId: created.data.id,
    imageId: imported.data[0].id,
    marker: { kind: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
    referenceSizeMm: 25,
    expectedRevision: null,
  }), { error: { code: "IMAGE_NOT_READY", retryable: false }, ok: false })
})

test("calculates manual spacing in source pixels and rejects invalid markers", () => {
  const image = {
    status: "ready", url: "blob:test", widthPx: 400, heightPx: 300, pixelAspectRatio: 1,
  }
  const line = { kind: "line", start: { x: 20, y: 30 }, end: { x: 120, y: 30 } }

  assert.deepEqual(calculateManualPixelSpacing(image, line, 25), { rowMm: 0.25, columnMm: 0.25 })
  assert.deepEqual(calculateManualPixelSpacing(image, {
    kind: "circle", center: { x: 100, y: 100 }, radiusPx: 50,
  }, 25), { rowMm: 0.25, columnMm: 0.25 })
  assert.deepEqual(calculateManualPixelSpacing({ ...image, pixelAspectRatio: 2 }, {
    kind: "line", start: { x: 20, y: 20 }, end: { x: 20, y: 70 },
  }, 25), { rowMm: 0.5, columnMm: 0.25 })
  assert.equal(calculateManualPixelSpacing(image, line, 0), null)
  assert.equal(calculateManualPixelSpacing(image, { ...line, end: { x: 500, y: 30 } }, 25), null)
  assert.equal(calculateManualPixelSpacing(image, { ...line, end: { x: 20.5, y: 30 } }, 25), null)
  assert.equal(calculateManualPixelSpacing({ ...image, pixelAspectRatio: 2 }, {
    kind: "circle", center: { x: 100, y: 100 }, radiusPx: 50,
  }, 25), null)
  assert.equal(calculateManualPixelSpacing({ status: "processing" }, line, 25), null)
})

test("maps drawn points to image pixels after display scaling", () => {
  const displayed = { left: 100, top: 50, width: 200, height: 100 }
  assert.deepEqual(mapClientPointToImage(200, 100, displayed, 1_000, 500), { x: 500, y: 250 })
  assert.deepEqual(mapClientPointToImage(300, 150, displayed, 1_000, 500), { x: 999, y: 499 })
  assert.deepEqual(mapClientPointToImage(50, 20, displayed, 1_000, 500), { x: 0, y: 0 })
  assert.equal(mapClientPointToImage(200, 100, { ...displayed, width: 0 }, 1_000, 500), null)
})

test("edits line endpoints and moves the whole line without changing its length", () => {
  const line = { kind: "line", start: { x: 20, y: 30 }, end: { x: 120, y: 30 } }
  const rect = { left: 100, top: 50, width: 400, height: 300 }
  assert.equal(hitTestLineMarker({ x: 120, y: 80 }, line, rect, 400, 300), "start")
  assert.equal(hitTestLineMarker({ x: 220, y: 80 }, line, rect, 400, 300), "end")
  assert.equal(hitTestLineMarker({ x: 170, y: 80 }, line, rect, 400, 300), "body")
  assert.equal(hitTestLineMarker({ x: 170, y: 100 }, line, rect, 400, 300), null)
  assert.deepEqual(resizeLineMarker(line, "start", { x: 10, y: 40 }), {
    kind: "line", start: { x: 10, y: 40 }, end: line.end,
  })
  assert.deepEqual(moveLineMarker(line, { x: 50, y: 30 }, { x: 80, y: 50 }, 400, 300), {
    kind: "line", start: { x: 50, y: 50 }, end: { x: 150, y: 50 },
  })
  assert.deepEqual(moveLineMarker(line, { x: 50, y: 30 }, { x: -100, y: 50 }, 400, 300), {
    kind: "line", start: { x: 0, y: 50 }, end: { x: 100, y: 50 },
  })
})

test("resizes the circle from its edge and moves it from its interior", () => {
  const circle = { kind: "circle", center: { x: 100, y: 100 }, radiusPx: 30 }
  const rect = { left: 100, top: 50, width: 400, height: 300 }

  assert.equal(hitTestCircleMarker({ x: 200, y: 150 }, circle, rect, 400, 300), "body")
  assert.equal(hitTestCircleMarker({ x: 230, y: 150 }, circle, rect, 400, 300), "edge")
  assert.equal(hitTestCircleMarker({ x: 250, y: 150 }, circle, rect, 400, 300), null)

  assert.deepEqual(resizeCircleMarker(circle, { x: 150, y: 100 }, 400, 300), {
    ...circle, radiusPx: 50,
  })
  assert.deepEqual(moveCircleMarker(circle, { x: 100, y: 100 }, { x: 120, y: 130 }, 400, 300), {
    ...circle, center: { x: 120, y: 130 },
  })
  assert.deepEqual(moveCircleMarker(circle, { x: 100, y: 100 }, { x: 500, y: 500 }, 150, 200), {
    ...circle, center: { x: 119, y: 169 },
  })
  assert.equal(resizeCircleMarker(circle, { x: 500, y: 100 }, 150, 200).radiusPx, 49)
})

test("rejects malformed workspace images at the repository seam", () => {
  const base = {
    case: {
      createdAt: "2026-09-25T12:00:00.000Z", id: "case-1",
      patient: { breed: null, name: "Luna", species: "Canina" },
      status: "draft", title: "Joelho direito", updatedAt: "2026-09-25T12:00:00.000Z",
    },
    files: [{
      kind: "image",
      file: { id: "image-1", name: "knee.png", size: 20, type: "image/png" },
      format: "png", originalUrl: null,
      rendering: { status: "ready", url: "blob:test", widthPx: 400, heightPx: 300, pixelAspectRatio: 1 },
      laterality: null, radiographicView: null, dicomScaleEvidence: null, calibration: null,
    }],
  }

  assert.equal(parseCaseWorkspaceResponse(base)?.files[0].kind, "image")
  assert.equal(parseCaseWorkspaceResponse({ ...base, files: [{ ...base.files[0], rendering: {
    ...base.files[0].rendering, widthPx: 0,
  } }] }), undefined)
  assert.equal(parseCaseWorkspaceResponse({ ...base, files: [{ ...base.files[0], calibration: {
    imageId: "another-image", marker: { kind: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
    referenceSizeMm: 25, pixelSpacing: { rowMm: 2.5, columnMm: 2.5 }, revision: 1,
    createdAt: "2026-09-25T12:00:00.000Z", updatedAt: "2026-09-25T12:00:00.000Z",
    createdBy: "user-1", updatedBy: "user-1",
  } }] }), undefined)
})

test("keeps calibration per image and checks revisions before replacement", async () => {
  const OriginalImage = globalThis.Image
  globalThis.Image = class {
    naturalWidth = 400
    naturalHeight = 300
    set src(_url) { queueMicrotask(() => this.onload?.()) }
  }

  try {
    const repository = createInMemoryCasesAdapter()
    const created = await repository.createCase(validInput)
    assert.equal(created.ok, true)
    if (!created.ok) return

    const firstImport = await repository.importFiles({
      caseId: created.data.id,
      files: [
        new File(["image"], "lateral.png", { type: "image/png" }),
        new File(["report"], "report.pdf", { type: "application/pdf" }),
      ],
    })
    assert.equal(firstImport.ok, true)
    if (!firstImport.ok) return

    const firstWorkspace = await repository.getCaseWorkspace(created.data.id)
    assert.equal(firstWorkspace.ok, true)
    if (!firstWorkspace.ok) return
    assert.deepEqual(firstWorkspace.data.files.map((item) => item.kind), ["image", "attachment"])
    assert.equal(firstWorkspace.data.files[0].rendering.status, "ready")

    const oriented = await repository.updateImageOrientation({
      caseId: created.data.id,
      imageId: firstImport.data[0].id,
      orientation: { laterality: "right", radiographicView: "mediolateral" },
    })
    assert.equal(oriented.ok, true)
    if (!oriented.ok) return
    assert.equal(oriented.data.laterality, "right")
    assert.equal(oriented.data.radiographicView, "mediolateral")

    const input = {
      caseId: created.data.id,
      imageId: firstImport.data[0].id,
      marker: { kind: "line", start: { x: 20, y: 30 }, end: { x: 120, y: 30 } },
      referenceSizeMm: 25,
      expectedRevision: null,
    }
    const saved = await repository.saveImageCalibration(input)
    assert.equal(saved.ok, true)
    if (!saved.ok) return
    assert.equal(saved.data.revision, 1)
    assert.deepEqual(saved.data.pixelSpacing, { rowMm: 0.25, columnMm: 0.25 })

    assert.deepEqual(await repository.saveImageCalibration(input), {
      error: { code: "CALIBRATION_CONFLICT", retryable: false }, ok: false,
    })
    const replacement = await repository.saveImageCalibration({ ...input, expectedRevision: 1, referenceSizeMm: 20 })
    assert.equal(replacement.ok, true)
    if (!replacement.ok) return
    assert.equal(replacement.data.revision, 2)

    await repository.importFiles({
      caseId: created.data.id,
      files: [new File(["image"], "craniocaudal.jpg", { type: "image/jpeg" })],
    })
    const reopened = await repository.getCaseWorkspace(created.data.id)
    assert.equal(reopened.ok, true)
    if (!reopened.ok) return
    assert.equal(reopened.data.files.length, 3)
    assert.equal(reopened.data.files[0].calibration.revision, 2)
    assert.equal(reopened.data.files[0].laterality, "right")
    assert.equal(reopened.data.files[2].calibration, null)

    reopened.data.files[0].calibration.marker.start.x = 999
    const reopenedAgain = await repository.getCaseWorkspace(created.data.id)
    assert.equal(reopenedAgain.data.files[0].calibration.marker.start.x, 20)
  } finally {
    globalThis.Image = OriginalImage
  }
})

test("renames, duplicates and deletes images without losing shared files or calibration", async (t) => {
  const OriginalImage = globalThis.Image
  globalThis.Image = class {
    naturalWidth = 400
    naturalHeight = 300
    set src(_url) { queueMicrotask(() => this.onload?.()) }
  }
  const revoked = []
  t.mock.method(URL, "revokeObjectURL", (url) => revoked.push(url))
  try {
    const repository = createInMemoryCasesAdapter()
    const created = await repository.createCase(validInput)
    const caseId = created.data.id
    const imported = await repository.importFiles({ caseId, files: [
      new File(["first"], "lateral.png", { type: "image/png" }),
      new File(["second"], "frontal.png", { type: "image/png" }),
      new File(["report"], "report.pdf", { type: "application/pdf" }),
    ] })
    const imageId = imported.data[0].id
    const saved = await repository.saveImageCalibration({ caseId, imageId,
      marker: { kind: "line", start: { x: 20, y: 30 }, end: { x: 120, y: 30 } },
      referenceSizeMm: 25, expectedRevision: null,
    })
    assert.equal(saved.ok, true)
    const renamed = await repository.renameImage({ caseId, imageId, name: "  Joelho direito.png  " })
    assert.equal(renamed.ok, true)
    assert.equal(renamed.data.file.name, "Joelho direito.png")
    assert.equal(renamed.data.file.uploadedAt, imported.data[0].uploadedAt)
    assert.deepEqual(renamed.data.calibration, saved.data)

    const copied = await repository.duplicateImage({ caseId, imageId, name: "Joelho direito (cópia).png" })
    assert.equal(copied.ok, true)
    assert.notEqual(copied.data.file.id, imageId)
    assert.equal(copied.data.originalUrl, renamed.data.originalUrl)
    assert.equal(copied.data.calibration.imageId, copied.data.file.id)
    assert.deepEqual(copied.data.calibration.pixelSpacing, saved.data.pixelSpacing)
    const copyCalibration = await repository.saveImageCalibration({ caseId, imageId: copied.data.file.id,
      marker: copied.data.calibration.marker, referenceSizeMm: 50, expectedRevision: 1,
    })
    assert.equal(copyCalibration.ok, true)
    let workspace = await repository.getCaseWorkspace(caseId)
    assert.equal(workspace.data.case.fileCount, 4)
    assert.equal(workspace.data.files[0].calibration.referenceSizeMm, 25)
    assert.equal(workspace.data.files[1].calibration.referenceSizeMm, 50)
    copied.data.calibration.marker.start.x = 999
    assert.equal((await repository.getCaseWorkspace(caseId)).data.files[1].calibration.marker.start.x, 20)

    assert.deepEqual(await repository.deleteImage({ caseId, imageId }), { data: null, ok: true })
    workspace = await repository.getCaseWorkspace(caseId)
    assert.equal(workspace.data.case.fileCount, 3)
    assert.equal(workspace.data.case.thumbnailUrl, copied.data.rendering.url)
    assert.deepEqual(revoked, [])
    await repository.deleteImage({ caseId, imageId: copied.data.file.id })
    workspace = await repository.getCaseWorkspace(caseId)
    assert.equal(workspace.data.case.fileCount, 2)
    assert.equal(workspace.data.case.thumbnailUrl, workspace.data.files[0].rendering.url)
    assert.deepEqual(revoked, [renamed.data.originalUrl])
    await repository.deleteImage({ caseId, imageId: imported.data[1].id })
    workspace = await repository.getCaseWorkspace(caseId)
    assert.equal(workspace.data.case.fileCount, 1)
    assert.equal(workspace.data.case.thumbnailUrl, null)
    assert.equal(workspace.data.files[0].kind, "attachment")
  } finally {
    globalThis.Image = OriginalImage
  }
})

test("rejects invalid names, cross-case operations and missing images", async () => {
  const repository = createInMemoryCasesAdapter()
  const caseId = (await repository.createCase(validInput)).data.id
  const otherCaseId = (await repository.createCase(validInput)).data.id
  const imported = await repository.importFiles({ caseId, files: [
    { name: "exam.dcm", size: 100, type: "application/dicom" },
    { name: "report.pdf", size: 100, type: "application/pdf" },
  ] })
  const imageId = imported.data[0].id
  for (const name of ["", " .dcm", "exam.png", "../exam.dcm", "folder\\exam.dcm", "bad\u0000.dcm", `${"a".repeat(256)}.dcm`]) {
    for (const operation of ["renameImage", "duplicateImage"]) {
      assert.deepEqual(await repository[operation]({ caseId, imageId, name }), {
        error: { code: "VALIDATION_ERROR", retryable: false }, ok: false,
      })
    }
  }
  for (const operation of ["renameImage", "duplicateImage", "deleteImage"]) {
    assert.deepEqual(await repository[operation]({ caseId: "missing", imageId, name: "renamed.dcm" }), {
      error: { code: "CASE_NOT_FOUND", retryable: false }, ok: false,
    })
    for (const input of [
      { caseId: otherCaseId, imageId },
      { caseId, imageId: "missing" },
      { caseId, imageId: imported.data[1].id },
    ]) {
      assert.deepEqual(await repository[operation]({ ...input, name: "renamed.dcm" }), {
        error: { code: "IMAGE_NOT_FOUND", retryable: false }, ok: false,
      })
    }
    await assert.rejects(repository[operation]({ caseId, imageId, name: "renamed.dcm" }, { signal: AbortSignal.abort() }), { name: "AbortError" })
  }
  const workspace = await repository.getCaseWorkspace(caseId)
  assert.equal(workspace.data.case.fileCount, 2)
  assert.equal(workspace.data.files[0].file.name, "exam.dcm")
})

test("generates unique copy names within the filename limit", async () => {
  const { createImageCopyName } = await import("../src/features/cases/lib/case-image-name.ts")
  assert.equal(createImageCopyName("exam.png", "cópia", ["exam (cópia).png", "exam (cópia 2).png"]), "exam (cópia 3).png")
  const longCopy = createImageCopyName(`${"a".repeat(251)}.png`, "copy", [])
  assert.equal(longCopy.length, 255)
  assert.ok(longCopy.endsWith(" (copy).png"))
})

test("never simulates persistence in the frontend-only production adapter", async () => {
  const repository = createFrontendOnlyCasesAdapter()
  assert.deepEqual(await repository.listCases(), { data: [], ok: true })
  assert.deepEqual(await repository.createCase(validInput), {
    error: { code: "CASES_UNAVAILABLE", retryable: false },
    ok: false,
  })
  assert.deepEqual(await repository.importFiles({ caseId: "case-1", files: [] }), {
    error: { code: "FILES_UNAVAILABLE", retryable: false },
    ok: false,
  })
  assert.deepEqual(await repository.getCaseWorkspace("case-1"), {
    error: { code: "CASES_UNAVAILABLE", retryable: false }, ok: false,
  })
  assert.deepEqual(await repository.saveImageCalibration({
    caseId: "case-1", imageId: "image-1", expectedRevision: null,
    marker: { kind: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
    referenceSizeMm: 25,
  }), {
    error: { code: "CALIBRATION_UNAVAILABLE", retryable: false }, ok: false,
  })
  assert.deepEqual(await repository.updateImageOrientation({
    caseId: "case-1", imageId: "image-1",
    orientation: { laterality: "left", radiographicView: "mediolateral" },
  }), {
    error: { code: "ORIENTATION_UNAVAILABLE", retryable: false }, ok: false,
  })
  for (const operation of ["renameImage", "duplicateImage", "deleteImage"]) {
    assert.deepEqual(await repository[operation]({ caseId: "case-1", imageId: "image-1", name: "exam.png" }), {
      error: { code: "FILES_UNAVAILABLE", retryable: false }, ok: false,
    })
  }
})
