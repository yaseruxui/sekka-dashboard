<?php

namespace Tests\Feature;

use App\Models\ContactMessage;
use App\Models\ContactMessageNote;
use App\Models\User;
use App\Notifications\NewEnquiry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
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
        $this->assertSame('new', $m->status);
    }

    public function test_contact_webhook_validates(): void
    {
        $this->postJson('/api/contact?key=test-contact-key', $this->submission(['email' => 'nope', 'name' => '']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'name']);
    }

    public function test_inbox_lists_and_deletes_messages(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $this->postJson('/api/contact?key=test-contact-key', $this->submission());
        $this->postJson('/api/contact?key=test-contact-key', $this->submission(['name' => 'Omar', 'email' => 'omar@example.com']));
        [, $omar] = ContactMessage::orderBy('id')->get();

        $this->actingAs($user)->get('/inbox?filter=new')->assertInertia(fn ($page) => $page
            ->component('inbox/index', false)
            ->has('messages.data', 2)
            ->where('counts.new', 2)
            ->where('unreadMessages', 2));

        $this->actingAs($user)->get('/inbox?q=omar')->assertInertia(fn ($page) => $page->has('messages.data', 1));

        $this->actingAs($user)->delete("/inbox/{$omar->id}")->assertSessionHas('success');
        $this->assertModelMissing($omar);
    }

    public function test_status_changes_only_by_hand(): void
    {
        $this->withoutVite();
        $agent = User::factory()->create(['permissions' => ['inbox']]);
        $this->postJson('/api/contact?key=test-contact-key', $this->submission());
        $m = ContactMessage::first();

        // Viewing the list does not touch the status.
        $this->actingAs($agent)->get('/inbox')->assertOk();
        $this->assertSame('new', $m->fresh()->status);

        $this->actingAs($agent)->patch("/inbox/{$m->id}/status", ['status' => 'replied'])->assertSessionHas('success');
        $this->assertSame('replied', $m->fresh()->status);

        $this->actingAs($agent)->post("/inbox/{$m->id}/notes", ['body' => 'اتصلت بهم']);

        $this->actingAs($agent)->patch("/inbox/{$m->id}/status", ['status' => 'spam']);
        $this->actingAs($agent)->get('/inbox')->assertInertia(fn ($page) => $page->has('messages.data', 0)->where('counts.spam', 1));
        $this->actingAs($agent)->get('/inbox?filter=spam')->assertInertia(fn ($page) => $page
            ->has('messages.data', 1)
            ->has('messages.data.0.notes', 1)
            ->has('messages.data.0.events', 3)
            ->where('canDelete', false));

        $this->actingAs($agent)->patch("/inbox/{$m->id}/status", ['status' => 'bogus'])->assertSessionHasErrors('status');
        $this->actingAs($agent)->delete("/inbox/{$m->id}")->assertForbidden();
    }

    public function test_new_enquiry_emails_active_inbox_staff(): void
    {
        Notification::fake();
        $admin = User::factory()->create();
        $agent = User::factory()->create(['permissions' => ['inbox']]);
        $projects = User::factory()->create(['permissions' => ['projects']]);
        $invited = User::factory()->create(['permissions' => ['inbox'], 'invited_at' => now()]);

        $this->postJson('/api/contact?key=test-contact-key', $this->submission())->assertCreated();

        Notification::assertSentTo([$admin, $agent], NewEnquiry::class);
        Notification::assertNotSentTo([$projects, $invited], NewEnquiry::class);
    }

    public function test_bulk_status_change(): void
    {
        $user = User::factory()->create(['permissions' => ['inbox']]);
        $this->postJson('/api/contact?key=test-contact-key', $this->submission());
        $this->postJson('/api/contact?key=test-contact-key', $this->submission(['name' => 'Omar']));
        $this->postJson('/api/contact?key=test-contact-key', $this->submission(['name' => 'Lina']));
        [$a, $b, $c] = ContactMessage::orderBy('id')->get();

        $this->actingAs($user)->patch('/inbox/status', ['ids' => [$a->id, $b->id], 'status' => 'closed'])->assertSessionHas('success');

        $this->assertSame(['closed', 'closed', 'new'], ContactMessage::orderBy('id')->pluck('status')->all());
        $this->assertSame(1, $a->events()->count());
        $this->actingAs($user)->patch('/inbox/status', ['ids' => [$c->id], 'status' => 'nope'])->assertSessionHasErrors('status');
    }

    public function test_notes_are_edited_and_deleted_by_their_author_or_an_admin(): void
    {
        $admin = User::factory()->create();
        $author = User::factory()->create(['permissions' => ['inbox']]);
        $other = User::factory()->create(['permissions' => ['inbox']]);
        $this->postJson('/api/contact?key=test-contact-key', $this->submission());
        $m = ContactMessage::first();
        $this->actingAs($author)->post("/inbox/{$m->id}/notes", ['body' => 'أولى']);
        $note = ContactMessageNote::first();

        $this->actingAs($other)->patch("/inbox/notes/{$note->id}", ['body' => 'x'])->assertForbidden();
        $this->actingAs($other)->delete("/inbox/notes/{$note->id}")->assertForbidden();

        $this->actingAs($author)->patch("/inbox/notes/{$note->id}", ['body' => 'معدّلة'])->assertSessionHas('success');
        $this->assertSame('معدّلة', $note->fresh()->body);

        $this->actingAs($admin)->delete("/inbox/notes/{$note->id}")->assertSessionHas('success');
        $this->assertModelMissing($note);
    }

    public function test_open_param_loads_a_message_from_another_page(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $this->postJson('/api/contact?key=test-contact-key', $this->submission(['name' => 'Oldest']));
        $oldest = ContactMessage::first();
        for ($i = 0; $i < 25; $i++) {
            $this->postJson('/api/contact?key=test-contact-key', $this->submission(['name' => "M{$i}"]));
        }

        $this->actingAs($user)->get("/inbox?open={$oldest->id}")->assertInertia(fn ($page) => $page
            ->has('messages.data', 25)
            ->where('opened.id', $oldest->id));

        $newest = ContactMessage::latest('id')->first();
        $this->actingAs($user)->get("/inbox?open={$newest->id}")->assertInertia(fn ($page) => $page->where('opened', null));
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

    public function test_bulk_delete_is_for_admins(): void
    {
        $this->postJson('/api/contact?key=test-contact-key', $this->submission());
        $this->postJson('/api/contact?key=test-contact-key', $this->submission(['name' => 'Omar']));
        [$a, $b] = ContactMessage::orderBy('id')->get();
        $a->notes()->create(['body' => 'متابعة']);

        $staff = User::factory()->create(['permissions' => ['inbox']]);
        $this->actingAs($staff)->post('/inbox/bulk', ['ids' => [$a->id, $b->id], 'action' => 'delete'])->assertForbidden();
        $this->assertSame(2, ContactMessage::count());

        $this->actingAs(User::factory()->create())->post('/inbox/bulk', ['ids' => [$a->id, $b->id], 'action' => 'delete'])
            ->assertSessionHas('success', 'تم حذف 2 رسالة.');
        $this->assertSame(0, ContactMessage::count());
        $this->assertSame(0, ContactMessageNote::count());
    }
}
