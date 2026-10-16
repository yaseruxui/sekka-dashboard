<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Models\Project;
use App\Models\Setting;
use App\Support\Blocks;
use App\Support\SiteClient;
use App\Support\SiteContent;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * One-time import of the site's bundled content and projects
 * (GET {SITE_URL}/api/content-defaults), so the dashboard starts from what
 * the site shows today. Safe to re-run: without --force it only fills what
 * is still empty.
 */
class ImportSite extends Command
{
    protected $signature = 'sekka:import-site
        {--file= : Read { content, projects } from a JSON file instead of the site}
        {--force : Overwrite content sections and projects (matched by slug) that already exist}';

    protected $description = 'Import the site\'s bundled content and projects into the dashboard';

    public function handle(): int
    {
        try {
            $payload = $this->payload();
        } catch (Throwable $e) {
            $this->error('Could not load the site defaults: '.$e->getMessage());

            return self::FAILURE;
        }

        $content = is_array($payload['content'] ?? null) ? $payload['content'] : [];
        $projects = is_array($payload['projects'] ?? null) ? $payload['projects'] : [];
        $force = (bool) $this->option('force');

        DB::transaction(function () use ($content, $projects, $force) {
            // Always kept current: the site's own copy, which empty fields fall back to.
            Setting::setValue('defaults', array_intersect_key($content, array_flip(SiteContent::SECTIONS)));
            Category::ensure(array_column(array_filter($projects, 'is_array'), 'category'));

            foreach (SiteContent::SECTIONS as $section) {
                if (! is_array($content[$section] ?? null)) {
                    continue;
                }
                if (! $force && SiteContent::get($section) !== null) {
                    $this->line("  skip   content.{$section} (already set)");

                    continue;
                }
                SiteContent::put($section, $content[$section]);
                $this->line("  import content.{$section}");
            }

            if (! $force && Project::exists()) {
                $this->line('  skip   projects (already set)');

                return;
            }
            $start = (int) Project::max('position');
            foreach (array_values($projects) as $i => $p) {
                if (! is_array($p) || empty($p['slug'])) {
                    continue;
                }
                $existing = Project::where('slug', $p['slug'])->first();
                Project::updateOrCreate(['slug' => $p['slug']], [
                    'title' => (string) ($p['title'] ?? ''),
                    'summary' => (string) ($p['summary'] ?? ''),
                    'category' => (string) ($p['category'] ?? ''),
                    'year' => (string) ($p['year'] ?? ''),
                    'cover' => (string) ($p['cover'] ?? ''),
                    'preview' => $p['preview'] ?? null,
                    'aspect' => in_array($p['aspect'] ?? null, Project::ASPECTS, true) ? $p['aspect'] : '4:5',
                    'blocks' => Blocks::normalizeAll(is_array($p['blocks'] ?? null) ? $p['blocks'] : []),
                    'position' => $existing?->position ?? $start + $i + 1,
                    'published' => $existing?->published ?? true,
                    'published_at' => $existing?->published_at ?? now(),
                    'draft' => null,
                ]);
                $this->line("  import project {$p['slug']}");
            }
        });

        $this->info('Import done.');

        return self::SUCCESS;
    }

    private function payload(): array
    {
        if ($file = $this->option('file')) {
            $json = json_decode((string) file_get_contents($file), true, flags: JSON_THROW_ON_ERROR);

            return is_array($json) ? $json : [];
        }
        if (! SiteClient::configured()) {
            throw new \RuntimeException('set SITE_URL and SITE_REVALIDATE_SECRET (or pass --file).');
        }

        return SiteClient::contentDefaults();
    }
}
