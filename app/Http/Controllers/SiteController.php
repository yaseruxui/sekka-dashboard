<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Support\ContentRules;
use App\Support\SiteContent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * "التحكم بالموقع": one screen per site page, made of section cards. Each card
 * saves only its own fields (texts in ar/en, media, contact info, policy);
 * the result is validated as a whole section before it is stored.
 */
class SiteController extends Controller
{
    public const PAGES = ['home', 'work', 'contact', 'policy', 'menu'];

    public function show(string $page): Response
    {
        abort_unless(in_array($page, self::PAGES, true), 404);
        $defaults = Setting::getValue('defaults', []);

        return Inertia::render('site/page', [
            'page' => $page,
            'content' => [
                'home' => SiteContent::get('home') ?? ($defaults['home'] ?? null),
                'contact' => SiteContent::get('contact') ?? ($defaults['contact'] ?? null),
                'policy' => SiteContent::get('policy') ?? ($defaults['policy'] ?? null),
                'messages' => SiteContent::get('messages') ?? ($defaults['messages'] ?? ['ar' => [], 'en' => []]),
            ],
            'defaults' => ['messages' => $defaults['messages'] ?? ['ar' => [], 'en' => []]],
            'meta' => Setting::getValue('section_meta', []),
        ]);
    }

    /**
     * Saves one section card. Body:
     *   section: "home.hero" (for "last updated by")
     *   texts:   { ar: { "home.heroEyebrow": "…" }, en: { … } }  empty → back to the original text
     *   home / contact: { "<dot.path>": value }
     *   policy:  { ar: {…}, en: {…} | null }
     */
    public function update(Request $request): RedirectResponse
    {
        $request->validate([
            'section' => ['required', 'string', 'max:64'],
            'texts' => ['nullable', 'array'],
            'texts.ar' => ['nullable', 'array'],
            'texts.en' => ['nullable', 'array'],
            'home' => ['nullable', 'array'],
            'contact' => ['nullable', 'array'],
            'policy' => ['nullable', 'array'],
        ]);
        $defaults = Setting::getValue('defaults', []);
        $save = [];

        if ($texts = $request->input('texts')) {
            $messages = SiteContent::get('messages') ?? ($defaults['messages'] ?? ['ar' => [], 'en' => []]);
            foreach (['ar', 'en'] as $locale) {
                foreach ((array) ($texts[$locale] ?? []) as $path => $value) {
                    if ($value === null || $value === '') {
                        // Empty: drop it, so the site shows its original text.
                        Arr::forget($messages[$locale], $path);
                    } else {
                        Arr::set($messages[$locale], $path, self::blankNulls($value));
                    }
                }
                if ($bad = ContentRules::badLeaf($messages[$locale] ?? [], $locale)) {
                    throw ValidationException::withMessages(["texts.{$locale}" => "قيمة غير مدعومة في {$bad}."]);
                }
            }
            $save['messages'] = [
                'ar' => ($messages['ar'] ?? []) ?: new \stdClass,
                'en' => ($messages['en'] ?? []) ?: new \stdClass,
            ];
        }

        foreach (['home', 'contact'] as $section) {
            if (! $request->has($section)) {
                continue;
            }
            $doc = SiteContent::get($section) ?? ($defaults[$section] ?? []);
            foreach ((array) $request->input($section) as $path => $value) {
                Arr::set($doc, $path, $value);
            }
            $rules = $section === 'home' ? ContentRules::home("{$section}.") : ContentRules::contact("{$section}.");
            Validator::make([$section => $doc], $rules, self::messages())->validate();
            $save[$section] = $section === 'home' ? ContentRules::normalizeHome($doc) : ContentRules::normalizeContact($doc);
        }

        if ($request->has('policy')) {
            $policy = array_replace(SiteContent::get('policy') ?? ($defaults['policy'] ?? []), (array) $request->input('policy'));
            Validator::make(['policy' => $policy], ContentRules::policy('policy.'), self::messages())->validate();
            $save['policy'] = ContentRules::normalizePolicy($policy);
        }

        foreach ($save as $section => $value) {
            SiteContent::put($section, $value);
        }
        $meta = Setting::getValue('section_meta', []);
        $meta[$request->input('section')] = ['at' => now()->toIso8601String(), 'by' => $request->user()->name];
        Setting::setValue('section_meta', $meta);

        return $this->savedAndRevalidated(back(), 'تم حفظ القسم ونشره على الموقع.');
    }

    private static function blankNulls(mixed $v): mixed
    {
        return is_array($v) ? array_map(self::blankNulls(...), $v) : ($v ?? '');
    }

    private static function messages(): array
    {
        return [
            'contact.whatsappNumber.regex' => 'أرقام فقط مع رمز الدولة، مثل 9665XXXXXXXX.',
        ];
    }
}
