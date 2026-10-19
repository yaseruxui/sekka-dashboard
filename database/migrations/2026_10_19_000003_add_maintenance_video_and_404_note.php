<?php

use App\Models\Setting;
use App\Support\SiteContent;
use Illuminate\Database\Migrations\Migration;

/**
 * The maintenance screen starts on the 404 film (so the editor shows it), and
 * the 404 page's new note joins the imported defaults as its original text.
 */
return new class extends Migration
{
    private const NOTE = [
        'ar' => 'ربما تغيّر الرابط أو لم يعد موجوداً.',
        'en' => 'The link may have changed or no longer exists.',
    ];

    public function up(): void
    {
        if (($home = SiteContent::get('home')) !== null && empty($home['maintenanceVideo']) && ! empty($home['notFoundVideo'])) {
            $home['maintenanceVideo'] = $home['notFoundVideo'];
            SiteContent::put('home', $home);
        }

        $defaults = Setting::getValue('defaults');
        if (! is_array($defaults) || ! isset($defaults['messages'])) {
            return;
        }
        foreach (self::NOTE as $locale => $text) {
            if (! data_get($defaults, "messages.{$locale}.common.notFound.body")) {
                data_set($defaults, "messages.{$locale}.common.notFound.body", $text);
            }
        }
        Setting::setValue('defaults', $defaults);
    }

    public function down(): void
    {
        //
    }
};
