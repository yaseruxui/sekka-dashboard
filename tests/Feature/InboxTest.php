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

    public function test_inbox_lists_marks_and_deletes_messages(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $this->postJson('/api/contact?key=test-contact-key', $this->submission());
        $this->postJson('/api/contact?key=test-contact-key', $this->submission(['name' => 'Omar', 'email' => 'omar@example.com']));
        [$sara, $omar] = ContactMessage::orderBy('id')->get();

        $this->actingAs($user)->get('/inbox?filter=unread')->assertInertia(fn ($page) => $page
            ->component('inbox/index', false)
            ->has('messages.data', 2)
            ->where('counts.unread', 2)
            ->where('unreadMessages', 2));

        $this->actingAs($user)->patch("/inbox/{$sara->id}/read", ['read' => true]);
        $this->assertNotNull($sara->fresh()->read_at);

        $this->actingAs($user)->get('/inbox?q=omar')->assertInertia(fn ($page) => $page->has('messages.data', 1));

        $this->actingAs($user)->patch("/inbox/{$sara->id}/read", ['read' => false]);
        $this->assertNull($sara->fresh()->read_at);

        $this->actingAs($user)->delete("/inbox/{$omar->id}")->assertSessionHas('success');
        $this->assertModelMissing($omar);
    }

    public function test_export_is_an_excel_friendly_csv(): void
    {
        $this->postJson('/api/contact?key=test-contact-key', $this->submission());

        $csv = $this->actingAs(User::factory()->create())->get('/inbox/export')->assertOk()->streamedContent();

        $this->assertStringStartsWith("\xEF\xBB\xBF", $csv);
        $this->assertStringContainsString('سارة', $csv);
        $this->assertStringContainsString('50k-100k', $csv);
    }

    public function test_export_neutralises_formulas(): void
    {
        $this->postJson('/api/contact?key=test-contact-key', $this->submission(['name' => '=HYPERLINK("http://evil.test","x")']));

        $csv = $this->actingAs(User::factory()->create())->get('/inbox/export')->assertOk()->streamedContent();

        $this->assertStringContainsString("'=HYPERLINK", $csv);
    }
}
