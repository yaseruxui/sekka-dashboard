<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            // Dashboard only: the English name the slug is made from.
            $table->string('title_en')->default('')->after('title');
            // Working copy, autosaved by the editor. The columns above stay the
            // published version the site reads until the project is published.
            $table->json('draft')->nullable();
            $table->timestamp('draft_saved_at')->nullable();
            $table->timestamp('published_at')->nullable();
        });

        // The fields (categories) a project can be filed under.
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        // Projects already live count as published; their fields seed the list.
        DB::table('projects')->where('published', true)->update(['published_at' => DB::raw('updated_at')]);
        $names = DB::table('projects')->where('category', '!=', '')->orderBy('position')->distinct()->pluck('category');
        foreach ($names->values() as $i => $name) {
            DB::table('categories')->insert(['name' => $name, 'position' => $i + 1, 'created_at' => now(), 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['title_en', 'draft', 'draft_saved_at', 'published_at']);
        });
    }
};
