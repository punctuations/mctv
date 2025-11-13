import { NextResponse } from "next/server";
import { chatManager } from "@/lib/chat-manager";

export async function POST() {
  try {
    chatManager.clearMessages();
    return NextResponse.json({ success: true, message: "Messages cleared" });
  } catch (error) {
    console.error("[mctv] Error clearing messages:", error);
    return NextResponse.json({ error: "Failed to clear messages" }, {
      status: 500,
    });
  }
}
