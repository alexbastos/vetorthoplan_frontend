import type {
  CaseListPage,
  CaseStatus,
  ClinicalCase,
  ClinicalImage,
  CompletedImageUpload,
  CreateCasePayload,
  ImagePlan,
  ImageUploadSession,
  IngestionJob,
  PlanDocument,
} from "../types"

type ClinicalResult<T> =
  | { data: T; ok: true; status: number }
  | { error: string; ok: false; status: number; errorCode?: string; details?: Record<string, unknown>; fieldErrors?: Record<string, string> }

async function request<T>(path: string, init?: RequestInit): Promise<ClinicalResult<T>> {
  try {
    const headers = new Headers(init?.headers)
    if (init?.body && !headers.has("content-type")) headers.set("content-type", "application/json")
    const response = await fetch(path, {
      ...init,
      cache: "no-store",
      credentials: "same-origin",
      headers,
    })
    const data: unknown = await response.json().catch(() => undefined)
    if (!response.ok) {
      return {
        error: readError(data),
        ok: false,
        status: response.status,
        errorCode: readErrorCode(data),
        details: readErrorDetails(data),
        fieldErrors: readFieldErrors(data),
      }
    }
    return { data: data as T, ok: true, status: response.status }
  } catch {
    return { error: "Não foi possível acessar o serviço clínico.", ok: false, status: 503 }
  }
}

function readError(value: unknown): string {
  if (isRecord(value) && isRecord(value.error) && typeof value.error.code === "string") {
    return value.error.code
  }
  if (isRecord(value) && typeof value.message === "string") return value.message
  return "A operação clínica não pôde ser concluída."
}

function readFieldErrors(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined
  const payload = isRecord(value.error) ? value.error : value
  if (!isRecord(payload.details)) return undefined
  const errors = payload.details.errors
  if (Array.isArray(errors)) {
    return Object.fromEntries(errors.flatMap((item) => {
      if (!isRecord(item) || typeof item.field !== "string" || typeof item.type !== "string") return []
      return [[item.field, validationMessage(item.type)]]
    }))
  }
  if (typeof payload.details.field === "string") return { [payload.details.field]: String(payload.message ?? "invalid") }
  return undefined
}

function errorPayload(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined
  return isRecord(value.error) ? value.error : value
}

function readErrorCode(value: unknown): string | undefined {
  const payload = errorPayload(value)
  return typeof payload?.code === "string" ? payload.code : undefined
}

function readErrorDetails(value: unknown): Record<string, unknown> | undefined {
  const payload = errorPayload(value)
  return isRecord(payload?.details) ? payload.details : undefined
}

function validationMessage(type: string): string {
  return ({
    greater_than: "O valor precisa ser maior que o mínimo.",
    greater_than_equal: "O valor está abaixo do mínimo permitido.",
    less_than_equal: "O valor ultrapassa o máximo permitido.",
    string_too_long: "O texto ultrapassa o limite de caracteres.",
    string_too_short: "Preencha este campo.",
    decimal_max_digits: "O número possui mais dígitos do que o permitido.",
    decimal_max_places: "Use no máximo duas casas decimais.",
    enum: "Selecione uma opção válida.",
    date_from_datetime_parsing: "Informe uma data válida.",
  } satisfies Record<string, string>)[type] ?? "Revise este campo."
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

const clinicalBffClient = {
  createCase: (payload: CreateCasePayload, idempotencyKey: string) => request<ClinicalCase>(
    "/api/clinical/cases",
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(payload),
    },
  ),
  getCase: (caseId: string) => request<ClinicalCase>(`/api/clinical/cases/${encodeURIComponent(caseId)}`),
  listCases: (filters: { limit?: number; cursor?: string; status?: CaseStatus; search?: string } = {}) => {
    const query = new URLSearchParams({ limit: String(filters.limit ?? 20) })
    if (filters.cursor) query.set("cursor", filters.cursor)
    if (filters.status) query.set("status", filters.status)
    if (filters.search) query.set("search", filters.search)
    return request<CaseListPage>(`/api/clinical/cases?${query}`)
  },
  listImages: (caseId: string) => request<{ items: ClinicalImage[] }>(
    `/api/clinical/cases/${encodeURIComponent(caseId)}/images`,
  ),
  createImageUpload: (caseId: string, metadata: { original_filename: string; media_type: string; size_bytes: number; sha256: string }) => request<ImageUploadSession>(
    `/api/clinical/cases/${encodeURIComponent(caseId)}/image-uploads`,
    { method: "POST", body: JSON.stringify(metadata) },
  ),
  completeImageUpload: (uploadId: string) => request<CompletedImageUpload>(
    `/api/clinical/image-uploads/${encodeURIComponent(uploadId)}/complete`,
    { method: "POST" },
  ),
  getIngestionJob: (jobId: string) => request<IngestionJob>(
    `/api/clinical/jobs/${encodeURIComponent(jobId)}`,
  ),
  getPlan: (imageId: string) => request<ImagePlan>(`/api/clinical/images/${encodeURIComponent(imageId)}/plan`),
  savePlan: (imageId: string, baseRevision: number, document: PlanDocument) => request<ImagePlan>(
    `/api/clinical/images/${encodeURIComponent(imageId)}/plan`,
    { method: "PUT", body: JSON.stringify({ base_revision: baseRevision, document }) },
  ),
}

export { clinicalBffClient }
export type { ClinicalResult }
