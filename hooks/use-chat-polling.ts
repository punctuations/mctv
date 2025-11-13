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

interface UseChatPollingOptions {
    fadeOutTime: number;
    pollInterval?: number; // Default 2000ms (2 seconds)
    enabled?: boolean;
}

export function useChatPolling(
    { fadeOutTime, pollInterval = 2000, enabled = true }: UseChatPollingOptions,
) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastFetchRef = useRef<number>(0);

    const fetchMessages = useCallback(async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const now = Date.now();
        const timeSinceLastFetch = now - lastFetchRef.current;
        if (timeSinceLastFetch < pollInterval - 100) {
            console.log("[mctv] Skipping fetch - too soon since last request");
            return;
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;
        lastFetchRef.current = now;

        try {
            const response = await fetch("/api/chat/messages", {
                signal: controller.signal,
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache",
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            // Filter messages within fade out time
            const validMessages = data.messages
                .filter((msg: any) => {
                    const messageAge = now - (msg.createdAt || now);
                    return messageAge < fadeOutTime;
                })
                .map((msg: any) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp),
                }));

            setMessages(validMessages);
            setIsConnected(true);
            setError(null);
        } catch (err: any) {
            if (err.name === "AbortError") {
                // Request was cancelled, ignore
                return;
            }

            console.error("[mctv] Error fetching messages:", err);
            setIsConnected(false);
            setError(err.message || "Failed to fetch messages");
        } finally {
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
        }
    }, [fadeOutTime, pollInterval]);

    const schedulePoll = useCallback(() => {
        if (!enabled) return;

        // Clear any existing timeout
        if (pollTimeoutRef.current) {
            clearTimeout(pollTimeoutRef.current);
        }

        pollTimeoutRef.current = setTimeout(() => {
            fetchMessages().then(() => {
                // Schedule next poll after this one completes
                schedulePoll();
            });
        }, pollInterval);
    }, [enabled, pollInterval, fetchMessages]);

    useEffect(() => {
        if (!enabled) {
            // Clean up when disabled
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            if (pollTimeoutRef.current) {
                clearTimeout(pollTimeoutRef.current);
                pollTimeoutRef.current = null;
            }
            return;
        }

        // Initial fetch
        fetchMessages();
        // Start polling
        schedulePoll();

        return () => {
            // Cleanup
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (pollTimeoutRef.current) {
                clearTimeout(pollTimeoutRef.current);
            }
        };
    }, [enabled, fetchMessages, schedulePoll]);

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

    return { messages, isConnected, error };
}
