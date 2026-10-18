<?php

use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;

/*
 * There is no public sign-up: admins are created (or have their password
 * reset) from the command line.
 */
Artisan::command('sekka:admin {email} {--name=} {--password=}', function (string $email) {
    $password = $this->option('password') ?: $this->secret('Password (min 8 characters)');
    if (! is_string($password) || strlen($password) < 8) {
        $this->error('The password must be at least 8 characters.');

        return 1;
    }

    $user = User::firstOrNew(['email' => $email]);
    $user->name = $this->option('name') ?: ($user->name ?: 'Sekka Admin');
    $user->password = Hash::make($password);
    $user->email_verified_at ??= now();
    $user->save();

    $this->info(($user->wasRecentlyCreated ? 'Created' : 'Updated')." admin {$email}.");
})->purpose('Create an admin account, or reset its password');

Artisan::command('sekka:deploy', function () {
    $connection = config('database.default');
    if (! config("database.connections.{$connection}.url")) {
        $this->warn("No database URL for [{$connection}]: skipping migrations.");

        return 0;
    }

    return $this->call('migrate', ['--force' => true]) ?: $this->call('db:seed', ['--force' => true]);
})->purpose('Run on each Vercel build: migrate, then create the first admin if missing');
