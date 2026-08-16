/**
 * Cloudflare Worker: osu! API v2 Secure Proxy & Caching Gateway
 * 
 * Securely handles osu! API v2 OAuth2 client credentials authentication without exposing
 * client secrets to the browser. Caches tokens and responses to protect rate limits.
 *
 * Required Environment Variables / Secrets:
 * - OSU_CLIENT_ID: Your osu! OAuth application Client ID
 * - OSU_CLIENT_SECRET: Your osu! OAuth application Client Secret
 * - DEFAULT_USER_ID: Default osu! user ID (e.g. "14671577")
 */

// In-memory token cache for Worker isolate
let cachedToken = null;
let tokenExpiresAt = 0;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Cache-Control",
  "Access-Control-Max-Age": "86400",
};

const USER_AGENT = "osu-api-proxy/1.0 (Afterlight Sanctuary / contact: afterlight@users.noreply.github.com)";

/**
 * Obtain a valid osu! OAuth2 client credentials bearer token.
 */
async function getOsuToken(env) {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  const clientId = env.OSU_CLIENT_ID;
  const clientSecret = env.OSU_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("OSU_CLIENT_ID and OSU_CLIENT_SECRET must be configured as environment secrets.");
  }

  const bodyParams = new URLSearchParams({
    client_id: String(clientId).trim(),
    client_secret: String(clientSecret).trim(),
    grant_type: "client_credentials",
    scope: "public",
  });

  const tokenResp = await fetch("https://osu.ppy.sh/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: bodyParams.toString(),
  });

  if (!tokenResp.ok) {
    const errText = await tokenResp.text();
    throw new Error(`Failed to obtain osu! OAuth token (${tokenResp.status}): ${errText}`);
  }

  const tokenData = await tokenResp.json();
  cachedToken = tokenData.access_token;
  // Expire 2 minutes before actual expiry for safety
  tokenExpiresAt = now + ((tokenData.expires_in || 86400) - 120) * 1000;

  return cachedToken;
}

/**
 * Fetch and sanitize osu! profile data for frontend consumption.
 */
async function fetchUserProfile(userId, token) {
  const userResp = await fetch(`https://osu.ppy.sh/api/v2/users/${encodeURIComponent(userId)}/osu?key=id`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
      "User-Agent": USER_AGENT,
    },
  });

  if (!userResp.ok) {
    const err = await userResp.text();
    throw new Error(`osu! API error (${userResp.status}): ${err}`);
  }

  const user = await userResp.json();
  const stats = user.statistics || {};

  return {
    id: user.id,
    username: user.username,
    country_code: user.country_code || (user.country && user.country.code) || "UN",
    country_name: (user.country && user.country.name) || "",
    avatar_url: user.avatar_url,
    is_online: user.is_online || false,
    global_rank: stats.global_rank || null,
    country_rank: stats.country_rank || null,
    pp: stats.pp ? parseFloat(stats.pp.toFixed(1)) : 0,
    hit_accuracy: stats.hit_accuracy ? parseFloat(stats.hit_accuracy.toFixed(2)) : 0,
    play_count: stats.play_count || 0,
    level: stats.level ? stats.level.current : 0,
    ranked_score: stats.ranked_score || 0,
    total_score: stats.total_score || 0,
    updated_at: new Date().toISOString(),
  };
}

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get("user") || env.DEFAULT_USER_ID || "14671577";

    try {
      const token = await getOsuToken(env);
      const profile = await fetchUserProfile(userId, token);

      return new Response(JSON.stringify({ success: true, data: profile }), {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json; charset=utf-8",
          // Edge & browser cache for 5 minutes (300s)
          "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=60",
        },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({
          success: false,
          error: err.message || "Failed to fetch osu! profile",
        }),
        {
          status: 502,
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
          },
        }
      );
    }
  },
};
