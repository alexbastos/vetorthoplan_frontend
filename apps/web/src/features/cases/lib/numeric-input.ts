function sanitizeUnsignedInteger(value: string, maxDigits?: number): string {
  const digits = value.replace(/\D/g, "")
  return maxDigits === undefined ? digits : digits.slice(0, maxDigits)
}

function sanitizeUnsignedDecimal(value: string, decimalPlaces = 2): string {
  const numericCharacters = value.replace(/[^\d.,]/g, "")
  const separatorIndex = numericCharacters.search(/[.,]/)

  if (separatorIndex === -1) {
    return numericCharacters
  }

  const integerPart = numericCharacters.slice(0, separatorIndex).replace(/\D/g, "") || "0"
  const separator = numericCharacters[separatorIndex]
  const decimalPart = numericCharacters
    .slice(separatorIndex + 1)
    .replace(/\D/g, "")
    .slice(0, decimalPlaces)

  return `${integerPart}${separator}${decimalPart}`
}

export { sanitizeUnsignedDecimal, sanitizeUnsignedInteger }
