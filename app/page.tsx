"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TwitchIcon } from "@/components/twitch-icon"
import { YoutubeIcon } from "@/components/youtube-icon"
import ChatMessageComponent from "@/components/chat-message"
import { preloadBadges } from "@/lib/badge-ids"

interface ChatMessage {
  id: string
  platform: "twitch" | "youtube"
  username: string
  message: string
  parsedMessage?: string
  timestamp: Date
  badges?: string[]
  color?: string
  channel?: string // Added channel field
}

export default function MultiChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [twitchChannel, setTwitchChannel] = useState("")
  const [youtubeChannelId, setYoutubeChannelId] = useState("")
  const [isConnectedTwitch, setIsConnectedTwitch] = useState(false)
  const [isConnectedYoutube, setIsConnectedYoutube] = useState(false)
  const [showPlatformBadges, setShowPlatformBadges] = useState(true)
  const [isConnectingTwitch, setIsConnectingTwitch] = useState(false)
  const [isConnectingYoutube, setIsConnectingYoutube] = useState(false)
  const [copiedOverlay, setCopiedOverlay] = useState(false)
  const [chatboxWidth, setChatboxWidth] = useState("400")
  const [chatboxHeight, setChatboxHeight] = useState("600")
  const [fadeOutTime, setFadeOutTime] = useState("10")
  const [fontSize, setFontSize] = useState("14") // Added font size state
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    preloadBadges()
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const connectTwitch = async () => {
    if (!twitchChannel.trim() || isConnectingTwitch) return

    setIsConnectingTwitch(true)
    try {
      const response = await fetch("/api/chat/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "twitch", channel: twitchChannel }),
      })

      if (response.ok) {
        setIsConnectedTwitch(true)
      }
    } catch (error) {
      console.error("Failed to connect to Twitch:", error)
    } finally {
      setIsConnectingTwitch(false)
    }
  }

  const connectYoutube = async () => {
    if (!youtubeChannelId.trim() || isConnectingYoutube) return

    setIsConnectingYoutube(true)
    try {
      const response = await fetch("/api/chat/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "youtube", channelId: youtubeChannelId }),
      })

      if (response.ok) {
        setIsConnectedYoutube(true)
      } else {
        const data = await response.json()
        alert(data.error || "Failed to connect to YouTube")
      }
    } catch (error) {
      console.error("Failed to connect to YouTube:", error)
      alert("Failed to connect to YouTube")
    } finally {
      setIsConnectingYoutube(false)
    }
  }

  const disconnect = async (platform: "twitch" | "youtube") => {
    try {
      await fetch("/api/chat/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      })

      if (platform === "twitch") {
        setIsConnectedTwitch(false)
        setTwitchChannel("")
      } else {
        setIsConnectedYoutube(false)
        setYoutubeChannelId("")
      }
    } catch (error) {
      console.error(`Failed to disconnect from ${platform}:`, error)
    }
  }

  useEffect(() => {
    const pollMessages = async () => {
      try {
        const response = await fetch("/api/chat/messages")
        const data = await response.json()

        if (data.messages) {
          setMessages(
            data.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            })),
          )
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error)
      }
    }

    const interval = setInterval(pollMessages, 1000)
    return () => clearInterval(interval)
  }, [isConnectedTwitch, isConnectedYoutube])

  const copyOverlayLink = () => {
    const overlayUrl = `${window.location.origin}/overlay?twitch=${twitchChannel}&youtubeChannel=${youtubeChannelId}&platformBadge=${showPlatformBadges}&width=${chatboxWidth}&height=${chatboxHeight}&fadeOut=${fadeOutTime}&fontSize=${fontSize}`
    navigator.clipboard.writeText(overlayUrl)
    setCopiedOverlay(true)
    setTimeout(() => setCopiedOverlay(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-balance">MultiChat Dashboard</h1>
          <p className="text-muted-foreground text-pretty">
            Connect to Twitch and YouTube chat streams with 7TV, BTTV, and FrankerFaceZ emote support
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-twitch/10">
                <TwitchIcon className="h-5 w-5 text-twitch" />
              </div>
              <div>
                <h3 className="font-semibold">Twitch Chat</h3>
                <p className="text-sm text-muted-foreground">Connect to a channel</p>
              </div>
              {isConnectedTwitch && (
                <Badge className="ml-auto bg-[#9147FF] text-white hover:bg-[#9147FF]/90">Connected</Badge>
              )}
            </div>

            {!isConnectedTwitch ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter channel name"
                  value={twitchChannel}
                  onChange={(e) => setTwitchChannel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && connectTwitch()}
                  disabled={isConnectingTwitch}
                />
                <Button
                  onClick={connectTwitch}
                  className="bg-twitch hover:bg-twitch/90 cursor-pointer"
                  disabled={isConnectingTwitch}
                >
                  {isConnectingTwitch ? "Connecting..." : "Connect"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Channel: <span className="font-medium text-foreground">{twitchChannel}</span>
                </span>
                <Button variant="outline" size="sm" onClick={() => disconnect("twitch")} className="cursor-pointer">
                  Disconnect
                </Button>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg">
                <YoutubeIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">YouTube Chat</h3>
                <p className="text-sm text-muted-foreground">Connect to a channel</p>
              </div>
              {isConnectedYoutube && (
                <Badge className="ml-auto bg-[#FF0000] text-white hover:bg-[#FF0000]/90">Connected</Badge>
              )}
            </div>

            {!isConnectedYoutube ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter channel ID or @handle"
                  value={youtubeChannelId}
                  onChange={(e) => setYoutubeChannelId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && connectYoutube()}
                  disabled={isConnectingYoutube}
                />
                <Button
                  onClick={connectYoutube}
                  className="bg-youtube hover:bg-youtube/90 cursor-pointer"
                  disabled={isConnectingYoutube}
                >
                  {isConnectingYoutube ? "Connecting..." : "Connect"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Channel: <span className="font-medium text-foreground">{youtubeChannelId}</span>
                </span>
                <Button variant="outline" size="sm" onClick={() => disconnect("youtube")} className="cursor-pointer">
                  Disconnect
                </Button>
              </div>
            )}
          </Card>
        </div>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Live Chat</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPlatformBadges(!showPlatformBadges)}
                className="cursor-pointer"
              >
                {showPlatformBadges ? "Hide" : "Show"} Platform Badges
              </Button>
              {(isConnectedTwitch || isConnectedYoutube) && (
                <Button variant="outline" size="sm" onClick={copyOverlayLink} className="cursor-pointer bg-transparent">
                  {copiedOverlay ? "Copied!" : "Copy Overlay Link"}
                </Button>
              )}
              {isConnectedTwitch && (
                <Badge variant="outline" className="border-[#9147FF] text-[#9147FF]">
                  <TwitchIcon className="mr-1 h-4 w-4" />
                  Twitch
                </Badge>
              )}
              {isConnectedYoutube && (
                <Badge variant="outline" className="border-[#FF0000] text-[#FF0000]">
                  <YoutubeIcon className="mr-1 h-4 w-4" />
                  YouTube
                </Badge>
              )}
            </div>
          </div>

          <div className="mb-4 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label htmlFor="width" className="text-sm font-medium">
                Overlay Width (px):
              </label>
              <Input
                id="width"
                type="number"
                value={chatboxWidth}
                onChange={(e) => setChatboxWidth(e.target.value)}
                className="w-24"
                min="200"
                max="1000"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="height" className="text-sm font-medium">
                Overlay Height (px):
              </label>
              <Input
                id="height"
                type="number"
                value={chatboxHeight}
                onChange={(e) => setChatboxHeight(e.target.value)}
                className="w-24"
                min="200"
                max="1200"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="fadeOut" className="text-sm font-medium">
                Fade Out (seconds):
              </label>
              <Input
                id="fadeOut"
                type="number"
                value={fadeOutTime}
                onChange={(e) => setFadeOutTime(e.target.value)}
                className="w-20"
                min="3"
                max="60"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="fontSize" className="text-sm font-medium">
                Font Size (px):
              </label>
              <Input
                id="fontSize"
                type="number"
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="w-20"
                min="10"
                max="32"
              />
            </div>
          </div>

          <ScrollArea className={`h-[${chatboxHeight}px] pr-4`} ref={scrollRef}>
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="flex h-[500px] items-center justify-center text-muted-foreground">
                  <p>Connect to a chat to see messages</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <ChatMessageComponent
                    key={msg.id}
                    platform={msg.platform}
                    username={msg.username}
                    message={msg.message}
                    parsedMessage={msg.parsedMessage}
                    timestamp={msg.timestamp}
                    badges={msg.badges}
                    color={msg.color}
                    showPlatformBadge={showPlatformBadges}
                    channel={msg.channel} // Pass channel prop
                    fontSize={fontSize} // Pass fontSize prop
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  )
}
