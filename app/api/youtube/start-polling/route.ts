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

        youtubePollingManager.startPolling(liveChatId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[mctv] Error starting YouTube polling:", error);
        return NextResponse.json({ error: "Failed to start polling" }, {
            status: 500,
        });
    }
}
