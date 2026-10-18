<?php

use App\Support\HomeCarryOver;
use App\Support\SiteContent;
use Illuminate\Database\Migrations\Migration;

/**
 * The home work reel now lists projects (home.workReelIds) instead of
 * hand-entered image / title / link rows. Rows whose link is a project
 * page (/work/{slug}) carry over as that project, in the same order.
 */
return new class extends Migration
{
    public function up(): void
    {
        HomeCarryOver::workReel();
    }

    public function down(): void
    {
        $home = SiteContent::get('home');
        if ($home !== null) {
            unset($home['workReelIds']);
            SiteContent::put('home', $home);
        }
    }
};
