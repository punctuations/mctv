import { type NextRequest, NextResponse } from "next/server";
import { chatManager } from "@/lib/chat-manager";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, channel, videoId, channelId } = body;

    if (platform === "twitch" && channel) {
      await chatManager.connectTwitch(channel);
      return NextResponse.json({
        success: true,
        message: "Connected to Twitch",
      });
    } else if (platform === "youtube" && (videoId || channelId)) {
      const id = channelId || videoId;
      await chatManager.connectYoutube(id, !!channelId);
      return NextResponse.json({
        success: true,
        message: "Connected to YouTube",
      });
    } else {
      return NextResponse.json({
        error: "Invalid platform or missing parameters",
      }, { status: 400 });
    }
  } catch (error) {
    console.error("[mctv] Connection error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to connect",
    }, { status: 500 });
  }
}
