# Sekka dashboard

Admin dashboard for the Sekka site (`../sekka-next`): projects with a block
editor, site content (texts in Arabic / English, media, contact info,
privacy policy), media library and the contact inbox.

Laravel 12 · Inertia 2 · React 19 · shadcn/ui · SQLite (any Laravel database works).

## Setup

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan storage:link
php artisan sekka:admin you@example.com      # asks for a password
npm run build
php artisan serve
```

`.env`:

| Key | What |
| --- | --- |
| `APP_URL` | Where the dashboard runs. Uploaded files are served from `{APP_URL}/storage/…`. |
| `SITE_URL` | The public site, e.g. `https://seka-sa.com`. |
| `SITE_REVALIDATE_SECRET` | Same value as the site's `REVALIDATE_SECRET`. |
| `CONTACT_WEBHOOK_KEY` | Any long random string; see below. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Optional: `php artisan db:seed` creates this admin. |

## Connecting the site

In `sekka-next/.env`:

```
DASHBOARD_URL={APP_URL}
REVALIDATE_SECRET={SITE_REVALIDATE_SECRET}
CONTACT_WEBHOOK_URL={APP_URL}/api/contact?key={CONTACT_WEBHOOK_KEY}
```

Then, once, copy what the site shows today into the dashboard:

```bash
php artisan sekka:import-site            # from {SITE_URL}/api/content-defaults
php artisan sekka:import-site --file=…   # or from a saved { content, projects } JSON
```

It only fills what is still empty (`--force` overwrites). It also keeps the
site's original texts, which empty fields fall back to.

## What the site reads

- `GET /api/public/projects`: published projects, in dashboard order (projectSchema).
- `GET /api/public/content`: the content sections edited here (siteContentSchema).
  Sections never saved are left out, so the site uses its bundled copy.
- `POST /api/contact?key=…`: the site's contact form, into the inbox.

Every publish / save calls `POST {SITE_URL}/api/revalidate` so changes show at
once. Project edits autosave as a draft the site never sees until «نشر».

The site's contracts are copied verbatim in `resources/js/contracts`. Check the
live API against them with:

```bash
npm run check:api -- http://localhost:8000
```

## Development

```bash
php artisan test
npx tsc --noEmit
npm run lint
```
