<?php

namespace Tests\Feature;

use App\Models\Category;
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
            'title_en' => 'New case',
            'summary' => 'ملخص',
            'category' => 'هوية',
            'year' => '2026',
            'cover' => '/media/work/a.jpg',
            'preview' => '',
            'aspect' => '16:9',
            'blocks' => [
                ['id' => 't1', 'type' => 'text', 'title' => 'التحدي', 'body' => "سطر\n\nفقرة", 'junk' => 'x'],
                ['id' => 'i1', 'type' => 'image', 'media' => ['src' => 'http://localhost/storage/a.jpg', 'width' => 1600, 'height' => 900], 'background' => '#111', 'spacingTop' => 'lg'],
                ['id' => 'g1', 'type' => 'grid', 'items' => [['src' => '/a.jpg', 'width' => 10, 'height' => 20, 'alt' => 'a']], 'perRow' => '3'],
                ['id' => 'e1', 'type' => 'embed', 'url' => 'https://vimeo.com/123', 'hidden' => true],
            ],
            ...$overrides,
        ];
    }

    private function newProject(User $user): Project
    {
        $this->actingAs($user)->post('/projects')->assertRedirect();

        return Project::latest('id')->first();
    }

    public function test_guests_cannot_reach_projects(): void
    {
        $this->get('/projects')->assertRedirect('/login');
        $this->post('/projects')->assertRedirect('/login');
    }

    public function test_new_project_starts_as_an_unpublished_draft(): void
    {
        $project = $this->newProject(User::factory()->create());

        $this->assertFalse($project->published);
        $this->assertNull($project->published_at);
        $this->getJson('/api/public/projects')->assertJsonCount(0);
    }

    public function test_draft_is_saved_without_touching_the_site(): void
    {
        $user = User::factory()->create();
        $project = Project::create(['slug' => 'live', 'title' => 'Live', 'summary' => '', 'cover' => '/c.jpg', 'blocks' => [], 'published' => true, 'published_at' => now()]);

        $this->actingAs($user)->putJson("/projects/{$project->id}/draft", $this->payload(['slug' => 'live', 'title' => 'Edited']))
            ->assertOk()->assertJsonStructure(['savedAt']);

        $this->assertSame('Edited', $project->fresh()->workingCopy()['title']);
        $this->getJson('/api/public/projects')->assertJsonPath('0.title', 'Live');
    }

    public function test_publishing_copies_the_draft_with_normalised_blocks(): void
    {
        $user = User::factory()->create();
        $project = $this->newProject($user);
        $this->actingAs($user)->putJson("/projects/{$project->id}/draft", $this->payload());

        $this->actingAs($user)->post("/projects/{$project->id}/publish", $this->payload())->assertSessionHasNoErrors();

        $project->refresh();
        $this->assertTrue($project->published);
        $this->assertNotNull($project->published_at);
        $this->assertNull($project->draft);
        $this->assertSame('New case', $project->title_en);
        [$text, $image, $grid, $embed] = $project->blocks;
        $this->assertArrayNotHasKey('junk', $text);
        $this->assertSame(['src' => 'http://localhost/storage/a.jpg', 'width' => 1600, 'height' => 900, 'alt' => ''], $image['media']);
        $this->assertSame(3, $grid['perRow']);
        $this->assertTrue($embed['hidden']);
        $this->assertContains('هوية', Category::names());

        $this->getJson('/api/public/projects')
            ->assertJsonPath('0.slug', 'new-case')
            ->assertJsonPath('0.blocks.1.background', '#111')
            ->assertJsonMissingPath('0.title_en');
    }

    public function test_publish_validates_blocks_by_type(): void
    {
        $user = User::factory()->create();
        $project = $this->newProject($user);

        $this->actingAs($user)->post("/projects/{$project->id}/publish", $this->payload(['cover' => '', 'blocks' => [
            ['id' => 'i1', 'type' => 'image', 'media' => ['src' => '/a.jpg']],
            ['id' => 'g1', 'type' => 'grid', 'items' => [], 'perRow' => 9],
            ['id' => 'e1', 'type' => 'embed', 'url' => 'not a url'],
            ['id' => 'x1', 'type' => 'carousel'],
        ]]))->assertSessionHasErrors(['cover', 'blocks.0.media.width', 'blocks.1.items', 'blocks.1.perRow', 'blocks.2.url', 'blocks.3.type']);

        $this->assertFalse($project->fresh()->published);
    }

    public function test_slug_must_be_unique_and_kebab_case(): void
    {
        $user = User::factory()->create();
        Project::create(['slug' => 'new-case', 'title' => 'x', 'summary' => '', 'blocks' => []]);
        $project = $this->newProject($user);

        $this->actingAs($user)->post("/projects/{$project->id}/publish", $this->payload())->assertSessionHasErrors('slug');
        $this->actingAs($user)->post("/projects/{$project->id}/publish", $this->payload(['slug' => 'Bad Slug']))->assertSessionHasErrors('slug');
    }

    public function test_visibility_switch_needs_a_first_publish(): void
    {
        $user = User::factory()->create();
        $project = $this->newProject($user);

        $this->actingAs($user)->patch("/projects/{$project->id}/visibility", ['published' => true])->assertSessionHas('error');
        $this->assertFalse($project->fresh()->published);

        $this->actingAs($user)->post("/projects/{$project->id}/publish", $this->payload());
        $this->actingAs($user)->patch("/projects/{$project->id}/visibility", ['published' => false]);
        $this->getJson('/api/public/projects')->assertJsonCount(0);
        $this->actingAs($user)->patch("/projects/{$project->id}/visibility", ['published' => true]);
        $this->getJson('/api/public/projects')->assertJsonCount(1);
    }

    public function test_reorder(): void
    {
        $a = Project::create(['slug' => 'a', 'title' => 'A', 'summary' => '', 'blocks' => [], 'position' => 0]);
        $b = Project::create(['slug' => 'b', 'title' => 'B', 'summary' => '', 'blocks' => [], 'position' => 1]);

        $this->actingAs(User::factory()->create())->post('/projects/reorder', ['ids' => [$b->id, $a->id]])->assertSessionHasNoErrors();
        $this->getJson('/api/public/projects')->assertJsonPath('0.slug', 'b');
    }

    public function test_duplicate_copies_blocks_with_new_ids_and_stays_hidden(): void
    {
        $user = User::factory()->create();
        $project = $this->newProject($user);
        $this->actingAs($user)->post("/projects/{$project->id}/publish", $this->payload());

        $this->actingAs($user)->post("/projects/{$project->id}/duplicate")->assertRedirect();

        $copy = Project::latest('id')->first();
        $this->assertSame('new-case-copy', $copy->slug);
        $this->assertFalse($copy->published);
        $this->assertCount(4, $copy->blocks);
        $this->assertNotSame($project->fresh()->blocks[0]['id'], $copy->blocks[0]['id']);
        $this->assertSame($project->fresh()->blocks[0]['body'], $copy->blocks[0]['body']);
    }

    public function test_discarding_a_draft_goes_back_to_the_published_version(): void
    {
        $user = User::factory()->create();
        $project = $this->newProject($user);
        $this->actingAs($user)->post("/projects/{$project->id}/publish", $this->payload());
        $this->actingAs($user)->putJson("/projects/{$project->id}/draft", $this->payload(['title' => 'Changed']));

        $this->actingAs($user)->delete("/projects/{$project->id}/draft");
        $this->assertSame('حالة جديدة', $project->fresh()->workingCopy()['title']);
    }

    public function test_categories_can_be_added(): void
    {
        $this->actingAs(User::factory()->create())->postJson('/categories', ['name' => ' تصوير '])
            ->assertCreated()->assertJsonPath('name', 'تصوير');
        $this->assertSame(['تصوير'], Category::names());
    }

    public function test_publishing_revalidates_the_site(): void
    {
        config(['sekka.revalidate_secret' => 's3cret']);
        Http::fake(['site.test/api/revalidate' => Http::response(['revalidated' => true])]);
        $user = User::factory()->create();
        $project = $this->newProject($user);

        $this->actingAs($user)->post("/projects/{$project->id}/publish", $this->payload())->assertSessionHas('success');

        Http::assertSent(fn (Request $r) => $r->url() === 'http://site.test/api/revalidate'
            && $r->method() === 'POST'
            && $r->header('x-revalidate-secret') === ['s3cret']);
    }

    public function test_failed_revalidate_still_publishes_and_warns(): void
    {
        config(['sekka.revalidate_secret' => 's3cret']);
        Http::fake(['site.test/*' => Http::response(['error' => 'unauthorized'], 401)]);
        $user = User::factory()->create();
        $project = $this->newProject($user);

        $this->actingAs($user)->post("/projects/{$project->id}/publish", $this->payload())->assertSessionHas('error');
        $this->assertTrue($project->fresh()->published);
    }

    public function test_index_and_edit_pages_render(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $project = $this->newProject($user);
        $this->actingAs($user)->putJson("/projects/{$project->id}/draft", $this->payload());

        $this->actingAs($user)->get('/projects')->assertInertia(fn ($page) => $page
            ->component('projects/index', false)
            ->where('projects.0.slug', 'new-case')
            ->where('projects.0.hasDraft', true)
            ->where('projects.0.blocksCount', 4));

        $this->actingAs($user)->get("/projects/{$project->id}/edit")->assertInertia(fn ($page) => $page
            ->component('projects/edit', false)
            ->where('project.slug', 'new-case')
            ->has('project.blocks', 4)
            ->has('aspects', 6)
            ->has('categories'));
    }
}
