<?php

use App\Models\Setting;
use Illuminate\Database\Migrations\Migration;

/**
 * The site's bundled maintenance texts, added to the imported defaults so the
 * editor shows them as the original text (the import ran before they existed).
 */
return new class extends Migration
{
    private const TEXTS = [
        'ar' => ['eyebrow' => 'صيانة', 'title' => 'الموقع قيد الصيانـة', 'body' => 'نجهّز شيئاً أفضل، ونعود قريباً.', 'cta' => 'تواصل معنا'],
        'en' => ['eyebrow' => 'Maintenance', 'title' => 'We’re under maintenance', 'body' => 'We’re making something better and will be back soon.', 'cta' => 'Get in touch'],
    ];

    public function up(): void
    {
        $defaults = Setting::getValue('defaults');
        if (! is_array($defaults) || ! isset($defaults['messages'])) {
            return;
        }
        foreach (self::TEXTS as $locale => $texts) {
            if (! data_get($defaults, "messages.{$locale}.common.maintenance")) {
                data_set($defaults, "messages.{$locale}.common.maintenance", $texts);
            }
        }
        Setting::setValue('defaults', $defaults);
    }

    public function down(): void
    {
        //
    }
};
