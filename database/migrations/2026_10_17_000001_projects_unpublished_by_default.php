<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A project the code creates without saying otherwise must not go live:
 * the dashboard and the importer always pass `published` explicitly, so
 * this only changes what a stray insert does. Existing rows keep their value.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->boolean('published')->default(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->boolean('published')->default(true)->change();
        });
    }
};
