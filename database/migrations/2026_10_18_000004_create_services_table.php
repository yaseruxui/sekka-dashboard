<?php

use App\Support\HomeCarryOver;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
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

        HomeCarryOver::services();
    }

    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
