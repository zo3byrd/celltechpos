# CellTechPOS — Deployment Guide

## Hosting: DigitalOcean Droplet ($6/mo)

| URL | Platform |
|-----|----------|
| `celltechpos.com` | DigitalOcean Droplet (Node + Nginx + SQLite) |
| `celltechpos.com` (landing) | Netlify (free, drag-and-drop) |

---

## Part 1 — Create the Droplet

1. Go to **digitalocean.com** → sign up → **Create → Droplets**
2. Settings:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic → Shared CPU → **Regular $6/mo** (1GB RAM, 1 vCPU, 25GB)
   - **Region**: pick closest to you
   - **Authentication**: Password (set a strong root password) or SSH key
3. Click **Create Droplet** — note the IP address (e.g. `143.110.x.x`)

---

## Part 2 — Point your domain to the Droplet

In **GoDaddy DNS**:
- Add an **A record**: Name `@`, Value `<your-droplet-ip>`, TTL 600
- Add an **A record**: Name `www`, Value `<your-droplet-ip>`, TTL 600

Wait 10–30 minutes for DNS to propagate before running SSL setup.

---

## Part 3 — Server setup (run these commands via SSH)

SSH into your droplet: `ssh root@<your-droplet-ip>`

### 1. Install dependencies
```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx certbot python3-certbot-nginx git
npm install -g pm2
```

### 2. Clone your repo and build
```bash
mkdir -p /var/www/celltechpos
cd /var/www/celltechpos
git clone https://github.com/zo3byrd/celltechpos.git .
cd server
npm install
npm run build
```

### 3. Create data directory and environment file
```bash
mkdir -p /var/lib/celltechpos

cat > /var/www/celltechpos/server/.env << 'EOF'
NODE_ENV=production
PORT=5000
STORE_NAME=CellTechPOS
ALLOWED_ORIGINS=https://celltechpos.com,https://www.celltechpos.com
SQLITE_PATH=/var/lib/celltechpos/celltechpos.sqlite
JWT_SECRET=REPLACE_WITH_RANDOM_64_CHARS
EOF
```

Generate a secure JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```
Paste the output into the `.env` file replacing `REPLACE_WITH_RANDOM_64_CHARS`.

### 4. Start the app with PM2
```bash
cd /var/www/celltechpos/server
pm2 start src/app.js --name celltechpos
pm2 save
pm2 startup   # run the command it prints
```

### 5. Configure Nginx
```bash
cat > /etc/nginx/sites-available/celltechpos << 'EOF'
server {
    listen 80;
    server_name celltechpos.com www.celltechpos.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -s /etc/nginx/sites-available/celltechpos /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 6. Install SSL (free, auto-renews)
```bash
certbot --nginx -d celltechpos.com -d www.celltechpos.com
```
Follow the prompts — certbot auto-configures Nginx for HTTPS.

---

## Part 4 — Deploy landing page to Netlify

1. Go to **netlify.com** → **Add new site → Deploy manually**
2. Drag the `landing/` folder onto the upload area
3. Netlify gives you a URL → go to **Site Settings → Domain Management → Add custom domain** (optional, or just let Render host it via the same IP)

---

## Part 5 — Updating the app (after code changes)

SSH into the droplet and run:
```bash
cd /var/www/celltechpos
git pull origin master
cd server
npm install
npm run build
pm2 restart celltechpos
```

Or run the deploy script:
```bash
bash /var/www/celltechpos/deploy.sh
```

---

## Login credentials (first boot)
- **Email**: admin@celltechpos.com
- **Password**: admin123

Change these immediately after first login via Admin → Users.

---

## Costs

| Service | Cost |
|---------|------|
| DigitalOcean Droplet | $6/mo |
| Domain (GoDaddy) | ~$1/mo (~$12/yr) |
| SSL (Let's Encrypt) | Free |
| Netlify (landing page) | Free |
| **Total** | **~$7/mo** |
