<?php

use App\Models\Setting;
use App\Support\ContentRules;
use App\Support\SiteContent;
use Illuminate\Database\Migrations\Migration;

/**
 * Client logos become one file each: the cropped copy stays, the padded one
 * (only the story reel used it) goes, in the saved home and the defaults.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (($home = SiteContent::get('home')) !== null) {
            SiteContent::put('home', ContentRules::upgradeHome($home));
        }

        $defaults = Setting::getValue('defaults');
        if (is_array($defaults) && isset($defaults['home'])) {
            $defaults['home'] = ContentRules::upgradeHome($defaults['home']);
            Setting::setValue('defaults', $defaults);
        }
    }

    public function down(): void
    {
        //
    }
};
