import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const liveChatId = searchParams.get("liveChatId")
  const pageToken = searchParams.get("pageToken")

  if (!liveChatId) {
    return NextResponse.json({ error: "Live chat ID is required" }, { status: 400 })
  }

  const apiKey = process.env.YOUTUBE_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: "YouTube API key not configured" }, { status: 500 })
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&key=${apiKey}${
      pageToken ? `&pageToken=${pageToken}` : ""
    }`

    const response = await fetch(url)
    const data = await response.json()

    if (data.items) {
      const messages = data.items.map((item: any) => ({
        authorName: item.authorDetails.displayName,
        message: item.snippet.displayMessage,
      }))

      return NextResponse.json({
        messages,
        nextPageToken: data.nextPageToken,
        pollingIntervalMillis: data.pollingIntervalMillis,
      })
    } else {
      return NextResponse.json({ messages: [] })
    }
  } catch (error) {
    console.error("YouTube messages API error:", error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}
