type HashResponse = { sha256: string } | { error: true }

function hashImageFile(file: File, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"))
      return
    }

    const worker = new Worker(new URL("../workers/image-sha256.worker.ts", import.meta.url), { type: "module" })
    const cleanup = () => {
      signal.removeEventListener("abort", onAbort)
      worker.terminate()
    }
    const onAbort = () => {
      cleanup()
      reject(new DOMException("Aborted", "AbortError"))
    }
    signal.addEventListener("abort", onAbort, { once: true })
    worker.onmessage = (event: MessageEvent<HashResponse>) => {
      cleanup()
      if ("sha256" in event.data && /^[a-f0-9]{64}$/.test(event.data.sha256)) {
        resolve(event.data.sha256)
      } else {
        reject(new Error("HASH_FAILED"))
      }
    }
    worker.onerror = () => {
      cleanup()
      reject(new Error("HASH_FAILED"))
    }
    worker.postMessage({ file })
  })
}

export { hashImageFile }
