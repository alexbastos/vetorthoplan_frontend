import type { CreateImageUploadRequest } from "@vetorthoplan/api-client/clinical-contract"

type ImageUploadAttempt = Readonly<{
  caseId: string
  input: Readonly<CreateImageUploadRequest>
  key: string
  fingerprint: string
}>

function isValidUploadIdempotencyKey(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= 128
    && value === value.trim() && /^[\x20-\x7e]+$/.test(value)
}

function prepareImageUploadAttempt(
  previous: ImageUploadAttempt | null,
  caseId: string,
  input: CreateImageUploadRequest,
  createKey: () => string = () => crypto.randomUUID(),
): ImageUploadAttempt {
  const fingerprint = JSON.stringify([
    caseId.toLowerCase(), input.original_filename, input.media_type, input.size_bytes, input.sha256,
  ])
  if (previous?.fingerprint === fingerprint) return previous

  return { caseId, input: Object.freeze({ ...input }), key: createKey(), fingerprint }
}

export { isValidUploadIdempotencyKey, prepareImageUploadAttempt }
export type { ImageUploadAttempt }
