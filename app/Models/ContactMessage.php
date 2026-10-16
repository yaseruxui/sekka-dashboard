<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContactMessage extends Model
{
    /** Workflow order; `spam` is hidden from the default list. */
    public const STATUSES = ['new', 'in_progress', 'replied', 'closed', 'spam'];

    protected $fillable = ['name', 'company', 'email', 'message', 'estimated_budget', 'locale', 'page_uri', 'submitted_at', 'status'];

    protected $casts = ['submitted_at' => 'datetime'];

    protected $attributes = ['status' => 'new'];

    public function notes(): HasMany
    {
        return $this->hasMany(ContactMessageNote::class)->latest('id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(ContactMessageEvent::class)->latest('id');
    }

    public function log(?User $user, string $type, array $data = []): void
    {
        $this->events()->create(['user_id' => $user?->id, 'type' => $type, 'data' => $data ?: null, 'created_at' => now()]);
    }
}
