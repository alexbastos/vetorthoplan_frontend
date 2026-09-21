function formatBrazilianPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)

  if (digits.length === 0) {
    return ""
  }

  if (digits.length <= 2) {
    return `(${digits}`
  }

  const areaCode = digits.slice(0, 2)
  const localNumber = digits.slice(2)
  const firstPartLength = localNumber.length > 8 ? 5 : 4
  const firstPart = localNumber.slice(0, firstPartLength)
  const secondPart = localNumber.slice(firstPartLength)

  return secondPart ? `(${areaCode}) ${firstPart}-${secondPart}` : `(${areaCode}) ${firstPart}`
}

function formatBrazilianPostalCode(value: string): string {
  const digits = onlyDigits(value).slice(0, 8)
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
}

function isBrazilianPhone(value: string): boolean {
  const digits = onlyDigits(value)

  if (digits.length === 0) {
    return true
  }

  const isMobile = digits.length === 11 && digits[2] === "9"
  const isLandline = digits.length === 10 && /^[2-5]$/.test(digits[2] ?? "")

  return /^[1-9]\d/.test(digits) && (isMobile || isLandline)
}

function isBrazilianPostalCode(value: string): boolean {
  const digits = onlyDigits(value)

  if (digits.length === 0) {
    return true
  }

  return /^\d{8}$/.test(digits) && !/^(\d)\1{7}$/.test(digits)
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "")
}

export {
  formatBrazilianPhone,
  formatBrazilianPostalCode,
  isBrazilianPhone,
  isBrazilianPostalCode,
  onlyDigits,
}
