<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\Invitation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class UsersTest extends TestCase
{
    use RefreshDatabase;

    public function test_inviting_sends_a_link_that_sets_the_password_and_signs_in(): void
    {
        Notification::fake();
        $admin = User::factory()->create();

        $this->actingAs($admin)->post('/users', [
            'name' => 'ريم', 'email' => 'reem@example.com', 'permissions' => ['projects', 'media'],
        ])->assertSessionHas('success');

        $invited = User::where('email', 'reem@example.com')->firstOrFail();
        $this->assertNotNull($invited->invited_at);
        $this->assertSame(['projects', 'media'], $invited->permissions);

        $token = null;
        Notification::assertSentTo($invited, Invitation::class, function (Invitation $n) use ($invited, &$token) {
            $url = $n->toMail($invited)->actionUrl;
            $token = basename(parse_url($url, PHP_URL_PATH));

            return str_contains($url, '/invitation/');
        });

        auth()->logout();
        $this->get("/invitation/{$token}?email=reem@example.com")->assertOk();
        $this->post('/invitation', [
            'token' => $token, 'email' => 'reem@example.com', 'password' => 'new-password-123', 'password_confirmation' => 'new-password-123',
        ])->assertRedirect('/dashboard');

        $this->assertAuthenticatedAs($invited);
        $this->assertNull($invited->fresh()->invited_at);
    }

    public function test_a_bad_invitation_token_is_refused(): void
    {
        $user = User::factory()->create(['invited_at' => now()]);

        $this->post('/invitation', [
            'token' => 'nope', 'email' => $user->email, 'password' => 'new-password-123', 'password_confirmation' => 'new-password-123',
        ])->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_sections_need_their_permission(): void
    {
        $user = User::factory()->create(['permissions' => ['projects']]);

        $this->actingAs($user)->get('/projects')->assertOk();
        $this->actingAs($user)->get('/inbox')->assertForbidden();
        $this->actingAs($user)->get('/media')->assertForbidden();
        $this->actingAs($user)->get('/site/home')->assertForbidden();
        $this->actingAs($user)->get('/users')->assertForbidden();
        // The project editor's media picker still works.
        $this->actingAs($user)->getJson('/media/list')->assertOk();
    }

    public function test_permissions_can_be_changed(): void
    {
        $admin = User::factory()->create();
        $other = User::factory()->create(['permissions' => ['projects']]);

        $this->actingAs($admin)->patch("/users/{$other->id}", ['permissions' => ['inbox', 'site']])->assertSessionHas('success');

        $this->assertSame(['site', 'inbox'], $other->fresh()->permissions);
    }

    public function test_nobody_removes_their_own_user_management(): void
    {
        $admin = User::factory()->create();

        $this->actingAs($admin)->patch("/users/{$admin->id}", ['permissions' => ['projects']])->assertSessionHas('error');
        $this->assertTrue($admin->fresh()->hasPermission('users'));
    }

    public function test_the_last_user_manager_cannot_be_removed(): void
    {
        $admin = User::factory()->create();
        // Can manage users only through this one admin; a second, limited user tries nothing here.
        $this->actingAs($admin)->delete("/users/{$admin->id}")->assertSessionHas('error');
        $this->assertNotNull($admin->fresh());
    }

    public function test_a_user_can_be_removed(): void
    {
        $admin = User::factory()->create();
        $other = User::factory()->create(['permissions' => ['inbox']]);

        $this->actingAs($admin)->delete("/users/{$other->id}")->assertSessionHas('success');
        $this->assertNull($other->fresh());
    }
}
