<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use App\Models\Project;
use App\Support\SiteClient;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('dashboard', [
            'stats' => [
                'published' => Project::where('published', true)->count(),
                'drafts' => Project::where(fn ($q) => $q->where('published', false)->orWhereNotNull('draft'))->count(),
                'unread' => ContactMessage::whereNull('read_at')->count(),
            ],
            'recentMessages' => ContactMessage::latest('id')->limit(5)
                ->get(['id', 'name', 'company', 'message', 'estimated_budget', 'read_at', 'created_at']),
            'site' => [
                'url' => config('sekka.site_url'),
                'connected' => SiteClient::configured(),
                'lastRefresh' => cache('sekka.last_revalidate'),
            ],
        ]);
    }
}
