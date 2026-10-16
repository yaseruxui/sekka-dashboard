<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProjectRequest;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('projects/index', [
            'projects' => Project::ordered()
                ->get(['id', 'slug', 'title', 'category', 'year', 'cover', 'preview', 'aspect', 'position', 'published', 'blocks', 'updated_at'])
                ->map(fn (Project $p) => [
                    ...$p->only(['id', 'slug', 'title', 'category', 'year', 'cover', 'preview', 'aspect', 'position', 'published']),
                    'blocksCount' => count($p->blocks ?? []),
                    'updatedAt' => $p->updated_at?->toIso8601String(),
                ]),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('projects/edit', [
            'project' => null,
            'aspects' => Project::ASPECTS,
        ]);
    }

    public function store(ProjectRequest $request): RedirectResponse
    {
        $project = Project::create([
            ...$request->project(),
            'position' => (int) Project::max('position') + 1,
        ]);

        return $this->savedAndRevalidated(to_route('projects.edit', $project), 'Project created.');
    }

    public function edit(Project $project): Response
    {
        return Inertia::render('projects/edit', [
            'project' => [...$project->toContract(), 'id' => $project->id, 'published' => $project->published],
            'aspects' => Project::ASPECTS,
        ]);
    }

    public function update(ProjectRequest $request, Project $project): RedirectResponse
    {
        $project->update($request->project());

        return $this->savedAndRevalidated(back(), 'Project saved.');
    }

    public function destroy(Project $project): RedirectResponse
    {
        $project->delete();

        return $this->savedAndRevalidated(to_route('projects.index'), 'Project deleted.');
    }

    /** New order from the sortable table: every project id, first to last. */
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

        return $this->savedAndRevalidated(back(), 'Order saved.');
    }

    public function publish(Request $request, Project $project): RedirectResponse
    {
        $project->update(['published' => $request->validate(['published' => ['required', 'boolean']])['published']]);

        return $this->savedAndRevalidated(back(), $project->published ? 'Project published.' : 'Project hidden from the site.');
    }
}
