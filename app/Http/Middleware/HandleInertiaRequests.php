<?php

namespace App\Http\Middleware;

use App\Models\ContactMessage;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'siteUrl' => config('sekka.site_url'),
            'auth' => [
                'user' => $request->user(),
                'permissions' => $request->user()?->permissionList() ?? [],
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'unreadMessages' => fn () => $request->user()?->hasPermission('inbox') ? ContactMessage::where('status', 'new')->count() : 0,
            // The bell: unread count and the latest few (the sidebar polls this prop).
            'notifications' => fn () => ! $request->user() ? null : [
                'unread' => $request->user()->unreadNotifications()->count(),
                'items' => $request->user()->notifications()->limit(8)->get()->map(fn ($n) => [
                    'id' => $n->id,
                    'title' => $n->data['title'] ?? '',
                    'body' => $n->data['body'] ?? '',
                    'read' => $n->read_at !== null,
                    'created_at' => $n->created_at,
                ]),
            ],
        ];
    }
}
