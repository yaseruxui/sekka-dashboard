<?php

namespace App\Support;

/**
 * Validation rules and normalisers for the site content sections, mirroring
 * siteContentSchema (resources/js/contracts/schema.ts), so a saved section
 * always passes on the site instead of falling back to its bundled copy.
 */
class ContentRules
{
    private const FITS = 'in:cover,contain,backdrop,backdrop-s';

    public static function home(string $p = ''): array
    {
        $src = ['required', 'string', 'min:1', 'max:2048'];
        $tile = fn (string $k) => [
            $k => ['present', 'array'],
            "{$k}.*.src" => $src,
            "{$k}.*.aspect" => ['required', 'string', 'max:64'],
            "{$k}.*.fit" => ['required', self::FITS],
            "{$k}.*.tint" => ['required', 'boolean'],
        ];

        return [
            "{$p}heroVideo" => $src,
            "{$p}gallery" => ['required', 'array'],
            "{$p}gallery.big.src" => $src,
            "{$p}gallery.big.fit" => ['required', self::FITS],
            "{$p}gallery.big.tint" => ['required', 'boolean'],
            ...$tile("{$p}gallery.start"),
            ...$tile("{$p}gallery.mid"),
            ...$tile("{$p}gallery.end"),
            "{$p}caseList" => ['present', 'array'],
            "{$p}caseList.*.video" => $src,
            "{$p}caseList.*.fit" => ['required', self::FITS],
            "{$p}caseList.*.gradient" => ['nullable', 'string', 'max:500'],
            "{$p}workReel" => ['present', 'array'],
            "{$p}workReel.*.src" => $src,
            "{$p}workReel.*.href" => ['required', 'string', 'min:1', 'max:2048'],
            "{$p}clientLogos" => ['present', 'array'],
            "{$p}clientLogos.*.name" => ['nullable', 'string', 'max:200'],
            "{$p}clientLogos.*.tight" => $src,
            "{$p}clientLogos.*.full" => $src,
            "{$p}reelStepS" => ['required', 'numeric', 'gt:0', 'max:10'],
            "{$p}about.region" => $src,
            "{$p}about.peopleFlag" => $src,
            "{$p}about.studio" => $src,
            "{$p}about.impact" => $src,
            "{$p}storyVideo" => $src,
            "{$p}notFoundVideo" => $src,
            "{$p}notFoundHref" => ['nullable', 'string', 'starts_with:/', 'max:200'],
            "{$p}maintenanceVideo" => ['nullable', 'string', 'max:2048'],
            "{$p}maintenance" => ['nullable', 'boolean'],
            "{$p}serviceIds" => ['nullable', 'array'],
            "{$p}serviceIds.*" => ['integer', 'distinct', 'exists:services,id'],
            "{$p}workReelIds" => ['nullable', 'array'],
            "{$p}workReelIds.*" => ['integer', 'distinct', 'exists:projects,id'],
        ];
    }

    public static function normalizeHome(array $h): array
    {
        $tiles = fn (array $list) => array_map(fn ($t) => [
            'src' => $t['src'], 'aspect' => $t['aspect'], 'fit' => $t['fit'], 'tint' => (bool) $t['tint'],
        ], array_values($list));

        return [
            'heroVideo' => $h['heroVideo'],
            'gallery' => [
                'big' => ['src' => $h['gallery']['big']['src'], 'fit' => $h['gallery']['big']['fit'], 'tint' => (bool) $h['gallery']['big']['tint']],
                'start' => $tiles($h['gallery']['start']),
                'mid' => $tiles($h['gallery']['mid']),
                'end' => $tiles($h['gallery']['end']),
            ],
            'caseList' => array_map(fn ($c) => ['video' => $c['video'], 'fit' => $c['fit'], 'gradient' => (string) ($c['gradient'] ?? '')], array_values($h['caseList'])),
            'workReel' => array_map(fn ($w) => ['src' => $w['src'], 'href' => $w['href']], array_values($h['workReel'])),
            'clientLogos' => array_map(fn ($l) => ['name' => (string) ($l['name'] ?? ''), 'tight' => $l['tight'], 'full' => $l['full']], array_values($h['clientLogos'])),
            'reelStepS' => (float) $h['reelStepS'],
            'about' => [
                'region' => $h['about']['region'],
                'peopleFlag' => $h['about']['peopleFlag'],
                'studio' => $h['about']['studio'],
                'impact' => $h['about']['impact'],
            ],
            'storyVideo' => $h['storyVideo'],
            'notFoundVideo' => $h['notFoundVideo'],
            'notFoundHref' => $h['notFoundHref'] ?? '/',
            'maintenanceVideo' => ($h['maintenanceVideo'] ?? null) ?: $h['notFoundVideo'],
            'maintenance' => (bool) ($h['maintenance'] ?? false),
            ...(isset($h['serviceIds']) ? ['serviceIds' => array_map('intval', array_values($h['serviceIds']))] : []),
            ...(isset($h['workReelIds']) ? ['workReelIds' => array_map('intval', array_values($h['workReelIds']))] : []),
        ];
    }

    public static function contact(string $p = ''): array
    {
        return [
            "{$p}email" => ['required', 'email'],
            "{$p}phone" => ['nullable', 'string', 'max:64'],
            "{$p}whatsappNumber" => ['required', 'regex:/^\d{6,16}$/'],
            "{$p}heroVideo" => ['required', 'string', 'min:1', 'max:2048'],
            "{$p}mapUrl" => ['required', 'url', 'max:2048'],
            "{$p}socials" => ['present', 'array'],
            "{$p}socials.*.platform" => ['required', 'string', 'min:1', 'max:64'],
            "{$p}socials.*.url" => ['nullable', 'string', 'max:2048'],
        ];
    }

    public static function normalizeContact(array $c): array
    {
        return [
            'email' => $c['email'],
            'phone' => (string) ($c['phone'] ?? ''),
            'whatsappNumber' => (string) $c['whatsappNumber'],
            'heroVideo' => $c['heroVideo'],
            'mapUrl' => $c['mapUrl'],
            'socials' => array_map(fn ($s) => ['platform' => $s['platform'], 'url' => (string) ($s['url'] ?? '')], array_values($c['socials'])),
        ];
    }

    public static function policy(string $p = ''): array
    {
        return [
            "{$p}ar" => ['required', 'array'],
            "{$p}ar.updated" => ['nullable', 'string', 'max:100'],
            "{$p}ar.title" => ['required', 'string', 'max:200'],
            "{$p}ar.html" => ['required', 'string'],
            // English is optional: null means the site shows the Arabic policy.
            "{$p}en" => ['nullable', 'array'],
            "{$p}en.updated" => ['nullable', 'string', 'max:100'],
            "{$p}en.title" => ["required_with:{$p}en", 'nullable', 'string', 'max:200'],
            "{$p}en.html" => ["required_with:{$p}en", 'nullable', 'string'],
        ];
    }

    public static function normalizePolicy(array $policy): array
    {
        $one = fn (array $p) => [
            'updated' => (string) ($p['updated'] ?? ''),
            'title' => (string) $p['title'],
            'html' => PolicyHtml::clean((string) $p['html']),
        ];

        return [
            'ar' => $one($policy['ar']),
            'en' => ! empty($policy['en']) && ! empty($policy['en']['title']) ? $one($policy['en']) : null,
        ];
    }

    /**
     * Texts (next-intl dictionaries) can only hold strings, lists and groups.
     * Returns the first path that holds anything else.
     */
    public static function badLeaf(mixed $value, string $path): ?string
    {
        if (is_string($value) || is_int($value) || is_float($value) || is_bool($value)) {
            return null;
        }
        if (is_array($value)) {
            foreach ($value as $k => $v) {
                if ($bad = self::badLeaf($v, "{$path}.{$k}")) {
                    return $bad;
                }
            }

            return null;
        }

        return $path;
    }
}
