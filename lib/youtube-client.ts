// YouTube Live Chat client
import { parseYouTubeEmotes } from "./youtube-emotes";

export class YouTubeClient {
  private videoId = "";
  private liveChatId = "";
  private pollingInterval: NodeJS.Timeout | null = null;
  private onMessageCallback:
    | ((username: string, message: string, color: string) => void)
    | null = null;
  private nextPageToken = "";

  async connect(
    idOrChannel: string,
    onMessage: (username: string, message: string, color: string) => void,
    isChannelId = false,
  ) {
    this.onMessageCallback = onMessage;

    try {
      if (isChannelId) {
        const searchResponse = await fetch(
          `/api/youtube/search-live?channelId=${idOrChannel}`,
          { method: "GET" },
        );
        const searchData = await searchResponse.json();

        if (!searchData.videoId) {
          throw new Error(
            searchData.error || "No live stream found for this channel",
          );
        }

        this.videoId = searchData.videoId;
        console.log(
          "[mctv] Found live video:",
          searchData.videoId,
          searchData.title,
        );
      } else {
        this.videoId = idOrChannel;
      }

      // Get live chat ID from video
      const response = await fetch(
        `/api/youtube/livechat?videoId=${this.videoId}`,
        { method: "GET" },
      );

      const data = await response.json();

      if (data.liveChatId) {
        this.liveChatId = data.liveChatId;
        this.startPolling();
      } else {
        throw new Error("No live chat found for this video");
      }
    } catch (error) {
      console.error("[mctv] Failed to connect to YouTube chat:", error);
      throw error;
    }
  }

  private startPolling() {
    // Poll YouTube Live Chat API for new messages
    const poll = async () => {
      try {
        const url = `/api/youtube/messages?liveChatId=${this.liveChatId}${
          this.nextPageToken ? `&pageToken=${this.nextPageToken}` : ""
        }`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.messages && this.onMessageCallback) {
          for (const msg of data.messages) {
            const color = this.generateColorFromUsername(msg.authorName);
            const parsedMessage = parseYouTubeEmotes(msg.message);
            this.onMessageCallback(msg.authorName, parsedMessage, color);
          }
        }

        if (data.nextPageToken) {
          this.nextPageToken = data.nextPageToken;
        }

        // Use polling interval from response or default to 5 seconds
        const pollingInterval = data.pollingIntervalMillis || 5000;
        this.pollingInterval = setTimeout(poll, pollingInterval);
      } catch (error) {
        console.error("[mctv] YouTube polling error:", error);
        // Retry after 5 seconds on error
        this.pollingInterval = setTimeout(poll, 5000);
      }
    };

    poll();
  }

  disconnect() {
    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private generateColorFromUsername(username: string): string {
    // Simple hash function to generate consistent color
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Convert to HSL for better color variety (avoid very dark or very light colors)
    const hue = Math.abs(hash % 360);
    const saturation = 65 + (Math.abs(hash) % 20); // 65-85%
    const lightness = 55 + (Math.abs(hash >> 8) % 15); // 55-70%

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
}
