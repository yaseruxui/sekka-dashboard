<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $fillable = ['name', 'position'];

    /** @return list<string> */
    public static function names(): array
    {
        return static::orderBy('position')->orderBy('id')->pluck('name')->all();
    }

    /** Makes sure the given names exist (e.g. after an import). */
    public static function ensure(iterable $names): void
    {
        $next = (int) static::max('position');
        foreach ($names as $name) {
            $name = trim((string) $name);
            if ($name !== '' && ! static::where('name', $name)->exists()) {
                static::create(['name' => $name, 'position' => ++$next]);
            }
        }
    }
}
