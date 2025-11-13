export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const channel = searchParams.get("channel")

  if (!channel) {
    return Response.json({ error: "Channel required" }, { status: 400 })
  }

  try {
    // Fetch global badges
    const globalResponse = await fetch("https://badges.twitch.tv/v1/badges/global/display")
    const globalData = await globalResponse.json()

    // Fetch channel-specific badges
    const channelResponse = await fetch(`https://badges.twitch.tv/v1/badges/channels/${channel}/display`)
    const channelData = await channelResponse.json()

    return Response.json({
      global: globalData.badge_sets || {},
      channel: channelData.badge_sets || {},
    })
  } catch (error) {
    console.error("Error fetching badges:", error)
    return Response.json({ global: {}, channel: {} })
  }
}
