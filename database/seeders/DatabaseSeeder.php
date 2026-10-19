<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * The admin from ADMIN_EMAIL / ADMIN_PASSWORD, if set. Runs on every deploy
     * and keeps that account's password equal to ADMIN_PASSWORD, so the env
     * var is the one place it is set (a change made in the dashboard is
     * replaced on the next deploy).
     */
    public function run(): void
    {
        $admin = config('sekka.admin');
        if (! $admin['email'] || ! $admin['password']) {
            $this->command?->warn('ADMIN_EMAIL / ADMIN_PASSWORD not set: no admin created (use `php artisan sekka:admin`).');

            return;
        }

        $user = User::firstOrCreate(
            ['email' => $admin['email']],
            ['name' => $admin['name'], 'password' => Hash::make($admin['password']), 'email_verified_at' => now()],
        );
        if (! Hash::check($admin['password'], $user->password)) {
            $user->forceFill(['password' => Hash::make($admin['password'])])->save();
        }
    }
}
