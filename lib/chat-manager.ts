import {
  type TwitchBadge,
  TwitchClient,
  type TwitchEmote,
} from "./twitch-client";
import { YouTubeClient } from "./youtube-client";
import { type Emote, emoteProviders } from "./emote-providers";

export interface ChatMessage {
  id: string;
  platform: "twitch" | "youtube";
  username: string;
  message: string;
  parsedMessage?: string;
  timestamp: Date;
  badges?: TwitchBadge[];
  color?: string;
  createdAt?: number; // Added createdAt timestamp for fade-out effect
  channel?: string; // Added channel field to track Twitch channel for badge lookups
}

export interface ConnectionStatus {
  twitch: {
    connected: boolean;
    channel: string | null;
  };
  youtube: {
    connected: boolean;
    videoId: string | null;
  };
}

class ChatManager {
  private twitchClient: TwitchClient | null = null;
  private youtubeClient: YouTubeClient | null = null;
  private messages: ChatMessage[] = [];
  private maxMessages = 100;
  private maxMessageAge = 30000; // 30 seconds - messages older than this get removed
  private channelEmotes: Emote[] = [];
  private currentTwitchChannel: string | null = null; // Track current Twitch channel
  private connectionStatus: ConnectionStatus = {
    twitch: { connected: false, channel: null },
    youtube: { connected: false, videoId: null },
  };

  async connectTwitch(channel: string) {
    if (this.twitchClient) {
      this.twitchClient.disconnect();
    }

    console.log("[mctv] Loading emotes for channel:", channel);
    this.channelEmotes = await emoteProviders.fetchAllEmotes(channel);
    console.log("[mctv] Loaded emotes:", this.channelEmotes.length);

    const { preloadChannelBadges } = await import("./badge-ids");
    await preloadChannelBadges(channel);
    this.currentTwitchChannel = channel;

    this.twitchClient = new TwitchClient();
    this.twitchClient.connect(
      channel,
      (username, message, badges, color, twitchEmotes) => {
        this.addMessage(
          "twitch",
          username,
          message,
          badges,
          color,
          twitchEmotes,
        );
      },
    );

    this.connectionStatus.twitch = { connected: true, channel };
  }

  async connectYoutube(idOrChannel: string, isChannelId = false) {
    if (this.youtubeClient) {
      this.youtubeClient.disconnect();
    }

    this.youtubeClient = new YouTubeClient();
    await this.youtubeClient.connect(
      idOrChannel,
      (username, message, color) => {
        this.addMessage("youtube", username, message, undefined, color);
      },
      isChannelId,
    );

    this.connectionStatus.youtube = { connected: true, videoId: idOrChannel };
  }

  disconnectTwitch() {
    if (this.twitchClient) {
      this.twitchClient.disconnect();
      this.twitchClient = null;
    }

    this.channelEmotes = [];
    this.currentTwitchChannel = null; // Clear current channel
    this.connectionStatus.twitch = { connected: false, channel: null };
  }

  disconnectYoutube() {
    if (this.youtubeClient) {
      this.youtubeClient.disconnect();
      this.youtubeClient = null;
    }

    this.connectionStatus.youtube = { connected: false, videoId: null };
  }

  private addMessage(
    platform: "twitch" | "youtube",
    username: string,
    message: string,
    badges?: TwitchBadge[],
    color?: string,
    twitchEmotes?: TwitchEmote[],
  ) {
    const parsedMessage = platform === "twitch"
      ? emoteProviders.parseEmotesWithTwitchNative(
        message,
        this.channelEmotes,
        twitchEmotes || [],
      )
      : message;

    const chatMessage: ChatMessage = {
      id: `${platform}-${Date.now()}-${Math.random()}`,
      platform,
      username,
      message,
      parsedMessage,
      timestamp: new Date(),
      badges,
      color,
      createdAt: Date.now(), // Track creation timestamp for fade-out
      channel: platform === "twitch"
        ? this.currentTwitchChannel || undefined
        : undefined, // Add channel to message
    };

    this.messages.push(chatMessage);

    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }
  }

  getMessages(): ChatMessage[] {
    this.cleanupOldMessages();
    return this.messages;
  }

  private cleanupOldMessages() {
    const now = Date.now();
    this.messages = this.messages.filter((msg) => {
      const age = now - (msg.createdAt || 0);
      return age < this.maxMessageAge;
    });
  }

  clearMessages() {
    this.messages = [];
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }
}

export const chatManager = new ChatManager();
