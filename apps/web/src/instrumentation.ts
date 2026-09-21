import { PHASE_PRODUCTION_BUILD } from "next/constants"

// Segredos runtime-only não devem ser exigidos durante o build da imagem.
export async function register() {
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD
  ) {
    return
  }

  const { validateServerRuntimeEnvironment } = await import("./lib/server/environment")

  try {
    validateServerRuntimeEnvironment()
  } catch (error) {
    console.error(
      error instanceof Error && error.name === "ServerEnvironmentConfigurationError"
        ? error.message
        : "Server startup aborted: runtime configuration could not be validated"
    )
    process.exit(1)
  }
}
