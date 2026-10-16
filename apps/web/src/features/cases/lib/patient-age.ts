import type { PatientAge } from "../types/cases"

function getPatientAgeYears(age: PatientAge | undefined, today = new Date()): number | null {
  if (!age) return null
  if (age.kind === "approximate-years") return age.years

  const [year, month, day] = age.birthDate.split("-").map(Number)
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null

  const birthdayHasPassed = today.getMonth() + 1 > month
    || (today.getMonth() + 1 === month && today.getDate() >= day)
  const years = today.getFullYear() - year - (birthdayHasPassed ? 0 : 1)
  return years >= 0 ? years : null
}

export { getPatientAgeYears }
