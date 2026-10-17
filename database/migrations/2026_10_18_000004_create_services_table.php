<?php

use App\Models\Setting;
use App\Support\SiteContent;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Services get their own table. The ones the home page listed (texts in
 * messages.*.home.caseList.items, clips in home.caseList, paired by position)
 * are carried over, and the home page keeps showing them all, in order.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('title_en')->nullable();
            $table->string('subtitle')->nullable();
            $table->string('subtitle_en')->nullable();
            $table->string('video')->default('');
            $table->string('fit')->default('cover');
            $table->timestamps();
        });

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

    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
