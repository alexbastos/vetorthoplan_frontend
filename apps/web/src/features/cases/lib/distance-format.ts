const displayOptions = {
  style: "unit", unit: "millimeter", unitDisplay: "short", minimumFractionDigits: 2, maximumFractionDigits: 2,
} as const satisfies Intl.NumberFormatOptions

// Formatting only. Persisted geometry and server values retain their precision.
function formatDistanceLength(lengthMm: number, number: (value: number, options: typeof displayOptions) => string): string {
  return lengthMm < 0.01 ? `< ${number(0.01, displayOptions)}` : number(lengthMm, displayOptions)
}

export { formatDistanceLength }
