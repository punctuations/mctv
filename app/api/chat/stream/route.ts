import type { NextRequest } from "next/server"
import { chatManager } from "@/lib/chat-manager"

// Server-Sent Events endpoint for real-time chat streaming
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(() => {
        const messages = chatManager.getMessages()
        const data = `data: ${JSON.stringify({ messages })}\n\n`
        controller.enqueue(encoder.encode(data))
      }, 1000)

      // Cleanup on client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
