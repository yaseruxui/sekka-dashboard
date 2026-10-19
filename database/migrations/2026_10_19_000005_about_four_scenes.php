<?php

use App\Models\Setting;
use App\Support\SiteContent;
use Illuminate\Database\Migrations\Migration;

/**
 * The about film shows four scenes: the first three as they were, then one
 * last scene that starts from the old impact scene (the team, impact and
 * partners scenes were merged). Its closing line is gone.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (($messages = SiteContent::get('messages')) !== null) {
            SiteContent::put('messages', $this->fourScenes($messages));
        }

        $defaults = Setting::getValue('defaults');
        if (is_array($defaults) && isset($defaults['messages'])) {
            $defaults['messages'] = $this->fourScenes($defaults['messages']);
            Setting::setValue('defaults', $defaults);
        }
    }

    private function fourScenes(array $messages): array
    {
        foreach (array_keys($messages) as $locale) {
            $scenes = data_get($messages, "{$locale}.home.about.scenes");
            if (is_array($scenes) && count($scenes) > 4) {
                $scenes = array_values($scenes);
                data_set($messages, "{$locale}.home.about.scenes", [$scenes[0], $scenes[1], $scenes[2], $scenes[4]]);
            }
            data_forget($messages, "{$locale}.home.about.closing");
        }

        return $messages;
    }

    public function down(): void
    {
        //
    }
};
