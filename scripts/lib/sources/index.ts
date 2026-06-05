import type { AccountConfig, PostRef } from '../types'
import { fetchXPosts } from './x'
import { fetchLinkedInPosts } from './linkedin'

/** Route an account to the right source client based on its platform. */
export async function fetchPostsForAccount(
  account: AccountConfig,
  sinceIso: string,
): Promise<PostRef[]> {
  try {
    switch (account.platform) {
      case 'x':
        return await fetchXPosts(account, sinceIso)
      case 'linkedin':
        return await fetchLinkedInPosts(account, sinceIso)
      default:
        console.warn(`[sources] unknown platform for ${account.name}`)
        return []
    }
  } catch (err) {
    console.error(`[sources] error fetching ${account.name}:`, (err as Error).message)
    return []
  }
}
