<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * `permission:projects` or `permission:media,projects,site` (any of them):
 * the signed-in user must hold one of the listed User::PERMISSIONS.
 */
class EnsurePermission
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();
        foreach ($permissions as $permission) {
            if ($user?->hasPermission($permission)) {
                return $next($request);
            }
        }

        abort(403, 'ليس لديك صلاحية لهذا القسم.');
    }
}
