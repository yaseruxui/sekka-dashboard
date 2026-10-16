<?php

namespace App\Http\Requests;

use App\Models\Project;
use App\Support\Blocks;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The project form, checked against projectSchema (resources/js/contracts/project.ts).
 */
class ProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'slug' => strtolower(trim((string) $this->input('slug'))),
            'blocks' => is_array($this->input('blocks')) ? array_values($this->input('blocks')) : [],
        ]);
    }

    public function rules(): array
    {
        $project = $this->route('project');

        return [
            'slug' => ['required', 'string', 'max:120', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('projects', 'slug')->ignore($project?->id)],
            'title' => ['required', 'string', 'max:200'],
            'summary' => ['nullable', 'string', 'max:2000'],
            'category' => ['nullable', 'string', 'max:120'],
            'year' => ['nullable', 'string', 'max:16'],
            'cover' => ['nullable', 'string', 'max:2048'],
            'preview' => ['nullable', 'string', 'max:2048'],
            'aspect' => ['required', Rule::in(Project::ASPECTS)],
            'published' => ['boolean'],
            ...Blocks::rules($this->input('blocks', [])),
        ];
    }

    public function messages(): array
    {
        return [
            'slug.regex' => 'Use lowercase letters, digits and dashes (e.g. chaos-campaign).',
        ];
    }

    /** Validated data in the stored shape, blocks normalised. */
    public function project(): array
    {
        $data = $this->validated();

        return [
            'slug' => $data['slug'],
            'title' => $data['title'],
            'summary' => (string) ($data['summary'] ?? ''),
            'category' => (string) ($data['category'] ?? ''),
            'year' => (string) ($data['year'] ?? ''),
            'cover' => (string) ($data['cover'] ?? ''),
            'preview' => ($data['preview'] ?? '') ?: null,
            'aspect' => $data['aspect'],
            'published' => (bool) ($data['published'] ?? true),
            'blocks' => Blocks::normalizeAll($this->input('blocks', [])),
        ];
    }
}
