<?php

namespace Tests\Feature;

use App\Models\Media;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_image_upload_reads_its_size(): void
    {
        $this->actingAs(User::factory()->create())
            ->postJson('/media', ['file' => UploadedFile::fake()->image('Hero Shot.png', 640, 480)])
            ->assertCreated()
            ->assertJsonPath('width', 640)
            ->assertJsonPath('height', 480)
            ->assertJsonPath('kind', 'image');

        $media = Media::first();
        Storage::disk('public')->assertExists($media->path);
        $this->assertStringStartsWith('media/', $media->path);
        $this->assertStringContainsString('hero-shot-', $media->path);
    }

    public function test_svg_size_comes_from_its_viewbox(): void
    {
        $svg = UploadedFile::fake()->createWithContent('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40"></svg>');

        $this->actingAs(User::factory()->create())
            ->postJson('/media', ['file' => $svg])
            ->assertCreated()
            ->assertJsonPath('width', 120)
            ->assertJsonPath('height', 40);
    }

    public function test_svg_with_script_is_refused(): void
    {
        $svg = UploadedFile::fake()->createWithContent('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" onload="alert(1)"></svg>');

        $this->actingAs(User::factory()->create())
            ->postJson('/media', ['file' => $svg])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file');
    }

    public function test_video_upload_takes_the_size_read_in_the_browser(): void
    {
        $clip = UploadedFile::fake()->create('clip.mp4', 100, 'video/mp4');

        $this->actingAs(User::factory()->create())
            ->postJson('/media', ['file' => $clip, 'width' => 1920, 'height' => 1080])
            ->assertCreated()
            ->assertJsonPath('kind', 'video')
            ->assertJsonPath('width', 1920);
    }

    public function test_other_files_are_refused(): void
    {
        $this->actingAs(User::factory()->create())
            ->postJson('/media', ['file' => UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf')])
            ->assertUnprocessable();
    }

    public function test_media_in_use_is_not_deleted_without_force(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->postJson('/media', ['file' => UploadedFile::fake()->image('a.jpg', 10, 10)]);
        $media = Media::first();
        Project::create(['slug' => 'p', 'title' => 'P', 'summary' => '', 'blocks' => [
            ['id' => 'i', 'type' => 'image', 'media' => ['src' => $media->url, 'width' => 10, 'height' => 10]],
        ]]);

        $this->actingAs($user)->delete("/media/{$media->id}")->assertSessionHas('error');
        $this->assertModelExists($media);

        $this->actingAs($user)->delete("/media/{$media->id}?force=1")->assertSessionHas('success');
        $this->assertModelMissing($media);
        Storage::disk('public')->assertMissing($media->path);
    }

    public function test_picker_list_filters_by_kind(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->postJson('/media', ['file' => UploadedFile::fake()->image('a.jpg', 10, 10)]);
        $this->actingAs($user)->postJson('/media', ['file' => UploadedFile::fake()->create('b.mp4', 10, 'video/mp4'), 'width' => 2, 'height' => 2]);

        $this->actingAs($user)->getJson('/media/list?kind=video')->assertJsonCount(1, 'data')->assertJsonPath('data.0.kind', 'video');
    }
}
