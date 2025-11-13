"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TwitchIcon } from "@/components/twitch-icon";
import { YoutubeIcon } from "@/components/youtube-icon";
import {
  getBadgeUrl,
  preloadBadges,
  preloadChannelBadges,
} from "@/lib/badge-ids";
import { useChatWebSocket } from "@/hooks/use-chat-websocket";

function OverlayContent() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [badgeUrls, setBadgeUrls] = useState<
    Record<string, Record<string, string>>
  >({});

  const twitchChannel = searchParams.get("twitch") || "";
  const youtubeVideoId = searchParams.get("youtube") || "";
  const showPlatformBadge = searchParams.get("platformBadge") !== "false"; // defaults to true
  const width = searchParams.get("width") || "800";
  const height = searchParams.get("height") || "600";
  const fadeOutTime =
    Number.parseInt(searchParams.get("fadeOut") || "10") * 1000; // Convert to milliseconds
  const fontSize = searchParams.get("fontSize") || "32"; // Added fontSize from query parameter

  const { messages: streamedMessages, isConnected } =
    useChatWebSocket(fadeOutTime);

  useEffect(() => {
    setMessages(streamedMessages);
  }, [streamedMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const connectChats = async () => {
      if (twitchChannel) {
        await fetch("/api/chat/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: "twitch", channel: twitchChannel }),
        });
      }

      if (youtubeVideoId) {
        await fetch("/api/chat/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform: "youtube",
            videoId: youtubeVideoId,
          }),
        });
      }
    };

    connectChats();
  }, [twitchChannel, youtubeVideoId]);

  useEffect(() => {
    const now = Date.now();
    // Clean up old messages from state immediately
    setMessages((prev) =>
      prev.filter((msg) => now - (msg.createdAt || 0) < fadeOutTime)
    );
  }, [fadeOutTime]);

  useEffect(() => {
    const loadBadges = async () => {
      await preloadBadges();
      if (twitchChannel) {
        await preloadChannelBadges(twitchChannel);
      }
    };
    loadBadges();
  }, [twitchChannel]);

  useEffect(() => {
    const loadBadgeUrls = async () => {
      const newBadgeUrls: Record<string, Record<string, string>> = {};

      for (const msg of messages) {
        if (msg.badges && msg.badges.length > 0) {
          const msgBadges: Record<string, string> = {};
          for (const badge of msg.badges) {
            const key = `${badge.name}-${badge.version}`;
            const url = await getBadgeUrl(
              badge.name,
              badge.version,
              msg.channel
            );
            if (url) {
              msgBadges[key] = url;
            }
          }
          newBadgeUrls[msg.id] = msgBadges;
        }
      }

      setBadgeUrls(newBadgeUrls);
    };

    loadBadgeUrls();
  }, [messages]);

  const getMessageOpacity = (msg: any) => {
    if (!msg.createdAt) return 1;
    const age = Date.now() - msg.createdAt;
    const fadeStartTime = fadeOutTime - 3000; // Start fading 3 seconds before removal for smoother effect
    if (age < fadeStartTime) return 1;
    const fadeProgress = (age - fadeStartTime) / 3000;
    // Use ease-out curve for more natural fade
    const easedProgress = 1 - Math.pow(1 - fadeProgress, 3);
    return Math.max(0, 1 - easedProgress);
  };

  return (
    <div className="fixed inset-0 p-4 flex items-end">
      {!isConnected && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-red-500/80 text-white text-xs rounded">
          Reconnecting...
        </div>
      )}
      <div
        className="overflow-y-auto space-y-1 flex flex-col scrollbar-hide"
        ref={scrollRef}
        style={{
          width: `${width}px`,
          maxHeight: `${height}px`,
          height: "auto",
          fontSize: `${fontSize}px`,
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="flex items-start gap-2 rounded px-2 py-0.5 transition-opacity duration-[3000ms] ease-out"
            style={{ opacity: getMessageOpacity(msg) }}
          >
            <div className="flex-1 flex items-start flex-wrap gap-1">
              <div className="flex items-center gap-1">
                {showPlatformBadge && (
                  <span
                    className="inline-flex items-center justify-center align-middle"
                    style={{ height: "1em", width: "1em" }}
                  >
                    {msg.platform === "twitch" ? (
                      <TwitchIcon style={{ height: "1em", width: "1em" }} />
                    ) : (
                      <YoutubeIcon style={{ height: "1em", width: "1em" }} />
                    )}
                  </span>
                )}
                {msg.badges &&
                  msg.badges.map((badge: any, idx: number) => {
                    const key = `${badge.name}-${badge.version}`;
                    const badgeUrl = badgeUrls[msg.id]?.[key];
                    if (!badgeUrl) return null;

                    return (
                      <img
                        key={`${badge.name}-${badge.version}-${idx}`}
                        src={badgeUrl || "/placeholder.svg"}
                        alt={badge.name}
                        title={badge.name}
                        className="inline-block align-middle mr-0.5"
                        style={{ height: "1em", width: "1em" }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    );
                  })}

                <span
                  className="font-semibold"
                  style={{
                    color:
                      msg.color ||
                      (msg.platform === "twitch" ? "#9146FF" : "#FF0000"),
                  }}
                >
                  {msg.username}:
                </span>
              </div>

              {/* Message */}
              <span className="leading-relaxed break-words flex-1">
                {(() => {
                  const textToRender = msg.parsedMessage || msg.message;
                  const parts: any[] = [];
                  let lastIndex = 0;
                  let lastEmoteData: { code: string; url: string } | null =
                    null;
                  let lastEmotePartIndex = -1;

                  const emoteRegex = /\[EMOTE\|([^|]+)\|([^|]+)\|([^\]]+)\]/g;
                  let match;

                  while ((match = emoteRegex.exec(textToRender)) !== null) {
                    if (match.index > lastIndex) {
                      parts.push(
                        textToRender.substring(lastIndex, match.index)
                      );
                    }

                    const [, code, url, zeroWidth] = match;
                    const isZeroWidth = zeroWidth === "1";

                    if (
                      isZeroWidth &&
                      lastEmoteData &&
                      lastEmotePartIndex >= 0
                    ) {
                      parts[lastEmotePartIndex] = (
                        <span
                          key={`emote-overlay-${match.index}`}
                          className="relative inline-block align-middle mx-0.5"
                        >
                          <img
                            src={lastEmoteData.url || "/placeholder.svg"}
                            alt={lastEmoteData.code}
                            title={lastEmoteData.code}
                            style={{ height: "1.5em", width: "auto" }}
                          />
                          <img
                            src={url || "/placeholder.svg"}
                            alt={code}
                            title={code}
                            className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                          />
                        </span>
                      );
                    } else {
                      parts.push(
                        <img
                          key={`emote-${match.index}`}
                          src={url || "/placeholder.svg"}
                          alt={code}
                          title={code}
                          className="inline-block align-middle mx-0.5"
                          style={{ height: "1.5em", width: "auto" }}
                        />
                      );
                      lastEmoteData = { code, url };
                      lastEmotePartIndex = parts.length - 1;
                    }

                    lastIndex = match.index + match[0].length;
                  }

                  if (lastIndex < textToRender.length) {
                    parts.push(textToRender.substring(lastIndex));
                  }

                  return parts.length > 0 ? parts : msg.message;
                })()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OverlayPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <OverlayContent />
    </Suspense>
  );
}
