import Image from "next/image"
import { Laptop, Smartphone, Tablet } from "lucide-react"

type ConnectedDeviceIconProps = {
  deviceName: string | null
  userAgent: string | null
}

type ConnectedDeviceKind = "chrome" | "desktop" | "edge" | "mobile" | "tablet"

function ConnectedDeviceIcon({ deviceName, userAgent }: ConnectedDeviceIconProps) {
  const kind = detectConnectedDeviceKind(deviceName, userAgent)

  return (
    <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
      {kind === "chrome" ? <Image alt="" height={24} src="/icons/google-chrome-logo-new-svgrepo.svg" width={24} /> : null}
      {kind === "edge" ? <Image alt="" height={24} src="/icons/edge-svgrepo.svg" width={24} /> : null}
      {kind === "mobile" ? <Smartphone className="size-5 text-content-secondary" strokeWidth={1.5} /> : null}
      {kind === "tablet" ? <Tablet className="size-5 text-content-secondary" strokeWidth={1.5} /> : null}
      {kind === "desktop" ? <Laptop className="size-5 text-content-secondary" strokeWidth={1.5} /> : null}
    </span>
  )
}

function detectConnectedDeviceKind(deviceName: string | null, userAgent: string | null): ConnectedDeviceKind {
  const fingerprint = `${deviceName ?? ""} ${userAgent ?? ""}`

  if (/ipad|tablet/i.test(fingerprint)) return "tablet"
  if (/android.*mobile|iphone|ipod|mobile/i.test(fingerprint)) return "mobile"
  if (/edg(?:e|a|ios)?[\s/]|microsoft edge/i.test(fingerprint)) return "edge"
  if (/chrome|chromium|crios/i.test(fingerprint)) return "chrome"

  return "desktop"
}

export { ConnectedDeviceIcon, detectConnectedDeviceKind }
