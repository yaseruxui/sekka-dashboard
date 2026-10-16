<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Media extends Model
{
    protected $fillable = ['path', 'url', 'name', 'mime', 'size', 'width', 'height', 'alt'];

    protected $casts = ['size' => 'integer', 'width' => 'integer', 'height' => 'integer'];

    protected $appends = ['kind'];

    public function getKindAttribute(): string
    {
        return match (true) {
            str_starts_with($this->mime, 'image/') => 'image',
            str_starts_with($this->mime, 'video/') => 'video',
            default => 'file',
        };
    }
}
