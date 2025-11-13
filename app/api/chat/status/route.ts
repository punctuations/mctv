import { NextResponse } from "next/server";
import { chatManager } from "@/lib/chat-manager";

export async function GET() {
  try {
    const status = chatManager.getConnectionStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("[mctv] Error fetching status:", error);
    return NextResponse.json({ error: "Failed to fetch status" }, {
      status: 500,
    });
  }
}
