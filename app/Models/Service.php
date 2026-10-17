<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A service the agency offers. The home page's services section shows the
 * ones picked there (home.serviceIds), in that order; clicking one opens a
 * WhatsApp chat naming it. Titles may hold <br> / <em>.
 */
class Service extends Model
{
    public const FITS = ['cover', 'contain', 'backdrop', 'backdrop-s'];

    protected $fillable = ['title', 'title_en', 'subtitle', 'subtitle_en', 'video', 'fit'];

    /** The site's shape for one service card (both languages). */
    public function toContract(): array
    {
        return [
            'id' => $this->id,
            'title' => ['ar' => $this->title, 'en' => $this->title_en ?: $this->title],
            'subtitle' => ['ar' => (string) $this->subtitle, 'en' => (string) ($this->subtitle_en ?: $this->subtitle)],
            'video' => $this->video,
            'fit' => $this->fit,
        ];
    }
}
