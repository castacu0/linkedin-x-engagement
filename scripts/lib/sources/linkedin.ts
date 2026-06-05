import type { AccountConfig, PostRef } from '../types'
import { fetchRssPosts } from './rss'

/**
 * Fetch recent posts for a LinkedIn organization page since `sinceIso`.
 *
 * IMPORTANT — LinkedIn reality check:
 *  - There is NO public API to read an arbitrary person's or company's feed.
 *  - Reading an *organization's* posts requires the Community Management API,
 *    a valid access token, and admin rights on that page (set `orgUrn`).
 *  - For everything else the practical path is an RSS-bridge feed: set
 *    `rssUrl` on the account in config/accounts.json.
 *
 * Resolution order: rssUrl (if present) → Community Management API → skip.
 */
export async function fetchLinkedInPosts(account: AccountConfig, sinceIso: string): Promise<PostRef[]> {
  if (account.rssUrl) return fetchRssPosts(account, sinceIso)

  const token = process.env.LINKEDIN_ACCESS_TOKEN
  if (!token) {
    console.warn(
      `[linkedin] ${account.name}: no rssUrl and LINKEDIN_ACCESS_TOKEN unset — skipping. See README → LinkedIn.`,
    )
    return []
  }
  if (!account.orgUrn) {
    console.warn(
      `[linkedin] ${account.name}: no orgUrn configured. The API can only read org pages you administer — skipping.`,
    )
    return []
  }

  const version = process.env.LINKEDIN_API_VERSION || '202406'
  const url =
    `https://api.linkedin.com/rest/posts?q=author` +
    `&author=${encodeURIComponent(account.orgUrn)}&count=10&sortBy=LAST_MODIFIED`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'LinkedIn-Version': version,
      'X-Restli-Protocol-Version': '2.0.0',
    },
  })
  if (!res.ok) {
    console.error(`[linkedin] posts fetch failed for ${account.name}: ${res.status} ${res.statusText}`)
    return []
  }

  const json = (await res.json()) as {
    elements?: Array<{ id: string; commentary?: string; createdAt?: number }>
  }
  const since = Date.parse(sinceIso)
  return (json.elements ?? [])
    .map((e) => ({
      id: e.id,
      url: `https://www.linkedin.com/feed/update/${e.id}`,
      publishedAt: new Date(e.createdAt ?? Date.now()).toISOString(),
      text: e.commentary ?? '',
    }))
    .filter((p) => Date.parse(p.publishedAt) >= since)
}
