import type { CompletedImageUpload } from "./completed-image-upload"

type IngestionReference = Pick<CompletedImageUpload, "caseId" | "imageId" | "uploadId" | "jobId" | "jobStatus">
type IngestionJobIdentity = Pick<IngestionReference, "caseId" | "imageId" | "uploadId" | "jobId">
type ImageIngestionIdentity = Pick<IngestionReference, "caseId" | "imageId" | "uploadId">

export type { ImageIngestionIdentity, IngestionJobIdentity, IngestionReference }
