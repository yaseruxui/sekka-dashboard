<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeployCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        putenv('VERCEL_ENV');
        unset($_ENV['VERCEL_ENV'], $_SERVER['VERCEL_ENV']);
        parent::tearDown();
    }

    public function test_preview_builds_leave_the_shared_database_alone()
    {
        putenv('VERCEL_ENV=preview');
        $_ENV['VERCEL_ENV'] = $_SERVER['VERCEL_ENV'] = 'preview';

        $this->artisan('sekka:deploy')
            ->expectsOutputToContain('Preview build: skipping')
            ->doesntExpectOutputToContain('Running migrations')
            ->assertSuccessful();
    }
}
