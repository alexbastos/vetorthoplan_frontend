import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"

const snapshotPath = new URL("../../../docs/openapi/clinical-api.openapi.json", import.meta.url)
const metadataPath = new URL("../../../docs/openapi/clinical-api.snapshot.json", import.meta.url)
const generatedPath = new URL("../src/generated/clinical-api.ts", import.meta.url)

const metadata = JSON.parse(readFileSync(metadataPath, "utf8"))
const snapshotBytes = readFileSync(snapshotPath)
const sourceBytes = readFileSync(new URL(metadata.sourceFile, snapshotPath))
const generatedBytes = readFileSync(generatedPath)
const document = JSON.parse(snapshotBytes.toString("utf8"))
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex")
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

assert(snapshotBytes.length === metadata.byteLength, "OpenAPI byte length differs from snapshot metadata")
assert(sha256(snapshotBytes) === metadata.sha256, "OpenAPI SHA-256 differs from snapshot metadata")
assert(sourceBytes.length === metadata.sourceByteLength, "Source byte length differs from snapshot metadata")
assert(sha256(sourceBytes) === metadata.sourceSha256, "Source SHA-256 differs from snapshot metadata")
assert(snapshotBytes.equals(sourceBytes), "Canonical OpenAPI differs from the preserved source")
assert(sha256(generatedBytes) === metadata.generatedSha256, "Generated types differ from snapshot metadata")
assert(document.openapi === metadata.openapiVersion, "OpenAPI version differs from snapshot metadata")
assert(document.info.title === metadata.apiTitle, "API title differs from snapshot metadata")
assert(document.info.version === metadata.apiVersion, "API version differs from snapshot metadata")
assert((document.info["x-git-branch"] ?? null) === metadata.backendBranch, "Backend branch differs from snapshot metadata")
assert((document.info["x-git-commit"] ?? null) === metadata.backendRevision, "Backend revision differs from snapshot metadata")
assert((document.info["x-generated-at"] ?? null) === metadata.sourceGeneratedAtUtc, "Source generation time differs from snapshot metadata")
assert(Object.keys(document.paths ?? {}).length === metadata.pathCount, "Path count differs from snapshot metadata")
assert(
  Object.values(document.paths ?? {}).reduce(
    (count, path) => count + Object.keys(path).filter((key) => /^(get|post|put|patch|delete|head|options|trace)$/.test(key)).length,
    0,
  ) === metadata.operationCount,
  "Operation count differs from snapshot metadata",
)
assert(
  Object.keys(document.components?.schemas ?? {}).length === metadata.schemaCount,
  "Schema count differs from snapshot metadata",
)

let referenceCount = 0
const visit = (value) => {
  if (Array.isArray(value)) return value.forEach(visit)
  if (value === null || typeof value !== "object") return
  if (typeof value.$ref === "string") {
    assert(value.$ref.startsWith("#/"), `External reference requires explicit handling: ${value.$ref}`)
    const tokens = value.$ref.slice(2).split("/").map((token) => token.replaceAll("~1", "/").replaceAll("~0", "~"))
    let target = document
    for (const token of tokens) {
      assert(target !== null && typeof target === "object" && Object.hasOwn(target, token), `Unresolved reference: ${value.$ref}`)
      target = target[token]
    }
    referenceCount += 1
  }
  Object.values(value).forEach(visit)
}
visit(document)
assert(referenceCount === metadata.referenceCount, "Resolved reference count differs from snapshot metadata")

const listSchema = document.components.schemas.CaseListResponse
assert(listSchema.required?.includes("next_cursor"), "Case list must require next_cursor")
assert(listSchema.required?.includes("status_counts"), "Case list must require status_counts")
assert(
  listSchema.properties?.status_counts?.propertyNames?.$ref === "#/components/schemas/CaseStatus",
  "Case status counts must use CaseStatus keys",
)

const createCase = document.paths["/api/v1/cases"]?.post
assert(
  createCase?.parameters?.some((parameter) => parameter.in === "header" && parameter.name === "Idempotency-Key"),
  "Case creation must declare Idempotency-Key",
)
assert(
  createCase?.responses?.[409]?.content?.["application/json"]?.schema?.$ref ===
    "#/components/schemas/IdempotencyKeyConflictResponse",
  "Case creation must declare the idempotency conflict response",
)
assert(
  createCase?.responses?.[422]?.content?.["application/json"]?.schema?.$ref ===
    "#/components/schemas/CreateCaseValidationErrorResponse",
  "Case creation must declare typed validation errors",
)

const schemas = document.components.schemas
assert(schemas.CreateCaseRequest.required?.includes("sex"), "Case creation must require sex")
assert(
  schemas.CreateCaseRequest.properties?.sex?.$ref === "#/components/schemas/BiologicalSex",
  "Case creation sex must be a non-null BiologicalSex",
)
for (const field of ["age_source", "age_reference_date"]) {
  assert(schemas.CaseResponse.required?.includes(field), `Case response must declare ${field}`)
}
assert(schemas.ImageResponse.required?.includes("job_id"), "Image response must declare job_id")
for (const status of ["FAILED", "CANCELLED"]) {
  assert(schemas.ImageUploadStatus.enum?.includes(status), `Image status must include ${status}`)
}
assert(
  document.paths["/api/v1/cases/{case_id}/image-uploads"]?.post?.parameters?.some(
    (parameter) => parameter.in === "header" && parameter.name === "Idempotency-Key" && parameter.required === true,
  ),
  "Upload session creation must require Idempotency-Key",
)
for (const [path, method, status] of [
  ["/health/ready", "get", 200],
  ["/api/v1/images/{image_id}/job", "get", 200],
  ["/api/v1/jobs/{job_id}/retry", "post", 202],
  ["/api/v1/image-uploads/{upload_id}", "delete", 204],
  ["/api/v1/images/{image_id}", "delete", 204],
]) {
  assert(document.paths[path]?.[method]?.responses?.[status], `Missing clinical operation: ${method.toUpperCase()} ${path} (${status})`)
}

console.log(`Clinical OpenAPI ${metadata.apiVersion}: ${metadata.pathCount} paths, ${metadata.operationCount} operations, ${metadata.schemaCount} schemas, ${referenceCount} resolved references; checksums OK.`)
