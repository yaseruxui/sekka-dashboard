<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * A project. Its columns are the PUBLISHED version the site reads; the editor
 * autosaves to `draft` until the project is published again.
 */
class Project extends Model
{
    public const ASPECTS = ['4:5', '16:9', '9:16', '1:1', '3:4', '21:9'];

    /** The fields the editor works on (the contract plus the English name). */
    public const EDITABLE = ['slug', 'title', 'title_en', 'summary', 'category', 'year', 'cover', 'preview', 'aspect', 'blocks'];

    protected $fillable = [
        'slug', 'title', 'title_en', 'summary', 'category', 'year', 'cover', 'preview', 'aspect', 'blocks',
        'position', 'published', 'published_at', 'draft', 'draft_saved_at',
    ];

    protected $casts = [
        'blocks' => 'array',
        'draft' => 'array',
        'published' => 'boolean',
        'position' => 'integer',
        'published_at' => 'datetime',
        'draft_saved_at' => 'datetime',
    ];

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('position')->orderBy('id');
    }

    /** The project as the site's projectSchema expects it (published version). */
    public function toContract(): array
    {
        return [
            'slug' => $this->slug,
            'title' => $this->title,
            'summary' => $this->summary,
            'category' => $this->category,
            'year' => $this->year,
            'cover' => $this->cover,
            'preview' => $this->preview ?: null,
            'aspect' => $this->aspect,
            'blocks' => array_values($this->blocks ?? []),
        ];
    }

    /** What the editor shows: the draft if there is one, else the published version. */
    public function workingCopy(): array
    {
        $published = [
            ...$this->only(self::EDITABLE),
            'preview' => $this->preview ?: null,
            'blocks' => array_values($this->blocks ?? []),
        ];

        return $this->draft ? array_replace($published, array_intersect_key($this->draft, $published)) : $published;
    }

    public function hasBeenPublished(): bool
    {
        return $this->published_at !== null;
    }

    /** A slug not used by any other project, based on $base. */
    public static function uniqueSlug(string $base, ?int $ignoreId = null): string
    {
        $base = Str::slug($base) ?: 'project';
        $slug = $base;
        for ($i = 2; static::where('slug', $slug)->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))->exists(); $i++) {
            $slug = "{$base}-{$i}";
        }

        return $slug;
    }
}
