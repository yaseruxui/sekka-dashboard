<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
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

    /** Partial siteContentSchema: only the sections edited in the dashboard. */
    public function content(): JsonResponse
    {
        return response()->json((object) SiteContent::public(), options: JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
