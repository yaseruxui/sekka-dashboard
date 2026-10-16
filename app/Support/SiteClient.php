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
        return Http::baseUrl(config('sekka.site_url'))
            ->withHeaders(['x-revalidate-secret' => (string) config('sekka.revalidate_secret')])
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
                return true;
            }
            Log::warning('[sekka] site revalidate failed', ['status' => $res->status()]);
        } catch (Throwable $e) {
            Log::warning('[sekka] site revalidate failed', ['error' => $e->getMessage()]);
        }

        return false;
    }

    /** The site's bundled content and projects: { content, projects }. */
    public static function contentDefaults(): array
    {
        return self::http(30)->get('/api/content-defaults')->throw()->json();
    }
}
