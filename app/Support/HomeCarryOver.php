<?php

namespace App\Support;

use App\Models\Project;
use App\Models\Setting;
use Illuminate\Support\Facades\DB;

/**
 * Builds dashboard records that the home page used to hold as plain content.
 * Run by their migrations and again after `sekka:import-site`, since on a
 * fresh database the migrations run before any content exists. Each step is
 * a no-op once done.
 */
class HomeCarryOver
{
    public static function run(): void
    {
        self::services();
        self::workReel();
    }

    /**
     * The services the home page listed (texts in messages.*.home.caseList.items,
     * clips in home.caseList, paired by position) become rows in `services`, and
     * the home page keeps showing them all, in order.
     */
    public static function services(): void
    {
        if (DB::table('services')->exists()) {
            return;
        }

        $defaults = Setting::getValue('defaults', []);
        $home = SiteContent::get('home') ?? ($defaults['home'] ?? []);
        $messages = SiteContent::get('messages') ?? ($defaults['messages'] ?? []);
        $ar = data_get($messages, 'ar.home.caseList.items') ?? data_get($defaults, 'messages.ar.home.caseList.items') ?? [];
        $en = data_get($messages, 'en.home.caseList.items') ?? data_get($defaults, 'messages.en.home.caseList.items') ?? [];
        $clips = $home['caseList'] ?? [];

        $ids = [];
        foreach ($ar as $i => $item) {
            if (! isset($clips[$i])) {
                break;
            }
            $ids[] = DB::table('services')->insertGetId([
                'title' => (string) ($item['title'] ?? ''),
                'title_en' => $en[$i]['title'] ?? null,
                'subtitle' => $item['subtitle'] ?? null,
                'subtitle_en' => $en[$i]['subtitle'] ?? null,
                'video' => (string) ($clips[$i]['video'] ?? ''),
                'fit' => (string) ($clips[$i]['fit'] ?? 'cover'),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        if ($ids && SiteContent::get('home') !== null) {
            SiteContent::put('home', [...SiteContent::get('home'), 'serviceIds' => $ids]);
        }
    }

    /**
     * The home work reel lists projects (home.workReelIds) instead of hand-entered
     * image / title / link rows. Rows whose link is a project page (/work/{slug})
     * carry over as that project, in the same order.
     */
    public static function workReel(): void
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
}
