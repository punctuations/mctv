let cachedToken: { access_token: string; expires_at: number } | null = null

export async function getTwitchAppAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5 minute buffer)
  if (cachedToken && cachedToken.expires_at > Date.now() + 5 * 60 * 1000) {
    return cachedToken.access_token
  }

  const clientId = process.env.TWITCH_CLIENT_ID
  const clientSecret = process.env.TWITCH_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be set")
  }

  // Request app access token using Client Credentials flow
  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get Twitch access token: ${error}`)
  }

  const data = await response.json()

  // Cache the token with expiration time
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  }

  return data.access_token
}

export function getTwitchClientId(): string {
  const clientId = process.env.TWITCH_CLIENT_ID

  if (!clientId) {
    throw new Error("TWITCH_CLIENT_ID must be set")
  }

  return clientId
}
