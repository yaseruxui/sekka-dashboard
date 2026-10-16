<?php

namespace Tests\Feature;

use App\Models\ContactMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InboxTest extends TestCase
{
    use RefreshDatabase;

    /** As sent by the site's features/contact/services/deliver.ts. */
    private function submission(array $overrides = []): array
    {
        return [
            'name' => 'سارة',
            'company' => 'شركة',
            'email' => 'sara@example.com',
            'message' => 'نريد حملة',
            'estimatedBudget' => '50k-100k',
            'locale' => 'ar',
            'pageUri' => 'https://seka-sa.com/ar/contact',
            'submittedAt' => '2026-10-16T09:00:00.000Z',
            ...$overrides,
        ];
    }

    public function test_contact_webhook_needs_the_key(): void
    {
        $this->postJson('/api/contact', $this->submission())->assertUnauthorized();
        $this->postJson('/api/contact?key=wrong', $this->submission())->assertUnauthorized();
        $this->assertSame(0, ContactMessage::count());
    }

    public function test_contact_webhook_is_off_without_a_key(): void
    {
        config(['sekka.contact_webhook_key' => '']);
        $this->postJson('/api/contact?key=', $this->submission())->assertStatus(503);
    }

    public function test_contact_webhook_stores_the_submission(): void
    {
        $this->postJson('/api/contact?key=test-contact-key', $this->submission())->assertCreated()->assertJsonPath('ok', true);

        $m = ContactMessage::first();
        $this->assertSame('sara@example.com', $m->email);
        $this->assertSame('50k-100k', $m->estimated_budget);
        $this->assertSame('2026-10-16 09:00:00', $m->submitted_at->utc()->format('Y-m-d H:i:s'));
        $this->assertNull($m->read_at);
    }

    public function test_contact_webhook_validates(): void
    {
        $this->postJson('/api/contact?key=test-contact-key', $this->submission(['email' => 'nope', 'name' => '']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'name']);
    }

    public function test_inbox_lists_opens_and_marks_messages(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $this->postJson('/api/contact?key=test-contact-key', $this->submission());
        $this->postJson('/api/contact?key=test-contact-key', $this->submission(['name' => 'Omar', 'email' => 'omar@example.com']));
        [$sara, $omar] = ContactMessage::orderBy('id')->get();

        $this->actingAs($user)->get('/inbox?filter=unread')->assertInertia(fn ($page) => $page
            ->component('inbox/index', false)
            ->has('messages.data', 2)
            ->where('unreadMessages', 2));

        $this->actingAs($user)->get("/inbox/{$sara->id}")->assertOk();
        $this->assertNotNull($sara->fresh()->read_at);

        $this->actingAs($user)->get('/inbox?q=omar')->assertInertia(fn ($page) => $page->has('messages.data', 1));

        $this->actingAs($user)->patch("/inbox/{$sara->id}/read", ['read' => false]);
        $this->assertNull($sara->fresh()->read_at);

        $this->actingAs($user)->delete("/inbox/{$omar->id}")->assertRedirect('/inbox');
        $this->assertModelMissing($omar);
    }
}
