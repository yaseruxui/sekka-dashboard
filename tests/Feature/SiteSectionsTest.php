<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use App\Support\SiteContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SiteSectionsTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create(['name' => 'محمد']);
        // The site's real bundled content (tests/fixtures/site-content.json), as the import stores it.
        Setting::setValue('defaults', $this->site());
    }

    private function site(): array
    {
        return json_decode(file_get_contents(base_path('tests/fixtures/site-content.json')), true);
    }

    private function save(array $body)
    {
        return $this->actingAs($this->user)->put('/site', ['section' => 'home.hero', ...$body]);
    }

    public function test_guests_cannot_edit(): void
    {
        $this->put('/site', ['section' => 'home.hero'])->assertRedirect('/login');
    }

    public function test_a_section_saves_only_its_own_fields(): void
    {
        $this->save([
            'texts' => ['ar' => ['home.heroEyebrow' => 'سطر جديد'], 'en' => ['home.heroEyebrow' => 'New line']],
            'home' => ['heroVideo' => 'http://localhost/storage/media/hero.mp4'],
        ])->assertSessionHasNoErrors()->assertSessionHas('success');

        $content = $this->getJson('/api/public/content')->json();
        $site = $this->site();
        $this->assertSame('سطر جديد', $content['messages']['ar']['home']['heroEyebrow']);
        $this->assertSame('New line', $content['messages']['en']['home']['heroEyebrow']);
        $this->assertSame($site['messages']['ar']['home']['storyTitle'], $content['messages']['ar']['home']['storyTitle']);
        $this->assertSame('http://localhost/storage/media/hero.mp4', $content['home']['heroVideo']);
        $this->assertEquals($site['home']['gallery'], $content['home']['gallery']);
        $this->assertArrayNotHasKey('contact', $content);

        $this->assertSame('محمد', Setting::getValue('section_meta')['home.hero']['by']);
    }

    public function test_maintenance_mode_switches_on_and_off(): void
    {
        $this->save([
            'section' => 'maintenance.state',
            'home' => ['maintenance' => true],
            'texts' => ['ar' => ['common.maintenance.title' => 'نرجع بعد ساعة']],
        ])->assertSessionHasNoErrors();

        $content = $this->getJson('/api/public/content')->json();
        $this->assertTrue($content['home']['maintenance']);
        $this->assertSame('نرجع بعد ساعة', $content['messages']['ar']['common']['maintenance']['title']);

        $this->save(['home' => ['maintenance' => false]])->assertSessionHasNoErrors();
        $this->assertFalse(SiteContent::get('home')['maintenance']);

        $this->save(['home' => ['maintenance' => 'maybe']])->assertSessionHasErrors('home.maintenance');
    }

    public function test_the_maintenance_film_defaults_to_the_404_film(): void
    {
        $this->save(['home' => ['maintenance' => false]])->assertSessionHasNoErrors();
        $this->assertSame($this->site()['home']['notFoundVideo'], SiteContent::get('home')['maintenanceVideo']);

        $this->save([
            'home' => ['maintenanceVideo' => 'http://localhost/storage/media/soon.mp4'],
            'texts' => ['ar' => ['common.notFound.body' => 'الرابط قديم.']],
        ])->assertSessionHasNoErrors();
        $content = $this->getJson('/api/public/content')->json();
        $this->assertSame('http://localhost/storage/media/soon.mp4', $content['home']['maintenanceVideo']);
        $this->assertSame('الرابط قديم.', $content['messages']['ar']['common']['notFound']['body']);
    }

    public function test_an_empty_text_falls_back_to_the_original(): void
    {
        $this->save(['texts' => ['ar' => ['home.heroEyebrow' => '']]])->assertSessionHasNoErrors();

        $this->assertArrayNotHasKey('heroEyebrow', SiteContent::get('messages')['ar']['home']);
    }

    public function test_lists_replace_whole_and_keep_empty_items(): void
    {
        $items = $this->site()['messages']['ar']['home']['caseList']['items'];
        $items[0]['subtitle'] = '';
        $caseList = $this->site()['home']['caseList'];
        array_pop($items);
        array_pop($caseList);

        $this->save(['texts' => ['ar' => ['home.caseList.items' => $items]], 'home' => ['caseList' => $caseList]])->assertSessionHasNoErrors();

        $this->assertCount(6, SiteContent::get('messages')['ar']['home']['caseList']['items']);
        $this->assertSame('', SiteContent::get('messages')['ar']['home']['caseList']['items'][0]['subtitle']);
        $this->assertCount(6, SiteContent::get('home')['caseList']);
    }

    public function test_home_media_is_validated_as_a_whole(): void
    {
        $this->save(['home' => ['gallery.big.fit' => 'stretch', 'reelStepS' => 0, 'workReel.0.href' => '']])
            ->assertSessionHasErrors(['home.gallery.big.fit', 'home.reelStepS', 'home.workReel.0.href']);
        $this->assertNull(SiteContent::get('home'));
    }

    public function test_contact_is_validated(): void
    {
        $this->save(['contact' => ['whatsappNumber' => '+966 50', 'mapUrl' => 'nope']])
            ->assertSessionHasErrors(['contact.whatsappNumber', 'contact.mapUrl']);

        $this->save(['contact' => ['socials' => [['platform' => 'x', 'url' => 'https://x.com/sekka']]]])->assertSessionHasNoErrors();
        $this->assertSame([['platform' => 'x', 'url' => 'https://x.com/sekka']], SiteContent::get('contact')['socials']);
    }

    public function test_policy_html_is_sanitised_and_english_is_optional(): void
    {
        $this->save(['policy' => [
            'ar' => [
                'updated' => '2026',
                'title' => 'سياسة الخصوصية',
                'html' => '<p onclick="x()">نص <strong>مهم</strong> <a href="javascript:alert(1)">سيئ</a> <a href="https://seka-sa.com" style="color:red">جيد</a></p><script>alert(1)</script><div><ul><li>بند</li></ul></div><img src=x onerror=y>',
            ],
            'en' => null,
        ]])->assertSessionHasNoErrors();

        $policy = SiteContent::get('policy');
        $this->assertNull($policy['en']);
        $this->assertSame(
            '<p>نص <strong>مهم</strong> <a>سيئ</a> <a href="https://seka-sa.com" target="_blank" rel="noopener noreferrer">جيد</a></p><ul><li>بند</li></ul>',
            $policy['ar']['html'],
        );
    }

    public function test_pages_render_with_content_and_defaults(): void
    {
        $this->withoutVite();
        foreach (['home', 'work', 'contact', 'policy', 'not-found', 'maintenance', 'menu'] as $page) {
            $this->actingAs($this->user)->get("/site/{$page}")->assertOk()->assertInertia(fn ($p) => $p
                ->component('site/page', false)
                ->where('page', $page)
                ->has('content.home.heroVideo')
                ->has('defaults.messages.ar.home'));
        }
        $this->actingAs($this->user)->get('/site/nope')->assertNotFound();
    }
}
