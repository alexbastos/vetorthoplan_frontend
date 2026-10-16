export {}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: GoogleTokenClientConfig) => GoogleTokenClient
        }
      }
    }
  }
}

type GoogleTokenClientConfig = {
  callback: (response: GoogleTokenResponse) => void
  client_id: string
  error_callback?: (error: GoogleTokenClientError) => void
  scope: string
}

type GoogleTokenClient = {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void
}

type GoogleTokenResponse = {
  access_token?: string
  error?: string
}

type GoogleTokenClientError = {
  type: string
}
