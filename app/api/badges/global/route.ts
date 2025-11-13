import { getTwitchAppAccessToken, getTwitchClientId } from "@/lib/twitch-auth";

// Cache badges for 1 hour
let cachedBadges: {
  data: any;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function GET() {
  // Return cached badges if still valid
  if (cachedBadges && Date.now() - cachedBadges.timestamp < CACHE_DURATION) {
    return Response.json(cachedBadges.data);
  }

  try {
    const clientId = getTwitchClientId();
    const accessToken = await getTwitchAppAccessToken();

    const response = await fetch(
      "https://api.twitch.tv/helix/chat/badges/global",
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
        "[mctv] Twitch badge API error:",
        response.status,
        errorText,
      );
      throw new Error(`Failed to fetch badges: ${response.statusText}`);
    }

    const data = await response.json();

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
    cachedBadges = {
      data: result,
      timestamp: Date.now(),
    };

    console.log("[mctv] Successfully fetched and cached Twitch badges");
    return Response.json(result);
  } catch (error) {
    console.error("[mctv] Error fetching Twitch badges:", error);
    return Response.json({ error: "Failed to fetch badges" }, { status: 500 });
  }
}
