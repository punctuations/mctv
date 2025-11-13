import { getTwitchAppAccessToken, getTwitchClientId } from "@/lib/twitch-auth";

// Cache channel badges for 1 hour per channel
const channelBadgeCache = new Map<
  string,
  {
    data: any;
    timestamp: number;
  }
>();

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const broadcasterLogin = searchParams.get("broadcaster_login");

  if (!broadcasterLogin) {
    return Response.json({ error: "broadcaster_login is required" }, {
      status: 400,
    });
  }

  // Return cached badges if still valid
  const cached = channelBadgeCache.get(broadcasterLogin);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return Response.json(cached.data);
  }

  try {
    const clientId = getTwitchClientId();
    const accessToken = await getTwitchAppAccessToken();

    // First, get the broadcaster ID from their login name
    const userResponse = await fetch(
      `https://api.twitch.tv/helix/users?login=${broadcasterLogin}`,
      {
        headers: {
          "Client-Id": clientId,
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!userResponse.ok) {
      throw new Error(`Failed to fetch user: ${userResponse.statusText}`);
    }

    const userData = await userResponse.json();
    if (!userData.data || userData.data.length === 0) {
      return Response.json({ error: "Broadcaster not found" }, { status: 404 });
    }

    const broadcasterId = userData.data[0].id;

    // Now fetch channel-specific badges
    const response = await fetch(
      `https://api.twitch.tv/helix/chat/badges?broadcaster_id=${broadcasterId}`,
      {
        headers: {
          "Client-Id": clientId,
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[mctv] Twitch channel badge API error:",
        response.status,
        errorText,
      );
      throw new Error(`Failed to fetch channel badges: ${response.statusText}`);
    }

    const data = await response.json();

    console.log(
      "[mctv] Channel badge data for",
      broadcasterLogin,
      ":",
      JSON.stringify(data.data, null, 2),
    );

    // Create a lookup map: { set_id: { version: image_url_2x } }
    const badgeMap: Record<string, Record<string, string>> = {};

    for (const badgeSet of data.data) {
      badgeMap[badgeSet.set_id] = {};
      for (const version of badgeSet.versions) {
        badgeMap[badgeSet.set_id][version.id] = version.image_url_2x;
      }
    }

    const result = { badges: badgeMap };

    // Cache the result
    channelBadgeCache.set(broadcasterLogin, {
      data: result,
      timestamp: Date.now(),
    });

    console.log(
      "[mctv] Successfully fetched and cached channel badges for:",
      broadcasterLogin,
    );
    console.log(
      "[mctv] Subscriber badge versions available:",
      Object.keys(badgeMap.subscriber || {}),
    );
    return Response.json(result);
  } catch (error) {
    console.error("[mctv] Error fetching Twitch channel badges:", error);
    return Response.json({ error: "Failed to fetch channel badges" }, {
      status: 500,
    });
  }
}
