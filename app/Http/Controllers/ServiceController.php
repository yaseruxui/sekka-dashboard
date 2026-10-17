<?php

namespace App\Http\Controllers;

use App\Models\Service;
use App\Support\SiteContent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The services list. Which ones the home page shows, and in what order, is
 * picked in the home page's services section (home.serviceIds).
 */
class ServiceController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('services/index', [
            'services' => Service::orderBy('id')->get()->map(fn (Service $s) => [
                'id' => $s->id,
                'title' => $s->title,
                'title_en' => (string) $s->title_en,
                'subtitle' => (string) $s->subtitle,
                'subtitle_en' => (string) $s->subtitle_en,
                'video' => $s->video,
                'fit' => $s->fit,
            ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Service::create($this->validated($request));

        return $this->savedAndRevalidated(back(), 'تمت إضافة الخدمة. اخترها من قسم «الخدمات» في الصفحة الرئيسية حتى تظهر هناك.');
    }

    public function update(Request $request, Service $service): RedirectResponse
    {
        $service->update($this->validated($request));

        return $this->savedAndRevalidated(back(), 'تم حفظ الخدمة.');
    }

    public function destroy(Service $service): RedirectResponse
    {
        $service->delete();
        $home = SiteContent::get('home');
        if ($home !== null && isset($home['serviceIds'])) {
            $home['serviceIds'] = array_values(array_diff($home['serviceIds'], [$service->id]));
            SiteContent::put('home', $home);
        }

        return $this->savedAndRevalidated(back(), 'تم حذف الخدمة.');
    }

    /** @return list<int> */
    public static function homeIds(): array
    {
        $ids = SiteContent::get('home')['serviceIds'] ?? null;

        return is_array($ids) ? array_map('intval', $ids) : Service::orderBy('id')->pluck('id')->all();
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'title_en' => ['nullable', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'subtitle_en' => ['nullable', 'string', 'max:255'],
            'video' => ['required', 'string', 'max:2048'],
            'fit' => ['required', Rule::in(Service::FITS)],
        ], [
            'title.required' => 'اكتب اسم الخدمة.',
            'video.required' => 'اختر فيديو للخدمة.',
        ]);
    }
}
