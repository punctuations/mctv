// Map YouTube colon-style emotes to unicode emoji
export const YOUTUBE_EMOTE_MAP: Record<string, string> = {
  // Common YouTube emotes with emoji equivalents
  ":yougotthis:": "💪",
  ":elbowcough:": "😷",
  ":clappinghands:": "👏",
  ":heart:": "❤️",
  ":fire:": "🔥",
  ":thumbsup:": "👍",
  ":thumbsdown:": "👎",
  ":smilingface:": "😊",
  ":laughingface:": "😂",
  ":crying:": "😢",
  ":thinking:": "🤔",
  ":shocked:": "😱",
  ":partying:": "🥳",
  ":cool:": "😎",
  ":winking:": "😉",
  ":love:": "😍",
  ":angry:": "😠",
  ":sleepy:": "😴",
  ":surprised:": "😮",
  ":confused:": "😕",
  ":starstruck:": "🤩",
  ":money:": "💰",
  ":star:": "⭐",
  ":rocket:": "🚀",
  ":trophy:": "🏆",
  ":crown:": "👑",
  ":gift:": "🎁",
  ":cake:": "🎂",
  ":pizza:": "🍕",
  ":coffee:": "☕",
  ":musical:": "🎵",
  ":gaming:": "🎮",
  ":wave:": "👋",
  ":victory:": "✌️",
  ":ok:": "👌",
  ":pray:": "🙏",
  ":muscle:": "💪",
  ":rainbow:": "🌈",
  ":sun:": "☀️",
  ":moon:": "🌙",
}

export function parseYouTubeEmotes(message: string): string {
  let parsed = message

  // Replace YouTube colon-style emotes with unicode emoji
  for (const [emoteCode, emoji] of Object.entries(YOUTUBE_EMOTE_MAP)) {
    const regex = new RegExp(emoteCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
    parsed = parsed.replace(regex, emoji)
  }

  return parsed
}
