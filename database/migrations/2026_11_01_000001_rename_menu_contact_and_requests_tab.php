<?php

use App\Models\Setting;
use Illuminate\Database\Migrations\Migration;

/**
 * The site renamed two Arabic texts: the menu's contact line («تواصل معنا» →
 * «اتصل بنا», so the menu's lines need less kashida to match) and the contact
 * page's form tab («الاستفسارات» → «الطلبات»). The originals the editor shows
 * follow, and so does a saved text that was still the old wording; a text
 * someone changed to something else is left alone.
 */
return new class extends Migration
{
    private const RENAMES = [
        'navigation.contact' => ['تواصل معنا', 'اتصل بنا'],
        'contact.tabs.contact' => ['الاستفسارات', 'الطلبات'],
    ];

    public function up(): void
    {
        $this->apply(fn ($old, $new) => [$old, $new]);
    }

    public function down(): void
    {
        $this->apply(fn ($old, $new) => [$new, $old]);
    }

    private function apply(callable $direction): void
    {
        $defaults = Setting::getValue('defaults');
        if (is_array($defaults) && isset($defaults['messages'])) {
            $defaults['messages'] = $this->rename($defaults['messages'], $direction);
            Setting::setValue('defaults', $defaults);
        }
        $messages = Setting::getValue('messages');
        if (is_array($messages)) {
            Setting::setValue('messages', $this->rename($messages, $direction));
        }
    }

    private function rename(array $messages, callable $direction): array
    {
        foreach (self::RENAMES as $key => $pair) {
            [$from, $to] = $direction(...$pair);
            if (data_get($messages, "ar.{$key}") === $from) {
                data_set($messages, "ar.{$key}", $to);
            }
        }

        return $messages;
    }
};
