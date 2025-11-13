import { NextResponse } from "next/server";
import { chatManager } from "@/lib/chat-manager";

export async function GET() {
  try {
    const messages = chatManager.getMessages();
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("[mctv] Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, {
      status: 500,
    });
  }
}
