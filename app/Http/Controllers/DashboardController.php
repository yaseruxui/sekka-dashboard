<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use App\Models\Project;
use App\Support\SiteClient;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        // Visitors' messages only for those who may read the inbox.
        $inbox = $request->user()->hasPermission('inbox');

        return Inertia::render('dashboard', [
            'stats' => [
                'published' => Project::where('published', true)->count(),
                'drafts' => Project::where(fn ($q) => $q->where('published', false)->orWhereNotNull('draft'))->count(),
                'unread' => ContactMessage::where('status', 'new')->count(),
            ],
            'recentMessages' => ! $inbox ? [] : ContactMessage::latest('id')->limit(5)
                ->get(['id', 'name', 'company', 'message', 'estimated_budget', 'status', 'created_at']),
            'site' => [
                'url' => config('sekka.site_url'),
                'connected' => SiteClient::configured(),
                'lastRefresh' => cache('sekka.last_revalidate'),
                'failedAt' => cache('sekka.revalidate_failed_at'),
            ],
        ]);
    }
}
