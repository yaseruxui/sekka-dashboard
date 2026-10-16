<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\MailSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class NotificationsTest extends TestCase
{
    use RefreshDatabase;

    private function enquiry(): void
    {
        $this->postJson('/api/contact?key=test-contact-key', ['name' => 'سارة', 'email' => 'sara@example.com', 'message' => 'نريد حملة'])->assertCreated();
    }

    public function test_new_enquiry_lands_in_the_bell(): void
    {
        $this->withoutVite();
        $agent = User::factory()->create(['permissions' => ['inbox']]);
        $this->enquiry();

        $this->actingAs($agent)->get('/dashboard')->assertInertia(fn ($page) => $page
            ->where('notifications.unread', 1)
            ->where('notifications.items.0.title', 'طلب تواصل جديد من سارة'));

        $id = $agent->notifications()->first()->id;
        $this->actingAs($agent)->get("/notifications/{$id}")->assertRedirectContains('/inbox?open=');
        $this->assertSame(0, $agent->unreadNotifications()->count());
    }

    public function test_bell_survives_a_mail_failure(): void
    {
        $agent = User::factory()->create(['permissions' => ['inbox']]);
        config(['mail.default' => 'smtp', 'mail.mailers.smtp.host' => 'unreachable.invalid', 'mail.mailers.smtp.port' => 1]);

        $this->enquiry();

        $this->assertSame(1, $agent->notifications()->count());
    }

    public function test_read_all(): void
    {
        $agent = User::factory()->create(['permissions' => ['inbox']]);
        $this->enquiry();
        $this->enquiry();

        $this->actingAs($agent)->post('/notifications/read-all');
        $this->assertSame(0, $agent->unreadNotifications()->count());
    }

    public function test_others_notifications_are_not_reachable(): void
    {
        $agent = User::factory()->create(['permissions' => ['inbox']]);
        $other = User::factory()->create(['permissions' => ['projects']]);
        $this->enquiry();

        $this->actingAs($other)->get('/notifications/'.$agent->notifications()->first()->id)->assertNotFound();
    }

    public function test_mail_settings_are_admin_only_and_keep_the_password(): void
    {
        $this->withoutVite();
        $admin = User::factory()->create();
        $agent = User::factory()->create(['permissions' => ['inbox']]);
        $form = ['enabled' => true, 'host' => 'smtp.example.com', 'port' => 587, 'username' => 'me', 'password' => 'secret', 'encryption' => 'tls', 'from_address' => 'hello@example.com', 'from_name' => 'سكة'];

        $this->actingAs($agent)->get('/settings/mail')->assertForbidden();
        $this->actingAs($agent)->put('/settings/mail', $form)->assertForbidden();

        $this->actingAs($admin)->put('/settings/mail', $form)->assertSessionHas('success');
        $this->actingAs($admin)->put('/settings/mail', [...$form, 'password' => ''])->assertSessionHas('success');
        $this->assertSame('secret', MailSettings::get()['password']);

        $this->actingAs($admin)->get('/settings/mail')->assertInertia(fn ($page) => $page
            ->where('settings.password', '')
            ->where('settings.hasPassword', true));

        MailSettings::apply();
        $this->assertSame('smtp', config('mail.default'));
        $this->assertSame('smtp.example.com', config('mail.mailers.smtp.host'));
    }

    public function test_test_email_goes_to_the_admin(): void
    {
        Mail::fake();
        $admin = User::factory()->create();

        $this->actingAs($admin)->post('/settings/mail/test')->assertSessionHas('success');
    }
}
