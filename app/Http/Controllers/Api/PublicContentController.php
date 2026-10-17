<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\ServiceController;
use App\Models\Project;
use App\Models\Service;
use App\Support\SiteContent;
use Illuminate\Http\JsonResponse;

class PublicContentController extends Controller
{
    /** projectSchema[]: published projects, in dashboard order. */
    public function projects(): JsonResponse
    {
        $projects = Project::where('published', true)->ordered()->get()->map->toContract();

        return response()->json($projects->values(), options: JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * Partial siteContentSchema: only the sections edited in the dashboard,
     * plus `services` (the home page's service cards) and `workReel` (its work
     * reel tiles, from projects), each picked and ordered there.
     */
    public function content(): JsonResponse
    {
        $content = SiteContent::public();
        // No services yet: left out, so the site keeps its bundled ones.
        if (Service::exists()) {
            $byId = Service::whereIn('id', $ids = ServiceController::homeIds())->get()->keyBy('id');
            $content['services'] = collect($ids)->map(fn (int $id) => $byId->get($id)?->toContract())->filter()->values();
        }
        // Reel never picked: left out, so the site keeps home.workReel. Hidden or deleted projects drop out.
        $reelIds = SiteContent::get('home')['workReelIds'] ?? null;
        if (is_array($reelIds)) {
            $projects = Project::where('published', true)->whereIn('id', $reelIds)->get()->keyBy('id');
            $content['workReel'] = collect($reelIds)->map(fn ($id) => $projects->get((int) $id))->filter()->map(fn (Project $p) => [
                'src' => $p->cover,
                'href' => "/work/{$p->slug}",
                'title' => ['ar' => $p->title, 'en' => $p->title_en ?: $p->title],
            ])->values();
        }

        return response()->json((object) $content, options: JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
