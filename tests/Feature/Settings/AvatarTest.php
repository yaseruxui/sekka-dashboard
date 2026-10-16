<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AvatarTest extends TestCase
{
    use RefreshDatabase;

    public function test_avatar_is_uploaded_replaced_and_removed(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->actingAs($user)->post('/settings/avatar', ['avatar' => UploadedFile::fake()->image('me.png', 200, 200)])->assertSessionHas('success');
        $first = $user->fresh()->avatar_path;
        Storage::disk('public')->assertExists($first);
        $this->assertNotNull($user->fresh()->avatar);

        $this->actingAs($user)->post('/settings/avatar', ['avatar' => UploadedFile::fake()->image('new.jpg')]);
        Storage::disk('public')->assertMissing($first);

        $this->actingAs($user)->delete('/settings/avatar');
        $this->assertNull($user->fresh()->avatar_path);
        $this->assertNull($user->fresh()->avatar);
    }

    public function test_avatar_must_be_an_image(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->actingAs($user)->post('/settings/avatar', ['avatar' => UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf')])
            ->assertSessionHasErrors('avatar');
        $this->assertNull($user->fresh()->avatar_path);
    }
}
