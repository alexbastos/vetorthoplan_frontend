import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({
  resolve(specifier, context, nextResolve) {
    return specifier === "server-only"
      ? { shortCircuit: true, url: "data:text/javascript,export {}" }
      : nextResolve(specifier, context)
  },
})

const {
  assertDocumentNavigationRequest,
  assertTrustedMutationRequest,
  readBoundedRequestBody,
  RequestSecurityError,
} = await import("../src/lib/server/request-security.ts")

const APP_ORIGIN = "https://app.example.com"
const JSON_POLICY = { body: "application/json", method: "POST" }

test("accepts an exact same-origin JSON mutation", async () => {
  const request = createRequest({
    body: "{}",
    headers: {
      "content-type": "application/json; charset=utf-8",
      origin: APP_ORIGIN,
      "sec-fetch-site": "same-origin",
    },
  })

  await assert.doesNotReject(() =>
    assertTrustedMutationRequest(request, APP_ORIGIN, JSON_POLICY)
  )
})

test("rejects missing, cross-origin and same-site browser origins", async () => {
  const candidates = [
    createRequest({ body: "{}", headers: { "content-type": "application/json" } }),
    createRequest({
      body: "{}",
      headers: {
        "content-type": "application/json",
        origin: "https://evil.example",
        "sec-fetch-site": "cross-site",
      },
    }),
    createRequest({
      body: "{}",
      headers: {
        "content-type": "application/json",
        origin: APP_ORIGIN,
        "sec-fetch-site": "same-site",
      },
    }),
  ]

  for (const request of candidates) {
    await assertSecurityError(
      () => assertTrustedMutationRequest(request, APP_ORIGIN, JSON_POLICY),
      403,
      "origin_not_trusted"
    )
  }
})

test("uses exact Origin when Fetch Metadata is missing or unknown", async () => {
  for (const fetchSite of [undefined, "future-value"]) {
    const request = createRequest({
      body: "{}",
      headers: {
        "content-type": "application/json",
        origin: APP_ORIGIN,
        ...(fetchSite ? { "sec-fetch-site": fetchSite } : {}),
      },
    })

    await assert.doesNotReject(() =>
      assertTrustedMutationRequest(request, APP_ORIGIN, JSON_POLICY)
    )
  }
})

test("enforces method, media type, encoding and empty-body contracts", async () => {
  await assertSecurityError(
    () =>
      assertTrustedMutationRequest(
        createRequest({
          body: "{}",
          headers: { "content-type": "application/json", origin: APP_ORIGIN },
          method: "PUT",
        }),
        APP_ORIGIN,
        JSON_POLICY
      ),
    405,
    "method_not_allowed"
  )

  await assertSecurityError(
    () =>
      assertTrustedMutationRequest(
        createRequest({
          body: "{}",
          headers: { "content-type": "text/plain", origin: APP_ORIGIN },
        }),
        APP_ORIGIN,
        JSON_POLICY
      ),
    415,
    "content_type_not_allowed"
  )

  await assertSecurityError(
    () =>
      assertTrustedMutationRequest(
        createRequest({
          body: "{}",
          headers: {
            "content-encoding": "gzip",
            "content-type": "application/json",
            origin: APP_ORIGIN,
          },
        }),
        APP_ORIGIN,
        JSON_POLICY
      ),
    415,
    "content_encoding_not_allowed"
  )

  await assert.doesNotReject(() =>
    assertTrustedMutationRequest(
      createRequest({ headers: { origin: APP_ORIGIN } }),
      APP_ORIGIN,
      { body: "none", method: "POST" }
    )
  )

  const emptyStreamRequest = new Request(`${APP_ORIGIN}/api/example`, {
    body: new ReadableStream({
      start(controller) {
        controller.close()
      },
    }),
    duplex: "half",
    headers: { "content-length": "0", origin: APP_ORIGIN },
    method: "POST",
  })
  await assert.doesNotReject(() =>
    assertTrustedMutationRequest(emptyStreamRequest, APP_ORIGIN, {
      body: "none",
      method: "POST",
    })
  )

  await assertSecurityError(
    () =>
      assertTrustedMutationRequest(
        createRequest({ body: "unexpected", headers: { origin: APP_ORIGIN } }),
        APP_ORIGIN,
        { body: "none", method: "POST" }
      ),
    415,
    "content_type_not_allowed"
  )
})

test("bodyless mutations accept proxy JSON metadata only when declared and actual bodies are empty", async () => {
  for (const contentType of [undefined, "application/json", "application/json; charset=utf-8", "Application/JSON"]) {
    for (const contentLength of [undefined, "0"]) {
      const headers = { origin: APP_ORIGIN,
        ...(contentType ? { "content-type": contentType } : {}),
        ...(contentLength ? { "content-length": contentLength } : {}),
      }
      await assert.doesNotReject(() => assertTrustedMutationRequest(createRequest({ headers }), APP_ORIGIN, { body: "none", method: "POST" }))
      const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array()); controller.close() } })
      await assert.doesNotReject(() => assertTrustedMutationRequest(new Request(`${APP_ORIGIN}/api/example`, {
        method: "POST", body: stream, duplex: "half", headers,
      }), APP_ORIGIN, { body: "none", method: "POST" }))
    }
  }
})

test("bodyless JSON requests reject all actual content, including a stream with a false zero length", async () => {
  for (const body of ["{}", "null", " ", "\n", "\u0000"]) {
    for (const contentLength of [undefined, "0", String(Buffer.byteLength(body))]) {
      await assertSecurityError(() => assertTrustedMutationRequest(createRequest({ body, headers: {
        origin: APP_ORIGIN, "content-type": "application/json",
        ...(contentLength ? { "content-length": contentLength } : {}),
      } }), APP_ORIGIN, { body: "none", method: "POST" }), 400, "body_not_allowed")
    }
  }
  for (const contentType of [undefined, "application/json"]) {
    const streamed = new Request(`${APP_ORIGIN}/api/example`, {
      method: "POST", duplex: "half", headers: { origin: APP_ORIGIN, "content-length": "0", ...(contentType ? { "content-type": contentType } : {}) },
      body: new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array()); controller.enqueue(new Uint8Array([32])); controller.close() } }),
    })
    await assertSecurityError(() => assertTrustedMutationRequest(streamed, APP_ORIGIN, { body: "none", method: "POST" }), 400, "body_not_allowed")
  }
})

test("empty JSON metadata does not bypass origin, method, encoding, length or media-type restrictions", async () => {
  const policy = { body: "none", method: "POST" }
  for (const [headers, status, reason] of [
    [{ origin: "https://untrusted.example" }, 403, "origin_not_trusted"],
    [{ "sec-fetch-site": "cross-site" }, 403, "origin_not_trusted"],
    [{ "content-encoding": "gzip" }, 415, "content_encoding_not_allowed"],
    [{ "content-length": "1" }, 400, "body_not_allowed"],
    [{ "content-length": "-1" }, 400, "content_length_invalid"],
    [{ "content-length": "NaN" }, 400, "content_length_invalid"],
    [{ "content-type": "text/plain" }, 415, "content_type_not_allowed"],
    [{ "content-type": "application/x-www-form-urlencoded" }, 415, "content_type_not_allowed"],
  ]) {
    await assertSecurityError(() => assertTrustedMutationRequest(createRequest({ headers: {
      origin: APP_ORIGIN, "content-type": "application/json", ...headers,
    } }), APP_ORIGIN, policy), status, reason)
  }
  await assertSecurityError(() => assertTrustedMutationRequest(createRequest({ method: "PUT", headers: {
    origin: APP_ORIGIN, "content-type": "application/json",
  } }), APP_ORIGIN, policy), 405, "method_not_allowed")
})

test("limits both declared and streamed body bytes", async () => {
  const accepted = createRequest({
    body: "1234",
    headers: { "content-type": "application/json", origin: APP_ORIGIN },
  })
  assert.equal(new TextDecoder().decode(await readBoundedRequestBody(accepted, 4)), "1234")

  const declaredOversize = createRequest({
    body: "1",
    headers: {
      "content-length": "100",
      "content-type": "application/json",
      origin: APP_ORIGIN,
    },
  })
  await assert.rejects(
    () => readBoundedRequestBody(declaredOversize, 4),
    (error) => isSecurityError(error, 413, "payload_too_large")
  )

  const streamedOversize = createRequest({
    body: "12345",
    headers: { "content-type": "application/json", origin: APP_ORIGIN },
  })
  await assert.rejects(
    () => readBoundedRequestBody(streamedOversize, 4),
    (error) => isSecurityError(error, 413, "payload_too_large")
  )
})

test("allows OAuth document navigation and rejects subresource entry", () => {
  assert.doesNotThrow(() =>
    assertDocumentNavigationRequest(
      new Request(`${APP_ORIGIN}/oauth/authorize`, {
        headers: {
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
        },
      })
    )
  )

  assert.throws(
    () =>
      assertDocumentNavigationRequest(
        new Request(`${APP_ORIGIN}/oauth/authorize`, {
          headers: {
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
          },
        })
      ),
    (error) => isSecurityError(error, 403, "navigation_not_allowed")
  )
})

function createRequest({ body, headers, method = "POST" }) {
  return new Request(`${APP_ORIGIN}/api/example`, { body, headers, method })
}

function assertSecurityError(callback, status, reason) {
  return assert.rejects(callback, (error) => isSecurityError(error, status, reason))
}

function isSecurityError(error, status, reason) {
  return (
    error instanceof RequestSecurityError &&
    error.status === status &&
    error.reason === reason
  )
}
