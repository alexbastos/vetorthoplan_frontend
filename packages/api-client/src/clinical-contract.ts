import type { components, operations } from "./generated/clinical-api"

/** JSON payload declared for one operation and HTTP status in the clinical OpenAPI. */
export type ClinicalResponse<
  Operation extends keyof operations,
  Status extends keyof operations[Operation]["responses"],
> = operations[Operation]["responses"][Status] extends {
  content: { "application/json": infer Payload }
}
  ? Payload
  : never

export type ClinicalRequest<Operation extends keyof operations> =
  operations[Operation] extends {
    requestBody: { content: { "application/json": infer Payload } }
  }
    ? Payload
    : never

export type ClinicalPath<Operation extends keyof operations> =
  operations[Operation]["parameters"]["path"]

export type ClinicalCaseStatus = components["schemas"]["CaseStatus"]
export type ClinicalError = components["schemas"]["ErrorResponse"]
export type ClinicalValidationError = components["schemas"]["HTTPValidationError"]

export type LiveHealthResponse = ClinicalResponse<"live_health_live_get", 200>
export type ReadyHealthResponse = ClinicalResponse<"ready_health_ready_get", 200>

export type ListCasesQuery = NonNullable<
  operations["list_cases_api_v1_cases_get"]["parameters"]["query"]
>
export type ListCasesResponse = ClinicalResponse<"list_cases_api_v1_cases_get", 200>
export type ListCasesStatusCounts = ListCasesResponse["status_counts"]

export type CreateCaseRequest = ClinicalRequest<"create_case_api_v1_cases_post">
export type CreateCaseHeaders = NonNullable<
  operations["create_case_api_v1_cases_post"]["parameters"]["header"]
>
export type CreateCaseResponse = ClinicalResponse<"create_case_api_v1_cases_post", 201>
export type CreateCaseIdempotencyConflict = ClinicalResponse<"create_case_api_v1_cases_post", 409>
export type CreateCaseValidationError = ClinicalResponse<"create_case_api_v1_cases_post", 422>

export type GetCasePath = ClinicalPath<"get_case_api_v1_cases__case_id__get">
export type GetCaseResponse = ClinicalResponse<"get_case_api_v1_cases__case_id__get", 200>

export type CreateImageUploadPath = ClinicalPath<
  "create_image_upload_api_v1_cases__case_id__image_uploads_post"
>
export type CreateImageUploadRequest = ClinicalRequest<
  "create_image_upload_api_v1_cases__case_id__image_uploads_post"
>
export type CreateImageUploadHeaders = NonNullable<
  operations["create_image_upload_api_v1_cases__case_id__image_uploads_post"]["parameters"]["header"]
>
export type CreateImageUploadResponse = ClinicalResponse<
  "create_image_upload_api_v1_cases__case_id__image_uploads_post",
  201
>

export type CompleteImageUploadPath = ClinicalPath<
  "complete_image_upload_api_v1_image_uploads__upload_id__complete_post"
>
export type CompleteImageUploadResponse = ClinicalResponse<
  "complete_image_upload_api_v1_image_uploads__upload_id__complete_post",
  202
>

export type CancelImageUploadPath = ClinicalPath<"cancel_image_upload_api_v1_image_uploads__upload_id__delete">

export type GetIngestionJobPath = ClinicalPath<"get_ingestion_job_api_v1_jobs__job_id__get">
export type GetIngestionJobResponse = ClinicalResponse<"get_ingestion_job_api_v1_jobs__job_id__get", 200>
export type GetImageIngestionJobPath = ClinicalPath<"get_image_ingestion_job_api_v1_images__image_id__job_get">
export type GetImageIngestionJobResponse = ClinicalResponse<"get_image_ingestion_job_api_v1_images__image_id__job_get", 200>
export type RetryIngestionJobPath = ClinicalPath<"retry_ingestion_job_api_v1_jobs__job_id__retry_post">
export type RetryIngestionJobResponse = ClinicalResponse<"retry_ingestion_job_api_v1_jobs__job_id__retry_post", 202>

export type ListCaseImagesPath = ClinicalPath<"list_case_images_api_v1_cases__case_id__images_get">
export type ListCaseImagesResponse = ClinicalResponse<"list_case_images_api_v1_cases__case_id__images_get", 200>

export type GetImagePath = ClinicalPath<"get_image_api_v1_images__image_id__get">
export type GetImageResponse = ClinicalResponse<"get_image_api_v1_images__image_id__get", 200>
export type DeleteImagePath = ClinicalPath<"delete_image_api_v1_images__image_id__delete">

export type GetImagePreviewPath = ClinicalPath<"get_image_preview_api_v1_images__image_id__preview_get">
export type GetImagePreviewResponse = ClinicalResponse<"get_image_preview_api_v1_images__image_id__preview_get", 200>

export type GetImagePlanPath = ClinicalPath<"get_image_plan_api_v1_images__image_id__plan_get">
export type GetImagePlanResponse = ClinicalResponse<"get_image_plan_api_v1_images__image_id__plan_get", 200>

export type SaveImagePlanPath = ClinicalPath<"save_image_plan_api_v1_images__image_id__plan_put">
export type SaveImagePlanRequest = ClinicalRequest<"save_image_plan_api_v1_images__image_id__plan_put">
export type SaveImagePlanResponse = ClinicalResponse<"save_image_plan_api_v1_images__image_id__plan_put", 200>

export type FinalizeImagePlanPath = ClinicalPath<"finalize_image_plan_api_v1_images__image_id__plan_finalize_post">
export type FinalizeImagePlanRequest = ClinicalRequest<"finalize_image_plan_api_v1_images__image_id__plan_finalize_post">
export type FinalizeImagePlanResponse = ClinicalResponse<"finalize_image_plan_api_v1_images__image_id__plan_finalize_post", 200>
export type GetFinalizedImagePlanPath = ClinicalPath<"get_finalized_image_plan_api_v1_images__image_id__plan_finalization_get">
export type GetFinalizedImagePlanResponse = ClinicalResponse<"get_finalized_image_plan_api_v1_images__image_id__plan_finalization_get", 200>
export type GetTploRotationTableQuery = NonNullable<operations["get_tplo_rotation_table_api_v1_tplo_rotation_table_get"]["parameters"]["query"]>
export type GetTploRotationTableResponse = ClinicalResponse<"get_tplo_rotation_table_api_v1_tplo_rotation_table_get", 200>
export type GetTploClinicalProtocolResponse = ClinicalResponse<"get_tplo_clinical_protocol_api_v1_tplo_clinical_protocol_get", 200>
