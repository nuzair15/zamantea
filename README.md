# Zaman Tea

**Start with [AWS-PM2.md](AWS-PM2.md) for copy-paste EC2/PM2 deployment commands and [LAUNCH.md](LAUNCH.md) for the store setup and launch checklist.**

A colourful, packaging-led tea store with a responsive storefront, persistent cart, online checkout, cash on delivery, WhatsApp ordering, private order-status pages and password-protected store management.

The original ginger, cardamom and Darjeeling artwork is preserved. The header displays the existing Zaman logo directly from the supplied artwork. Local fonts and supplied images avoid external font/image dependencies.

## Run locally

Requires **Node.js 24 or newer**. Install dependencies with `npm ci`. There is no frontend build step.

```bash
npm ci
cp .env.example .env
node server/setup-admin.mjs
node --env-file=.env server/index.mjs
```

Open `http://localhost:3000` and `http://localhost:3000/admin.html`.

`setup-admin.mjs` asks for an email and a hidden password of at least 12 characters. Run it again to reset the owner account; doing so signs out all existing sessions. There is no default login.

If your environment changes `DB_PATH`, use `node --env-file=.env server/setup-admin.mjs` so setup and the server use the same database.

The original static-only Nginx instructions are replaced: **run the Node server**. Opening `index.html` directly or serving only `Template/` cannot run checkout or management.

## First-time store setup

1. Sign in to `/admin.html`.
2. Open **Products**. Confirm names, sizes, prices and each product's delivery charge. You can add teas, edit descriptions, upload JPEG/PNG/WebP images, change sizes and prices, or hide a tea without deleting its orders.
3. Open **Store settings**. Choose the free delivery threshold and check the WhatsApp number. The confirmed business WhatsApp number is **918296795986**.
4. Enable **Delivery rates reviewed — accept orders**, then save. Checkout stays paused until you do this.
5. Configure and test Razorpay as described below for online payments.

Original catalogue prices, preserved for all three teas:

| Size | Price |
| --- | ---: |
| 75g | ₹99 |
| 150g | ₹179 |
| 300g | ₹399 |

**Initial shipping values are suggestions, not approved business rates:** ₹40 per pack and free delivery from ₹599. Both are editable. Delivery is the sum of each product's delivery charge multiplied by its quantity. The charge becomes zero at or above the free delivery threshold. Leave the threshold blank to disable free delivery. Set it to zero for free delivery on all orders. Shipping is not weight-, courier-, state- or PIN-specific.

Prices are stored as integer paise. Treat entered prices as final retail product prices; this release does not calculate separate taxes or create GST invoices.

## Customer flows

- Customers choose a size, add teas to their bag, adjust quantities and see shipping before checkout.
- The cart is device-local. Catalogue, orders, prices, delivery rules and admin sessions are stored on the server.
- **COD:** creates and confirms the order immediately in the database.
- **Online:** creates an awaiting-payment order, then opens Razorpay. Server-side signature and captured-payment verification are required before fulfilment. The signed webhook recovers successful payments when the customer closes their browser before the callback.
- **WhatsApp:** prepares a message with products, delivery details and total for the customer to send. It does not create a confirmed website order; confirmation and payment happen in the conversation. If a browser blocks the popup, checkout provides an explicit WhatsApp link.
- After website checkout, customers receive a private order page with current status and tracking information. The token is in the URL fragment, not a query parameter, to keep it out of normal access logs. The page explains that the link should be kept private. The most recent link is also saved on the device.
- Transactional email is available through a durable SMTP outbox once configured. SMS and automatic WhatsApp notifications are not integrated. Customers without email save their order link.

## Managing orders

Orders can be searched by order number, customer name or phone and filtered by status. Each page shows up to 30 orders.

The fulfilment sequence is **Confirmed → Packed → Shipped → Delivered**. Enter a courier and tracking number before marking an order shipped; the HTTPS tracking link is optional. An online order cannot enter fulfilment until payment is verified. Marking a COD order delivered also records payment as collected.

Unpaid COD orders can be cancelled before delivery. Stock reservations, guarded stock editing, partial/full refund synchronization and explicit restocking are supported. Issue online refunds in the Razorpay dashboard; signed events or the admin synchronization action update the store. Courier booking and chargebacks are not integrated. Do not mark an unpaid COD parcel as delivered.

## Razorpay setup

1. Create/activate your Razorpay merchant account and configure **automatic payment capture** in its dashboard.
2. Put `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and a separately chosen `RAZORPAY_WEBHOOK_SECRET` in the server environment. Start with test-mode keys. Never add secrets to files under `Template/`.
3. Configure a Razorpay webhook for `https://zamantea.shop/api/payments/webhook`, using the same webhook secret, and subscribe to **payment.captured**, **refund.created**, **refund.processed**, and **refund.failed**.
4. Restart the application. Online payment only appears as available when all three values are present.
5. Perform an actual Razorpay test checkout. Confirm the order becomes paid/confirmed, confirm webhook deliveries succeed, test cancellation/retry, and test closing the browser after payment. The included automated tests simulate gateway responses; they do not replace this merchant-account test.
6. Switch to live keys and configure a live-mode webhook before accepting real payments. Confirm the account is activated and your intended payment methods are enabled.

The server creates a Razorpay order using its own calculated amount, validates the callback HMAC with its stored gateway order ID, fetches the payment from Razorpay and requires matching order ID, INR currency, amount and `captured` status. Duplicate order submissions and webhook events are idempotent. Payment-provider or network errors leave the order awaiting payment so customers can retry using their private link.

Reference: [Razorpay Standard Checkout integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/). Provider settings and merchant onboarding must be checked in your account before launch.

## EC2 deployment

The supported application process manager is **PM2 in single-process fork mode**. Follow [AWS-PM2.md](AWS-PM2.md) for the complete Ubuntu EC2 commands.

Included files:

- `ecosystem.config.cjs`: single-process PM2 configuration.
- `deploy/nginx.conf`: Nginx reverse proxy.
- `.env.example`: required configuration names.
- `scripts/backup.mjs`: consistent SQLite backup utility.

Use one EC2 instance with persistent EBS storage, Node.js 24+, Nginx and HTTPS. Do not use PM2 cluster mode, multiple PM2 instances or multiple EC2 instances with this SQLite database. The AWS guide covers installation, `.env`, owner setup, Nginx, Certbot, PM2 boot startup, log rotation, cron backups, health checks and safe Git updates.

## Validation performed

```bash
node scripts/check.mjs
node --test server/commerce.test.mjs
```

The checks cover page/asset references and JavaScript syntax. Automated integration tests cover original prices; shipping thresholds; invalid quantities and totals; idempotent COD orders; private order access; admin authentication and logout; catalogue management; delivery transitions; payment-order reuse; signature verification; signed-webhook recovery and deduplication; and unavailable payment options.

Desktop/mobile Chromium flows and automated accessibility checks have been performed. No live Razorpay payment or EC2 deployment has been performed. Check the final site on a real phone and desktop, including payment-provider frames, before launch. Public policies, merchant details and gateway requirements should reflect your actual business; no placeholder legal policies or reviews were invented.

## Project layout

- `Template/index.html`, `menu.html`, `about.html`, `contacts.html`: public storefront.
- `Template/checkout.html`, `order.html`: checkout and private order status.
- `Template/admin.html`: owner management interface.
- `Template/css/store.css`, `admin.css`: new responsive design.
- `Template/js/store.js`, `admin.js`: storefront and management interactions.
- `Template/img/zaman/`: original packaging assets and uploaded product images.
- `server/`: persistence, checkout, payment, authentication and API.
- `deploy/`: EC2 service and proxy configuration.

Legacy template files are retained from the upload but are not public page routes in the new server. The old `Template/js/zaman.js` and `Template/css/zaman.css` are not used by the redesigned pages. The smoke-test entry now delegates to the current browser suite.
