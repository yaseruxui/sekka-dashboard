<?php

namespace Tests\Feature;

use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicApiTest extends TestCase
{
    use RefreshDatabase;

    private function import(): void
    {
        $this->artisan('sekka:import-site', ['--file' => base_path('tests/fixtures/content-defaults.json')])->assertSuccessful();
    }

    public function test_import_fills_content_and_projects_with_block_defaults(): void
    {
        $this->import();

        $block = Project::firstWhere('slug', 'demo')->blocks[1];
        $this->assertSame('full', $block['width']);
        $this->assertSame('md', $block['spacingTop']);
        $this->assertFalse($block['hidden']);
        $this->assertSame('loop', $block['mode']);
        $this->assertSame('', $block['media']['alt']);
    }

    public function test_import_does_not_overwrite_without_force(): void
    {
        $this->import();
        Project::firstWhere('slug', 'demo')->update(['title' => 'Edited']);

        $this->import();
        $this->assertSame('Edited', Project::firstWhere('slug', 'demo')->title);
    }

    public function test_public_projects_lists_only_published_in_order(): void
    {
        $this->import();
        Project::create(['slug' => 'draft', 'title' => 'x', 'summary' => '', 'blocks' => [], 'published' => false, 'position' => 0]);
        Project::create(['slug' => 'first', 'title' => 'x', 'summary' => '', 'blocks' => [], 'position' => 0]);

        $this->getJson('/api/public/projects')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.slug', 'first')
            ->assertJsonPath('1.slug', 'demo')
            ->assertJsonPath('1.preview', null)
            ->assertJsonMissingPath('1.id');
    }

    public function test_public_content_returns_only_saved_sections(): void
    {
        $this->getJson('/api/public/content')->assertOk()->assertExactJson([]);

        $this->import();
        $this->getJson('/api/public/content')
            ->assertOk()
            ->assertJsonPath('contact.whatsappNumber', '966500000000')
            ->assertJsonPath('policy.en', null)
            ->assertJsonMissingPath('home');
    }
}
