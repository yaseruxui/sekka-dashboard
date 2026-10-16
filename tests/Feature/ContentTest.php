<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\SiteContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContentTest extends TestCase
{
    use RefreshDatabase;

    /** The site's real bundled content, as imported (tests/fixtures/site-content.json). */
    private function site(): array
    {
        return json_decode(file_get_contents(base_path('tests/fixtures/site-content.json')), true);
    }

    public function test_guests_cannot_edit_content(): void
    {
        $this->put('/content/home', $this->site()['home'])->assertRedirect('/login');
    }

    public function test_sections_round_trip_unchanged(): void
    {
        $user = User::factory()->create();
        $site = $this->site();

        $this->actingAs($user)->put('/content/home', $site['home'])->assertSessionHasNoErrors();
        $this->actingAs($user)->put('/content/contact', $site['contact'])->assertSessionHasNoErrors();
        $this->actingAs($user)->put('/content/texts', ['messages' => $site['messages']])->assertSessionHasNoErrors();

        $content = $this->getJson('/api/public/content')->json();
        $this->assertEquals($site['home'], $content['home']);
        $this->assertEquals($site['contact'], $content['contact']);
        $this->assertEquals($site['messages'], $content['messages']);
    }

    public function test_home_media_is_validated(): void
    {
        $home = $this->site()['home'];
        $home['gallery']['big']['fit'] = 'stretch';
        $home['reelStepS'] = 0;
        $home['workReel'][0]['href'] = '';
        unset($home['about']['studio']);

        $this->actingAs(User::factory()->create())->put('/content/home', $home)
            ->assertSessionHasErrors(['gallery.big.fit', 'reelStepS', 'workReel.0.href', 'about.studio']);
        $this->assertNull(SiteContent::get('home'));
    }

    public function test_contact_whatsapp_must_be_digits(): void
    {
        $contact = ['whatsappNumber' => '+966 50', 'mapUrl' => 'nope'] + $this->site()['contact'];

        $this->actingAs(User::factory()->create())->put('/content/contact', $contact)
            ->assertSessionHasErrors(['whatsappNumber', 'mapUrl']);
    }

    public function test_texts_keep_empty_strings_and_reject_lists_at_the_top(): void
    {
        $user = User::factory()->create();
        $messages = $this->site()['messages'];
        $messages['ar']['common'] = ['blank' => ''] + (array) ($messages['ar']['common'] ?? []);

        $this->actingAs($user)->put('/content/texts', ['messages' => $messages])->assertSessionHasNoErrors();
        $this->assertSame('', SiteContent::get('messages')['ar']['common']['blank']);

        $this->actingAs($user)->put('/content/texts', ['messages' => ['ar' => ['a', 'b'], 'en' => $messages['en']]])
            ->assertSessionHasErrors('messages.ar');
    }

    public function test_policy_html_is_sanitised_and_english_is_optional(): void
    {
        $this->actingAs(User::factory()->create())->put('/content/policy', [
            'ar' => [
                'updated' => '2026',
                'title' => 'سياسة الخصوصية',
                'html' => '<p onclick="x()">نص <strong>مهم</strong> <a href="javascript:alert(1)">سيئ</a> <a href="https://seka-sa.com" style="color:red">جيد</a></p><script>alert(1)</script><div><ul><li>بند</li></ul></div><img src=x onerror=y>',
            ],
            'en' => null,
        ])->assertSessionHasNoErrors();

        $policy = SiteContent::get('policy');
        $this->assertNull($policy['en']);
        $this->assertSame(
            '<p>نص <strong>مهم</strong> <a>سيئ</a> <a href="https://seka-sa.com" target="_blank" rel="noopener noreferrer">جيد</a></p><ul><li>بند</li></ul>',
            $policy['ar']['html'],
        );
    }

    public function test_content_pages_render(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        foreach (['home', 'texts', 'contact', 'policy'] as $section) {
            $this->actingAs($user)->get("/content/{$section}")->assertOk()
                ->assertInertia(fn ($page) => $page->component("content/{$section}", false));
        }
    }
}
