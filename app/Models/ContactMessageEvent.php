<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Activity log entry: status changed, assigned, replied, note added. */
class ContactMessageEvent extends Model
{
    public $timestamps = false;

    protected $fillable = ['user_id', 'type', 'data', 'created_at'];

    protected $casts = ['data' => 'array', 'created_at' => 'datetime'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
