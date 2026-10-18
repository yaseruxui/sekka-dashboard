<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD, if set.
     */
    public function run(): void
    {
        $admin = config('sekka.admin');
        if (! $admin['email'] || ! $admin['password']) {
            $this->command?->warn('ADMIN_EMAIL / ADMIN_PASSWORD not set: no admin created (use `php artisan sekka:admin`).');

            return;
        }

        // Never overwrite an existing account (it runs on every deploy); reset with `sekka:admin`.
        User::firstOrCreate(
            ['email' => $admin['email']],
            ['name' => $admin['name'], 'password' => Hash::make($admin['password']), 'email_verified_at' => now()],
        );
    }
}
