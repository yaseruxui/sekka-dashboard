<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminSeedTest extends TestCase
{
    use RefreshDatabase;

    private function seedAdmin(string $password): void
    {
        config(['sekka.admin' => ['name' => 'Sekka Admin', 'email' => 'admin@sekka.test', 'password' => $password]]);
        $this->seed();
    }

    public function test_the_admin_password_follows_the_env_on_every_deploy(): void
    {
        $this->seedAdmin('first-pass-123');
        $admin = User::where('email', 'admin@sekka.test')->sole();
        $this->assertTrue(Hash::check('first-pass-123', $admin->password));

        // Changed in the dashboard, then deployed again: the env value wins.
        $admin->update(['password' => 'changed-by-hand', 'name' => 'Yaser']);
        $this->seedAdmin('first-pass-123');
        $this->assertTrue(Hash::check('first-pass-123', $admin->fresh()->password));
        $this->assertSame('Yaser', $admin->fresh()->name);

        $this->seedAdmin('second-pass-456');
        $this->assertTrue(Hash::check('second-pass-456', $admin->fresh()->password));
        $this->assertSame(1, User::count());
    }

    public function test_an_unchanged_password_is_not_rewritten(): void
    {
        $this->seedAdmin('first-pass-123');
        $hash = User::sole()->password;
        $this->seedAdmin('first-pass-123');
        $this->assertSame($hash, User::sole()->password);
    }
}
