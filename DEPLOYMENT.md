# DEPLOYMENT — Hostinger VPS, Nginx Proxy Manager, sub-path

This guide deploys the Happy Cash Positioning Questionnaire on the same VPS that already runs another project behind **Nginx Proxy Manager** (NPM). The app is mounted as a sub-path of the existing domain.

Final URL: **`https://printmarksgraphics.cloud/happycash/`**

---

## 0. Architecture

```
Internet ──HTTPS:443──► Nginx Proxy Manager (Docker container)
                          │
                          ├─ /              → other-project container (untouched)
                          ├─ /happycash/    → hc-web   (Docker container)
                          └─ /happycash/api/→ hc-api   (Docker container)
```

All four containers (NPM + other-project + hc-web + hc-api) share the same Docker network so NPM can reach them by container name. **Nothing is published on host ports** — only NPM listens on 80/443.

## 1. Find the NPM Docker network

```bash
docker network ls
docker ps --format 'table {{.Names}}\t{{.Networks}}'
```

Identify the network used by the NPM container. Common names:
- `nginx-proxy-manager_default`
- `npm_default`
- `proxy` (custom)

Note this name — you will paste it into `.env` below.

## 2. Pull the code on the VPS

```bash
ssh hc@<VPS_IP>
cd ~
git clone <repo-url> positioning-questionnaire
cd positioning-questionnaire
```

## 3. Configure `.env`

```bash
cp .env.example .env
nano .env
```

Critical keys:

| Key | Value | Notes |
|---|---|---|
| `NPM_NETWORK` | (the name from step 1) | Must match exactly |
| `VITE_BASE_PATH` | `/happycash/` | Sub-path the SPA is served from |
| `VITE_API_BASE_URL` | `/happycash/api` | Browser-visible API URL |
| `CORS_ORIGINS` | `https://printmarksgraphics.cloud` | The public origin |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | … | Your SMTP provider |
| `SMTP_SECURE` | `true` for 465, `false` for 587 | |
| `MAIL_FROM_NAME` / `MAIL_FROM_ADDRESS` | `Happy Cash` / `noreply@…` | |
| `ADMIN_EMAIL` | `admin@…` | Where every submission lands |

### SMTP gotchas

- **Gmail**: enable 2FA, create an App Password at <https://myaccount.google.com/apppasswords>, use it as `SMTP_PASSWORD`. Host `smtp.gmail.com`, port `465`, secure `true`.
- **Brevo**: 300 emails/day free tier, `smtp-relay.brevo.com:587`, secure `false`.
- **Resend SMTP**: `smtp.resend.com:465`, user `resend`, password = API key.
- **OVH**: `ssl0.ovh.net:465`, user = full mailbox address.

## 4. Start the containers

```bash
docker compose up -d --build
docker compose ps
```

Expected: `hc-web` and `hc-api` both `Up`. Verify they joined the NPM network:

```bash
docker network inspect $(grep '^NPM_NETWORK=' .env | cut -d= -f2) \
  | grep -E '"Name":|hc-'
```

You should see `hc-web` and `hc-api` listed alongside the NPM container and the other project's container. If they aren't there, `NPM_NETWORK` is wrong.

Smoke test from the NPM container (the only place that can reach them):

```bash
# Replace <npm-container-name> with the real one from `docker ps`.
docker exec <npm-container-name> wget -qO- http://hc-api:3001/api/health
# → {"ok":true}
docker exec <npm-container-name> wget -qO- -S http://hc-web:80/ 2>&1 | head -5
# → HTTP/1.1 200 OK
```

## 5. Configure the Proxy Host in Nginx Proxy Manager

1. Open the NPM admin UI (usually `http://<VPS_IP>:81`).
2. Go to **Hosts → Proxy Hosts**.
3. Find the entry for `printmarksgraphics.cloud` and click the **three dots → Edit**.
4. Switch to the **Advanced** tab.
5. Paste the content of [`infra/nginx-proxy-manager.advanced.conf`](./infra/nginx-proxy-manager.advanced.conf) into the **Custom Nginx Configuration** textarea — **append** it, do not erase anything that may already be there.
6. Click **Save**.

NPM will validate the config and reload Nginx. If it errors out, the most likely cause is a typo or that `hc-web` / `hc-api` aren't on the NPM network — fix step 4 and save again.

> ⚠️ **Use the Advanced tab, not Custom Locations.** NPM's UI generates `proxy_pass http://host:port` without a trailing slash, which leaks the `/happycash/` prefix to the upstream and breaks routing. The snippet in the Advanced tab uses `proxy_pass http://hc-web:80/` (trailing slash) to strip the prefix correctly.

## 6. Smoke test from a browser

1. Open `https://printmarksgraphics.cloud/happycash/` → Happy Cash landing page.
2. DevTools → Network → confirm `/happycash/assets/*` requests return 200.
3. Walk through 2–3 steps, switch FR ↔ EN, refresh — drafts must persist.
4. Fill the form with a real email in Q1.3 and submit.
5. Both admin and Q1.3 email should receive a PDF.

## 7. Update & redeploy

```bash
cd ~/positioning-questionnaire
git pull
docker compose up -d --build
docker image prune -f
```

No NPM change needed — the Proxy Host config keeps pointing to `hc-web` / `hc-api` by name.

## 8. Backups

There is no database. Worth keeping safe off-host:

- `~/positioning-questionnaire/.env`
- A screenshot or export of the NPM Proxy Host's Advanced config (in case you need to recreate the entry).

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `502 Bad Gateway` on `/happycash/` | `hc-web` not on NPM network | Check `NPM_NETWORK` in `.env`, `docker compose up -d` |
| Blank page, console: `Failed to load module script` from `/assets/...` | `VITE_BASE_PATH` not set at build time | Rebuild: `docker compose up -d --build` after fixing `.env` |
| API returns 404 on `/happycash/api/submit` | Advanced snippet missing or wrong `proxy_pass` | Re-paste the snippet; verify trailing `/` |
| `CORS error` in browser | `CORS_ORIGINS` does not include `https://printmarksgraphics.cloud` | Edit `.env`, `docker compose up -d` |
| Email never arrives | SMTP creds rejected | `docker compose logs api` — look for `EAUTH` / `ETIMEDOUT` |
| NPM shows "Internal Error" after Save | Syntax error in Advanced config | Check the NPM container logs: `docker logs <npm-container>` |

## 10. Decommission

1. NPM UI → Edit the `printmarksgraphics.cloud` Proxy Host → Advanced tab → remove the Happy Cash block → Save.
2. On the VPS:
   ```bash
   cd ~/positioning-questionnaire
   docker compose down -v
   rm -rf ~/positioning-questionnaire
   ```
