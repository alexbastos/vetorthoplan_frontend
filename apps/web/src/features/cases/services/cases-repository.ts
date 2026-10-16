import { createFrontendOnlyCasesAdapter } from "./frontend-only-cases-adapter"
import { createInMemoryCasesAdapter } from "./in-memory-cases-adapter"

const casesRepository = process.env.NODE_ENV === "development"
  ? createInMemoryCasesAdapter()
  : createFrontendOnlyCasesAdapter()

export { casesRepository }
