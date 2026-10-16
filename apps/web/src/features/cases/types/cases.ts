import type { CaseImageCalibration, CaseWorkspace, CaseWorkspaceImage, SaveImageCalibrationInput, UpdateImageOrientationInput } from "./case-workspace"

type CaseStatus = "archived" | "completed" | "draft" | "in-progress"
type PatientSex = "female" | "male" | "not-informed"

type PatientAge =
  | { kind: "approximate-years"; years: number }
  | { birthDate: string; kind: "birth-date" }
  | null

type CasePatientSummary = Readonly<{
  age?: PatientAge
  breed: string | null
  name: string
  sex?: PatientSex
  species: string
  weightKg?: number | null
}>

type CaseSummary = Readonly<{
  clinicalNotes?: string | null
  createdAt: string
  fileCount?: number
  id: string
  patient: CasePatientSummary
  status: CaseStatus
  thumbnailUrl?: string | null
  title: string
  updatedAt: string
}>

type CreateCasePatientInput = Readonly<{
  age: PatientAge
  breed: string | null
  name: string
  sex: PatientSex
  species: string
  weightKg: number | null
}>

type CreateCaseInput = Readonly<{
  clinicalNotes: string | null
  patient: CreateCasePatientInput
  title: string
}>

type CaseFileSummary = Readonly<{
  id: string
  name: string
  size: number
  type: string
  uploadedAt?: string
}>

type ImportCaseFilesInput = Readonly<{
  caseId: string
  files: readonly File[]
}>

type CaseImageInput = Readonly<{ caseId: string; imageId: string }>
type NamedCaseImageInput = CaseImageInput & Readonly<{ name: string }>

type CasesErrorCode =
  | "CASE_NOT_FOUND"
  | "CASES_UNAVAILABLE"
  | "CALIBRATION_CONFLICT"
  | "CALIBRATION_UNAVAILABLE"
  | "FILES_UNAVAILABLE"
  | "IMAGE_NOT_FOUND"
  | "IMAGE_NOT_READY"
  | "INVALID_RESPONSE"
  | "ORIENTATION_UNAVAILABLE"
  | "VALIDATION_ERROR"

type CasesError = Readonly<{
  code: CasesErrorCode
  retryable: boolean
}>

type CasesResult<Data> =
  | { data: Data; ok: true }
  | { error: CasesError; ok: false }

type CasesRepositoryRequest = Readonly<{
  signal?: AbortSignal
}>

/**
 * Seam entre a feature e sua fonte de dados. Cancelamentos usam AbortSignal;
 * falhas operacionais esperadas retornam CasesResult em vez de mensagens remotas.
 */
type CasesRepository = Readonly<{
  createCase: (
    input: CreateCaseInput,
    request?: CasesRepositoryRequest,
  ) => Promise<CasesResult<CaseSummary>>
  importFiles: (
    input: ImportCaseFilesInput,
    request?: CasesRepositoryRequest,
  ) => Promise<CasesResult<readonly CaseFileSummary[]>>
  getCaseWorkspace: (
    caseId: string,
    request?: CasesRepositoryRequest,
  ) => Promise<CasesResult<CaseWorkspace>>
  saveImageCalibration: (
    input: SaveImageCalibrationInput,
    request?: CasesRepositoryRequest,
  ) => Promise<CasesResult<CaseImageCalibration>>
  updateImageOrientation: (
    input: UpdateImageOrientationInput,
    request?: CasesRepositoryRequest,
  ) => Promise<CasesResult<CaseWorkspaceImage>>
  renameImage: (
    input: NamedCaseImageInput,
    request?: CasesRepositoryRequest,
  ) => Promise<CasesResult<CaseWorkspaceImage>>
  duplicateImage: (
    input: NamedCaseImageInput,
    request?: CasesRepositoryRequest,
  ) => Promise<CasesResult<CaseWorkspaceImage>>
  deleteImage: (
    input: CaseImageInput,
    request?: CasesRepositoryRequest,
  ) => Promise<CasesResult<null>>
  listCases: (
    request?: CasesRepositoryRequest,
  ) => Promise<CasesResult<readonly CaseSummary[]>>
}>

export type {
  CaseImageInput,
  NamedCaseImageInput,
  CasesError,
  CasesErrorCode,
  CasesRepository,
  CasesRepositoryRequest,
  CasesResult,
  CaseFileSummary,
  CaseStatus,
  CaseSummary,
  CreateCaseInput,
  CreateCasePatientInput,
  ImportCaseFilesInput,
  PatientAge,
  PatientSex,
}
