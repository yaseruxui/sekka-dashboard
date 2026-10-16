<?php

namespace App\Http\Controllers;

use App\Support\PolicyHtml;
use App\Support\SiteContent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The site content sections, one screen each. Rules mirror siteContentSchema
 * (resources/js/contracts/schema.ts) so a saved section always passes on the
 * site instead of silently falling back to its bundled copy.
 */
class ContentController extends Controller
{
    private const FITS = 'in:cover,contain,backdrop,backdrop-s';

    public function home(): Response
    {
        return Inertia::render('content/home', ['home' => SiteContent::get('home')]);
    }

    public function updateHome(Request $request): RedirectResponse
    {
        $src = ['required', 'string', 'min:1', 'max:2048'];
        $tile = fn (string $p) => [
            $p => ['present', 'array'],
            "{$p}.*.src" => $src,
            "{$p}.*.aspect" => ['required', 'string', 'max:64'],
            "{$p}.*.fit" => ['required', self::FITS],
            "{$p}.*.tint" => ['required', 'boolean'],
        ];

        $data = $request->validate([
            'heroVideo' => $src,
            'gallery' => ['required', 'array'],
            'gallery.big.src' => $src,
            'gallery.big.fit' => ['required', self::FITS],
            'gallery.big.tint' => ['required', 'boolean'],
            ...$tile('gallery.start'),
            ...$tile('gallery.mid'),
            ...$tile('gallery.end'),
            'caseList' => ['present', 'array'],
            'caseList.*.video' => $src,
            'caseList.*.fit' => ['required', self::FITS],
            'caseList.*.gradient' => ['nullable', 'string', 'max:500'],
            'workReel' => ['present', 'array'],
            'workReel.*.src' => $src,
            'workReel.*.href' => ['required', 'string', 'min:1', 'max:2048'],
            'clientLogos' => ['present', 'array'],
            'clientLogos.*.name' => ['nullable', 'string', 'max:200'],
            'clientLogos.*.tight' => $src,
            'clientLogos.*.full' => $src,
            'reelStepS' => ['required', 'numeric', 'gt:0', 'max:10'],
            'about.region' => $src,
            'about.peopleFlag' => $src,
            'about.studio' => $src,
            'about.impact' => $src,
            'storyVideo' => $src,
            'notFoundVideo' => $src,
        ]);

        $tiles = fn (array $list) => array_map(fn ($t) => [
            'src' => $t['src'], 'aspect' => $t['aspect'], 'fit' => $t['fit'], 'tint' => (bool) $t['tint'],
        ], array_values($list));

        SiteContent::put('home', [
            'heroVideo' => $data['heroVideo'],
            'gallery' => [
                'big' => ['src' => $data['gallery']['big']['src'], 'fit' => $data['gallery']['big']['fit'], 'tint' => (bool) $data['gallery']['big']['tint']],
                'start' => $tiles($data['gallery']['start']),
                'mid' => $tiles($data['gallery']['mid']),
                'end' => $tiles($data['gallery']['end']),
            ],
            'caseList' => array_map(fn ($c) => ['video' => $c['video'], 'fit' => $c['fit'], 'gradient' => (string) ($c['gradient'] ?? '')], array_values($data['caseList'])),
            'workReel' => array_map(fn ($w) => ['src' => $w['src'], 'href' => $w['href']], array_values($data['workReel'])),
            'clientLogos' => array_map(fn ($l) => ['name' => (string) ($l['name'] ?? ''), 'tight' => $l['tight'], 'full' => $l['full']], array_values($data['clientLogos'])),
            'reelStepS' => (float) $data['reelStepS'],
            'about' => [
                'region' => $data['about']['region'],
                'peopleFlag' => $data['about']['peopleFlag'],
                'studio' => $data['about']['studio'],
                'impact' => $data['about']['impact'],
            ],
            'storyVideo' => $data['storyVideo'],
            'notFoundVideo' => $data['notFoundVideo'],
        ]);

        return $this->savedAndRevalidated(back(), 'Home media saved.');
    }

    public function texts(): Response
    {
        return Inertia::render('content/texts', ['messages' => SiteContent::get('messages') ?? ['ar' => [], 'en' => []]]);
    }

    /**
     * Texts are next-intl dictionaries (namespaces → keys → strings / lists).
     * The site merges them key by key over its bundled copy, keeping a
     * bundled text wherever the kind differs, so only the shape is checked.
     */
    public function updateTexts(Request $request): RedirectResponse
    {
        $request->validate([
            'messages' => ['required', 'array'],
            'messages.ar' => ['required', 'array'],
            'messages.en' => ['required', 'array'],
        ]);

        // Empty inputs arrive as null (ConvertEmptyStringsToNull): they are empty texts.
        $blank = function (mixed $v) use (&$blank): mixed {
            return is_array($v) ? array_map($blank, $v) : ($v ?? '');
        };
        $messages = ['ar' => $blank($request->input('messages.ar')), 'en' => $blank($request->input('messages.en'))];
        foreach ($messages as $locale => $dict) {
            if (array_is_list($dict) && $dict !== []) {
                return back()->withErrors(["messages.{$locale}" => 'Must be an object of namespaces.']);
            }
            if ($bad = $this->badLeaf($dict, $locale)) {
                return back()->withErrors(['messages' => "Unsupported value at {$bad}: texts can only be strings, lists or groups."]);
            }
        }

        SiteContent::put('messages', [
            'ar' => $messages['ar'] === [] ? new \stdClass : $messages['ar'],
            'en' => $messages['en'] === [] ? new \stdClass : $messages['en'],
        ]);

        return $this->savedAndRevalidated(back(), 'Texts saved.');
    }

    private function badLeaf(mixed $value, string $path): ?string
    {
        if (is_string($value)) {
            return null;
        }
        if (is_array($value)) {
            foreach ($value as $k => $v) {
                if ($bad = $this->badLeaf($v, "{$path}.{$k}")) {
                    return $bad;
                }
            }

            return null;
        }

        // Numbers / booleans come back as strings from forms anyway; null is not a text.
        return is_int($value) || is_float($value) || is_bool($value) ? null : $path;
    }

    public function contact(): Response
    {
        return Inertia::render('content/contact', ['contact' => SiteContent::get('contact')]);
    }

    public function updateContact(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'phone' => ['nullable', 'string', 'max:64'],
            'whatsappNumber' => ['required', 'regex:/^\d{6,16}$/'],
            'heroVideo' => ['required', 'string', 'min:1', 'max:2048'],
            'mapUrl' => ['required', 'url', 'max:2048'],
            'socials' => ['present', 'array'],
            'socials.*.platform' => ['required', 'string', 'min:1', 'max:64'],
            'socials.*.url' => ['nullable', 'string', 'max:2048'],
        ], [
            'whatsappNumber.regex' => 'Digits only, with the country code (e.g. 9665XXXXXXXX).',
        ]);

        SiteContent::put('contact', [
            'email' => $data['email'],
            'phone' => (string) ($data['phone'] ?? ''),
            'whatsappNumber' => $data['whatsappNumber'],
            'heroVideo' => $data['heroVideo'],
            'mapUrl' => $data['mapUrl'],
            'socials' => array_map(fn ($s) => ['platform' => $s['platform'], 'url' => (string) ($s['url'] ?? '')], array_values($data['socials'])),
        ]);

        return $this->savedAndRevalidated(back(), 'Contact info saved.');
    }

    public function policy(): Response
    {
        return Inertia::render('content/policy', ['policy' => SiteContent::get('policy')]);
    }

    public function updatePolicy(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'ar' => ['required', 'array'],
            'ar.updated' => ['nullable', 'string', 'max:100'],
            'ar.title' => ['required', 'string', 'max:200'],
            'ar.html' => ['required', 'string'],
            // English is optional: null hides the English policy (the site shows Arabic).
            'en' => ['nullable', 'array'],
            'en.updated' => ['nullable', 'string', 'max:100'],
            'en.title' => ['required_with:en', 'nullable', 'string', 'max:200'],
            'en.html' => ['required_with:en', 'nullable', 'string'],
        ]);

        $one = fn (array $p) => [
            'updated' => (string) ($p['updated'] ?? ''),
            'title' => (string) $p['title'],
            'html' => PolicyHtml::clean((string) $p['html']),
        ];

        SiteContent::put('policy', [
            'ar' => $one($data['ar']),
            'en' => ! empty($data['en']) ? $one($data['en']) : null,
        ]);

        return $this->savedAndRevalidated(back(), 'Privacy policy saved.');
    }
}
