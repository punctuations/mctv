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

export function useChatWebSocket(
    fadeOutTime: number = Number.POSITIVE_INFINITY,
) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const isConnectingRef = useRef(false);

    const connectStream = useCallback(async () => {
        if (isConnectingRef.current) {
            console.log("[mctv] Connection already in progress, skipping...");
            return;
        }

        isConnectingRef.current = true;

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        try {
            console.log("[mctv] Connecting to SSE stream...");

            const response = await fetch("/api/chat/ws", {
                method: "GET",
                signal,
                headers: {
                    Accept: "text/event-stream",
                },
            });

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`,
                );
            }

            if (!response.body) {
                throw new Error("No response body");
            }

            console.log("[mctv] Stream connection established");
            setIsConnected(true);
            reconnectAttemptsRef.current = 0;
            isConnectingRef.current = false;

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    console.log("[mctv] Stream closed by server");
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const data = line.slice(6);
                        try {
                            const parsed = JSON.parse(data);

                            if (parsed.type === "connected") {
                                console.log(
                                    "[mctv] Stream confirmed connected",
                                );
                            } else if (parsed.type === "initial") {
                                console.log(
                                    "[mctv] Received initial messages:",
                                    parsed.messages.length,
                                );
                                const now = Date.now();
                                const validMessages = parsed.messages.filter(
                                    (msg: any) => {
                                        const messageAge = now -
                                            (msg.createdAt || now);
                                        return messageAge < fadeOutTime;
                                    },
                                );
                                setMessages(
                                    validMessages.map((msg: any) => ({
                                        ...msg,
                                        timestamp: new Date(msg.timestamp),
                                    })),
                                );
                            } else if (parsed.type === "new-message") {
                                console.log(
                                    "[mctv] Received new message:",
                                    parsed.message.id,
                                );
                                const newMessage = {
                                    ...parsed.message,
                                    timestamp: new Date(
                                        parsed.message.timestamp,
                                    ),
                                };
                                setMessages((prev) => {
                                    const updated = [...prev, newMessage];
                                    const now = Date.now();
                                    return updated.filter((msg) =>
                                        now - (msg.createdAt || 0) < fadeOutTime
                                    );
                                });
                            }
                        } catch (error) {
                            console.error(
                                "[mctv] Error parsing stream data:",
                                error,
                                "Raw:",
                                data,
                            );
                        }
                    }
                }
            }
        } catch (error: any) {
            if (error.name === "AbortError") {
                console.log("[mctv] Stream connection aborted");
                return;
            }

            console.error(
                "[mctv] Stream connection error:",
                error.message || error,
            );
            setIsConnected(false);
            isConnectingRef.current = false;

            if (!reconnectTimeoutRef.current && !signal.aborted) {
                reconnectAttemptsRef.current++;
                const delay = Math.min(
                    1000 * Math.pow(2, reconnectAttemptsRef.current),
                    30000,
                );
                console.log(
                    `[mctv] Scheduling reconnection in ${delay}ms (attempt ${reconnectAttemptsRef.current})...`,
                );
                reconnectTimeoutRef.current = setTimeout(() => {
                    reconnectTimeoutRef.current = null;
                    console.log("[mctv] Attempting to reconnect stream...");
                    connectStream();
                }, delay);
            }
        }
    }, [fadeOutTime]);

    useEffect(() => {
        connectStream();

        return () => {
            console.log("[mctv] Cleaning up stream connection");
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            isConnectingRef.current = false;
        };
    }, [connectStream]);

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
