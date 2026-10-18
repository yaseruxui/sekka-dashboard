<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Service;
use App\Models\User;
use App\Support\SiteContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ServicesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Http::fake();
    }

    private function service(string $title): Service
    {
        return Service::create(['title' => $title, 'video' => '/media/a.mp4', 'fit' => 'cover']);
    }

    public function test_services_can_be_added_edited_and_deleted(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post('/services', [
            'title' => "الموشن\nجرافيك", 'title_en' => 'Motion', 'subtitle' => 'حركة', 'video' => '/media/m.mp4', 'fit' => 'backdrop',
        ])->assertSessionHas('success');
        $service = Service::firstOrFail();
        $this->assertSame('backdrop', $service->fit);

        $this->put("/services/{$service->id}", ['title' => 'هوية', 'video' => '/media/h.mp4', 'fit' => 'cover'])->assertSessionHas('success');
        $this->assertSame('هوية', $service->fresh()->title);

        $this->delete("/services/{$service->id}")->assertSessionHas('success');
        $this->assertSame(0, Service::count());
    }

    public function test_a_service_needs_a_title_and_a_video(): void
    {
        $this->actingAs(User::factory()->create())
            ->post('/services', ['title' => '', 'video' => '', 'fit' => 'cover'])
            ->assertSessionHasErrors(['title', 'video']);
    }

    public function test_the_site_gets_the_home_pick_in_order_and_deleting_removes_it(): void
    {
        [$a, $b, $c] = [$this->service('أ'), $this->service('ب'), $this->service('ج')];
        SiteContent::put('home', ['serviceIds' => [$c->id, $a->id]]);

        $this->getJson('/api/public/content')
            ->assertJsonCount(2, 'services')
            ->assertJsonPath('services.0.title.ar', 'ج')
            ->assertJsonPath('services.1.title.en', 'أ'); // falls back to the Arabic title

        $this->actingAs(User::factory()->create())->delete("/services/{$c->id}");
        $this->assertSame([$a->id], SiteContent::get('home')['serviceIds']);
        $this->getJson('/api/public/content')->assertJsonCount(1, 'services');
    }

    public function test_never_picked_shows_every_service(): void
    {
        $this->service('أ');
        $this->service('ب');
        $this->getJson('/api/public/content')->assertJsonCount(2, 'services');
    }

    public function test_only_site_editors_reach_services(): void
    {
        $this->actingAs(User::factory()->create(['permissions' => ['projects']]))->get('/services')->assertForbidden();
    }

    public function test_the_work_reel_comes_from_picked_published_projects(): void
    {
        $a = Project::create(['slug' => 'a', 'title' => 'أ', 'title_en' => 'A', 'cover' => '/media/a.jpg', 'published' => true, 'summary' => '', 'blocks' => []]);
        $b = Project::create(['slug' => 'b', 'title' => 'ب', 'cover' => '/media/b.jpg', 'published' => true, 'summary' => '', 'blocks' => []]);
        $hidden = Project::create(['slug' => 'c', 'title' => 'ج', 'cover' => '/media/c.jpg', 'published' => false, 'summary' => '', 'blocks' => []]);
        SiteContent::put('home', ['workReelIds' => [$b->id, $hidden->id, $a->id]]);

        $this->getJson('/api/public/content')
            ->assertJsonCount(2, 'workReel')
            ->assertJsonPath('workReel.0.href', '/work/b')
            ->assertJsonPath('workReel.0.title.en', 'ب')
            ->assertJsonPath('workReel.1.title.en', 'A')
            ->assertJsonPath('workReel.1.src', '/media/a.jpg');

        $this->actingAs(User::factory()->create())->delete("/projects/{$b->id}")->assertRedirect();
        $this->assertSame([$hidden->id, $a->id], SiteContent::get('home')['workReelIds']);
    }

    public function test_bulk_delete_removes_services_and_their_home_pick(): void
    {
        [$a, $b, $c] = [$this->service('أ'), $this->service('ب'), $this->service('ج')];
        SiteContent::put('home', ['serviceIds' => [$a->id, $b->id, $c->id]]);

        $this->actingAs(User::factory()->create())
            ->post('/services/bulk', ['ids' => [$a->id, $c->id], 'action' => 'delete'])
            ->assertSessionHas('success', 'تم حذف 2 خدمة.');

        $this->assertSame([$b->id], Service::pluck('id')->all());
        $this->assertSame([$b->id], SiteContent::get('home')['serviceIds']);
    }
}
