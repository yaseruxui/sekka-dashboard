<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use App\Models\Media;
use App\Models\Project;
use App\Models\Service;
use App\Models\Setting;
use App\Support\SiteClient;
use App\Support\SiteContent;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        // Visitors' messages only for those who may read the inbox; site edits for those who may edit it.
        $inbox = $user->hasPermission('inbox');
        $site = $user->hasPermission('site');
        $home = SiteContent::get('home') ?? [];
        $meta = Setting::getValue('section_meta', []);

        return Inertia::render('dashboard', [
            'stats' => [
                'published' => Project::where('published', true)->count(),
                'drafts' => Project::where(fn ($q) => $q->where('published', false)->orWhereNotNull('draft'))->count(),
                'unread' => ContactMessage::where('status', 'new')->count(),
            ],
            'recentMessages' => ! $inbox ? [] : ContactMessage::latest('id')->limit(5)
                ->get(['id', 'name', 'company', 'message', 'estimated_budget', 'status', 'created_at']),
            'messages' => $inbox ? $this->messageStats() : null,
            'site' => [
                'url' => config('sekka.site_url'),
                'connected' => SiteClient::configured(),
                'lastRefresh' => cache('sekka.last_revalidate'),
                'failedAt' => cache('sekka.revalidate_failed_at'),
                'maintenance' => (bool) ($home['maintenance'] ?? false),
                'lastUpdate' => $this->lastUpdate($meta),
            ],
            'recentEdits' => ! $site ? [] : collect($meta)
                ->map(fn ($m, $section) => ['section' => $section, 'by' => $m['by'] ?? '', 'at' => $m['at'] ?? null])
                ->filter(fn ($e) => $e['at'])
                ->sortByDesc('at')->take(6)->values(),
            'content' => [
                // The site shows every service until some are picked.
                'services' => isset($home['serviceIds']) ? count($home['serviceIds']) : Service::count(),
                'servicesTotal' => Service::count(),
                'workReel' => count($home['workReelIds'] ?? []),
                'media' => Media::count(),
            ],
        ]);
    }

    /** Messages in the last 30 days, per day, and the 30 before them; how many sit in each status. */
    private function messageStats(): array
    {
        $today = CarbonImmutable::today();
        $from = $today->subDays(29);
        $perDay = ContactMessage::where('status', '!=', 'spam')->where('created_at', '>=', $from)
            ->get(['created_at'])
            ->countBy(fn ($m) => $m->created_at->toDateString());

        return [
            'days' => collect(range(0, 29))->map(fn ($i) => [
                'date' => $d = $from->addDays($i)->toDateString(),
                'count' => (int) ($perDay[$d] ?? 0),
            ]),
            'last30' => (int) $perDay->sum(),
            'previous30' => ContactMessage::where('status', '!=', 'spam')
                ->whereBetween('created_at', [$from->subDays(30), $from])->count(),
            'byStatus' => collect(ContactMessage::STATUSES)->reject(fn ($s) => $s === 'spam')
                ->mapWithKeys(fn ($s) => [$s => ContactMessage::where('status', $s)->count()]),
        ];
    }

    /** When content last changed: a saved site section, project or service. */
    private function lastUpdate(array $meta): ?string
    {
        return collect([...collect($meta)->pluck('at')->all(), Project::max('updated_at'), Service::max('updated_at')])
            ->filter()
            ->map(fn ($t) => CarbonImmutable::parse($t))
            ->sortDesc()
            ->first()
            ?->toIso8601String();
    }
}
