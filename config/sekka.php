<?php

return [

    /*
    | The public Sekka site (sekka-next). Used to refresh its cache on save
    | (POST {site}/api/revalidate) and for the one-time import of its bundled
    | content (GET {site}/api/content-defaults). Also prefixes site-relative
    | media paths (/media/...) for previews in the dashboard.
    */
    'site_url' => rtrim((string) env('SITE_URL', 'http://localhost:3000'), '/'),

    /* Shared with the site's REVALIDATE_SECRET (header x-revalidate-secret). */
    'revalidate_secret' => env('SITE_REVALIDATE_SECRET', ''),

    /* The site's Vercel "Protection Bypass for Automation" secret, when the site is behind Deployment Protection. */
    'site_protection_bypass' => env('SITE_PROTECTION_BYPASS', ''),

    /* The site posts its contact form to /api/contact?key=<this>. */
    'contact_webhook_key' => env('CONTACT_WEBHOOK_KEY', ''),

    /* Used by `php artisan db:seed` (every deploy): creates the admin and keeps its password equal to ADMIN_PASSWORD. */
    'admin' => [
        'name' => env('ADMIN_NAME', 'Sekka Admin'),
        'email' => env('ADMIN_EMAIL'),
        'password' => env('ADMIN_PASSWORD'),
    ],

];
