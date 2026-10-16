<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Per-section permissions (User::PERMISSIONS), and invitations: `invited_at`
 * is set until the invited user picks a password. Everyone who exists today
 * keeps full access.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('permissions')->nullable()->after('password');
            $table->timestamp('invited_at')->nullable()->after('permissions');
        });
        DB::table('users')->update(['permissions' => json_encode(User::PERMISSIONS)]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['permissions', 'invited_at']);
        });
    }
};
