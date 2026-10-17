<?php

use App\Models\Project;
use App\Models\Setting;
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
        $home = SiteContent::get('home');
        if ($home === null || isset($home['workReelIds'])) {
            return;
        }
        $bySlug = Project::pluck('id', 'slug');
        // The reel's English titles name the projects; keep them where a project has no English name yet.
        $defaults = Setting::getValue('defaults', []);
        $enTiles = data_get(SiteContent::get('messages'), 'en.home.workReel.tiles') ?? data_get($defaults, 'messages.en.home.workReel.tiles') ?? [];
        $ids = [];
        foreach ($home['workReel'] ?? [] as $i => $row) {
            $id = preg_match('#^/work/([^/?\#]+)#', (string) ($row['href'] ?? ''), $m) ? $bySlug->get($m[1]) : null;
            if (! $id || in_array($id, $ids, true)) {
                continue;
            }
            $ids[] = $id;
            if (filled($enTiles[$i] ?? null)) {
                Project::whereKey($id)->where(fn ($q) => $q->whereNull('title_en')->orWhere('title_en', ''))->update(['title_en' => $enTiles[$i]]);
            }
        }
        SiteContent::put('home', [...$home, 'workReelIds' => $ids]);
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
