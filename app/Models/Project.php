<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    public const ASPECTS = ['4:5', '16:9', '9:16', '1:1', '3:4', '21:9'];

    protected $fillable = ['slug', 'title', 'summary', 'category', 'year', 'cover', 'preview', 'aspect', 'blocks', 'position', 'published'];

    protected $casts = [
        'blocks' => 'array',
        'published' => 'boolean',
        'position' => 'integer',
    ];

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('position')->orderBy('id');
    }

    /** The project as the site's projectSchema expects it. */
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
}
