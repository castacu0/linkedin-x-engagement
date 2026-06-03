# Setup guide — going live (RSS-first, no paid API keys)

This is the click-by-click guide to take the engagement desk from **sample mode**
to **live**. The chosen route uses **RSS bridges** for both X and LinkedIn, so
you need **no X API tier and no LinkedIn API key**. The only (optional) paid key
is Anthropic, which improves comment quality.

> 🔐 **Never paste keys or feed tokens into chat or commit them.** They go in
> GitHub Actions **Secrets** or a local `.env` (git-ignored). The app reads them
> from the environment.

---

## 1. Create RSS feeds for the 4 accounts (no keys)

Use any RSS-bridge service that can turn a profile/page URL into a feed. Popular
options: **RSS.app**, **Feedly**, **Inoreader**, or a self-hosted **RSSHub**.

Create one feed per source URL:

| Account | Source URL to feed |
| --- | --- |
| Garry Tan (X) | `https://x.com/garrytan` |
| Andrej Karpathy (X) | `https://x.com/karpathy` |
| Y Combinator Community (LinkedIn) | `https://www.linkedin.com/company/y-combinator-community/posts/` |
| Y Combinator (LinkedIn) | `https://www.linkedin.com/school/y-combinator/posts/` |

Each service gives you a feed URL like `https://rss.app/feeds/abc123.xml`.

### Paste them into `config/accounts.json`
Set the `rssUrl` field for each account:

```jsonc
{
  "name": "Andrej Karpathy",
  "handle": "@karpathy",
  "platform": "x",
  "url": "https://x.com/karpathy",
  "enabled": true,
  "rssUrl": "https://rss.app/feeds/REPLACE_ME.xml"   // ← paste here
}
```

> Feed URLs in `accounts.json` are committed to the repo. If your provider's feed
> URL is sensitive, instead leave `rssUrl` empty and we can switch to reading it
> from an environment variable — just ask.

### Test locally
```bash
npm install
npm run scan          # live mode — pulls from the rssUrl feeds
npm run dev           # view the drafts in the dashboard
```
You should see real posts from the last 24h with draft comments. If a feed is
empty or errors, the scan logs a warning and skips it (never invents posts).

---

## 2. Anthropic key (optional, recommended) — better comments

Without this, comments use the built-in template writer. With it, Claude writes
them in the learn-wise voice.

1. Get a key at <https://console.anthropic.com> → **API Keys**.
2. Local use: add to `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ANTHROPIC_MODEL=claude-sonnet-4-6
   ```

---

## 3. GitHub Actions secrets — the daily 08:00 run

The workflow `.github/workflows/daily-scan.yml` runs every morning and commits
new drafts. Add your keys so the scheduled run can use them:

**Repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret | Needed? | Value |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | optional | your Anthropic key |
| `NOTIFY_WEBHOOK_URL` | optional | webhook for push notifications (step 4) |
| `X_BEARER_TOKEN` | only if you later switch X off RSS | X API token |
| `LINKEDIN_ACCESS_TOKEN` | only for org pages you admin | LinkedIn token |

RSS feeds need no secret — their URLs live in `accounts.json`.

> The cron is set to **14:00 UTC = 08:00 America/Mexico_City**. Change the
> `cron:` line in the workflow if your timezone changes.

---

## 4. Push notifications (optional) — Calendar + Claude app

`scripts/lib/notify.ts` POSTs the daily summary to `NOTIFY_WEBHOOK_URL`. The
easiest fan-out (and you already have Make.com connected):

1. In **Make.com**, create a scenario with a **Custom webhook** trigger → copy
   its URL → set it as the `NOTIFY_WEBHOOK_URL` secret.
2. Add modules to the scenario:
   - **Google Calendar → Create an Event** (use the `text` field from the webhook
     payload), and/or
   - a **push** module to your phone / Claude app.

The webhook payload looks like:
```json
{
  "text": "🗞️ 2026-06-03: found 3 new post(s) and drafted 3 comment(s) ...",
  "date": "2026-06-03",
  "summary": { "postsFound": 3, "draftsReady": 3, "accountsScanned": 4 },
  "drafts": [ { "account": "...", "handle": "...", "postUrl": "...", "comment": "..." } ]
}
```

---

## 5. (Optional, later) X API instead of RSS

If you ever want richer/faster X data, create an app at
<https://developer.x.com> (needs the paid **Basic** tier to read other users'
timelines), generate a **Bearer Token**, set it as the `X_BEARER_TOKEN` secret,
and clear the `rssUrl` for those accounts. The app prefers `rssUrl` when both
are present, so blanking it switches that account to the API.

---

## Checklist
- [ ] RSS feed URLs pasted into `config/accounts.json` (`rssUrl`)
- [ ] `npm run scan` shows real posts locally
- [ ] `ANTHROPIC_API_KEY` added (optional)
- [ ] GitHub Actions secrets added
- [ ] `NOTIFY_WEBHOOK_URL` wired to Make.com (optional)
- [ ] First scheduled run reviewed in `drafts/<date>.md` or the dashboard
