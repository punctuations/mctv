"use client"

import { TwitchIcon } from "@/components/twitch-icon"
import { YoutubeIcon } from "@/components/youtube-icon"
import type { TwitchBadge } from "@/lib/twitch-client"
import { getBadgeUrl } from "@/lib/badge-ids"
import type { JSX } from "react"
import { useEffect, useState } from "react"

interface ChatMessageProps {
  platform: "twitch" | "youtube"
  username: string
  message: string
  parsedMessage?: string
  timestamp: Date
  badges?: TwitchBadge[]
  color?: string
  showPlatformBadge?: boolean // Added optional showPlatformBadge prop to control platform indicator visibility
  channel?: string // Added channel prop for badge lookup
}

export function ChatMessage({
  platform,
  username,
  message,
  parsedMessage,
  timestamp,
  badges,
  color,
  showPlatformBadge = true, // Default to showing platform badge
  channel, // Receive channel prop
}: ChatMessageProps) {
  const [badgeUrls, setBadgeUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    const loadBadges = async () => {
      if (!badges || badges.length === 0) return

      const urls: Record<string, string> = {}
      for (const badge of badges) {
        const key = `${badge.name}-${badge.version}`
        const url = await getBadgeUrl(badge.name, badge.version, channel)
        if (url) {
          urls[key] = url
        }
      }
      setBadgeUrls(urls)
    }

    loadBadges()
  }, [badges, channel])

  const renderMessage = () => {
    const textToRender = parsedMessage || message
    const parts: (string | JSX.Element)[] = []
    let lastIndex = 0
    let lastEmoteData: { code: string; url: string } | null = null
    let lastEmotePartIndex = -1

    const emoteRegex = /\[EMOTE\|([^|]+)\|([^|]+)\|([^\]]+)\]/g
    let match

    while ((match = emoteRegex.exec(textToRender)) !== null) {
      if (match.index > lastIndex) {
        parts.push(textToRender.substring(lastIndex, match.index))
      }

      const [, code, url, zeroWidth] = match
      const isZeroWidth = zeroWidth === "1"

      if (isZeroWidth && lastEmoteData && lastEmotePartIndex >= 0) {
        parts[lastEmotePartIndex] = (
          <span key={`emote-overlay-${match.index}`} className="relative inline-block align-middle mx-0.5">
            <img
              src={lastEmoteData.url || "/placeholder.svg"}
              alt={lastEmoteData.code}
              title={lastEmoteData.code}
              className="h-7 w-auto"
            />
            <img
              src={url || "/placeholder.svg"}
              alt={code}
              title={code}
              className="absolute inset-0 h-full w-full object-contain pointer-events-none"
            />
          </span>
        )
      } else {
        parts.push(
          <img
            key={`emote-${match.index}`}
            src={url || "/placeholder.svg"}
            alt={code}
            title={code}
            className="inline-block h-7 w-auto align-middle mx-0.5"
          />,
        )
        lastEmoteData = { code, url }
        lastEmotePartIndex = parts.length - 1
      }

      lastIndex = match.index + match[0].length
    }

    if (lastIndex < textToRender.length) {
      parts.push(textToRender.substring(lastIndex))
    }

    return parts.length > 0 ? parts : message
  }

  const renderBadges = () => {
    if (!badges || badges.length === 0) return null

    return badges.map((badge, idx) => {
      const key = `${badge.name}-${badge.version}`
      const badgeUrl = badgeUrls[key]
      if (!badgeUrl) return null

      return (
        <img
          key={`${badge.name}-${badge.version}-${idx}`}
          src={badgeUrl || "/placeholder.svg"}
          alt={badge.name}
          title={badge.name}
          className="inline-block h-4 w-4 align-middle mr-0.5"
          onError={(e) => {
            e.currentTarget.style.display = "none"
          }}
        />
      )
    })
  }

  const getUsernameColor = () => {
    if (color) {
      return color
    }
    return platform === "twitch" ? "#9146FF" : "#FF0000"
  }

  return (
    <div className="flex items-start gap-2 rounded px-2 py-0.5 min-h-9 transition-colors hover:bg-accent/50">
      {showPlatformBadge && (
        <div className="flex shrink-0 items-center justify-center mt-0.5">
          {platform === "twitch" ? <TwitchIcon className="h-4 w-4" /> : <YoutubeIcon className="h-4 w-4" />}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          {renderBadges()}

          <span className="font-semibold text-sm" style={{ color: getUsernameColor() }}>
            {username}:
          </span>

          <span className="text-sm leading-relaxed break-words">{renderMessage()}</span>
        </div>
      </div>

      <span className="text-xs text-muted-foreground shrink-0 ml-auto mt-0.5">{timestamp.toLocaleTimeString()}</span>
    </div>
  )
}

export default ChatMessage
