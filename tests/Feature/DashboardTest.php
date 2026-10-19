<?php

namespace Tests\Feature;

use App\Models\ContactMessage;
use App\Models\Setting;
use App\Models\User;
use App\Support\SiteContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_authenticated_users_can_visit_the_dashboard()
    {
        $this->actingAs($user = User::factory()->create());

        $this->get('/dashboard')->assertOk();
    }

    public function test_the_overview_counts_messages_edits_and_site_status()
    {
        $this->withoutVite();
        $this->travelTo(now()->startOfDay()->addHours(12));
        $make = fn (string $status, $at) => ContactMessage::forceCreate(['name' => 'س', 'company' => '', 'email' => 'a@b.co', 'status' => $status, 'created_at' => $at, 'updated_at' => $at]);
        $make('new', now());
        $make('replied', now()->subDays(3));
        $make('spam', now());
        $make('closed', now()->subDays(40));
        SiteContent::put('home', ['maintenance' => true]);
        Setting::setValue('section_meta', [
            'home.hero' => ['at' => now()->subHour()->toIso8601String(), 'by' => 'محمد'],
            'menu.footer' => ['at' => now()->subDays(2)->toIso8601String(), 'by' => 'سارة'],
        ]);

        $this->actingAs(User::factory()->create())->get('/dashboard')->assertInertia(fn ($p) => $p
            ->where('messages.last30', 2)
            ->where('messages.previous30', 1)
            ->where('messages.byStatus.new', 1)
            ->where('messages.byStatus.replied', 1)
            ->missing('messages.byStatus.spam')
            ->has('messages.days', 30)
            ->where('messages.days.29.count', 1)
            ->where('site.maintenance', true)
            ->where('recentEdits.0.section', 'home.hero')
            ->where('recentEdits.0.by', 'محمد')
            ->has('recentEdits', 2));

        // No inbox permission: no message numbers.
        $this->actingAs(User::factory()->create(['permissions' => ['site']]))->get('/dashboard')
            ->assertInertia(fn ($p) => $p->where('messages', null)->has('recentEdits', 2));
    }
}
