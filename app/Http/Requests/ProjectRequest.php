<?php

namespace App\Http\Requests;

use App\Models\Category;
use App\Models\Project;
use App\Support\Blocks;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Publishing a project: the whole working copy, checked against projectSchema
 * (resources/js/contracts/project.ts).
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
            'title_en' => ['nullable', 'string', 'max:200'],
            'summary' => ['nullable', 'string', 'max:2000'],
            'category' => ['nullable', 'string', 'max:120'],
            'year' => ['nullable', 'string', 'max:16'],
            'cover' => ['required', 'string', 'max:2048'],
            'preview' => ['nullable', 'string', 'max:2048'],
            'aspect' => ['required', Rule::in(Project::ASPECTS)],
            ...Blocks::rules($this->input('blocks', [])),
        ];
    }

    public function messages(): array
    {
        return [
            'slug.regex' => 'استخدم حروفاً إنجليزية صغيرة وأرقاماً وشرطات فقط (مثل chaos-campaign).',
            'slug.unique' => 'هذا الرابط مستخدم في مشروع آخر.',
            'cover.required' => 'اختر صورة غلاف قبل النشر.',
        ];
    }

    /** Validated data in the stored shape, blocks normalised. */
    public function project(): array
    {
        $data = $this->validated();
        if (! empty($data['category'])) {
            Category::ensure([$data['category']]);
        }

        return [
            'slug' => $data['slug'],
            'title' => $data['title'],
            'title_en' => (string) ($data['title_en'] ?? ''),
            'summary' => (string) ($data['summary'] ?? ''),
            'category' => (string) ($data['category'] ?? ''),
            'year' => (string) ($data['year'] ?? ''),
            'cover' => (string) $data['cover'],
            'preview' => ($data['preview'] ?? '') ?: null,
            'aspect' => $data['aspect'],
            'blocks' => Blocks::normalizeAll($this->input('blocks', [])),
        ];
    }
}
