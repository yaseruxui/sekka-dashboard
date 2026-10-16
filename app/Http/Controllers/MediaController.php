<?php

namespace App\Http\Controllers;

use App\Models\Media;
use App\Models\Project;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Uploaded images and clips. Each file keeps its intrinsic width / height,
 * which the site's image, video and grid blocks need (mediaSchema).
 */
class MediaController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('media/index', [
            'media' => $this->query($request)->paginate(48)->withQueryString(),
            'filters' => $request->only(['q', 'kind']),
        ]);
    }

    /** JSON list for the media picker in the editors. */
    public function list(Request $request): JsonResponse
    {
        return response()->json($this->query($request)->paginate(60)->withQueryString());
    }

    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:524288', 'mimetypes:image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml,video/mp4,video/webm,video/quicktime'],
            // Read in the browser; needed for clips, whose size PHP cannot read.
            'width' => ['nullable', 'integer', 'min:1'],
            'height' => ['nullable', 'integer', 'min:1'],
            'alt' => ['nullable', 'string', 'max:500'],
        ]);

        $file = $request->file('file');
        $base = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)) ?: 'file';
        $ext = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'bin');
        $path = $file->storeAs('media/'.now()->format('Y/m'), $base.'-'.Str::lower(Str::random(6)).'.'.$ext, 'public');

        [$width, $height] = $this->dimensions(Storage::disk('public')->path($path), $file->getMimeType())
            ?? [$request->integer('width') ?: null, $request->integer('height') ?: null];

        $media = Media::create([
            'path' => $path,
            'url' => Storage::disk('public')->url($path),
            'name' => $file->getClientOriginalName(),
            'mime' => (string) $file->getMimeType(),
            'size' => (int) $file->getSize(),
            'width' => $width,
            'height' => $height,
            'alt' => (string) $request->input('alt', ''),
        ]);

        return $request->wantsJson()
            ? response()->json($media, 201)
            : back()->with('success', 'تم رفع '.$media->name.'.');
    }

    public function update(Request $request, Media $media): JsonResponse|RedirectResponse
    {
        $media->update($request->validate([
            'alt' => ['nullable', 'string', 'max:500'],
            'width' => ['nullable', 'integer', 'min:1'],
            'height' => ['nullable', 'integer', 'min:1'],
        ]));

        return $request->wantsJson() ? response()->json($media) : back()->with('success', 'تم الحفظ.');
    }

    public function destroy(Request $request, Media $media): RedirectResponse
    {
        if (! $request->boolean('force') && $this->inUse($media->url)) {
            return back()->with('error', "الملف {$media->name} مستخدم في مشروع أو في محتوى الموقع. استبدله هناك أولاً.");
        }

        Storage::disk('public')->delete($media->path);
        $media->delete();

        return back()->with('success', 'تم حذف '.$media->name.'.');
    }

    private function query(Request $request)
    {
        return Media::query()
            ->when($request->string('q')->trim()->value(), fn ($q, $term) => $q->where('name', 'like', "%{$term}%"))
            ->when($request->input('kind') === 'image', fn ($q) => $q->where('mime', 'like', 'image/%'))
            ->when($request->input('kind') === 'video', fn ($q) => $q->where('mime', 'like', 'video/%'))
            ->latest('id');
    }

    /** @return array{0: int, 1: int}|null */
    private function dimensions(string $file, ?string $mime): ?array
    {
        if ($mime === 'image/svg+xml') {
            return $this->svgDimensions($file);
        }
        if (str_starts_with((string) $mime, 'image/') && ($size = @getimagesize($file))) {
            return [$size[0], $size[1]];
        }

        return null;
    }

    /** @return array{0: int, 1: int}|null */
    private function svgDimensions(string $file): ?array
    {
        $svg = @simplexml_load_string((string) file_get_contents($file));
        if (! $svg) {
            return null;
        }
        $w = (float) ($svg['width'] ?? 0);
        $h = (float) ($svg['height'] ?? 0);
        if ((! $w || ! $h) && isset($svg['viewBox'])) {
            $box = preg_split('/[\s,]+/', trim((string) $svg['viewBox']));
            [$w, $h] = [(float) ($box[2] ?? 0), (float) ($box[3] ?? 0)];
        }

        return $w > 0 && $h > 0 ? [(int) round($w), (int) round($h)] : null;
    }

    private function inUse(string $url): bool
    {
        // Few rows: decode and search in PHP rather than LIKE over escaped JSON.
        $contains = fn (mixed $value) => str_contains(json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), json_encode($url, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

        return Project::all(['cover', 'preview', 'blocks'])->contains(fn (Project $p) => $contains([$p->cover, $p->preview, $p->blocks]))
            || Setting::all(['value'])->contains(fn (Setting $s) => $contains($s->value));
    }
}
