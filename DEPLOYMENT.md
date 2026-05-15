# DEPLOYMENT — Hostinger VPS (Ubuntu 24.04) + Docker Compose + Caddy

This guide walks you through deploying the Happy Cash Positioning Questionnaire on a fresh Hostinger VPS. Total time: ~30 minutes.

---

## 0. Prerequisites

- A **Hostinger VPS** (KVM 1 or higher — 1 vCPU / 1 GB RAM is enough).
- A **domain name** pointing to the VPS public IP (A record). Example: `positionnement.happycash.example`.
- SMTP credentials for sending email (Gmail App Password, Brevo, OVH, Resend, etc.).
- The admin email address that will receive every submission.
- Local SSH key.

---

## 1. Create the VPS

1. In the Hostinger panel: **VPS → Buy VPS**, pick **Ubuntu 24.04 LTS**.
2. Add your **SSH public key** during provisioning (Hostinger lets you paste it).
3. Wait for the VPS to be ready; note its public IPv4.

## 2. Point the domain to the VPS

In your DNS provider (Hostinger or another), create an **A record**:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `positionnement` (or `@`) | `<VPS public IPv4>` | 3600 |

Wait until `dig +short positionnement.happycash.example` returns the VPS IP (1–15 minutes).

## 3. Connect to the VPS

```bash
ssh root@<VPS_IP>
```

Create a non-root user (recommended):

```bash
adduser hc
usermod -aG sudo hc
mkdir -p /home/hc/.ssh && cp ~/.ssh/authorized_keys /home/hc/.ssh/
chown -R hc:hc /home/hc/.ssh && chmod 700 /home/hc/.ssh && chmod 600 /home/hc/.ssh/authorized_keys
```

Re-connect as `hc`:
```bash
ssh hc@<VPS_IP>
```

## 4. Basic hardening + firewall

```bash
sudo apt update && sudo apt upgrade -y
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
```

## 5. Install Docker Engine + Compose plugin

```bash
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Log out / log back in so the docker group is picked up. Verify:

```bash
docker --version
docker compose version
```

## 6. Pull the project on the VPS

If your code is on GitHub:

```bash
cd ~
git clone <git@github.com:your-org/positioning-questionnaire.git> positioning-questionnaire
cd positioning-questionnaire
```

Or upload via `scp`:

```bash
# from your laptop
rsync -avz --exclude node_modules --exclude .git ./ hc@<VPS_IP>:~/positioning-questionnaire/
```

## 7. Configure environment variables

```bash
cp .env.example .env
nano .env
```

Fill **at least**:

| Key | Example | Notes |
|---|---|---|
| `DOMAIN` | `positionnement.happycash.example` | Used by Caddy for HTTPS |
| `CORS_ORIGINS` | `https://positionnement.happycash.example` | The same domain over HTTPS |
| `SMTP_HOST` | `smtp.gmail.com` | Your SMTP server |
| `SMTP_PORT` | `465` | 465 SSL, 587 STARTTLS |
| `SMTP_SECURE` | `true` | `true` for 465, `false` for 587 |
| `SMTP_USER` | `noreply@happycash.example` | SMTP username |
| `SMTP_PASSWORD` | `xxxx xxxx xxxx xxxx` | App password (Gmail) or SMTP secret |
| `MAIL_FROM_NAME` | `Happy Cash` | Display name on outgoing emails |
| `MAIL_FROM_ADDRESS` | `noreply@happycash.example` | Must match the SMTP account in most cases |
| `ADMIN_EMAIL` | `admin@happycash.example` | Recipient of every submission |

> ⚠️ Never commit `.env`. The `.gitignore` already excludes it.

### SMTP gotchas

- **Gmail**: enable 2FA on the account, then create an **App password** at <https://myaccount.google.com/apppasswords>. Use that as `SMTP_PASSWORD`. Port `465`, secure `true`.
- **OVH**: SSL on `ssl0.ovh.net:465`, the SMTP user is the full mailbox address.
- **Brevo (ex-Sendinblue)**: free tier of 300 emails/day, host `smtp-relay.brevo.com`, port `587`, `SMTP_SECURE=false`.
- **Resend** SMTP: host `smtp.resend.com`, port `465`, secure `true`, user `resend`, password is your API key.

## 8. First boot

```bash
docker compose pull
docker compose up -d --build
docker compose ps
```

Expected: three healthy services (`web`, `api`, `caddy`).

Caddy will request a Let's Encrypt certificate automatically the first time it answers a request on the configured `DOMAIN`. Watch the logs:

```bash
docker compose logs -f caddy
```

You should see `certificate obtained successfully`.

Visit `https://<DOMAIN>` — the form should load.

## 9. Smoke test

1. Open `https://<DOMAIN>` in a browser → landing page.
2. Walk through 2–3 steps, switch language FR ↔ EN, refresh the page (the draft should persist).
3. Fill the form to the end with a **real email** in Q1.3.
4. Submit. The admin mailbox AND the email used in Q1.3 should each receive a PDF.

If the email never arrives:
- `docker compose logs api` — look for SMTP errors (auth, port, TLS).
- Check the SMTP provider's outbound queue.
- If Gmail: confirm you used an App Password, not the account password.

## 10. Update & redeploy

```bash
cd ~/positioning-questionnaire
git pull
docker compose up -d --build
docker image prune -f
```

Zero downtime is not guaranteed for a 1-container-per-role layout, but the rebuild + restart cycle takes ~30s.

## 11. Backups

There is **no database** to back up — submissions live exclusively in the recipient mailboxes.

Worth backing up regardless:
- `~/positioning-questionnaire/.env` (off-host secret store)
- The `caddy_data` Docker volume (holds the Let's Encrypt certificates — losing it just triggers a re-issue on next boot, but rate limits exist).

```bash
# Snapshot caddy_data
docker run --rm -v positioning-questionnaire_caddy_data:/data -v "$PWD":/backup alpine \
  tar czf /backup/caddy_data.tar.gz -C /data .
```

## 12. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `502 Bad Gateway` on the API | `api` container not yet healthy | `docker compose logs api` |
| Caddy logs `no certificate found` | DNS not propagated | Re-check the A record, wait, then `docker compose restart caddy` |
| Form submits but no email | SMTP rejected the credentials | Check `api` logs; rotate App Password |
| `CORS error` in browser | `CORS_ORIGINS` does not include your real frontend origin | Add it to `.env`, `docker compose up -d` |
| Static assets 404 after deploy | Stale CDN/browser cache | The Nginx config sets `no-store` on `index.html` — usually a Cloudflare proxy in front; purge it |

## 13. Decommission

```bash
docker compose down -v
sudo rm -rf ~/positioning-questionnaire
```

This deletes the containers, volumes (including the issued certificates) and source.
