<?php

namespace App\Support;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Calls to the public site (sekka-next), authenticated with the shared
 * revalidate secret (header x-revalidate-secret).
 */
class SiteClient
{
    public static function configured(): bool
    {
        return config('sekka.site_url') !== '' && (string) config('sekka.revalidate_secret') !== '';
    }

    private static function http(int $timeout): PendingRequest
    {
        $bypass = (string) config('sekka.site_protection_bypass');

        return Http::baseUrl(config('sekka.site_url'))
            ->withHeaders(['x-revalidate-secret' => (string) config('sekka.revalidate_secret')])
            // Lets these calls through Vercel Deployment Protection on a private (staging) site.
            ->when($bypass !== '', fn (PendingRequest $r) => $r->withHeaders(['x-vercel-protection-bypass' => $bypass]))
            ->acceptJson()
            ->timeout($timeout);
    }

    /**
     * Asks the site to drop its cached projects and content so a save shows
     * at once. Never throws: returns whether the site confirmed.
     */
    public static function revalidate(): bool
    {
        if (! self::configured()) {
            return false;
        }
        try {
            $res = self::http(5)->post('/api/revalidate');
            if ($res->successful()) {
                cache()->forever('sekka.last_revalidate', now()->toIso8601String());
                cache()->forget('sekka.revalidate_failed_at');

                return true;
            }
            Log::warning('[sekka] site revalidate failed', ['status' => $res->status()]);
        } catch (Throwable $e) {
            Log::warning('[sekka] site revalidate failed', ['error' => $e->getMessage()]);
        }
        // Shown on the overview's site card until a later revalidate succeeds.
        cache()->forever('sekka.revalidate_failed_at', now()->toIso8601String());

        return false;
    }

    /** The site's bundled content and projects: { content, projects }. */
    public static function contentDefaults(): array
    {
        return self::http(30)->get('/api/content-defaults')->throw()->json();
    }
}
