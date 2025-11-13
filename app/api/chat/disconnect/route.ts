import { type NextRequest, NextResponse } from "next/server";
import { chatManager } from "@/lib/chat-manager";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform } = body;

    if (platform === "twitch") {
      chatManager.disconnectTwitch();
      return NextResponse.json({
        success: true,
        message: "Disconnected from Twitch",
      });
    } else if (platform === "youtube") {
      chatManager.disconnectYoutube();
      return NextResponse.json({
        success: true,
        message: "Disconnected from YouTube",
      });
    } else {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }
  } catch (error) {
    console.error("[mctv] Disconnection error:", error);
    return NextResponse.json({ error: "Failed to disconnect" }, {
      status: 500,
    });
  }
}
