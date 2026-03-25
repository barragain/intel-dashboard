```
██╗███╗   ██╗████████╗███████╗██╗
██║████╗  ██║╚══██╔══╝██╔════╝██║
██║██╔██╗ ██║   ██║   █████╗  ██║
██║██║╚██╗██║   ██║   ██╔══╝  ██║
██║██║ ╚████║   ██║   ███████╗███████╗
╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚══════╝
```

<div align="center">

**PERSONAL FINANCIAL INTELLIGENCE**

*"Should I be nervous right now?"*

[![Live](https://img.shields.io/badge/LIVE-intel--dashboard--snowy.vercel.app-orange?style=flat-square&logo=vercel)](https://intel-dashboard-snowy.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Gemini](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-blue?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini/)

</div>

---

## WHAT IT IS

I live in Taiwan. My partner works at Asus. I run ads for a living. When oil prices spike, brands freeze budgets — which means I feel it fast. When Taiwan Strait tension rises, that's not geopolitics, that's where I live.

INTEL is a daily briefing built around that reality. Every section is filtered through the question: what does this mean for my specific life, today?

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│   WATCH  45/100                                            │
│   "Keep an eye on things"                                  │
│                                                            │
│   STABLE ─────────── WATCH ─────────── WORRIED            │
│   0                  34               67        100       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## THE 6 SECTIONS

```
  ┌─────────────────────────────┐
  │  ① PERSONAL RISK METER      │  STABLE / WATCH / WORRIED
  │     Score 0–100             │  5 driver cards, updated twice daily
  ├─────────────────────────────┤
  │  ② ECONOMY PULSE            │  US · Taiwan · France · Paraguay · Global
  │     Live market data        │  30-day charts, plain-English context
  ├─────────────────────────────┤
  │  ③ CONFLICT TRACKER         │  Middle East · Taiwan Strait
  │     Active hotspots         │  US-China · Russia-Ukraine
  ├─────────────────────────────┤
  │  ④ CRYPTO SIGNAL            │  BTC · ETH · Fear & Greed Index
  │     RISK-OFF / RISK-ON      │  What markets are feeling
  ├─────────────────────────────┤
  │  ⑤ MARKET SENTIMENT         │  Goldman · JPMorgan · 10 subreddits
  │     Community + institutions│  Polymarket odds · Investment Radar
  ├─────────────────────────────┤
  │  ⑥ HISTORICAL CONTEXT       │  1970s · 2008 · 1997
  │     Parallels + forecasts   │  Goldman · IMF · Morgan Stanley
  └─────────────────────────────┘
```

---

## HOW IT WORKS

```
Page loads
    │
    ▼
Cache hit? ──YES──▶ Serve cached data (24h TTL, no API call)
    │
    NO
    │
    ▼
Gemini 2.5 Flash
+ Google Search Grounding ◀── pulls real headlines before answering
    │
    ▼
Analysis filtered through personal context
(Taiwan / Asus / advertising / France)
    │
    ▼
Plain English output
"Oil went up because Iran tensions got worse."
Not: "supply disruptions amid geopolitical escalation."
    │
    ▼
Cached until next cron window
(9AM or 9PM Taiwan Time)
```

Grounding matters because without it, the AI generates from memory — fabricated expert quotes, stale context. With Grounding enabled, Gemini retrieves real pages before answering and cites actual sources. That's the difference between a hallucination machine and something you can trust.

All AI sections load manually. Nothing fires on page load. The 24h cache means the entire dashboard runs on roughly 10 Gemini calls per day under normal use. Free tier holds fine.

---

## STACK

| Layer | What |
|-------|------|
| Framework | Next.js 15 (App Router) |
| Deployment | Vercel |
| AI | Gemini 2.5 Flash + Google Search Grounding |
| Market data | Yahoo Finance |
| Crypto | CoinGecko + Alternative.me |
| News | GNews · Guardian API · NYT API · Currents |
| Charts | Recharts |
| Scheduling | Vercel Cron (01:00 UTC + 13:00 UTC) |

---

## SETUP

**1. Clone**

```bash
git clone https://github.com/barragain/intel-dashboard.git
cd intel-dashboard
npm install
```

**2. Create `.env.local`**

```env
GEMINI_API_KEY=       # console.cloud.google.com
GNEWS_API_KEY=        # gnews.io
GUARDIAN_API_KEY=     # open-platform.theguardian.com
NYT_API_KEY=          # developer.nytimes.com
CURRENTS_API_KEY=     # currentsapi.services
CRON_SECRET=          # any random string
```

**3. Run**

```bash
npm run dev
```

---

## DEPLOY

```bash
git push origin main
# Import at vercel.com/new
# Add env vars
# Deploy — Vercel auto-detects Next.js
```

Cron config is already in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/refresh", "schedule": "0 1 * * *" },
    { "path": "/api/cron/refresh", "schedule": "0 13 * * *" }
  ]
}
```

---

## LANGUAGES

Header toggle: **EN / FR / ES**

When FR or ES is selected, every AI section responds in that language. EN is pre-cached by cron. FR and ES only fetch when a user actually requests them — no wasted quota.

---

## HOW IT WAS BUILT

I described what I wanted. Claude Code wrote the code. I have no CS degree.

That's it. That's the whole story. Some people think that disqualifies the project. I think it makes the point.

---

<div align="center">

```
I N T E L — Personal Financial Intelligence
```

Data for informational purposes only. Not financial advice.

[intel-dashboard-snowy.vercel.app](https://intel-dashboard-snowy.vercel.app)

</div>
