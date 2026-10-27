import { queryOptions } from "@tanstack/react-query"

import { casesQueryKeys as keys } from "../hooks/cases-query-keys"
import type { TploRotationQuery } from "../schemas/tplo-reference.schema"
import { fetchTploClinicalProtocol, fetchTploRotationTable } from "../services/tplo-reference-api"

type Options = { fetchImpl?: typeof fetch; enabled?: boolean }
function tploClinicalProtocolQueryOptions(options: Options = {}) {
  return queryOptions({ queryKey: keys.tploClinicalProtocol(), queryFn: ({ signal }) => fetchTploClinicalProtocol({ ...options, signal }),
    enabled: options.enabled, retry: false, staleTime: 0, refetchOnWindowFocus: false })
}
function tploRotationTableQueryOptions(query: TploRotationQuery = {}, options: Options = {}) {
  return queryOptions({ queryKey: keys.tploRotationTable(query), queryFn: ({ signal }) => fetchTploRotationTable(query, { ...options, signal }),
    enabled: options.enabled, retry: false, staleTime: 0, refetchOnWindowFocus: false })
}

export { tploClinicalProtocolQueryOptions, tploRotationTableQueryOptions }
