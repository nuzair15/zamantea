# Deploy Zaman Tea on AWS EC2 with PM2

These commands assume a fresh **Ubuntu EC2 instance**, the default `ubuntu` user, the repository at `/opt/zaman`, Nginx in front of the app, and one PM2 process. Keep exactly one app instance because the store uses SQLite.

Before starting, allocate an Elastic IP and set the EC2 security group to allow TCP 22 from your IP and TCP 80/443 from the internet. Do not expose port 3000.

## 1. Install Node 24, Nginx, Git, PM2 and Certbot

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg git nginx certbot python3-certbot-nginx

curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

node --version
npm --version
sudo npm install -g pm2
pm2 --version
```

## 2. Clone the store

```bash
sudo mkdir -p /opt/zaman
sudo chown ubuntu:ubuntu /opt/zaman
git clone https://github.com/nuzair15/zamantea.git /opt/zaman
cd /opt/zaman
npm ci --omit=dev
mkdir -p data backups
chmod 700 data backups
```

For a private repository, use a GitHub deploy key or a fine-grained read-only token. Do not put a token directly in a command or committed remote URL.

## 3. Configure the private environment

```bash
cd /opt/zaman
cp .env.example .env
chmod 600 .env
nano .env
```

Use this baseline after you purchase a domain:

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
APP_ORIGIN=https://zamantea.shop
DB_PATH=/opt/zaman/data/zaman.sqlite
TRUST_PROXY=1

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=0
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM=

BACKUP_S3_URI=
```

Leave Razorpay and SMTP values empty until those accounts exist. COD and WhatsApp can work without Razorpay. Never commit `.env`.

## 4. Initialize the store and owner login

For a new server, apply the saved Zaman Tea profile and create a generated owner password:

```bash
cd /opt/zaman
node --env-file=.env scripts/setup-store.mjs
cat data/owner-credentials.txt
```

Save the password in a password manager, then remove only the credentials file:

```bash
rm /opt/zaman/data/owner-credentials.txt
```

You can later reset the owner account interactively:

```bash
cd /opt/zaman
npm run admin:setup
```

## 5. Start the single PM2 process

```bash
cd /opt/zaman
pm2 start ecosystem.config.cjs --only zaman-tea
pm2 status
pm2 logs zaman-tea --lines 100
curl --fail http://127.0.0.1:3000/api/health
```

Register PM2 for reboot startup. Run the command printed by `pm2 startup`, then save the process list:

```bash
pm2 startup
pm2 save
```

Install log rotation so PM2 logs cannot grow forever:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 20M
pm2 set pm2-logrotate:retain 14
pm2 save
```

## 6. Configure Nginx and HTTPS

The supplied Nginx configuration already uses `zamantea.shop` as the canonical domain and redirects `www.zamantea.shop` to it:

```bash
cd /opt/zaman
sudo cp deploy/nginx.conf /etc/nginx/sites-available/zaman
sudo ln -s /etc/nginx/sites-available/zaman /etc/nginx/sites-enabled/zaman
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

At your domain registrar, point the `@` A record to the EC2 Elastic IP. Point `www` to the same IP with an A record, or use a CNAME from `www` to `zamantea.shop`. Wait for both names to resolve, then enable HTTPS:

```bash
sudo certbot --nginx -d zamantea.shop -d www.zamantea.shop
sudo certbot renew --dry-run
```

Use `https://zamantea.shop` as the canonical address. `APP_ORIGIN` must match it exactly, with no trailing slash. After changing `.env`, restart with:

```bash
cd /opt/zaman
pm2 restart ecosystem.config.cjs --only zaman-tea --update-env
pm2 save
```

## 7. Finish store setup

Visit `https://zamantea.shop/admin.html`, then:

1. Enter stock for every pack size.
2. Confirm delivery charges, free-delivery threshold and optional COD fee.
3. Complete the postal address with city, state and PIN.
4. Review and approve the policy drafts.
5. Enable **Delivery charges reviewed — accept orders** only when fulfilment is ready.

Check launch readiness on the server:

```bash
cd /opt/zaman
npm run launch:check
```

## 8. Backups and health checks without an app systemd service

Create a local backup manually:

```bash
cd /opt/zaman
npm run backup -- /opt/zaman/backups
```

Add cron jobs under the same `ubuntu` account that owns PM2 and the store:

```bash
crontab -e
```

Add:

```cron
30 2 * * * cd /opt/zaman && /usr/bin/node --env-file=.env scripts/backup.mjs /opt/zaman/backups >> /opt/zaman/backups/backup.log 2>&1
*/5 * * * * cd /opt/zaman && /usr/bin/node --env-file=.env scripts/health-check.mjs >> /opt/zaman/data/health.log 2>&1
```

Set `BACKUP_S3_URI` and attach an EC2 IAM role with narrowly scoped S3 upload permission to copy backups off the server. Configure S3 versioning and lifecycle retention. Local backups on the same EC2 volume are not enough for disaster recovery.

## 9. Deploy future Git updates

Back up before every update, then pull and restart the one PM2 process:

```bash
cd /opt/zaman
npm run backup -- /opt/zaman/backups
git pull --ff-only origin main
npm ci --omit=dev
pm2 restart ecosystem.config.cjs --only zaman-tea --update-env
pm2 save
curl --fail http://127.0.0.1:3000/api/health
pm2 logs zaman-tea --lines 100 --nostream
```

Do not use PM2 cluster mode or set `instances` above 1. SQLite and the payment workflow are designed for a single application process on one EC2 instance.

PM2's documented boot flow uses `pm2 startup` followed by `pm2 save`: [PM2 startup hook](https://pm2.io/docs/runtime/guide/startup-hook/) and [ecosystem file reference](https://pm2.io/docs/runtime/reference/ecosystem-file/).
