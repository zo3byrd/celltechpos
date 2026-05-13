# CellTechPOS — Deployment Guide

## Domain Plan
| URL | Hosts | Platform |
|-----|-------|----------|
| `celltechpos.com` | Landing page | Netlify (free) |
| `app.celltechpos.com` | POS App (frontend + backend) | Railway (free $5 credit/mo) |

---

## Part 1 — Landing Page on Netlify (Free)

### Step 1 — Deploy
1. Go to **netlify.com** → sign up free
2. Click **"Add new site" → "Deploy manually"**
3. Drag and drop the **`landing/`** folder onto the Netlify upload area
4. Netlify gives you a random URL like `random-name.netlify.app` — it's live instantly

### Step 2 — Connect your GoDaddy domain
1. In Netlify → **Site Settings → Domain Management → Add custom domain**
2. Type `celltechpos.com` → confirm
3. Netlify shows you nameservers (e.g. `dns1.p06.nsone.net`)
4. In **GoDaddy → DNS → Nameservers → Change → Custom**
5. Paste in Netlify's nameservers → Save
6. Wait 10–30 minutes → SSL auto-installs ✓

### Step 3 — Redeploy when you make changes
Just drag the `landing/` folder onto Netlify again — instant update.

---

## Part 2 — POS App on Railway (Free)

Railway runs your Node.js backend and serves the React frontend from it.

### Step 1 — Push your code to GitHub
1. Go to **github.com** → New repository → name it `celltechpos`
2. Make it **Private**
3. In your project folder run:
```
git init
git add .
git commit -m "Initial deploy"
git remote add origin https://github.com/YOURUSERNAME/celltechpos.git
git push -u origin main
```

### Step 2 — Deploy on Railway
1. Go to **railway.app** → sign up with GitHub
2. Click **"New Project" → "Deploy from GitHub repo"**
3. Select your `celltechpos` repo
4. Railway detects Node.js automatically
5. Set the **root directory** to `web version/server`
6. Set the **start command** to: `node src/app.js`

### Step 3 — Set environment variables on Railway
In Railway → your project → **Variables** tab, add:

```
NODE_ENV=production
PORT=5000
JWT_SECRET=Y6+sP96kbdfko48fjBVzjfOtESz2rnIhAgHLx/l2A8h1qHQ/q/EYT7Zt1+szAIa/
ALLOWED_ORIGINS=https://celltechpos.com,https://www.celltechpos.com,https://app.celltechpos.com
SQLITE_PATH=/app/data/celltechpos.sqlite
STORE_NAME=CellTechPOS
```

Add these when you're ready:
```
TWILIO_SID=
TWILIO_TOKEN=
TWILIO_FROM=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

### Step 4 — Build the React frontend before deploying
Railway needs the `client/dist/` folder to exist. Add a build step:

In Railway → your project → **Settings → Build Command**:
```
cd ../client && npm install && npm run build
```

Or add this to `server/package.json` scripts (already done — see below).

### Step 5 — Connect your GoDaddy subdomain
1. In Railway → your project → **Settings → Domains → Add Custom Domain**
2. Type `app.celltechpos.com`
3. Railway gives you a CNAME value like `your-app.up.railway.app`
4. In **GoDaddy DNS → Add Record**:
   - Type: `CNAME`
   - Name: `app`
   - Value: `your-app.up.railway.app`
5. Wait 10 minutes → SSL auto-installs ✓

---

## Part 3 — GoDaddy DNS Summary

After both setups, your GoDaddy DNS should look like this:

| Type | Name | Value |
|------|------|-------|
| NS | @ | *(Netlify nameservers — replaces GoDaddy's)* |
| CNAME | app | `your-app.up.railway.app` |

> Note: If you switch to Netlify nameservers, manage ALL DNS from Netlify's dashboard (including the `app` CNAME).

---

## Final Checklist

- [ ] Landing page live at `celltechpos.com` via Netlify
- [ ] POS app live at `app.celltechpos.com` via Railway
- [ ] SSL green lock on both domains (auto)
- [ ] Login button on landing page goes to `https://app.celltechpos.com/login` ✅
- [ ] All environment variables set in Railway dashboard
- [ ] Test login at `app.celltechpos.com` with your admin credentials

---

## Costs

| Service | Free Tier | Paid if needed |
|---------|-----------|----------------|
| Netlify (landing) | Free forever | $19/mo for teams |
| Railway (POS app) | $5 credit/mo | $5–20/mo |
| GoDaddy domain | ~$12/yr | already yours |
| SSL certificates | Free (auto) | — |
| **Total** | **~$1/yr (domain only)** | |

Railway's $5 credit covers roughly 500 hours of a small Node.js app per month —
enough for one always-on service.
