export class YouTubeClient {
  private videoId = "";
  private liveChatId = "";
  private onMessageCallback:
    | ((username: string, message: string, color: string) => void)
    | null = null;
  private pollingWorker: Worker | null = null;

  async connect(
    idOrChannel: string,
    onMessage: (username: string, message: string, color: string) => void,
    isChannelId = false,
  ) {
    this.onMessageCallback = onMessage;

    // Build an absolute base URL for server-side fetch; use relative in browser
    const isServer = typeof window === "undefined";
    const baseUrl = isServer
      ? process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : `http://localhost:${process.env.PORT || 3000}`)
      : "";

    try {
      if (isChannelId) {
        const searchResponse = await fetch(
          `${baseUrl}/api/youtube/search-live?channelId=${
            encodeURIComponent(idOrChannel)
          }`,
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
        `${baseUrl}/api/youtube/livechat?videoId=${
          encodeURIComponent(this.videoId)
        }`,
        { method: "GET" },
      );

      const data = await response.json();

      if (data.liveChatId) {
        this.liveChatId = data.liveChatId;
        this.startServerPolling();
      } else {
        throw new Error("No live chat found for this video");
      }
    } catch (error) {
      console.error("[mctv] Failed to connect to YouTube chat:", error);
      throw error;
    }
  }

  private async startServerPolling() {
    try {
      // Build an absolute base URL for server-side fetch; use relative in browser
      const isServer = typeof window === "undefined";
      const baseUrl = isServer
        ? process.env.NEXT_PUBLIC_SITE_URL ||
          (process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : `http://localhost:${process.env.PORT || 3000}`)
        : "";

      // Notify the server to start polling this live chat
      await fetch(`${baseUrl}/api/youtube/start-polling`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveChatId: this.liveChatId }),
      });
      console.log(
        "[mctv] Started server-side YouTube polling for chat:",
        this.liveChatId,
      );
    } catch (error) {
      console.error("[mctv] Failed to start YouTube polling:", error);
    }
  }

  async disconnect() {
    if (this.liveChatId) {
      try {
        // Build an absolute base URL for server-side fetch; use relative in browser
        const isServer = typeof window === "undefined";
        const baseUrl = isServer
          ? process.env.NEXT_PUBLIC_SITE_URL ||
            (process.env.VERCEL_URL
              ? `https://${process.env.VERCEL_URL}`
              : `http://localhost:${process.env.PORT || 3000}`)
          : "";

        await fetch(`${baseUrl}/api/youtube/stop-polling`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ liveChatId: this.liveChatId }),
        });
        console.log("[mctv] Stopped server-side YouTube polling");
      } catch (error) {
        console.error("[mctv] Failed to stop YouTube polling:", error);
      }
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
