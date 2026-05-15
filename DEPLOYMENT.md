# DEPLOYMENT — Hostinger VPS (Ubuntu) — sub-path under printmarksgraphics.cloud

This guide deploys the Happy Cash Positioning Questionnaire **on the same VPS that already serves `https://printmarksgraphics.cloud/`**. The app is mounted under the sub-path `/happycash/`, reusing the existing host Nginx + its HTTPS certificate. No new domain, no new ports exposed publicly.

Final URL: **`https://printmarksgraphics.cloud/happycash/`**

---

## 0. Architecture in one diagram

```
Internet ──HTTPS:443──► host Nginx (printmarksgraphics.cloud)
                          │
                          ├─ /              → other project (untouched)
                          ├─ /happycash/    → 127.0.0.1:8080  (Docker: hc-web)
                          └─ /happycash/api/→ 127.0.0.1:3001  (Docker: hc-api)
```

The two new containers bind to **loopback only** (`127.0.0.1`), so they are unreachable from Internet directly — all traffic goes through the host Nginx.

## 1. Prerequisites on the VPS

- Docker Engine + Compose plugin already installed (you have them since the other project runs).
- Existing Nginx serving `printmarksgraphics.cloud` with a valid Let's Encrypt cert.
- Ports `8080` and `3001` available on `127.0.0.1` (see Step 7 if they collide).
- SMTP credentials + admin email.
- SSH access to the VPS.

## 2. Pull the code onto the VPS

```bash
ssh hc@<VPS_IP>     # or root@<VPS_IP>
cd ~
git clone <repo-url> positioning-questionnaire
cd positioning-questionnaire
```

(Or `rsync` from your laptop if there is no Git remote yet.)

## 3. Configure `.env`

```bash
cp .env.example .env
nano .env
```

Make sure these values are correct for the sub-path setup:

| Key | Value | Notes |
|---|---|---|
| `VITE_BASE_PATH` | `/happycash/` | Sub-path the SPA is served from |
| `VITE_API_BASE_URL` | `/happycash/api` | The browser-visible API URL |
| `CORS_ORIGINS` | `https://printmarksgraphics.cloud` | Origin that calls the API |
| `WEB_HOST_PORT` | `8080` | Change only if 8080 is taken on the VPS |
| `API_HOST_PORT` | `3001` | Change only if 3001 is taken on the VPS |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | … | Your SMTP provider |
| `SMTP_SECURE` | `true` for port 465, `false` for 587 | |
| `MAIL_FROM_NAME` / `MAIL_FROM_ADDRESS` | `Happy Cash` / `noreply@…` | |
| `ADMIN_EMAIL` | `admin@…` | Where every submission lands |

### SMTP gotchas (recap)

- **Gmail**: enable 2FA, then generate an App Password at <https://myaccount.google.com/apppasswords>. Use it as `SMTP_PASSWORD`. Host `smtp.gmail.com`, port `465`, `SMTP_SECURE=true`.
- **Brevo**: free tier 300 emails/day, host `smtp-relay.brevo.com`, port `587`, `SMTP_SECURE=false`.
- **Resend SMTP**: host `smtp.resend.com`, port `465`, user `resend`, password = your API key.
- **OVH**: `ssl0.ovh.net:465`, SMTP user is the full mailbox address.

## 4. Build & start the containers

```bash
docker compose up -d --build
docker compose ps
```

Expected: two healthy services (`web` on `127.0.0.1:8080`, `api` on `127.0.0.1:3001`). Quick smoke test from the VPS itself:

```bash
curl -I http://127.0.0.1:8080/             # should return 200 (the SPA index)
curl -s http://127.0.0.1:3001/api/health   # should return {"ok":true}
```

If either fails, check logs:
```bash
docker compose logs web
docker compose logs api
```

## 5. Add the Nginx sub-path on the host

> **Do not replace** the existing config. Just paste three new `location` blocks **inside the `server { … }` that already handles `printmarksgraphics.cloud:443`**.

Find the right file:
```bash
sudo nginx -T | grep -E 'server_name|listen' | less
# or the typical paths:
ls /etc/nginx/sites-enabled/
ls /etc/nginx/conf.d/
```

Open the file that contains `server_name printmarksgraphics.cloud;` and the `listen 443 ssl;` directive. Inside its `server { ... }`, paste the content of [`infra/nginx-host.example.conf`](./infra/nginx-host.example.conf):

```nginx
# Happy Cash sub-path
location /happycash/api/ {
    proxy_pass http://127.0.0.1:3001/api/;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 256k;
    proxy_read_timeout 30s;
}

location /happycash/ {
    proxy_pass http://127.0.0.1:8080/;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location = /happycash {
    return 301 /happycash/;
}
```

> ⚠️ **Order matters.** The `/happycash/api/` block must come **before** the `/happycash/` block, otherwise Nginx will route API calls to the SPA. Nginx matches prefix locations by longest match, so this is normally fine, but keeping the order makes the intent unambiguous and avoids surprises if the config is reorganized later.

Validate then reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

If `nginx -t` errors out, fix the syntax before reloading (Nginx will keep running on the previous good config until you reload).

## 6. Smoke test from a browser

1. Visit `https://printmarksgraphics.cloud/happycash/` → landing page Happy Cash.
2. Open DevTools → Network → confirm all `/happycash/assets/*` requests return 200.
3. Walk through 2–3 steps, switch FR ↔ EN, refresh — the draft should persist.
4. Fill the form with a **real email** in Q1.3 and submit.
5. Both the admin mailbox and the email in Q1.3 should receive a PDF.

## 7. Port collisions

If `8080` or `3001` is already used by the other project, change them in `.env`:

```bash
WEB_HOST_PORT=8089
API_HOST_PORT=3089
```

Then update the **two** `proxy_pass` lines in the Nginx host config to match, and:
```bash
docker compose up -d
sudo nginx -t && sudo systemctl reload nginx
```

To check what is already listening:
```bash
sudo ss -tlnp | grep -E ':(8080|3001|8089|3089)\b'
```

## 8. Update & redeploy

```bash
cd ~/positioning-questionnaire
git pull
docker compose up -d --build
docker image prune -f
```

Rebuild time ~1–2 min on a small VPS. The host Nginx config does **not** need to be touched on updates — it just keeps reverse-proxying to the same loopback ports.

## 9. Backups

There is no database. Worth keeping safe off-host:

- `~/positioning-questionnaire/.env`
- Your existing Nginx config (you modified it — back it up before/after).

```bash
# Before editing the Nginx config, snapshot it:
sudo cp /etc/nginx/sites-enabled/printmarksgraphics.cloud /root/nginx-printmarks.bak.$(date +%F)
```

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `502 Bad Gateway` on `/happycash/` | Container down or wrong port | `docker compose ps` + `docker compose logs web` |
| Blank page, console: `Failed to load module script` from `/assets/...` | `VITE_BASE_PATH` not set at build time | Rebuild: `docker compose up -d --build` after fixing `.env` |
| API returns 404 on `/happycash/api/submit` | Nginx prefix-strip not applied | Make sure `proxy_pass` ends with `/api/`, not `/api` |
| `CORS error` in browser | `CORS_ORIGINS` missing `https://printmarksgraphics.cloud` | Edit `.env`, `docker compose up -d` |
| Email never arrives | SMTP creds rejected | `docker compose logs api` — look for `EAUTH` / `ETIMEDOUT` |
| `nginx: [emerg] duplicate location` | You pasted into the wrong server block | Verify `server_name printmarksgraphics.cloud;` is the right one |

## 11. Decommission

```bash
cd ~/positioning-questionnaire
docker compose down -v
rm -rf ~/positioning-questionnaire
# Then remove the three location blocks from the host Nginx config and reload.
sudo nginx -t && sudo systemctl reload nginx
```
