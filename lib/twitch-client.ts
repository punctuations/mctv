export interface TwitchBadge {
  name: string
  version: string
}

export interface TwitchEmote {
  id: string
  code: string
  positions: { start: number; end: number }[]
}

export class TwitchClient {
  private ws: WebSocket | null = null
  private channel = ""
  private onMessageCallback:
    | ((username: string, message: string, badges: TwitchBadge[], color?: string, twitchEmotes?: TwitchEmote[]) => void)
    | null = null

  connect(
    channel: string,
    onMessage: (
      username: string,
      message: string,
      badges: TwitchBadge[],
      color?: string,
      twitchEmotes?: TwitchEmote[],
    ) => void,
  ) {
    this.channel = channel.toLowerCase()
    this.onMessageCallback = onMessage

    // Connect to Twitch IRC via WebSocket (anonymous)
    this.ws = new WebSocket("wss://irc-ws.chat.twitch.tv:443")

    this.ws.onopen = () => {
      this.ws?.send("CAP REQ :twitch.tv/tags twitch.tv/commands")
      this.ws?.send("PASS SCHMOOPIIE")
      this.ws?.send(`NICK justinfan${Math.floor(Math.random() * 100000)}`)
      this.ws?.send(`JOIN #${this.channel}`)
    }

    this.ws.onmessage = (event) => {
      const messages = event.data.split("\r\n")

      for (const message of messages) {
        if (message.startsWith("PING")) {
          this.ws?.send("PONG :tmi.twitch.tv")
        } else if (message.includes("PRIVMSG")) {
          const parsed = this.parseMessage(message)
          if (parsed && this.onMessageCallback) {
            this.onMessageCallback(parsed.username, parsed.message, parsed.badges, parsed.color, parsed.twitchEmotes)
          }
        }
      }
    }

    this.ws.onerror = (error) => {
      console.error("Twitch WebSocket error:", error)
    }

    this.ws.onclose = () => {
      console.log("Twitch WebSocket closed")
    }
  }

  private parseMessage(
    rawMessage: string,
  ): { username: string; message: string; badges: TwitchBadge[]; color?: string; twitchEmotes?: TwitchEmote[] } | null {
    try {
      const badges: TwitchBadge[] = []

      let displayName: string | null = null
      const displayNameMatch = rawMessage.match(/display-name=([^;]*);/)
      if (displayNameMatch && displayNameMatch[1]) {
        displayName = displayNameMatch[1]
      }

      let subscriberMonths: string | null = null
      const badgeInfoMatch = rawMessage.match(/badge-info=([^;]*);/)
      if (badgeInfoMatch && badgeInfoMatch[1]) {
        const badgeInfoString = badgeInfoMatch[1]
        if (badgeInfoString) {
          badgeInfoString.split(",").forEach((info) => {
            const [name, value] = info.split("/")
            if (name === "subscriber" && value) {
              subscriberMonths = value
            }
          })
        }
      }

      const badgeMatch = rawMessage.match(/badges=([^;]*);/)
      if (badgeMatch && badgeMatch[1]) {
        const badgeString = badgeMatch[1]
        if (badgeString) {
          badgeString.split(",").forEach((badge) => {
            const [name, version] = badge.split("/")
            if (name && version) {
              if (name === "subscriber" && subscriberMonths) {
                badges.push({ name, version: subscriberMonths })
              } else {
                badges.push({ name, version })
              }
            }
          })
        }
      }

      let color: string | undefined
      const colorMatch = rawMessage.match(/color=(#[0-9A-Fa-f]{6})?;/)
      if (colorMatch && colorMatch[1] && colorMatch[1] !== "") {
        color = colorMatch[1]
      }

      const twitchEmotes: TwitchEmote[] = []
      const emotesMatch = rawMessage.match(/emotes=([^;]*);/)
      if (emotesMatch && emotesMatch[1]) {
        const emotesString = emotesMatch[1]
        if (emotesString) {
          // Format: emote_id:start-end,start-end/emote_id:start-end
          const emoteGroups = emotesString.split("/")
          for (const group of emoteGroups) {
            const [emoteId, positionsStr] = group.split(":")
            if (emoteId && positionsStr) {
              const positions = positionsStr.split(",").map((pos) => {
                const [start, end] = pos.split("-").map(Number)
                return { start, end }
              })
              twitchEmotes.push({
                id: emoteId,
                code: "", // Will be filled from message text
                positions,
              })
            }
          }
        }
      }

      const match = rawMessage.match(/:(\w+)!.*PRIVMSG #\w+ :(.+)/)
      if (match) {
        const messageText = match[2]

        for (const emote of twitchEmotes) {
          if (emote.positions.length > 0) {
            const firstPos = emote.positions[0]
            emote.code = messageText.substring(firstPos.start, firstPos.end + 1)
          }
        }

        return {
          username: displayName || match[1],
          message: messageText,
          badges,
          color,
          twitchEmotes,
        }
      }
    } catch (error) {
      console.error("Error parsing Twitch message:", error)
    }
    return null
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}
