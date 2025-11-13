// Server-side YouTube polling manager
import { parseYouTubeEmotes } from "./youtube-emotes";
import { chatManager } from "./chat-manager";

interface PollingSession {
    liveChatId: string;
    nextPageToken: string;
    intervalId: NodeJS.Timeout;
}

class YouTubePollingManager {
    private sessions = new Map<string, PollingSession>();

    startPolling(liveChatId: string) {
        // Don't start if already polling
        if (this.sessions.has(liveChatId)) {
            console.log("[mctv] Already polling YouTube chat:", liveChatId);
            return;
        }

        console.log("[mctv] Starting YouTube polling for chat:", liveChatId);

        const session: PollingSession = {
            liveChatId,
            nextPageToken: "",
            intervalId: null as any,
        };

        const poll = async () => {
            try {
                const apiKey = process.env.YOUTUBE_API_KEY;
                if (!apiKey) {
                    console.error("[mctv] YouTube API key not configured");
                    return;
                }

                const url =
                    `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&key=${apiKey}${
                        session.nextPageToken
                            ? `&pageToken=${session.nextPageToken}`
                            : ""
                    }`;

                const response = await fetch(url);
                const data = await response.json();

                if (data.items) {
                    for (const item of data.items) {
                        const username = item.authorDetails.displayName;
                        const message = parseYouTubeEmotes(
                            item.snippet.displayMessage,
                        );
                        const color = this.generateColorFromUsername(username);

                        // Add message directly to chat manager (which broadcasts via SSE)
                        chatManager["addMessage"](
                            "youtube",
                            username,
                            message,
                            undefined,
                            color,
                        );
                    }
                }

                if (data.nextPageToken) {
                    session.nextPageToken = data.nextPageToken;
                }

                // Use polling interval from response or default to 5 seconds
                const pollingInterval = data.pollingIntervalMillis || 5000;
                session.intervalId = setTimeout(poll, pollingInterval);
            } catch (error) {
                console.error("[mctv] YouTube polling error:", error);
                // Retry after 5 seconds on error
                session.intervalId = setTimeout(poll, 5000);
            }
        };

        // Start initial poll
        poll();
        this.sessions.set(liveChatId, session);
    }

    stopPolling(liveChatId: string) {
        const session = this.sessions.get(liveChatId);
        if (session) {
            clearTimeout(session.intervalId);
            this.sessions.delete(liveChatId);
            console.log("[mctv] Stopped YouTube polling for chat:", liveChatId);
        }
    }

    stopAll() {
        for (const [liveChatId, session] of this.sessions) {
            clearTimeout(session.intervalId);
        }
        this.sessions.clear();
        console.log("[mctv] Stopped all YouTube polling sessions");
    }

    private generateColorFromUsername(username: string): string {
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }

        const hue = Math.abs(hash % 360);
        const saturation = 65 + (Math.abs(hash) % 20);
        const lightness = 55 + (Math.abs(hash >> 8) % 15);

        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
}

export const youtubePollingManager = new YouTubePollingManager();
