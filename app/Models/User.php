<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'permissions',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'avatar_path',
    ];

    /** @var list<string> */
    protected $appends = ['avatar'];

    /** Public URL of the profile picture (null: initials are shown). */
    protected function avatar(): Attribute
    {
        return Attribute::get(fn () => $this->avatar_path ? Storage::disk('public')->url($this->avatar_path) : null);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'permissions' => 'array',
            'invited_at' => 'datetime',
        ];
    }

    /**
     * Dashboard sections a user can be given. `users` also means managing
     * other users and their permissions.
     */
    public const PERMISSIONS = ['projects', 'site', 'inbox', 'media', 'users'];

    /** null (e.g. created from the command line): everything. */
    public function hasPermission(string $permission): bool
    {
        return $this->permissions === null || in_array($permission, $this->permissions, true);
    }

    /** @return list<string> */
    public function permissionList(): array
    {
        return array_values(array_filter(self::PERMISSIONS, fn (string $p) => $this->hasPermission($p)));
    }
}
