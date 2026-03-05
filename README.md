# ⚡ AUREUS — XAUUSD Signal Intelligence

Live XAUUSD (Gold) trading signals dashboard with buy/sell signals, win probability indicators, candlestick pattern analysis, and profit tracking.

## Quick Start (Local Dev)

```bash
npm install
npm run dev
```

## Deploy to Cloudflare Pages via GitHub

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit - AUREUS Gold Trading App"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/aureus-gold.git
git push -u origin main
```

### Step 2 — Connect to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create**
2. Select the **Pages** tab → **Connect to Git**
3. Authorize GitHub and select the `aureus-gold` repository
4. Configure build settings:

   | Setting             | Value         |
   |---------------------|---------------|
   | Framework preset    | Vite          |
   | Build command       | `npm run build` |
   | Build output dir    | `dist`        |
   | Node.js version     | 18+           |

5. Click **Save and Deploy**

### Step 3 — Done!

Your site will be live at `https://aureus-gold.pages.dev` (or your custom domain).

Every push to `main` will auto-deploy.

### Optional: Custom Domain

1. In Cloudflare Pages → your project → **Custom domains**
2. Add your domain (e.g., `app.aureus.io`)
3. Cloudflare handles SSL automatically

## Tech Stack

- **React 18** — UI framework
- **Vite 5** — Build tool
- **Cloudflare Pages** — Hosting (free tier works perfectly)

## Features

- Login wall with Google login & test account
- Live XAUUSD price dashboard with real-time updates
- 5-minute candlestick chart with buy/sell signal overlays
- Pattern detection: Bullish Engulfing, Hammer, Three White Soldiers, Bearish Engulfing, Double Top, Morning Star, Evening Star, Doji Star
- Win probability bars based on historical pattern performance
- Signal cards with entry, TP (1:3 ratio), SL, and profit/loss tracking
- Trade execution modal
- Pattern performance analytics table
- Dark theme with gold accents

## License

Private — All rights reserved.
