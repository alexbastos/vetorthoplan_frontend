function formatUploadFileSize(bytes: number, locale: string): string {
  bytes = Math.floor(bytes)
  if (bytes <= 0) return "0 KB"
  const units = ["B", "KB", "MB", "GB"]
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1_024)), units.length - 1)
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(bytes / 1_024 ** exponent)} ${units[exponent]}`
}

function uploadProgressValue(progress: number | undefined): number {
  return typeof progress === "number" && Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0
}

export { formatUploadFileSize, uploadProgressValue }
