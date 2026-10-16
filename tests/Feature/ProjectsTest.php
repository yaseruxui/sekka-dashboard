<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ProjectsTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return [
            'slug' => 'new-case',
            'title' => 'حالة جديدة',
            'summary' => 'ملخص',
            'category' => 'هوية',
            'year' => '2026',
            'cover' => '/media/work/a.jpg',
            'preview' => '',
            'aspect' => '16:9',
            'published' => true,
            'blocks' => [
                ['id' => 't1', 'type' => 'text', 'title' => 'التحدي', 'body' => "سطر\n\nفقرة", 'junk' => 'x'],
                ['id' => 'i1', 'type' => 'image', 'media' => ['src' => 'http://localhost/storage/a.jpg', 'width' => 1600, 'height' => 900], 'background' => '#111', 'spacingTop' => 'lg'],
                ['id' => 'g1', 'type' => 'grid', 'items' => [['src' => '/a.jpg', 'width' => 10, 'height' => 20, 'alt' => 'a']], 'perRow' => '3'],
                ['id' => 'e1', 'type' => 'embed', 'url' => 'https://vimeo.com/123', 'hidden' => true],
            ],
            ...$overrides,
        ];
    }

    public function test_guests_cannot_reach_projects(): void
    {
        $this->get('/projects')->assertRedirect('/login');
        $this->post('/projects', $this->payload())->assertRedirect('/login');
    }

    public function test_project_is_created_with_normalised_blocks(): void
    {
        $this->actingAs(User::factory()->create())
            ->post('/projects', $this->payload())
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $project = Project::firstWhere('slug', 'new-case');
        $this->assertNull($project->preview);
        [$text, $image, $grid, $embed] = $project->blocks;
        $this->assertArrayNotHasKey('junk', $text);
        $this->assertSame('start', $text['align']);
        $this->assertSame(['src' => 'http://localhost/storage/a.jpg', 'width' => 1600, 'height' => 900, 'alt' => ''], $image['media']);
        $this->assertSame('lg', $image['spacingTop']);
        $this->assertSame(3, $grid['perRow']);
        $this->assertSame(16, $grid['gap']);
        $this->assertTrue($embed['hidden']);

        $this->getJson('/api/public/projects')->assertJsonPath('0.blocks.1.background', '#111');
    }

    public function test_blocks_are_validated_by_type(): void
    {
        $this->actingAs(User::factory()->create())
            ->post('/projects', $this->payload(['blocks' => [
                ['id' => 'i1', 'type' => 'image', 'media' => ['src' => '/a.jpg']],
                ['id' => 'g1', 'type' => 'grid', 'items' => [], 'perRow' => 9],
                ['id' => 'e1', 'type' => 'embed', 'url' => 'not a url'],
                ['id' => 'x1', 'type' => 'carousel'],
            ]]))
            ->assertSessionHasErrors(['blocks.0.media.width', 'blocks.1.items', 'blocks.1.perRow', 'blocks.2.url', 'blocks.3.type']);

        $this->assertSame(0, Project::count());
    }

    public function test_slug_must_be_unique_and_kebab_case(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->post('/projects', $this->payload());
        $this->actingAs($user)->post('/projects', $this->payload())->assertSessionHasErrors('slug');
        $this->actingAs($user)->post('/projects', $this->payload(['slug' => 'Bad Slug']))->assertSessionHasErrors('slug');
    }

    public function test_update_keeps_own_slug(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->post('/projects', $this->payload());
        $project = Project::first();

        $this->actingAs($user)->put("/projects/{$project->id}", $this->payload(['title' => 'Renamed']))->assertSessionHasNoErrors();
        $this->assertSame('Renamed', $project->fresh()->title);
    }

    public function test_reorder_and_publish(): void
    {
        $user = User::factory()->create();
        $a = Project::create(['slug' => 'a', 'title' => 'A', 'summary' => '', 'blocks' => [], 'position' => 0]);
        $b = Project::create(['slug' => 'b', 'title' => 'B', 'summary' => '', 'blocks' => [], 'position' => 1]);

        $this->actingAs($user)->post('/projects/reorder', ['ids' => [$b->id, $a->id]])->assertSessionHasNoErrors();
        $this->getJson('/api/public/projects')->assertJsonPath('0.slug', 'b');

        $this->actingAs($user)->patch("/projects/{$b->id}/publish", ['published' => false]);
        $this->getJson('/api/public/projects')->assertJsonCount(1)->assertJsonPath('0.slug', 'a');
    }

    public function test_saving_revalidates_the_site(): void
    {
        config(['sekka.revalidate_secret' => 's3cret']);
        Http::fake(['site.test/api/revalidate' => Http::response(['revalidated' => true])]);

        $this->actingAs(User::factory()->create())->post('/projects', $this->payload())->assertSessionHas('success');

        Http::assertSent(fn (Request $r) => $r->url() === 'http://site.test/api/revalidate'
            && $r->method() === 'POST'
            && $r->header('x-revalidate-secret') === ['s3cret']);
    }

    public function test_failed_revalidate_still_saves_and_warns(): void
    {
        config(['sekka.revalidate_secret' => 's3cret']);
        Http::fake(['site.test/*' => Http::response(['error' => 'unauthorized'], 401)]);

        $this->actingAs(User::factory()->create())->post('/projects', $this->payload())->assertSessionHas('error');
        $this->assertSame(1, Project::count());
    }

    public function test_index_and_edit_pages_render(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $this->actingAs($user)->post('/projects', $this->payload());
        $project = Project::first();

        $this->actingAs($user)->get('/projects')->assertInertia(fn ($page) => $page
            ->component('projects/index', false)
            ->where('projects.0.slug', 'new-case')
            ->where('projects.0.blocksCount', 4));

        $this->actingAs($user)->get("/projects/{$project->id}/edit")->assertInertia(fn ($page) => $page
            ->component('projects/edit', false)
            ->where('project.slug', 'new-case')
            ->has('project.blocks', 4)
            ->has('aspects', 6));
    }
}
