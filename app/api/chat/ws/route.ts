import type { NextRequest } from "next/server";
import { chatManager } from "@/lib/chat-manager";
import { wsManager } from "@/lib/websocket-manager";

export async function GET(request: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            console.log("[mctv] [SERVER] SSE connection started");

            // Send initial connection message
            controller.enqueue(
                encoder.encode(
                    "data: " + JSON.stringify({ type: "connected" }) + "\n\n",
                ),
            );

            // Send current messages
            const messages = chatManager.getMessages();
            controller.enqueue(
                encoder.encode(
                    "data: " + JSON.stringify({ type: "initial", messages }) +
                        "\n\n",
                ),
            );

            // Setup interval to send keepalive
            const keepaliveInterval = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(": keepalive\n\n"));
                } catch (e) {
                    clearInterval(keepaliveInterval);
                }
            }, 15000); // Every 15 seconds

            // Listen for new messages
            const cleanup = wsManager.onNewMessage((message) => {
                try {
                    console.log(
                        "[mctv] [SERVER] Broadcasting new message via SSE:",
                        message.id,
                    );
                    controller.enqueue(
                        encoder.encode(
                            "data: " +
                                JSON.stringify({
                                    type: "new-message",
                                    message,
                                }) + "\n\n",
                        ),
                    );
                } catch (e) {
                    console.error(
                        "[mctv] [SERVER] Error broadcasting message:",
                        e,
                    );
                    cleanup();
                    clearInterval(keepaliveInterval);
                }
            });

            // Cleanup on close
            request.signal.addEventListener("abort", () => {
                console.log("[mctv] [SERVER] SSE connection closed");
                cleanup();
                clearInterval(keepaliveInterval);
                try {
                    controller.close();
                } catch (e) {
                    // Already closed
                }
            });
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no", // Disable nginx buffering
        },
    });
}
