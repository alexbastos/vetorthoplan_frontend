type HashRequest = { file: File }
type HashResponse = { sha256: string } | { error: true }

self.onmessage = async (event: MessageEvent<HashRequest>) => {
  try {
    const bytes = await event.data.file.arrayBuffer()
    const digest = await crypto.subtle.digest("SHA-256", bytes)
    const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
    self.postMessage({ sha256 } satisfies HashResponse)
  } catch {
    self.postMessage({ error: true } satisfies HashResponse)
  }
}
