# Deploying: Render (Ghost) + Aiven (MySQL) + Mailgun

## 1. Aiven for MySQL
1. Create an Aiven account, then a new **MySQL** service. Pick a **free** plan (or Developer tier, see notes), choose a
   MySQL **8.x** version, and a region close to your Render region.
2. On the service Overview, copy: host, port, user (`avnadmin`), password, database (`defaultdb`), and the **CA certificate**.
3. Leave "allowed IP addresses" at its default: free plans have no static IPs and Render's outbound IPs are not fixed.
   Connections are protected by TLS and the password, so keep `database__connection__ssl__rejectUnauthorized=true`.

## 2. Mailgun (before first login: Ghost needs working mail even to sign in)
1. Add a sending domain, ideally a subdomain such as `mg.yourdomain.com`; add the DNS records; wait for "Verified".
2. Note the region (US/EU): it decides the SMTP host and API URL in `render.yaml`.
3. Create an API key (newsletters) and an SMTP credential (`postmaster@mg.yourdomain.com`).

## 3. Render
1. Push this repo to GitHub. Render > New > Blueprint > pick the repo.
2. Fill every prompted variable (see `.env.example`): the Aiven host, port, password and CA, `url`, and the Mailgun values.
3. First boot takes a few minutes while Ghost creates its tables.
4. Add your custom domain, then set `url` to `https://yourdomain.com` exactly and redeploy.

## 4. First login
Open `/ghost` and create the owner account. Ghost emails a code on new-device login. If mail is not ready,
temporarily add `security__staffDeviceVerification=false`, and remove it once mail works.

## 5. Theme
- Quick: Admin > Settings > Design > Change theme > upload `literary-theme.zip`, then Activate.
- Automatic: create a Custom integration, add its URL and Admin API key as the GitHub secrets named in
  `.github/workflows/deploy-theme.yml`. Every push that touches `theme/` redeploys.

## 6. Newsletter
Settings > Email newsletter: set the sender name and address, send a test to yourself, and check it lands in the inbox.

## 7. Keeping the free database awake, and backups
- Aiven's docs say free services can be powered off when there is no continuative activity, with a notice sent first.
  What counts as activity is not defined. Point a free uptime monitor (for example UptimeRobot) at your homepage every
  few minutes so the database sees regular reads, and watch the notice emails.
- Powering off does not delete data by itself: Aiven takes a backup first and restores it on power-on, and only deletes
  services that stay off for more than 180 days. Still, also export content monthly (Ghost Admin > Settings > Labs > Export).
- If it ever powers off on you, upgrade the service to the Developer tier: it is a paid plan that stays on 24/7.
- Free-tier limits: 1 GB storage, 1 GB RAM, `max_connections` 76, one free MySQL per organisation, no SLA.
  Uploaded images live on the Render disk, not in the database.

## Variable reference
See `.env.example` at the repo root.
