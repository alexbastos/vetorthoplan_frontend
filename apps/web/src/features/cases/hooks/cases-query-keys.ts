const casesQueryKeys = {
  all: ["cases"] as const,
  list: () => [...casesQueryKeys.all, "list"] as const,
  tploClinicalProtocol: () => [...casesQueryKeys.all, "tplo-clinical-protocol"] as const,
  tploRotationTable: (query: { tpa_degrees?: number; blade_diameter_mm?: number }) =>
    [...casesQueryKeys.all, "tplo-rotation-table", query.tpa_degrees ?? null, query.blade_diameter_mm ?? null] as const,
  listPage: (status: string | null, search: string) => [...casesQueryKeys.list(), status, search] as const,
  detail: (caseId: string) => [...casesQueryKeys.all, "detail", caseId] as const,
  images: (caseId: string) => [...casesQueryKeys.all, "images", caseId] as const,
  ingestionJob: (caseId: string, jobId: string) => [...casesQueryKeys.all, "ingestion-job", caseId, jobId] as const,
  ingestionRetry: (caseId: string, jobId: string) => [...casesQueryKeys.all, "ingestion-retry", caseId, jobId] as const,
  imageIngestionJob: (caseId: string, imageId: string) => [...casesQueryKeys.all, "image-ingestion-job", caseId, imageId] as const,
  activeIngestions: (caseId: string) => [...casesQueryKeys.all, "active-ingestions", caseId] as const,
  uploadCancellation: (caseId: string, uploadId: string) => [...casesQueryKeys.all, "upload-cancellation", caseId, uploadId] as const,
  imageDeletion: (caseId: string, imageId: string) => [...casesQueryKeys.all, "image-deletion", caseId, imageId] as const,
  imageRename: (caseId: string, imageId: string) => [...casesQueryKeys.all, "image-rename", caseId, imageId] as const,
  imagePlan: (caseId: string, imageId: string) => [...casesQueryKeys.all, "image-plan", caseId, imageId] as const,
  imagePlanSave: (caseId: string, imageId: string) => [...casesQueryKeys.all, "image-plan-save", caseId, imageId] as const,
  imageCalibrationDraft: (caseId: string, imageId: string) => [...casesQueryKeys.all, "image-calibration-draft", caseId, imageId] as const,
  imageQualityDraft: (caseId: string, imageId: string) => [...casesQueryKeys.all, "image-quality-draft", caseId, imageId] as const,
  imageDisplaySettings: (caseId: string, imageId: string) => [...casesQueryKeys.all, "image-display-settings", caseId, imageId] as const,
  imageCalibrationIntroduction: (caseId: string, imageId: string) => [...casesQueryKeys.all, "image-calibration-introduction", caseId, imageId] as const,
  caseDeletion: (caseId: string) => [...casesQueryKeys.all, "case-deletion", caseId] as const,
  deletedImages: (caseId: string) => [...casesQueryKeys.all, "deleted-images", caseId] as const,
  preview: (caseId: string, imageId: string) => [...casesQueryKeys.all, "preview", caseId, imageId] as const,
  workspace: (caseId: string) => [...casesQueryKeys.all, "workspace", caseId] as const,
}

export { casesQueryKeys }
