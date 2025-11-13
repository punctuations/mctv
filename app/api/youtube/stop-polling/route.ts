import { type NextRequest, NextResponse } from "next/server";
import { youtubePollingManager } from "@/lib/youtube-polling-manager";

export async function POST(request: NextRequest) {
    try {
        const { liveChatId } = await request.json();

        if (!liveChatId) {
            return NextResponse.json({ error: "Live chat ID is required" }, {
                status: 400,
            });
        }

        youtubePollingManager.stopPolling(liveChatId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[mctv] Error stopping YouTube polling:", error);
        return NextResponse.json({ error: "Failed to stop polling" }, {
            status: 500,
        });
    }
}
