<?php

use App\Models\Project;
use App\Support\SiteContent;
use Illuminate\Database\Migrations\Migration;

/**
 * One-time carry-over of the edits made in the local dashboard before it moved
 * to Vercel, where the database started again from the site's bundled content.
 * Each value is only replaced while it still holds that bundled text, so an
 * edit made since is kept. Does nothing on a database without content.
 */
return new class extends Migration
{
    private const TEXTS = [
        'policy' => [
            'ar.title' => ['سياسة الخصوصية لموقع سكة', 'سياسة الخصوصية لموقع سكـة'],
        ],
        'messages' => [
            'ar.home.heroEyebrow' => ['وكالة إبداعية رائدة', 'وكالة إبداعـية رائدة'],
            'ar.home.introTitle' => ["نحن سكـة.\u{a0}<br />وكالة إبداعية للحلول التسويقيـة.", '<em>نحن سكــة</em><br>وكالة إبداعية للحلول التسويقيـة.'],
            'ar.home.galleryTitle' => ['نصنع أثراً تفاعليـاً<br />يتجاوز حدود التصميـم المألوف', 'نصنع <em>أثراً تفاعليـاً</em><br>يتجاوز حدود التصميـم المألوف'],
        ],
    ];

    public function up(): void
    {
        foreach (self::TEXTS as $section => $edits) {
            $content = SiteContent::get($section);
            if ($content === null) {
                continue;
            }
            foreach ($edits as $path => [$bundled, $edited]) {
                if (data_get($content, $path) === $bundled) {
                    data_set($content, $path, $edited);
                }
            }
            SiteContent::put($section, $content);
        }

        // Chaos campaign: the "result" text block was moved above the closing video.
        $project = Project::where('slug', 'chaos-campaign')->first();
        $blocks = $project?->blocks ?? [];
        if (($blocks[5]['id'] ?? null) === 'video-6' && ($blocks[6]['id'] ?? null) === 'text-7') {
            [$blocks[5], $blocks[6]] = [$blocks[6], $blocks[5]];
            $project->update(['blocks' => $blocks]);
        }
    }

    public function down(): void
    {
        //
    }
};
