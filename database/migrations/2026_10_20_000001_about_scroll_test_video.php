<?php

use App\Support\SiteContent;
use Illuminate\Database\Migrations\Migration;

/**
 * Points the about section at the site's test film (public/media/about on
 * the site) so its scroll mode can be seen before the real film is ready.
 * Only when no film is set; remove or replace it from the editor.
 */
return new class extends Migration
{
    public function up(): void
    {
        $home = SiteContent::get('home');
        if ($home === null || ! empty($home['about']['video']) || empty($home['about'])) {
            return;
        }
        $home['about']['video'] = '/media/about/scroll-test.mp4';
        SiteContent::put('home', $home);
    }

    public function down(): void
    {
        //
    }
};
