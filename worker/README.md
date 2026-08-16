# osu! API v2 Serverless Proxy (Cloudflare Worker)

This serverless worker acts as a secure, rate-limit protected proxy between `Afterlight0338.github.io` and the official osu! API v2.

## Why this is required
osu! API v2 uses OAuth2 client credentials authentication (`client_id` + `client_secret`). Placing `client_secret` in frontend browser code would publicly leak your API credentials. This Worker keeps your credentials 100% private in server-side environment secrets and caches responses at the edge.

---

## 1. Prerequisites
1. Create a free [Cloudflare Account](https://dash.cloudflare.com/).
2. Create an osu! OAuth application at [osu.ppy.sh/home/account/edit#oauth](https://osu.ppy.sh/home/account/edit#oauth):
   - **Application Name**: `Afterlight Profile Sanctuary`
   - **Application Callback URL**: `https://localhost` (or your worker URL)
   - Save your **Client ID** and **Client Secret**.

---

## 2. Quick Deployment

### Option A: Using Wrangler CLI
```bash
# 1. Enter worker directory
cd worker

# 2. Login to Cloudflare
npx wrangler login

# 3. Add your secrets
npx wrangler secret put OSU_CLIENT_ID
# (Paste your numeric Client ID)

npx wrangler secret put OSU_CLIENT_SECRET
# (Paste your Client Secret)

# 4. Deploy worker
npx wrangler deploy
```

### Option B: Using Cloudflare Dashboard (No CLI needed)
1. Go to **Cloudflare Dashboard → Workers & Pages → Create Application → Create Worker**.
2. Name it `osu-api-proxy`.
3. Paste the contents of [`osu-worker.js`](osu-worker.js) into the editor.
4. Go to **Settings → Variables and Secrets → Add Secret**:
   - `OSU_CLIENT_ID` (Your Client ID)
   - `OSU_CLIENT_SECRET` (Your Client Secret)
5. Save & Deploy!

---

## 3. Worker API Endpoints

### `GET /api/osu`
Fetches the profile for the default configured user (`14671577`).

### `GET /api/osu?user=<USER_ID_OR_NAME>`
Fetches any specified user's profile.

### Sample Response:
```json
{
  "success": true,
  "data": {
    "id": 14671577,
    "username": "Afterlight",
    "country_code": "MY",
    "country_name": "Malaysia",
    "avatar_url": "https://a.ppy.sh/14671577",
    "is_online": false,
    "global_rank": 52410,
    "country_rank": 1240,
    "pp": 5432.1,
    "hit_accuracy": 98.64,
    "play_count": 35120,
    "level": 98,
    "ranked_score": 12500000000,
    "total_score": 45000000000,
    "updated_at": "2026-08-16T08:50:00.000Z"
  }
}
```

---

## 4. Caching & Security Features
- **OAuth Token Caching**: Tokens are cached in-memory and renewed automatically before expiration (~24h lifetime).
- **Edge Caching**: Responses contain `Cache-Control: public, max-age=300, s-maxage=300` to cache responses for 5 minutes across Cloudflare's global edge network.
- **CORS Protection**: Allows frontend AJAX requests safely without CORS issues.
