<?php

namespace App\Support;

/**
 * Server side of the block contract (resources/js/contracts/blocks.ts):
 * defaults and validation rules, so what is stored always parses on the site.
 */
class Blocks
{
    public const TYPES = ['text', 'image', 'video', 'grid', 'embed'];

    public const SPACING = ['none', 'sm', 'md', 'lg'];

    private const FRAME_DEFAULTS = [
        'hidden' => false,
        'background' => null,
        'spacingTop' => 'md',
        'spacingBottom' => 'md',
        'width' => 'contained',
    ];

    private const TYPE_DEFAULTS = [
        'text' => ['title' => '', 'body' => '', 'align' => 'start'],
        'image' => ['caption' => ''],
        'video' => ['poster' => null, 'mode' => 'loop', 'caption' => ''],
        'grid' => ['perRow' => 2, 'gap' => 16],
        'embed' => ['caption' => ''],
    ];

    /** Content keys of each type, besides the frame and `media` / `items`. */
    private const TYPE_KEYS = [
        'text' => ['title', 'body', 'align'],
        'image' => ['media', 'caption'],
        'video' => ['media', 'poster', 'mode', 'caption'],
        'grid' => ['items', 'perRow', 'gap'],
        'embed' => ['url', 'caption'],
    ];

    /**
     * Fills in every default, as the site's Zod schema would, and drops keys
     * the block's type does not have.
     */
    public static function normalize(array $block): array
    {
        $type = $block['type'] ?? 'text';
        $keep = array_flip(['id', 'type', ...array_keys(self::FRAME_DEFAULTS), ...(self::TYPE_KEYS[$type] ?? [])]);
        $block = array_intersect_key(array_replace(self::FRAME_DEFAULTS, self::TYPE_DEFAULTS[$type] ?? [], $block), $keep);
        $block['hidden'] = (bool) $block['hidden'];
        foreach (['perRow', 'gap'] as $int) {
            if (isset($block[$int])) {
                $block[$int] = (int) $block[$int];
            }
        }
        if (($block['background'] ?? null) === '') {
            $block['background'] = null;
        }
        if (($block['poster'] ?? null) === '') {
            $block['poster'] = null;
        }
        $block['id'] = (string) ($block['id'] ?? '') ?: $type.'-'.bin2hex(random_bytes(4));

        foreach (['title', 'body', 'caption'] as $text) {
            if (array_key_exists($text, $block) && $block[$text] === null) {
                $block[$text] = '';
            }
        }
        if (isset($block['media']) && is_array($block['media'])) {
            $block['media'] = self::media($block['media']);
        }
        if (isset($block['items']) && is_array($block['items'])) {
            $block['items'] = array_map(self::media(...), array_values($block['items']));
        }

        return $block;
    }

    private static function media(array $m): array
    {
        $m = array_intersect_key($m + ['alt' => ''], array_flip(['src', 'width', 'height', 'alt']));
        $m['alt'] ??= '';
        foreach (['width', 'height'] as $k) {
            if (isset($m[$k])) {
                $m[$k] = (int) $m[$k];
            }
        }

        return $m;
    }

    /** @param  array<int, mixed>  $blocks */
    public static function normalizeAll(array $blocks): array
    {
        return array_values(array_map(self::normalize(...), array_filter($blocks, 'is_array')));
    }

    /**
     * Laravel validation rules for `blocks.*`, built from the submitted
     * blocks so each one is checked against its own type.
     */
    public static function rules(array $blocks, string $prefix = 'blocks'): array
    {
        $rules = [$prefix => ['array']];
        foreach (array_values($blocks) as $i => $block) {
            $p = "{$prefix}.{$i}";
            $rules += [
                $p => ['array'],
                "{$p}.id" => ['required', 'string', 'min:1'],
                "{$p}.type" => ['required', 'in:'.implode(',', self::TYPES)],
                "{$p}.hidden" => ['boolean'],
                "{$p}.background" => ['nullable', 'string', 'max:64'],
                "{$p}.spacingTop" => ['in:'.implode(',', self::SPACING)],
                "{$p}.spacingBottom" => ['in:'.implode(',', self::SPACING)],
                "{$p}.width" => ['in:contained,full'],
            ];
            $rules += match (is_array($block) ? ($block['type'] ?? null) : null) {
                'text' => [
                    "{$p}.title" => ['nullable', 'string'],
                    "{$p}.body" => ['nullable', 'string'],
                    "{$p}.align" => ['in:start,center'],
                ],
                'image' => self::mediaRules("{$p}.media") + ["{$p}.caption" => ['nullable', 'string']],
                'video' => self::mediaRules("{$p}.media") + [
                    "{$p}.poster" => ['nullable', 'string'],
                    "{$p}.mode" => ['in:loop,player'],
                    "{$p}.caption" => ['nullable', 'string'],
                ],
                'grid' => [
                    "{$p}.items" => ['required', 'array', 'min:1'],
                    "{$p}.items.*.src" => ['required', 'string', 'min:1'],
                    "{$p}.items.*.width" => ['required', 'integer', 'min:1'],
                    "{$p}.items.*.height" => ['required', 'integer', 'min:1'],
                    "{$p}.items.*.alt" => ['nullable', 'string'],
                    "{$p}.perRow" => ['integer', 'min:1', 'max:4'],
                    "{$p}.gap" => ['integer', 'min:0', 'max:64'],
                ],
                'embed' => ["{$p}.url" => ['required', 'url'], "{$p}.caption" => ['nullable', 'string']],
                default => [],
            };
        }

        return $rules;
    }

    private static function mediaRules(string $m): array
    {
        return [
            $m => ['required', 'array'],
            "{$m}.src" => ['required', 'string', 'min:1'],
            "{$m}.width" => ['required', 'integer', 'min:1'],
            "{$m}.height" => ['required', 'integer', 'min:1'],
            "{$m}.alt" => ['nullable', 'string'],
        ];
    }
}
