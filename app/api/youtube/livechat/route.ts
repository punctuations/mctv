import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");

  if (!videoId) {
    return NextResponse.json({ error: "Video ID is required" }, {
      status: 400,
    });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "YouTube API key not configured" }, {
      status: 500,
    });
  }

  try {
    // Get video details to find the live chat ID
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${apiKey}`,
    );

    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const liveChatId = data.items[0].liveStreamingDetails?.activeLiveChatId;

      if (liveChatId) {
        return NextResponse.json({ liveChatId });
      } else {
        return NextResponse.json({
          error: "No active live chat found for this video",
        }, { status: 404 });
      }
    } else {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("YouTube API error:", error);
    return NextResponse.json({ error: "Failed to fetch live chat ID" }, {
      status: 500,
    });
  }
}
