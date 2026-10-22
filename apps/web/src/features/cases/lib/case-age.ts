type AgeParts = { years: number; months: number }
type DeclaredAge =
  | { kind: "unknown" }
  | { kind: "known"; totalMonths: number }
  | { kind: "invalid"; field: "ageYears" | "ageMonths"; reason: "years" | "months" | "limit" }

function parseDeclaredAge(years: string, months: string): DeclaredAge {
  if (years === "" && months === "") return { kind: "unknown" }
  if (years !== "" && !/^\d+$/.test(years)) return { kind: "invalid", field: "ageYears", reason: "years" }
  if (months !== "" && !/^\d+$/.test(months)) return { kind: "invalid", field: "ageMonths", reason: "months" }
  const yearCount = Number(years || 0)
  const monthCount = Number(months || 0)
  if (!Number.isSafeInteger(yearCount) || yearCount > 50) return { kind: "invalid", field: "ageYears", reason: "limit" }
  if (!Number.isInteger(monthCount) || monthCount > 11) return { kind: "invalid", field: "ageMonths", reason: "months" }
  const totalMonths = yearCount * 12 + monthCount
  return totalMonths > 600 ? { kind: "invalid", field: "ageMonths", reason: "limit" }
    : { kind: "known", totalMonths }
}

function splitAgeMonths(totalMonths: number | null): AgeParts | null {
  return totalMonths !== null && Number.isSafeInteger(totalMonths) && totalMonths >= 0
    ? { years: Math.floor(totalMonths / 12), months: totalMonths % 12 } : null
}

// Date-only arithmetic avoids timezone/DST shifts and Date's special handling of years 0–99.
function parseCalendarDate(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, yearText, monthText, dayText] = match
  const year = Number(yearText), month = Number(monthText), day = Number(dayText)
  if (year < 1 || month < 1 || month > 12 || day < 1) return null
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
  return day <= daysInMonth ? { year, month, day } : null
}

function ageMonthsAtDate(birthDate: string, referenceDate: string): number | null {
  const birth = parseCalendarDate(birthDate)
  const reference = parseCalendarDate(referenceDate)
  if (!birth || !reference || birthDate > referenceDate) return null
  return (reference.year - birth.year) * 12 + reference.month - birth.month
    - (reference.day < birth.day ? 1 : 0)
}

function utcDateOnly(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export { ageMonthsAtDate, parseDeclaredAge, splitAgeMonths, utcDateOnly }
export type { AgeParts }
