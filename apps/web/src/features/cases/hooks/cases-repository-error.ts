import type { CasesError, CasesErrorCode } from "../types/cases"

class CasesRepositoryError extends Error {
  readonly code: CasesErrorCode
  readonly retryable: boolean

  constructor(error: CasesError) {
    super(error.code)
    this.name = "CasesRepositoryError"
    this.code = error.code
    this.retryable = error.retryable
  }
}

export { CasesRepositoryError }
