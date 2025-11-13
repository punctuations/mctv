import type { TwitchEmote } from "./twitch-client";

export interface Emote {
  id: string;
  code: string;
  url: string;
  imageType: string;
  animated: boolean;
  zeroWidth?: boolean;
}

export class EmoteProviders {
  private emoteCache: Map<string, Emote[]> = new Map();
  private globalEmotesCache: Emote[] | null = null;

  async fetchAllEmotes(channel: string): Promise<Emote[]> {
    console.log(`[mctv] Loading emotes for channel: ${channel}`);

    const cacheKey = channel.toLowerCase();
    if (this.emoteCache.has(cacheKey)) {
      console.log(
        `[mctv] Returning cached emotes: ${
          this.emoteCache.get(cacheKey)!.length
        }`,
      );
      return this.emoteCache.get(cacheKey)!;
    }

    try {
      const [channelResponse, globalEmotes] = await Promise.all([
        fetch(`https://emotes.crippled.dev/v1/channel/${channel}/all`),
        this.fetchGlobalTwitchEmotes(),
      ]);

      const allEmotes: Emote[] = [...globalEmotes];

      if (channelResponse.ok) {
        const data = await channelResponse.json();

        if (Array.isArray(data)) {
          for (const emoteData of data) {
            const urlData = emoteData.urls?.find((u: any) => u.size === "3x") ||
              emoteData.urls?.find((u: any) => u.size === "2x") ||
              emoteData.urls?.[0];

            if (urlData && urlData.url) {
              allEmotes.push({
                id: emoteData.code,
                code: emoteData.code,
                url: urlData.url,
                imageType: emoteData.animated ? "GIF" : "PNG",
                animated: emoteData.animated || false,
                zeroWidth: emoteData.zero_width || false,
              });
            }
          }
        }
      } else {
        console.log(
          `[mctv] Failed to fetch channel emotes for ${channel}: ${channelResponse.status}`,
        );
      }

      console.log(
        `[mctv] Loaded ${allEmotes.length} total emotes for ${channel} (including globals)`,
      );
      this.emoteCache.set(cacheKey, allEmotes);
      return allEmotes;
    } catch (error) {
      console.error("[mctv] Error fetching emotes:", error);
      return this.globalEmotesCache || [];
    }
  }

  async fetchGlobalTwitchEmotes(): Promise<Emote[]> {
    if (this.globalEmotesCache) {
      console.log(
        `[mctv] Returning cached global Twitch emotes: ${this.globalEmotesCache.length}`,
      );
      return this.globalEmotesCache;
    }

    try {
      const response = await fetch(
        "https://emotes.crippled.dev/v1/global/twitch",
      );

      if (!response.ok) {
        console.log(
          `[mctv] Failed to fetch global Twitch emotes: ${response.status}`,
        );
        return [];
      }

      const data = await response.json();
      const emotes: Emote[] = [];

      if (Array.isArray(data)) {
        for (const emoteData of data) {
          const urlData = emoteData.urls?.find((u: any) => u.size === "3x") ||
            emoteData.urls?.find((u: any) => u.size === "2x") ||
            emoteData.urls?.[0];

          if (urlData && urlData.url) {
            emotes.push({
              id: emoteData.code,
              code: emoteData.code,
              url: urlData.url,
              imageType: emoteData.animated ? "GIF" : "PNG",
              animated: emoteData.animated || false,
              zeroWidth: emoteData.zero_width || false,
            });
          }
        }
      }

      console.log(`[mctv] Loaded ${emotes.length} global Twitch emotes`);
      this.globalEmotesCache = emotes;
      return emotes;
    } catch (error) {
      console.error("[mctv] Error fetching global Twitch emotes:", error);
      return [];
    }
  }

  parseEmotes(message: string, emotes: Emote[]): string {
    let parsed = message;

    const sortedEmotes = [...emotes].sort((a, b) =>
      b.code.length - a.code.length
    );

    for (const emote of sortedEmotes) {
      const regex = new RegExp(
        `\\b${emote.code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "g",
      );
      parsed = parsed.replace(
        regex,
        `[EMOTE|${emote.code}|${emote.url}|${emote.zeroWidth ? "1" : "0"}]`,
      );
    }

    return parsed;
  }

  parseEmotesWithTwitchNative(
    message: string,
    thirdPartyEmotes: Emote[],
    twitchEmotes: TwitchEmote[],
  ): string {
    let parsed = message;

    const sortedTwitchEmotes = [...twitchEmotes]
      .flatMap((emote) => emote.positions.map((pos) => ({ ...emote, ...pos })))
      .sort((a, b) => b.start - a.start);

    for (const emote of sortedTwitchEmotes) {
      const before = parsed.substring(0, emote.start);
      const after = parsed.substring(emote.end + 1);
      const emoteUrl =
        `https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/default/dark/2.0`;
      parsed = before + `[EMOTE|${emote.code}|${emoteUrl}|0]` + after;
    }

    const sortedEmotes = [...thirdPartyEmotes].sort((a, b) =>
      b.code.length - a.code.length
    );

    for (const emote of sortedEmotes) {
      const parts = parsed.split(/(\[EMOTE\|[^\]]+\])/);

      for (let i = 0; i < parts.length; i++) {
        if (!parts[i].startsWith("[EMOTE|")) {
          const regex = new RegExp(
            `\\b${emote.code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
            "g",
          );
          parts[i] = parts[i].replace(
            regex,
            `[EMOTE|${emote.code}|${emote.url}|${emote.zeroWidth ? "1" : "0"}]`,
          );
        }
      }

      parsed = parts.join("");
    }

    return parsed;
  }

  clearCache() {
    this.emoteCache.clear();
    this.globalEmotesCache = null;
  }
}

export const emoteProviders = new EmoteProviders();
