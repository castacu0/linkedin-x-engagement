# linkedin-x-engagement

A small **neobrutalist** "engagement desk" that, each morning, scans recent posts
from **Y Combinator** and selected builders on **X** and **LinkedIn**, drafts a
thoughtful *learn-wise* comment for each new post, and saves the drafts to this
repo for you to review. Nothing is ever posted automatically.

Monitored out of the box (edit `config/accounts.json`):

| Account | Platform |
| --- | --- |
| Y Combinator Community | LinkedIn |
| Y Combinator | LinkedIn |
| Garry Tan (@garrytan) | X |
| Andrej Karpathy (@karpathy) | X |
| Paul Graham, Sam Altman | X _(disabled by default — example "other personalities")_ |

---

## ⚠️ Honest access note (read this first)

This tool can only read what you give it credentials for. As of setup:

- **X / Twitter and LinkedIn both block anonymous reads** (their pages return
  HTTP 403). There is no "just scrape the page" path.
- **X** works with an official **X API v2** app-only Bearer token (`X_BEARER_TOKEN`).
- **LinkedIn has no public API to read an arbitrary person's or company's feed.**
  Reading an **organization** page's posts requires the **Community Management
  API**, an access token, and **admin rights on that page** (`orgUrn`). For
  everything else the practical path is an **RSS-bridge feed** (`rssUrl`).

Until you wire up credentials, live scans return **0 posts** (by design — the
tool will never invent posts). Use sample mode to see the app working:

```bash
npm install
npm run scan:sample   # generates drafts from config/sample-posts.json
npm run dev           # open the dashboard
```

---

## Quick start

```bash
npm install
cp .env.example .env   # fill in the keys you have (all optional)
npm run scan:sample    # or: npm run scan  (live, needs credentials)
npm run dev            # neobrutalist dashboard at http://localhost:5173
```

Build a static version (e.g. for GitHub Pages):

```bash
npm run build && npm run preview
```

---

## How it works

```
config/accounts.json ──▶ scripts/scan.ts ──▶ public/data/drafts/<date>.json  (the app reads this)
                                          └─▶ drafts/<date>.md                (review on GitHub)
                                          └─▶ notify (webhook + stdout)
```

1. **Fetch** — for each enabled account, pull posts newer than `SCAN_SINCE_HOURS`
   (default 24h) via the X API / LinkedIn API / RSS.
2. **Draft** — each post gets a comment. With `ANTHROPIC_API_KEY` set, Claude
   writes it using the *learn-wise* system prompt (acknowledge one concrete idea,
   express genuine learning, no sycophancy, ≤3 sentences, at most one emoji).
   Without a key, a built-in template writer is used (lower quality).
3. **Save** — JSON for the dashboard + Markdown for easy review in GitHub, plus
   an `index.json` the dashboard lists from.
4. **Notify** — a one-line summary is printed and POSTed to `NOTIFY_WEBHOOK_URL`.

## Configuration

### Accounts — `config/accounts.json`
```jsonc
{
  "name": "Andrej Karpathy",
  "handle": "@karpathy",          // @handle for X; org slug for LinkedIn
  "platform": "x",                // "x" | "linkedin"
  "url": "https://x.com/karpathy",
  "enabled": true,
  "orgUrn": "",                   // LinkedIn: urn:li:organization:<id>
  "rssUrl": ""                    // optional RSS-bridge feed (recommended for LinkedIn)
}
```
Add an "other personality" by appending an entry; toggle `enabled` to include/exclude.

### Environment — `.env` (see `.env.example`)
| Var | Purpose |
| --- | --- |
| `X_BEARER_TOKEN` | X API v2 app-only token (read user timelines) |
| `LINKEDIN_ACCESS_TOKEN` / `LINKEDIN_API_VERSION` | LinkedIn Community Management API |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | Claude-written comments (default `claude-sonnet-4-6`) |
| `NOTIFY_WEBHOOK_URL` | Webhook for the daily summary |
| `SCAN_SINCE_HOURS` | Look-back window (default `24`) |

## Notifications → Google Calendar + Claude app

`scripts/lib/notify.ts` POSTs the daily summary JSON to `NOTIFY_WEBHOOK_URL`.
The simplest fan-out is a **Make.com** (or Zapier) scenario triggered by that
webhook that:

1. **Creates a Google Calendar event** with the summary text, and
2. **Sends a push** to the Claude / mobile app.

This keeps platform credentials out of the codebase. (In the interactive Claude
session that set this up, the Calendar event + Claude push for the first run were
sent directly via connected tools.)

## Scheduling — "each morning"

`.github/workflows/daily-scan.yml` runs the scan on a cron schedule, commits any
new drafts back, and can be triggered manually from the **Actions** tab. **cron
is in UTC** — edit the `cron:` line for your timezone. Add your keys under
**Settings → Secrets and variables → Actions**:
`X_BEARER_TOKEN`, `LINKEDIN_ACCESS_TOKEN`, `ANTHROPIC_API_KEY`, `NOTIFY_WEBHOOK_URL`.

## Safety

- **Draft-only.** The app has no write/post capability to X or LinkedIn.
- Secrets live in `.env` (git-ignored) or GitHub Actions secrets — never committed.

## Project layout

```
config/        accounts + sample posts
scripts/       scan orchestrator + source clients (x, linkedin, rss), draft, store, notify
src/           neobrutalist React dashboard
public/data/   generated drafts (committed, for the dashboard)
drafts/        generated Markdown drafts (committed, for review)
.github/       daily-scan workflow
```
