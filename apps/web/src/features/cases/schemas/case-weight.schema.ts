import { z } from "zod"

const MAX_CASE_WEIGHT_KG = 99_999.99
const DECIMAL_WEIGHT = /^\d+(?:\.\d{1,2})?$/
const CANONICAL_REQUEST_WEIGHT = /^(?:0|[1-9]\d{0,4})(?:\.\d{1,2})?$/
const inRange = (value: string | number) => Number(value) > 0 && Number(value) <= MAX_CASE_WEIGHT_KG

// Keep decimal strings intact across the BFF. Convert only for validation/display.
// The published response is string|null; absence of an OpenAPI pattern does not
// establish support for scientific notation, localized separators or extra precision.
const CaseWeightResponseSchema = z.string().regex(DECIMAL_WEIGHT).refine(inRange).nullable()
const CaseWeightRequestSchema = z.union([
  z.number().finite().positive().max(MAX_CASE_WEIGHT_KG).refine(value => DECIMAL_WEIGHT.test(String(value))),
  z.string().regex(CANONICAL_REQUEST_WEIGHT).refine(inRange),
]).nullable()

function isValidCaseWeightInput(value: string): boolean {
  const decimal = value.replace(",", ".")
  return value === "" || CaseWeightResponseSchema.safeParse(decimal.startsWith(".") ? `0${decimal}` : decimal).success
}

export { CaseWeightRequestSchema, CaseWeightResponseSchema, isValidCaseWeightInput }
