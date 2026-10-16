const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024
const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png"] as const
const ACCEPTED_AVATAR_TYPE_SET = new Set<string>(ACCEPTED_AVATAR_TYPES)
const AVATAR_ACCEPT_ATTRIBUTE = ACCEPTED_AVATAR_TYPES.join(",")

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff] as const
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const

type AvatarFileValidationError = "empty" | "invalid-content" | "too-large" | "unsupported-type"
type AvatarFileValidationResult =
  | { error: AvatarFileValidationError; ok: false }
  | { ok: true }

async function validateAvatarFile(file: Blob): Promise<AvatarFileValidationResult> {
  if (file.size === 0) {
    return { error: "empty", ok: false }
  }

  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    return { error: "too-large", ok: false }
  }

  if (!ACCEPTED_AVATAR_TYPE_SET.has(file.type)) {
    return { error: "unsupported-type", ok: false }
  }

  try {
    const header = new Uint8Array(await file.slice(0, PNG_SIGNATURE.length).arrayBuffer())
    const detectedType = startsWithSignature(header, PNG_SIGNATURE)
      ? "image/png"
      : startsWithSignature(header, JPEG_SIGNATURE)
        ? "image/jpeg"
        : undefined

    return detectedType === file.type
      ? { ok: true }
      : { error: "invalid-content", ok: false }
  } catch {
    return { error: "invalid-content", ok: false }
  }
}

function startsWithSignature(bytes: Uint8Array, signature: readonly number[]): boolean {
  return bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte)
}

export { AVATAR_ACCEPT_ATTRIBUTE, MAX_AVATAR_SIZE_BYTES, validateAvatarFile }
export type { AvatarFileValidationError, AvatarFileValidationResult }
