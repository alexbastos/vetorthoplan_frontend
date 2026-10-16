import type { paths } from "./generated/authentication-api"

type HttpMethod = "delete" | "get" | "patch" | "post" | "put"
type ApiPath = keyof paths
type ApiMethod<Path extends ApiPath> = Extract<keyof paths[Path], HttpMethod>
type ApiOperation<Path extends ApiPath, Method extends ApiMethod<Path>> = paths[Path][Method]

type JsonContent<Value> = Value extends {
  content: { "application/json": infer Data }
}
  ? Data
  : never

type RequestBody<Operation> = Operation extends { requestBody?: infer Body }
  ? JsonContent<Body>
  : never

type QueryParameters<Operation> = Operation extends {
  parameters: { query: infer Query extends object }
}
  ? Query
  : never

type ResponseBody<Operation> = Operation extends { responses: infer Responses }
  ? Responses extends Record<PropertyKey, unknown>
    ? JsonContent<Responses[keyof Responses]>
    : never
  : never

type BodyProperty<Operation> = [RequestBody<Operation>] extends [never]
  ? { body?: never }
  : { body: RequestBody<Operation> }

type QueryProperty<Operation> = [QueryParameters<Operation>] extends [never]
  ? { query?: never }
  : { query: QueryParameters<Operation> }

type ApiRequestMetadata<Path extends ApiPath, Method extends ApiMethod<Path>> = {
  path: Path
  method: Method
  headers?: HeadersInit
  pathParams?: Record<string, string>
  signal?: AbortSignal
} & QueryProperty<ApiOperation<Path, Method>>

type TypedApiRequest<Path extends ApiPath, Method extends ApiMethod<Path>> = ApiRequestMetadata<Path, Method> &
  BodyProperty<ApiOperation<Path, Method>>

type TypedFormDataRequest<Path extends ApiPath, Method extends ApiMethod<Path>> = ApiRequestMetadata<Path, Method> & {
  body: FormData
}

type HttpResult<Data> = {
  data: Data | undefined
  headers: Headers
  response: Response
  status: number
}

type ApiHttpClientOptions = {
  baseUrl: string
  fetch?: typeof fetch
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 10_000

class ApiHttpClient {
  private readonly baseUrl: URL
  private readonly fetchImplementation: typeof fetch
  private readonly timeoutMs: number

  constructor({ baseUrl, fetch: fetchImplementation = fetch, timeoutMs = DEFAULT_TIMEOUT_MS }: ApiHttpClientOptions) {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new Error("timeoutMs must be a positive finite number")
    }

    this.baseUrl = new URL(baseUrl)
    this.fetchImplementation = fetchImplementation
    this.timeoutMs = timeoutMs
  }

  async request<Path extends ApiPath, Method extends ApiMethod<Path>>(
    request: TypedApiRequest<Path, Method>
  ): Promise<HttpResult<ResponseBody<ApiOperation<Path, Method>>>> {
    return this.send(
      request,
      request.body === undefined ? undefined : JSON.stringify(request.body),
      request.body === undefined ? undefined : "application/json"
    )
  }

  async requestFormData<Path extends ApiPath, Method extends ApiMethod<Path>>(
    request: TypedFormDataRequest<Path, Method>
  ): Promise<HttpResult<ResponseBody<ApiOperation<Path, Method>>>> {
    return this.send(request, request.body)
  }

  private async send<Path extends ApiPath, Method extends ApiMethod<Path>>(
    request: ApiRequestMetadata<Path, Method>,
    body: BodyInit | undefined,
    contentType?: string
  ): Promise<HttpResult<ResponseBody<ApiOperation<Path, Method>>>> {
    const timeoutController = new AbortController()
    const timeout = setTimeout(() => timeoutController.abort(), this.timeoutMs)
    const signal = request.signal
      ? AbortSignal.any([request.signal, timeoutController.signal])
      : timeoutController.signal
    const headers = new Headers({ accept: "application/json" })

    new Headers(request.headers).forEach((value, name) => headers.set(name, value))

    if (contentType && !headers.has("content-type")) {
      headers.set("content-type", contentType)
    }

    try {
      const response = await this.fetchImplementation(
        this.resolveUrl(request.path, request.pathParams, request.query),
        {
          body,
          cache: "no-store",
          headers,
          method: request.method.toUpperCase(),
          redirect: "manual",
          signal,
        }
      )

      return {
        data: (await readJsonBody(response)) as ResponseBody<ApiOperation<Path, Method>> | undefined,
        headers: response.headers,
        response,
        status: response.status,
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  private resolveUrl(path: string, pathParams?: Record<string, string>, query?: object) {
    const resolvedPath = path.replace(/\{([^}]+)\}/g, (placeholder, name: string) => {
      const value = pathParams?.[name]

      if (!value) {
        throw new Error(`Missing API path parameter: ${name}`)
      }

      return encodeURIComponent(value)
    })
    const url = new URL(resolvedPath, this.baseUrl)

    if (url.origin !== this.baseUrl.origin) {
      throw new Error("The API path must resolve to the configured API origin")
    }

    for (const [name, value] of Object.entries(query ?? {})) {
      appendQueryParameter(url.searchParams, name, value)
    }

    return url
  }
}

function appendQueryParameter(searchParams: URLSearchParams, name: string, value: unknown): void {
  if (value === undefined) {
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item) => appendQueryParameter(searchParams, name, item))
    return
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    searchParams.append(name, String(value))
    return
  }

  throw new TypeError(`Unsupported API query parameter: ${name}`)
}

async function readJsonBody(response: Response): Promise<unknown | undefined> {
  if (response.status === 204 || !response.headers.get("content-type")?.includes("application/json")) {
    return undefined
  }

  const body = await response.text()
  return body ? JSON.parse(body) : undefined
}

export { ApiHttpClient }
export type { ApiHttpClientOptions, HttpResult, TypedApiRequest, TypedFormDataRequest }
