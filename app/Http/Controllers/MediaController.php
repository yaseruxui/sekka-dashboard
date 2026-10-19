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
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Uploaded images and clips. Each file keeps its intrinsic width / height,
 * which the site's image, video and grid blocks need (mediaSchema).
 */
class MediaController extends Controller
{
    /** Stored extension per accepted type. */
    private const EXTENSIONS = [
        'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif',
        'image/avif' => 'avif', 'image/svg+xml' => 'svg', 'video/mp4' => 'mp4', 'video/webm' => 'webm', 'video/quicktime' => 'mov',
    ];

    public function index(Request $request): Response
    {
        return Inertia::render('media/index', [
            'media' => $this->query($request)->paginate(64)->withQueryString(),
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
        $mime = (string) $file->getMimeType();
        if ($mime === 'image/svg+xml' && ! $this->safeSvg((string) file_get_contents($file->getRealPath()))) {
            throw ValidationException::withMessages(['file' => 'ملف SVG هذا فيه سكربت أو روابط غير مسموحة. صدّره من جديد كصورة عادية.']);
        }
        $base = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)) ?: 'file';
        // From the detected type, never the client's file name (a "logo.html" that sniffs as SVG stays .svg).
        $ext = self::EXTENSIONS[$mime] ?? 'bin';
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
        $usages = $this->usages($media->url);
        // On the live site: never, even forced (the page would show a broken image).
        $live = array_column(array_filter($usages, fn ($u) => $u['live']), 'label');
        if ($live !== []) {
            return back()->with('error', "الملف {$media->name} ظاهر على الموقع (".implode('، ', $live).'). استبدله هناك أولاً.');
        }
        // Only in unpublished drafts: allowed once confirmed.
        if (! $request->boolean('force') && $usages !== []) {
            return back()->with('error', "الملف {$media->name} مستخدم في مسودة مشروع. استبدله هناك أولاً.");
        }

        Storage::disk('public')->delete($media->path);
        $media->delete();

        return back()->with('success', 'تم حذف '.$media->name.'.');
    }

    /** Delete the files ticked in the library; any file still in use (live or in a draft) is skipped. */
    public function bulk(Request $request): RedirectResponse
    {
        $files = Media::whereIn('id', $this->bulkInput($request, ['delete'])['ids'])->get();
        [$inUse, $free] = $files->partition(fn (Media $m) => $this->usages($m->url) !== []);

        Storage::disk('public')->delete($free->pluck('path')->all());
        Media::whereKey($free->modelKeys())->delete();

        $message = "تم حذف {$free->count()} ملف.";
        if ($inUse->isNotEmpty()) {
            $message .= " تخطّينا {$inUse->count()} مستخدم في الموقع أو في مسودة: ".$inUse->pluck('name')->take(5)->implode('، ').($inUse->count() > 5 ? '…' : '');
        }

        return back()->with($free->isEmpty() ? 'error' : 'success', $message);
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
    /**
     * SVGs are served from /storage on the dashboard's own origin, so one that
     * carries script would run with an admin's session. Plain artwork never
     * needs scripts, event handlers, embedded HTML, javascript: links or DTDs.
     */
    private function safeSvg(string $svg): bool
    {
        return ! preg_match(
            '/<\s*(?:script|foreignObject|iframe|embed|object)\b|\son[a-z]+\s*=|(?:href|src)\s*=\s*["\']?\s*(?:javascript:|data:text\/html)|<!(?:ENTITY|DOCTYPE)/i',
            $svg,
        );
    }

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

    /** Where a file is used, for the details sheet: [{label, href}]. */
    public function usage(Media $media): JsonResponse
    {
        return response()->json($this->usages($media->url));
    }

    /**
     * Where a file is used. `live`: the public site shows it now (a published
     * project's published version, or a site section).
     *
     * @return list<array{label: string, href: string, live: bool}>
     */
    private function usages(string $url): array
    {
        // Few rows: decode and search in PHP rather than LIKE over escaped JSON.
        $needle = json_encode($url, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $contains = fn (mixed $value) => $value !== null && str_contains(json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), $needle);
        $out = [];

        foreach (Project::ordered()->get(['id', 'title', 'published', 'cover', 'preview', 'blocks', 'draft']) as $p) {
            if ($contains([$p->cover, $p->preview, $p->blocks, $p->draft])) {
                $live = $p->published && $contains([$p->cover, $p->preview, $p->blocks]);
                $out[] = ['label' => 'مشروع: '.$p->title, 'href' => route('projects.edit', $p), 'live' => $live];
            }
        }
        $sections = ['home' => ['الصفحة الرئيسية', 'home'], 'contact' => ['تواصل معنا', 'contact']];
        foreach ($sections as $key => [$label, $page]) {
            if ($contains(Setting::getValue($key))) {
                $out[] = ['label' => $label, 'href' => route('site.show', $page), 'live' => true];
            }
        }

        return $out;
    }
}
