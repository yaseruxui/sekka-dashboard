<?php

namespace App\Support;

use App\Models\Setting;

/**
 * The site content sections (siteContentSchema in resources/js/contracts/schema.ts),
 * each stored as one Setting. Sections never saved are left out of the public
 * payload, so the site falls back to its bundled defaults for them.
 */
class SiteContent
{
    public const SECTIONS = ['home', 'contact', 'policy', 'messages'];

    public static function get(string $section): ?array
    {
        return Setting::getValue($section);
    }

    public static function put(string $section, array $value): void
    {
        Setting::setValue($section, $value);
    }

    public static function public(): array
    {
        $out = [];
        foreach (self::SECTIONS as $section) {
            $value = self::get($section);
            if ($value !== null) {
                $out[$section] = $value;
            }
        }

        return $out;
    }
}
