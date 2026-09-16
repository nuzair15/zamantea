# Zaman Tea — launch handoff

## Local store

Run `npm start`, then visit `http://localhost:3000/admin.html`.

An owner account has been created locally for **mohammadnuzair@gmail.com**. Its generated password is in **data/owner-credentials.txt**, excluded from Git and public web routes. Save it in your password manager and remove that file. Reset it with `npm run admin:setup`. Do not send credentials through chat.

Business contact information, 9am–6pm support hours, all-India coverage and typical 4–7 day delivery are saved. The owner confirmed all PIN codes are supported. Pack prices remain ₹99 / ₹179 / ₹399. Ingredients are not displayed. Product details remain optional until approved information is available.

## Complete in admin

1. **Products:** enter available stock for each pack size. Stock means units currently available for new orders, excluding already reserved units. Unknown stock is not silently treated as unlimited. An actual zero means sold out. Optional brewing, storage and shelf-life details can be added later.
2. **Store settings:** choose the delivery charge per product, free-delivery threshold, COD availability and additional COD fee. Initial delivery prices (₹40 per pack, free from ₹599) are suggestions, not approved prices. COD fee currently defaults to zero. You can limit delivery and COD to specific PIN codes at any time.
3. Complete the postal address with city/state/PIN, verify seller/registration disclosures applicable to your business, and review the saved policies. Drafts follow the no-change-of-mind return/cancellation instruction but preserve remedies for problem products and applicable consumer rights. See `POLICY-DRAFTS.md`.
4. Enable **policies reviewed**, then **delivery charges reviewed — accept orders**. The server refuses activation if required details or stock configuration are incomplete. Do not enable orders until fulfilment is ready.

## Domain, hosting and HTTPS

No domain, hosting access or Razorpay account was supplied, so nothing has been published or connected to a live merchant account.

Purchase your chosen domain and provision persistent Linux hosting. For EC2, use one PM2 application process and a persistent EBS volume. Install Node 24+, PM2, Nginx and your certificate tooling. Follow the copy-paste commands in `AWS-PM2.md`. Run `npm ci --omit=dev` before starting the process. Do not expose port 3000 publicly.

The repository is configured for `zamantea.shop`. Set `APP_ORIGIN=https://zamantea.shop` in `/opt/zaman/.env`; set `NODE_ENV=production`, `TRUST_PROXY=1` and the persistent `DB_PATH`. Configure the TLS certificate and renewal. `www.zamantea.shop` redirects to the canonical domain. Metadata, canonical links, sitemap and robots output use APP_ORIGIN.

Transfer the configured database and product images using a verified backup, keeping the credentials file private. Alternatively, on a fresh installation run `node --env-file=/etc/zaman.env scripts/setup-store.mjs` from `/opt/zaman` once, then complete stock/settings again. That script applies the saved business profile and pauses checkout; do not run it routinely on an operating store.

## Payments

COD and WhatsApp can be used without Razorpay after store setup. Online payment remains disabled until credentials are configured.

Create and activate your Razorpay account. Configure automatic capture, start with test keys, and add key ID, key secret and webhook secret only to the server environment. Subscribe the endpoint `https://zamantea.shop/api/payments/webhook` to `payment.captured`, `refund.created`, `refund.processed`, and `refund.failed`. Test success, failure, dismiss/retry, interrupted callbacks and dashboard refunds before switching to live keys/webhooks. No real merchant payment has been tested here.

Issue online refunds in the Razorpay dashboard. Signed webhooks synchronize partial/full refunds, and **Synchronize Razorpay refunds** in order management can recover missed events. Stock is not automatically increased after a refund: use **Return received packs to stock** only when physically appropriate. Unshipped COD cancellation restores its reservation automatically; shipped cancellation needs explicit restocking. Refunds for collected COD payments still require a manual payment and accounting process.

Unpaid online orders retain their stock reservation to prevent a late successful payment from overselling stock. They are not automatically expired or returned to stock. Review abandoned orders and payment state before adjusting availability; this release does not cancel gateway orders automatically.

## Customer and owner email

Use a transactional SMTP provider, or an appropriately configured mailbox service. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` and a verified `MAIL_FROM` in the private server environment. For port 587, STARTTLS is required; for implicit TLS on 465, set `SMTP_SECURE=1`. Authenticate and verify your sender domain as required by the provider.

Notifications are queued durably for new orders, payment confirmation, fulfilment changes and refund updates. Customer email is optional: orders without email retain their private status link and manual WhatsApp support. Owner notifications use the support email. Failed deliveries retry with backoff; counts are shown in Store settings. Delivery is at least once in crash/retry scenarios, so rare duplicates are possible. Test customer and owner inboxes before relying on notifications. No real email has been sent during development.

The contact form and WhatsApp checkout prepare messages for customers to send; there is no automatic WhatsApp/SMS integration.

## Backups and monitoring

`npm run backup -- PATH` creates a consistent SQLite snapshot, product-image copies and a SHA-256 manifest. To verify and restore into a **new** directory:

```sh
node scripts/restore.mjs BACKUP_DIRECTORY NEW_RESTORE_DIRECTORY
```

The restore command checks hashes and database integrity and refuses to overwrite a directory. Stop the store before replacing its actual database/images. Retain the previous database and its matching WAL/SHM files as a separate rollback set; never mix old WAL files with a restored database. Test the restored copy first. The bundle does not include server secrets; preserve those separately with restricted access.

Use the cron entries in `AWS-PM2.md` for daily backups and five-minute local health checks. PM2 manages only the application process. Configure an external monitor to alert you on `/api/health` failures, disk exhaustion and certificate expiry. Local health checks cannot detect a full host outage.

For S3 off-server backups, install AWS CLI, give the instance role least-privilege upload access and set `BACKUP_S3_URI=s3://YOUR-BUCKET/zaman`. The backup job uploads an encrypted copy and fails if the upload fails. Configure bucket access, versioning and retention for your requirements. Without this setting, the script explicitly reports that remote backup is unconfigured. No backup destination or monitoring account was supplied, so remote storage and alerts still need activation.

## Validation and invoicing

Run `npm test`, `npm run check`, `npm run test:browser`, and `npm run launch:check`. Browser tests use isolated in-memory test data; they do not alter the local store or place real orders. The test tooling requires `npm ci` and `npx playwright install chromium` on a development machine.

Printable order receipts are available on private order pages and are explicitly identified as receipts. GST/tax invoice generation has not been fabricated: registration details, tax treatment and an invoicing process must be established for your business before relying on this store for tax invoices.

Do a final supervised order on the deployed domain, verify fulfilment, tracking, email delivery and a backup restore, and check an actual phone. Automated browser/payment simulations do not validate your real courier, SMTP account or Razorpay account.

Implementation references: [Razorpay refund events](https://razorpay.com/docs/webhooks/refunds/), [Razorpay payment refund APIs](https://razorpay.com/docs/api/refunds/), [Nodemailer SMTP configuration](https://nodemailer.com/smtp), [Sharp image output](https://sharp.pixelplumbing.com/api-output/).
