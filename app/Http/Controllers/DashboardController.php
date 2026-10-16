<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use App\Models\Media;
use App\Models\Project;
use App\Support\SiteClient;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('dashboard', [
            'stats' => [
                'projects' => Project::count(),
                'published' => Project::where('published', true)->count(),
                'media' => Media::count(),
                'unread' => ContactMessage::whereNull('read_at')->count(),
            ],
            'recentProjects' => Project::latest('updated_at')->limit(5)->get(['id', 'slug', 'title', 'cover', 'published', 'updated_at']),
            'recentMessages' => ContactMessage::latest('id')->limit(5)->get(['id', 'name', 'email', 'company', 'read_at', 'created_at']),
            'site' => [
                'url' => config('sekka.site_url'),
                'connected' => SiteClient::configured(),
            ],
        ]);
    }
}
