import { NextResponse } from "next/server";
import { emoteProviders } from "@/lib/emote-providers";

export async function GET(
  request: Request,
  { params }: { params: { channel: string } },
) {
  try {
    const channel = params.channel;

    if (!channel) {
      return NextResponse.json({ error: "Channel name required" }, {
        status: 400,
      });
    }

    const emotes = await emoteProviders.fetchAllEmotes(channel);

    return NextResponse.json({
      emotes,
      count: emotes.length,
      channel,
    });
  } catch (error) {
    console.error("[mctv] Error fetching emotes:", error);
    return NextResponse.json({ error: "Failed to fetch emotes" }, {
      status: 500,
    });
  }
}
