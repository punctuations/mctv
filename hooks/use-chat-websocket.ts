"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ChatMessage {
    id: string;
    platform: "twitch" | "youtube";
    username: string;
    message: string;
    parsedMessage?: string;
    timestamp: Date;
    badges?: any[];
    color?: string;
    createdAt?: number;
    channel?: string;
}

export function useChatWebSocket(fadeOutTime: number) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const connectSSE = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        console.log("[mctv] Connecting to SSE endpoint...");

        const eventSource = new EventSource("/api/chat/ws");

        eventSource.onopen = () => {
            console.log("[mctv] SSE connection established");
            setIsConnected(true);
        };

        eventSource.onerror = (error) => {
            console.error("[mctv] SSE connection error:", {
                readyState: eventSource.readyState,
                error: error,
            });
            setIsConnected(false);

            eventSource.close();

            if (!reconnectTimeoutRef.current) {
                console.log("[mctv] Scheduling reconnection in 3 seconds...");
                reconnectTimeoutRef.current = setTimeout(() => {
                    reconnectTimeoutRef.current = null;
                    console.log("[mctv] Attempting to reconnect SSE...");
                    connectSSE();
                }, 3000);
            }
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === "connected") {
                    console.log("[mctv] SSE confirmed connected");
                } else if (data.type === "initial") {
                    console.log(
                        "[mctv] Received initial messages:",
                        data.messages.length,
                    );
                    // Set initial messages
                    const now = Date.now();
                    const validMessages = data.messages.filter((msg: any) => {
                        const messageAge = now - (msg.createdAt || now);
                        return messageAge < fadeOutTime;
                    });
                    setMessages(
                        validMessages.map((msg: any) => ({
                            ...msg,
                            timestamp: new Date(msg.timestamp),
                        })),
                    );
                } else if (data.type === "new-message") {
                    console.log(
                        "[mctv] Received new message:",
                        data.message.id,
                    );
                    // Add new message
                    const newMessage = {
                        ...data.message,
                        timestamp: new Date(data.message.timestamp),
                    };
                    setMessages((prev) => {
                        const updated = [...prev, newMessage];
                        // Keep only messages within fade out time
                        const now = Date.now();
                        return updated.filter((msg) =>
                            now - (msg.createdAt || 0) < fadeOutTime
                        );
                    });
                }
            } catch (error) {
                console.error("[mctv] Error parsing SSE message:", error);
            }
        };

        eventSourceRef.current = eventSource;
    }, [fadeOutTime]);

    useEffect(() => {
        connectSSE();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [connectSSE]);

    // Cleanup old messages periodically
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setMessages((prev) =>
                prev.filter((msg) => now - (msg.createdAt || 0) < fadeOutTime)
            );
        }, 1000);

        return () => clearInterval(interval);
    }, [fadeOutTime]);

    return { messages, isConnected };
}
