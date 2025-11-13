# MultiChat API

A real-time chat aggregator that connects to both Twitch and YouTube live chat
streams simultaneously with custom emote support.

## Features

- **Twitch Chat Integration**: Connect to any public Twitch channel with full
  badge support
- **YouTube Chat Integration**: Monitor YouTube live stream chat using YouTube
  Data API v3
- **Custom Emote Support**: Automatically loads and displays emotes from 7TV,
  BetterTTV (BTTV), FrankerFaceZ (FFZ), and native Twitch emotes
- **User Badges**: Display Twitch user badges (broadcaster, moderator, VIP,
  subscriber, bits, etc.)
- **Unified Chat View**: See messages from both platforms in a single dashboard
- **Real-time Updates**: Live message streaming with auto-scrolling
- **Transparent Overlay**: Embeddable chat overlay for OBS/streaming software

## Setup

### Environment Variables

You need to add the following environment variables.

**Required:**

- `YOUTUBE_API_KEY` - YouTube Data API v3 key for accessing live chat
- `TWITCH_CLIENT_ID` - Twitch application Client ID for badge API access
- `TWITCH_CLIENT_SECRET` - Twitch application Client Secret for badge API access

#### Getting YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the YouTube Data API v3
4. Create credentials (API Key)
5. Copy the API key

#### Getting Twitch Client ID and Secret

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console)
2. Register a new application or select an existing one
3. Set OAuth Redirect URLs to `http://localhost:3000` (or your domain)
4. Copy the **Client ID**
5. Click **"New Secret"** to generate a Client Secret
6. Copy the **Client Secret** immediately (it won't be shown again)
7. Add both to your environment variables

Add your credentials to the environment variables:

\`\`\` YOUTUBE_API_KEY=your_youtube_api_key_here
TWITCH_CLIENT_ID=your_twitch_client_id_here
TWITCH_CLIENT_SECRET=your_twitch_client_secret_here \`\`\`

### Installation

The app runs on Next.js and requires no additional setup beyond the YouTube API
key and Twitch Client ID.

## Usage

### Twitch Chat

1. Enter any public Twitch channel name (e.g., "xqc", "shroud")
2. Click "Connect" to start receiving chat messages
3. Emotes from 7TV, BTTV, FFZ, and native Twitch are automatically loaded and
   displayed
4. User badges are shown for each user
5. No authentication required - reads public chat anonymously

### YouTube Chat

1. Find a live YouTube channel ID (e.g., `@_andrewalexander_`)
2. Enter the channel ID in the YouTube section
3. Click "Connect" to start receiving live chat messages
4. Requires the YouTube API key to be configured

## API Endpoints

### Connect to Chat

**POST** `/api/chat/connect`

Connect to a platform chat stream.

\`\`\`json { "platform": "twitch", "channel": "channelname" } \`\`\`

or

\`\`\`json { "platform": "youtube", "videoId": "video_id_here" } \`\`\`

### Disconnect from Chat

**POST** `/api/chat/disconnect`

\`\`\`json { "platform": "twitch" } \`\`\`

### Get Messages

**GET** `/api/chat/messages`

Returns all cached messages from both platforms.

### Get Channel Emotes

**GET** `/api/emotes/[channel]`

Returns all available emotes (7TV, BTTV, FFZ) for a specific Twitch channel.

Response: \`\`\`json { "emotes": [ { "id": "emote_id", "code": "KEKW", "url":
"https://cdn.7tv.app/emote/...", "provider": "7tv" } ], "count": 150 } \`\`\`

### Clear Messages

**POST** `/api/chat/clear`

Clears all cached messages.

### Connection Status

**GET** `/api/chat/status`

Returns current connection status for both platforms.

## Emote Support

The app automatically integrates with three major third-party emote providers
for Twitch:

- **7TV**: Modern emote platform with animated emotes
- **BetterTTV (BTTV)**: Popular emote extension with channel and shared emotes
- **FrankerFaceZ (FFZ)**: Classic emote provider with extensive channel
  customization

Emotes are:

- Automatically loaded when connecting to a Twitch channel
- Cached for performance
- Rendered inline within chat messages
- Displayed with their original emote codes as tooltips

## Technical Details

- **Twitch**: Uses WebSocket IRC connection (anonymous read-only access) and
  Twitch Badge API for user badges
- **YouTube**: Polls YouTube Data API v3 for live chat messages
- **Emotes**: Fetches from 7TV, BTTV, FFZ, and native Twitch public APIs
- **Message Storage**: In-memory storage with 100 message limit
- **Polling Interval**: 1 second for message updates (5 seconds for YouTube API)
- **Emote Parsing**: Real-time text replacement with regex matching

## Limitations

- Twitch connection is read-only (cannot send messages)
- YouTube requires an active live stream with chat enabled
- YouTube API has quota limits (check Google Cloud Console for your usage)
- Emote caching is per-session (resets on server restart)
