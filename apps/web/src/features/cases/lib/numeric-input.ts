function sanitizeUnsignedInteger(value: string, maxDigits?: number): string {
  const digits = value.replace(/\D/g, "")
  return maxDigits === undefined ? digits : digits.slice(0, maxDigits)
}

export { sanitizeUnsignedInteger }
