import { queryOptions, type QueryClient } from "@tanstack/react-query"

import { casesQueryKeys as keys } from "../hooks/cases-query-keys"
import { fetchImagePlan, ImagePlanError } from "../services/image-plan-api"
import { isCalibrationSaveLocked, isPlanImageDeleted, type PlanIdentity } from "./calibration-save-state"

function imagePlanQueryOptions(client: QueryClient, identity: PlanIdentity, options: { fetchImpl?: typeof fetch; enabled?: boolean } = {}) {
  return queryOptions({
    queryKey: keys.imagePlan(identity.caseId, identity.imageId),
    queryFn: async ({ signal }) => {
      if (isPlanImageDeleted(client, identity)) throw new ImagePlanError("IMAGE_NOT_FOUND")
      const plan = await fetchImagePlan(identity.caseId, identity.imageId, { fetchImpl: options.fetchImpl, signal })
      if (isPlanImageDeleted(client, identity)) throw new ImagePlanError("IMAGE_NOT_FOUND")
      return plan
    },
    enabled: () => options.enabled !== false && Boolean(identity.caseId && identity.imageId)
      && !isPlanImageDeleted(client, identity) && !isCalibrationSaveLocked(client, identity.caseId, identity.imageId),
    retry: false, refetchOnWindowFocus: false, staleTime: 0,
  })
}

export { imagePlanQueryOptions }
