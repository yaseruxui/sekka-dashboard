<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A project as the site reads it (projectSchema), plus its place and publish state.
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->text('summary');
            $table->string('category')->default('');
            $table->string('year', 16)->default('');
            $table->string('cover', 2048)->default('');
            $table->string('preview', 2048)->nullable();
            $table->string('aspect', 8)->default('4:5');
            $table->json('blocks');
            $table->unsignedInteger('position')->default(0)->index();
            $table->boolean('published')->default(true);
            $table->timestamps();
        });

        // Site content sections (home, contact, policy, messages), one JSON value each.
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->json('value');
            $table->timestamps();
        });

        // Uploaded files, with the intrinsic size the site's blocks need.
        Schema::create('media', function (Blueprint $table) {
            $table->id();
            $table->string('path');
            $table->string('url', 2048);
            $table->string('name');
            $table->string('mime', 128);
            $table->unsignedBigInteger('size');
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->string('alt')->default('');
            $table->timestamps();
        });

        // Contact form submissions posted by the site.
        Schema::create('contact_messages', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('company')->default('');
            $table->string('email', 320);
            $table->text('message')->nullable();
            $table->string('estimated_budget')->nullable();
            $table->string('locale', 8)->nullable();
            $table->string('page_uri', 2048)->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('read_at')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_messages');
        Schema::dropIfExists('media');
        Schema::dropIfExists('settings');
        Schema::dropIfExists('projects');
    }
};
