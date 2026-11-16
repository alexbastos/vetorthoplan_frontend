const displayOptions = {
  style: "unit", unit: "degree", unitDisplay: "narrow", minimumFractionDigits: 2, maximumFractionDigits: 2,
} as const satisfies Intl.NumberFormatOptions

// Presentation only; 0 is valid and the official precision is not changed.
function formatAngleDegrees(degrees: number, number: (value: number, options: typeof displayOptions) => string): string {
  return number(degrees === 0 ? 0 : degrees, displayOptions)
}

export { formatAngleDegrees }
