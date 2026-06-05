import type { DayFile } from './types'

/** One-line, human-friendly summary of a day's scan. */
export function summaryText(day: DayFile): string {
  const { postsFound, draftsReady } = day.summary
  if (postsFound === 0) {
    return `🗞️ ${day.date}: no new posts found across ${day.summary.accountsScanned} accounts. Nothing to review.`
  }
  return (
    `🗞️ ${day.date}: found ${postsFound} new post(s) and drafted ${draftsReady} comment(s) ` +
    `ready for your review (draft-only).`
  )
}

/**
 * Send the daily summary. Posts to NOTIFY_WEBHOOK_URL when configured (point
 * it at a Make.com / Zapier webhook that fans out to Google Calendar + the
 * Claude app — see README). Always logs to stdout so CI captures it.
 */
export async function notify(day: DayFile): Promise<void> {
  const text = summaryText(day)
  console.log(`\n[notify] ${text}`)

  const webhook = process.env.NOTIFY_WEBHOOK_URL
  if (!webhook) {
    console.log('[notify] NOTIFY_WEBHOOK_URL not set — skipping webhook delivery.')
    return
  }
  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text,
        date: day.date,
        summary: day.summary,
        drafts: day.drafts.map((d) => ({
          account: d.account.name,
          handle: d.account.handle,
          platform: d.account.platform,
          postUrl: d.post.url,
          comment: d.draftComment,
        })),
      }),
    })
    console.log(`[notify] webhook responded ${res.status}`)
  } catch (err) {
    console.error('[notify] webhook delivery failed:', (err as Error).message)
  }
}
