<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Crypt;
use Throwable;

/**
 * SMTP settings edited from the dashboard (Settings → Email), stored in the
 * `mail` setting with the password encrypted. When enabled they override the
 * .env mail config for the request; when not, .env applies as before.
 */
class MailSettings
{
    public const KEY = 'mail';

    /** @return array{enabled: bool, host: string, port: int, username: string, password: string, encryption: string, from_address: string, from_name: string} */
    public static function get(): array
    {
        $s = (array) Setting::getValue(self::KEY, []);

        return [
            'enabled' => (bool) ($s['enabled'] ?? false),
            'host' => (string) ($s['host'] ?? ''),
            'port' => (int) ($s['port'] ?? 587),
            'username' => (string) ($s['username'] ?? ''),
            'password' => self::decrypt($s['password'] ?? ''),
            'encryption' => (string) ($s['encryption'] ?? 'tls'),
            'from_address' => (string) ($s['from_address'] ?? ''),
            'from_name' => (string) ($s['from_name'] ?? 'سكة'),
        ];
    }

    /** $password null keeps the saved one. */
    public static function save(array $data, ?string $password): void
    {
        $current = (array) Setting::getValue(self::KEY, []);
        Setting::setValue(self::KEY, [
            ...$data,
            'password' => $password === null ? ($current['password'] ?? '') : Crypt::encryptString($password),
        ]);
    }

    /** Point Laravel's mailer at the saved SMTP server (called on boot). */
    public static function apply(): void
    {
        try {
            $s = self::get();
        } catch (Throwable) {
            return; // e.g. before migrations ran
        }
        if (! $s['enabled'] || $s['host'] === '') {
            return;
        }

        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => $s['host'],
            'mail.mailers.smtp.port' => $s['port'],
            'mail.mailers.smtp.username' => $s['username'] ?: null,
            'mail.mailers.smtp.password' => $s['password'] ?: null,
            'mail.mailers.smtp.scheme' => $s['encryption'] === 'ssl' ? 'smtps' : null,
            'mail.from.address' => $s['from_address'] ?: config('mail.from.address'),
            'mail.from.name' => $s['from_name'] ?: config('mail.from.name'),
        ]);
    }

    private static function decrypt(string $value): string
    {
        if ($value === '') {
            return '';
        }
        try {
            return Crypt::decryptString($value);
        } catch (Throwable) {
            return '';
        }
    }
}
