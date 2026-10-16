import { validateCaseFile } from "../lib/case-file-policy"
import { calculateManualPixelSpacing } from "../lib/calculate-manual-calibration"
import { isValidImageName } from "../lib/case-image-name"
import { parseCaseWorkspaceResponse, parseImageCalibrationResponse } from "../schemas/case-workspace.schema"
import { parseCaseResponse, parseCasesListResponse, parseCreateCaseInput } from "../schemas/cases.schema"
import type { CaseFileSummary, CasesRepository, CaseSummary, CreateCaseInput } from "../types/cases"
import type { CaseImageCalibration, CaseWorkspaceFile, CaseWorkspaceImage } from "../types/case-workspace"

function createInMemoryCasesAdapter(initialCases: readonly CaseSummary[] = []): CasesRepository {
  const validatedInitialCases = parseCasesListResponse({ cases: initialCases })

  if (!validatedInitialCases) {
    throw new TypeError("Invalid initial cases supplied to the in-memory adapter")
  }

  let cases = validatedInitialCases.map(cloneCaseSummary)
  const filesByCaseId = new Map<string, CaseWorkspaceFile[]>()

  function updateCaseFiles(caseId: string, files: CaseWorkspaceFile[]) {
    filesByCaseId.set(caseId, files)
    const thumbnail = files.find((file) => file.kind === "image" && file.rendering.status === "ready")
    cases = cases.map((item) => item.id === caseId ? {
      ...item,
      fileCount: files.length,
      thumbnailUrl: thumbnail?.kind === "image" && thumbnail.rendering.status === "ready" ? thumbnail.rendering.url : null,
      updatedAt: new Date().toISOString(),
    } : item)
  }

  return {
    async createCase(input, request) {
      request?.signal?.throwIfAborted()
      const validatedInput = parseCreateCaseInput(input)

      if (!validatedInput) {
        return {
          error: { code: "VALIDATION_ERROR", retryable: false },
          ok: false,
        }
      }

      const createdCase = createCaseSummary(validatedInput)

      if (!createdCase) {
        return {
          error: { code: "INVALID_RESPONSE", retryable: false },
          ok: false,
        }
      }

      cases = [createdCase, ...cases]
      return { data: cloneCaseSummary(createdCase), ok: true }
    },

    async importFiles(input, request) {
      request?.signal?.throwIfAborted()

      if (!cases.some((caseSummary) => caseSummary.id === input.caseId)) {
        return {
          error: { code: "CASE_NOT_FOUND", retryable: false },
          ok: false,
        }
      }

      if (input.files.length === 0 || input.files.some((file) => !validateCaseFile(file).ok)) {
        return {
          error: { code: "VALIDATION_ERROR", retryable: false },
          ok: false,
        }
      }

      const uploadedAt = new Date().toISOString()
      const importedFiles = input.files.map<CaseFileSummary>((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        uploadedAt,
      }))

      const workspaceFiles = await Promise.all(input.files.map((file, index) =>
        createWorkspaceFile(file, importedFiles[index])))
      if (request?.signal?.aborted) {
        revokeOriginalUrls(workspaceFiles)
        request.signal.throwIfAborted()
      }
      const allFiles = [...(filesByCaseId.get(input.caseId) ?? []), ...workspaceFiles]
      filesByCaseId.set(input.caseId, allFiles)
      const thumbnailUrl = allFiles.find((file) =>
        file.kind === "image" && file.rendering.status === "ready")
      const thumbnail = thumbnailUrl?.kind === "image" && thumbnailUrl.rendering.status === "ready"
        ? thumbnailUrl.rendering.url : null
      cases = cases.map((caseSummary) => caseSummary.id === input.caseId
        ? {
            ...caseSummary,
            fileCount: allFiles.length,
            thumbnailUrl: thumbnail,
            updatedAt: new Date().toISOString(),
          }
        : caseSummary)
      return { data: importedFiles.map(cloneCaseFileSummary), ok: true }
    },

    async getCaseWorkspace(caseId, request) {
      request?.signal?.throwIfAborted()
      const caseSummary = cases.find((item) => item.id === caseId)
      if (!caseSummary) return { error: { code: "CASE_NOT_FOUND", retryable: false }, ok: false }

      const workspace = parseCaseWorkspaceResponse({
        case: cloneCaseSummary(caseSummary),
        files: (filesByCaseId.get(caseId) ?? []).map(cloneWorkspaceFile),
      })
      return workspace
        ? { data: workspace, ok: true }
        : { error: { code: "INVALID_RESPONSE", retryable: false }, ok: false }
    },

    async saveImageCalibration(input, request) {
      request?.signal?.throwIfAborted()
      if (!cases.some((item) => item.id === input.caseId)) {
        return { error: { code: "CASE_NOT_FOUND", retryable: false }, ok: false }
      }

      const workspaceFiles = filesByCaseId.get(input.caseId) ?? []
      const image = workspaceFiles.find((file) => file.kind === "image" && file.file.id === input.imageId)
      if (!image || image.kind !== "image") {
        return { error: { code: "IMAGE_NOT_FOUND", retryable: false }, ok: false }
      }
      if (image.rendering.status !== "ready") {
        return { error: { code: "IMAGE_NOT_READY", retryable: false }, ok: false }
      }
      if (image.calibration?.revision !== (input.expectedRevision ?? undefined)) {
        return { error: { code: "CALIBRATION_CONFLICT", retryable: false }, ok: false }
      }

      const pixelSpacing = calculateManualPixelSpacing(image.rendering, input.marker, input.referenceSizeMm)
      if (!pixelSpacing) {
        return { error: { code: "VALIDATION_ERROR", retryable: false }, ok: false }
      }

      const timestamp = new Date().toISOString()
      const calibration: CaseImageCalibration = {
        imageId: image.file.id,
        marker: cloneMarker(input.marker),
        referenceSizeMm: input.referenceSizeMm,
        pixelSpacing,
        revision: (image.calibration?.revision ?? 0) + 1,
        createdAt: image.calibration?.createdAt ?? timestamp,
        createdBy: image.calibration?.createdBy ?? "development-user",
        updatedAt: timestamp,
        updatedBy: "development-user",
      }
      const response = parseImageCalibrationResponse(cloneCalibration(calibration))
      if (!response) return { error: { code: "INVALID_RESPONSE", retryable: false }, ok: false }

      filesByCaseId.set(input.caseId, workspaceFiles.map((file) => file === image
        ? { ...image, calibration } : file))
      cases = cases.map((item) => item.id === input.caseId ? { ...item, updatedAt: timestamp } : item)
      return { data: response, ok: true }
    },

    async updateImageOrientation(input, request) {
      request?.signal?.throwIfAborted()
      if (!cases.some((item) => item.id === input.caseId)) {
        return { error: { code: "CASE_NOT_FOUND", retryable: false }, ok: false }
      }
      const workspaceFiles = filesByCaseId.get(input.caseId) ?? []
      const image = workspaceFiles.find((file) => file.kind === "image" && file.file.id === input.imageId)
      if (!image || image.kind !== "image") {
        return { error: { code: "IMAGE_NOT_FOUND", retryable: false }, ok: false }
      }
      const { laterality, radiographicView } = input.orientation
      if ((laterality !== null && laterality !== "left" && laterality !== "right")
        || (radiographicView !== null && radiographicView !== "craniocaudal"
          && radiographicView !== "mediolateral" && radiographicView !== "other")) {
        return { error: { code: "VALIDATION_ERROR", retryable: false }, ok: false }
      }

      const updated: CaseWorkspaceImage = { ...image, laterality, radiographicView }
      filesByCaseId.set(input.caseId, workspaceFiles.map((file) => file === image ? updated : file))
      cases = cases.map((item) => item.id === input.caseId
        ? { ...item, updatedAt: new Date().toISOString() } : item)
      return { data: cloneWorkspaceImage(updated), ok: true }
    },

    async renameImage(input, request) {
      request?.signal?.throwIfAborted()
      if (!cases.some((item) => item.id === input.caseId)) {
        return { error: { code: "CASE_NOT_FOUND", retryable: false }, ok: false }
      }
      const files = filesByCaseId.get(input.caseId) ?? []
      const image = files.find((file) => file.kind === "image" && file.file.id === input.imageId)
      if (!image || image.kind !== "image") {
        return { error: { code: "IMAGE_NOT_FOUND", retryable: false }, ok: false }
      }
      const name = input.name.trim()
      if (!isValidImageName(name, image.file.name)) {
        return { error: { code: "VALIDATION_ERROR", retryable: false }, ok: false }
      }
      const updated = { ...image, file: { ...image.file, name } }
      updateCaseFiles(input.caseId, files.map((file) => file === image ? updated : file))
      return { data: cloneWorkspaceImage(updated), ok: true }
    },

    async duplicateImage(input, request) {
      request?.signal?.throwIfAborted()
      if (!cases.some((item) => item.id === input.caseId)) {
        return { error: { code: "CASE_NOT_FOUND", retryable: false }, ok: false }
      }
      const files = filesByCaseId.get(input.caseId) ?? []
      const image = files.find((file) => file.kind === "image" && file.file.id === input.imageId)
      if (!image || image.kind !== "image") {
        return { error: { code: "IMAGE_NOT_FOUND", retryable: false }, ok: false }
      }
      const name = input.name.trim()
      if (!isValidImageName(name, image.file.name)) {
        return { error: { code: "VALIDATION_ERROR", retryable: false }, ok: false }
      }
      const id = crypto.randomUUID()
      const timestamp = new Date().toISOString()
      const copy: CaseWorkspaceImage = {
        ...cloneWorkspaceImage(image),
        file: { ...image.file, id, name },
        calibration: image.calibration ? {
          ...cloneCalibration(image.calibration), imageId: id, revision: 1,
          createdAt: timestamp, updatedAt: timestamp,
          createdBy: "development-user", updatedBy: "development-user",
        } : null,
      }
      const position = files.indexOf(image)
      updateCaseFiles(input.caseId, [...files.slice(0, position + 1), copy, ...files.slice(position + 1)])
      return { data: cloneWorkspaceImage(copy), ok: true }
    },

    async deleteImage(input, request) {
      request?.signal?.throwIfAborted()
      if (!cases.some((item) => item.id === input.caseId)) {
        return { error: { code: "CASE_NOT_FOUND", retryable: false }, ok: false }
      }
      const files = filesByCaseId.get(input.caseId) ?? []
      const image = files.find((file) => file.kind === "image" && file.file.id === input.imageId)
      if (!image || image.kind !== "image") {
        return { error: { code: "IMAGE_NOT_FOUND", retryable: false }, ok: false }
      }
      const remaining = files.filter((file) => file !== image)
      updateCaseFiles(input.caseId, remaining)
      if (image.originalUrl && !remaining.some((file) => file.kind === "image"
        && (file.originalUrl === image.originalUrl || (file.rendering.status === "ready" && file.rendering.url === image.originalUrl)))) {
        URL.revokeObjectURL?.(image.originalUrl)
      }
      return { data: null, ok: true }
    },

    async listCases(request) {
      request?.signal?.throwIfAborted()
      return { data: cases.map(cloneCaseSummary), ok: true }
    },
  }
}

function createCaseSummary(input: CreateCaseInput): CaseSummary | undefined {
  const timestamp = new Date().toISOString()

  return parseCaseResponse({
    case: {
      clinicalNotes: input.clinicalNotes,
      createdAt: timestamp,
      fileCount: 0,
      id: crypto.randomUUID(),
      patient: {
        age: input.patient.age,
        breed: input.patient.breed,
        name: input.patient.name,
        sex: input.patient.sex,
        species: input.patient.species,
        weightKg: input.patient.weightKg,
      },
      status: "draft",
      thumbnailUrl: null,
      title: input.title,
      updatedAt: timestamp,
    },
  })
}

async function createWorkspaceFile(file: File, summary: CaseFileSummary): Promise<CaseWorkspaceFile> {
  const extension = file.name.split(".").pop()?.toLowerCase()
  if (extension === "pdf" || extension === "mp4") {
    return { kind: "attachment", file: summary, format: extension }
  }

  const format = extension === "dcm" ? "dicom" : extension === "png" ? "png" : "jpeg"
  const originalUrl = typeof Blob !== "undefined" && file instanceof Blob
    && typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : null

  if (format === "dicom" || !originalUrl || typeof Image === "undefined") {
    return {
      kind: "image", file: summary, format, originalUrl,
      rendering: { status: "unavailable", reason: "renderer-unavailable" },
      laterality: null, radiographicView: null, dicomScaleEvidence: null,
      calibration: null,
    }
  }

  const dimensions = await readImageDimensions(originalUrl)
  return {
    kind: "image", file: summary, format, originalUrl,
    rendering: dimensions
      ? { status: "ready", url: originalUrl, ...dimensions, pixelAspectRatio: 1 }
      : { status: "unavailable", reason: "invalid-image" },
    laterality: null, radiographicView: null, dicomScaleEvidence: null,
    calibration: null,
  }
}

function readImageDimensions(url: string): Promise<{ widthPx: number; heightPx: number } | null> {
  return new Promise((resolve) => {
    const image = new Image()

    image.onload = () => resolve(image.naturalWidth > 0 && image.naturalHeight > 0
      ? { widthPx: image.naturalWidth, heightPx: image.naturalHeight } : null)
    image.onerror = () => resolve(null)
    image.src = url
  })
}

function revokeOriginalUrls(files: readonly CaseWorkspaceFile[]) {
  for (const file of files) {
    if (file.kind === "image" && file.originalUrl) URL.revokeObjectURL?.(file.originalUrl)
  }
}

function cloneWorkspaceFile(file: CaseWorkspaceFile): CaseWorkspaceFile {
  return file.kind === "attachment"
    ? { ...file, file: cloneCaseFileSummary(file.file) }
    : cloneWorkspaceImage(file)
}

function cloneWorkspaceImage(file: CaseWorkspaceImage): CaseWorkspaceImage {
  return {
    ...file,
    file: cloneCaseFileSummary(file.file),
    rendering: { ...file.rendering },
    dicomScaleEvidence: file.dicomScaleEvidence ? {
      ...file.dicomScaleEvidence,
      pixelSpacing: file.dicomScaleEvidence.pixelSpacing ? { ...file.dicomScaleEvidence.pixelSpacing } : null,
      imagerPixelSpacing: file.dicomScaleEvidence.imagerPixelSpacing
        ? { ...file.dicomScaleEvidence.imagerPixelSpacing } : null,
    } : null,
    calibration: file.calibration ? cloneCalibration(file.calibration) : null,
  }
}

function cloneCalibration(calibration: CaseImageCalibration): CaseImageCalibration {
  return {
    ...calibration,
    marker: cloneMarker(calibration.marker),
    pixelSpacing: { ...calibration.pixelSpacing },
  }
}

function cloneMarker<T extends CaseImageCalibration["marker"]>(marker: T): T {
  return (marker.kind === "line"
    ? { ...marker, start: { ...marker.start }, end: { ...marker.end } }
    : { ...marker, center: { ...marker.center } }) as T
}

function cloneCaseSummary(caseSummary: CaseSummary): CaseSummary {
  return {
    ...caseSummary,
    patient: {
      ...caseSummary.patient,
      ...(caseSummary.patient.age ? { age: { ...caseSummary.patient.age } } : {}),
    },
  }
}

function cloneCaseFileSummary(file: CaseFileSummary): CaseFileSummary {
  return { ...file }
}

export { createInMemoryCasesAdapter }
