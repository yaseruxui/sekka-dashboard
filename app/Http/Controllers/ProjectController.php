<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProjectRequest;
use App\Models\Category;
use App\Models\Project;
use App\Support\Blocks;
use App\Support\SiteContent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Projects. The editor autosaves a draft (never seen by the site); "نشر"
 * validates it, copies it over the published columns and refreshes the site.
 */
class ProjectController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('projects/index', [
            'projects' => Project::ordered()->get()->map(function (Project $p) {
                $work = $p->workingCopy();

                return [
                    'id' => $p->id,
                    'slug' => $work['slug'],
                    'title' => $work['title'],
                    'category' => $work['category'],
                    'year' => $work['year'],
                    'cover' => $work['cover'],
                    'preview' => $work['preview'],
                    'aspect' => $work['aspect'],
                    'blocksCount' => count($work['blocks'] ?? []),
                    'published' => $p->published,
                    'everPublished' => $p->hasBeenPublished(),
                    'hasDraft' => $p->draft !== null,
                    'updatedAt' => ($p->draft_saved_at ?? $p->updated_at)?->toIso8601String(),
                ];
            }),
            'categories' => Category::names(),
        ]);
    }

    /** "مشروع جديد": an empty, unpublished project, straight into the editor. */
    public function store(): RedirectResponse
    {
        $project = Project::create([
            'slug' => Project::uniqueSlug('new-project'),
            'title' => 'مشروع جديد',
            'summary' => '',
            'aspect' => '4:5',
            'year' => (string) now()->year,
            'blocks' => [],
            'published' => false,
            'position' => (int) Project::max('position') + 1,
        ]);

        return to_route('projects.edit', $project);
    }

    public function edit(Project $project): Response
    {
        return Inertia::render('projects/edit', [
            'project' => [
                ...$project->workingCopy(),
                'id' => $project->id,
                'published' => $project->published,
                'everPublished' => $project->hasBeenPublished(),
                'hasDraft' => $project->draft !== null,
                'draftSavedAt' => $project->draft_saved_at?->toIso8601String(),
                'publishedAt' => $project->published_at?->toIso8601String(),
            ],
            'aspects' => Project::ASPECTS,
            'categories' => Category::names(),
        ]);
    }

    /**
     * Autosave from the editor. Loosely checked (it is a draft); the full
     * contract is enforced on publish.
     */
    public function saveDraft(Request $request, Project $project): JsonResponse
    {
        $data = $request->validate([
            'slug' => ['nullable', 'string', 'max:120'],
            'title' => ['nullable', 'string', 'max:200'],
            'title_en' => ['nullable', 'string', 'max:200'],
            'summary' => ['nullable', 'string', 'max:2000'],
            'category' => ['nullable', 'string', 'max:120'],
            'year' => ['nullable', 'string', 'max:16'],
            'cover' => ['nullable', 'string', 'max:2048'],
            'preview' => ['nullable', 'string', 'max:2048'],
            'aspect' => ['nullable', 'string', 'max:8'],
            'blocks' => ['nullable', 'array'],
        ]);

        $draft = [
            ...array_map(fn ($v) => $v ?? '', array_intersect_key($data, array_flip(Project::EDITABLE))),
            'preview' => ($data['preview'] ?? null) ?: null,
            'blocks' => array_values($request->input('blocks', [])),
        ];
        // Edited back to what is published (e.g. undo): no draft left.
        $published = (clone $project)->forceFill(['draft' => null])->workingCopy();
        $same = $project->hasBeenPublished() && $this->sameContent($draft, $published);

        $project->update(['draft' => $same ? null : $draft, 'draft_saved_at' => $same ? null : now()]);

        return response()->json(['savedAt' => now()->toIso8601String(), 'hasDraft' => ! $same]);
    }

    private function sameContent(array $a, array $b): bool
    {
        $norm = fn (array $p) => json_encode(array_map(
            fn ($v) => is_array($v) ? Blocks::normalizeAll($v) : (string) $v,
            array_intersect_key(array_replace(array_fill_keys(Project::EDITABLE, ''), $p), array_flip(Project::EDITABLE)),
        ));

        return $norm($a) === $norm($b);
    }

    /** "نشر": the working copy becomes what the site shows. */
    public function publish(ProjectRequest $request, Project $project): RedirectResponse
    {
        $project->update([
            ...$request->project(),
            'published' => true,
            'published_at' => now(),
            'draft' => null,
            'draft_saved_at' => null,
        ]);

        return $this->savedAndRevalidated(back(), 'تم نشر المشروع.');
    }

    /** Drops the draft, back to the published version. */
    public function discardDraft(Project $project): RedirectResponse
    {
        $project->update(['draft' => null, 'draft_saved_at' => null]);

        return back()->with('success', 'تم الرجوع إلى النسخة المنشورة.');
    }

    /** The switch in the projects table: show or hide a published project. */
    public function visibility(Request $request, Project $project): RedirectResponse
    {
        $visible = $request->validate(['published' => ['required', 'boolean']])['published'];
        if ($visible && ! $project->hasBeenPublished()) {
            return back()->with('error', 'افتح المشروع واضغط «نشر» أول مرة قبل إظهاره.');
        }
        $project->update(['published' => $visible]);

        return $this->savedAndRevalidated(back(), $visible ? 'المشروع ظاهر على الموقع.' : 'المشروع مخفي عن الموقع.');
    }

    public function duplicate(Project $project): RedirectResponse
    {
        $work = $project->workingCopy();
        $copy = Project::create([
            ...$work,
            'slug' => Project::uniqueSlug($work['slug'].'-copy'),
            'title' => $work['title'].' (نسخة)',
            'blocks' => array_map(function (array $b) {
                $b['id'] = $b['type'].'-'.bin2hex(random_bytes(4));

                return $b;
            }, Blocks::normalizeAll($work['blocks'] ?? [])),
            'published' => false,
            'position' => (int) Project::max('position') + 1,
        ]);

        return to_route('projects.edit', $copy)->with('success', 'تم نسخ المشروع. عدّله ثم انشره.');
    }

    public function destroy(Project $project): RedirectResponse
    {
        $wasLive = $project->published;
        $project->delete();
        $this->dropFromWorkReel([$project->id]);
        $redirect = to_route('projects.index');

        return $wasLive ? $this->savedAndRevalidated($redirect, 'تم حذف المشروع.') : $redirect->with('success', 'تم حذف المشروع.');
    }

    /** Show, hide or delete the projects ticked in the list. */
    public function bulk(Request $request): RedirectResponse
    {
        ['ids' => $ids, 'action' => $action] = $this->bulkInput($request, ['show', 'hide', 'delete']);
        $projects = Project::whereIn('id', $ids)->get();

        if ($action === 'delete') {
            $wasLive = $projects->contains('published', true);
            Project::whereKey($projects->modelKeys())->delete();
            $this->dropFromWorkReel($projects->modelKeys());
            $message = "تم حذف {$projects->count()} مشروع.";

            return $wasLive ? $this->savedAndRevalidated(back(), $message) : back()->with('success', $message);
        }

        $visible = $action === 'show';
        // Same rule as the switch: a project goes live the first time from the editor's «نشر».
        [$eligible, $neverPublished] = $visible ? $projects->partition->hasBeenPublished() : [$projects, collect()];
        Project::whereKey($eligible->modelKeys())->update(['published' => $visible]);

        $message = $visible ? "تم إظهار {$eligible->count()} مشروع على الموقع." : "تم إخفاء {$eligible->count()} مشروع عن الموقع.";
        if ($neverPublished->isNotEmpty()) {
            $message .= " تخطّينا {$neverPublished->count()} مسودة لم تُنشر بعد: افتحها واضغط «نشر» أول مرة.";
        }

        return $eligible->isEmpty() ? back()->with('error', $message) : $this->savedAndRevalidated(back(), $message);
    }

    /** Out of the home work reel too, or the next home save would fail on a missing id. */
    private function dropFromWorkReel(array $ids): void
    {
        $home = SiteContent::get('home');
        if ($home !== null && isset($home['workReelIds'])) {
            $home['workReelIds'] = array_values(array_diff($home['workReelIds'], $ids));
            SiteContent::put('home', $home);
        }
    }

    /** New order from the projects table: every project id, first to last. */
    public function reorder(Request $request): RedirectResponse
    {
        $ids = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'distinct', 'exists:projects,id'],
        ])['ids'];

        DB::transaction(function () use ($ids) {
            foreach (array_values($ids) as $position => $id) {
                Project::whereKey($id)->update(['position' => $position]);
            }
        });

        return $this->savedAndRevalidated(back(), 'تم حفظ الترتيب.');
    }
}
