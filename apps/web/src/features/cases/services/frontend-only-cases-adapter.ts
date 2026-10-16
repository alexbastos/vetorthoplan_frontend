import type { CasesRepository } from "../types/cases"

/**
 * Adapter seguro enquanto o BFF não existe: permite renderizar o estado vazio,
 * mas nunca simula que um registro clínico foi persistido em produção.
 */
function createFrontendOnlyCasesAdapter(): CasesRepository {
  return {
    async createCase(_input, request) {
      request?.signal?.throwIfAborted()
      return {
        error: { code: "CASES_UNAVAILABLE", retryable: false },
        ok: false,
      }
    },

    async importFiles(_input, request) {
      request?.signal?.throwIfAborted()
      return {
        error: { code: "FILES_UNAVAILABLE", retryable: false },
        ok: false,
      }
    },

    async getCaseWorkspace(_caseId, request) {
      request?.signal?.throwIfAborted()
      return {
        error: { code: "CASES_UNAVAILABLE", retryable: false },
        ok: false,
      }
    },

    async saveImageCalibration(_input, request) {
      request?.signal?.throwIfAborted()
      return {
        error: { code: "CALIBRATION_UNAVAILABLE", retryable: false },
        ok: false,
      }
    },

    async updateImageOrientation(_input, request) {
      request?.signal?.throwIfAborted()
      return { error: { code: "ORIENTATION_UNAVAILABLE", retryable: false }, ok: false }
    },

    async renameImage(_input, request) {
      request?.signal?.throwIfAborted()
      return { error: { code: "FILES_UNAVAILABLE", retryable: false }, ok: false }
    },

    async duplicateImage(_input, request) {
      request?.signal?.throwIfAborted()
      return { error: { code: "FILES_UNAVAILABLE", retryable: false }, ok: false }
    },

    async deleteImage(_input, request) {
      request?.signal?.throwIfAborted()
      return { error: { code: "FILES_UNAVAILABLE", retryable: false }, ok: false }
    },

    async listCases(request) {
      request?.signal?.throwIfAborted()
      return { data: [], ok: true }
    },
  }
}

export { createFrontendOnlyCasesAdapter }
