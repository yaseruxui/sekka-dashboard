<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Key / JSON value store for the site content sections.
 */
class Setting extends Model
{
    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];

    protected $casts = ['value' => 'array'];

    public static function getValue(string $key, mixed $default = null): mixed
    {
        return static::find($key)?->value ?? $default;
    }

    public static function setValue(string $key, mixed $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
    }
}
