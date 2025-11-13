import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("channelId");

  if (!input) {
    return NextResponse.json({ error: "Channel ID or handle is required" }, {
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
    let channelId = input;

    // If it's not a proper channel ID format, look it up using forHandle parameter
    if (input.startsWith("@") || !input.startsWith("UC")) {
      const handle = input.startsWith("@") ? input : `@${input}`;

      console.log(`[mctv] Looking up channel ID for handle: ${handle}`);

      // Look up the channel ID from the handle
      const channelResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${
          encodeURIComponent(handle)
        }&key=${apiKey}`,
      );

      if (!channelResponse.ok) {
        const errorData = await channelResponse.json();
        console.error(`[mctv] Failed to look up channel:`, errorData);
        return NextResponse.json({ error: "Invalid channel handle" }, {
          status: 400,
        });
      }

      const channelData = await channelResponse.json();

      if (!channelData.items || channelData.items.length === 0) {
        return NextResponse.json({ error: "Channel not found" }, {
          status: 404,
        });
      }

      channelId = channelData.items[0].id;
      console.log(
        `[mctv] Found channel ID: ${channelId} for handle: ${handle}`,
      );
    }

    // Search for live broadcasts on the channel
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${apiKey}`,
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error(
        `fetch to https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=... failed with status ${response.status} and body:`,
        JSON.stringify(errorData, null, 2),
      );
      return NextResponse.json({ error: "Failed to search for live streams" }, {
        status: response.status,
      });
    }

    const data = await response.json();

    if (data.items && data.items.length > 0) {
      // Return the first live video found
      const videoId = data.items[0].id.videoId;
      return NextResponse.json({ videoId, title: data.items[0].snippet.title });
    } else {
      return NextResponse.json({
        error: "No live stream found for this channel",
      }, { status: 404 });
    }
  } catch (error) {
    console.error("[mctv] YouTube API error:", error);
    return NextResponse.json({ error: "Failed to search for live streams" }, {
      status: 500,
    });
  }
}
