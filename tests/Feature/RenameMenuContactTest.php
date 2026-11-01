<?php

namespace Tests\Feature;

use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RenameMenuContactTest extends TestCase
{
    use RefreshDatabase;

    private function migration(): object
    {
        return require database_path('migrations/2026_11_01_000001_rename_menu_contact_and_requests_tab.php');
    }

    public function test_old_wording_follows_the_site_and_edited_texts_stay(): void
    {
        $texts = fn (string $menu, string $tab) => ['ar' => ['navigation' => ['contact' => $menu], 'contact' => ['tabs' => ['contact' => $tab]]], 'en' => []];
        Setting::setValue('defaults', ['messages' => $texts('تواصل معنا', 'الاستفسارات')]);
        Setting::setValue('messages', $texts('تواصل معنا', 'راسلنا'));

        $this->migration()->up();

        $this->assertSame($texts('اتصل بنا', 'الطلبات'), Setting::getValue('defaults')['messages']);
        // The saved menu line was still the old wording; the tab was renamed by hand.
        $this->assertSame($texts('اتصل بنا', 'راسلنا'), Setting::getValue('messages'));

        $this->migration()->down();
        $this->assertSame($texts('تواصل معنا', 'الاستفسارات'), Setting::getValue('defaults')['messages']);
    }

    public function test_nothing_to_do_before_the_import(): void
    {
        $this->migration()->up();
        $this->assertNull(Setting::getValue('messages'));
    }
}
