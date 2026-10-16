<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Enquiries from the site's contact form (posted to /api/contact). A message
 * opens in a side sheet on the list; opening it marks it read.
 */
class InboxController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('inbox/index', [
            'messages' => $this->query($request)->paginate(25)->withQueryString(),
            'filters' => $request->only(['filter', 'q']),
            'counts' => [
                'all' => ContactMessage::count(),
                'unread' => ContactMessage::whereNull('read_at')->count(),
            ],
        ]);
    }

    public function markRead(Request $request, ContactMessage $message): RedirectResponse
    {
        $read = $request->validate(['read' => ['required', 'boolean']])['read'];
        $message->update(['read_at' => $read ? ($message->read_at ?? now()) : null]);

        return back();
    }

    public function destroy(ContactMessage $message): RedirectResponse
    {
        $message->delete();

        return back()->with('success', 'تم حذف الرسالة.');
    }

    /** CSV (UTF-8 with BOM, so Excel shows Arabic correctly) of the filtered list. */
    public function export(Request $request): StreamedResponse
    {
        $rows = $this->query($request)->get();

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['الاسم', 'الشركة', 'البريد الإلكتروني', 'الميزانية', 'الرسالة', 'اللغة', 'الصفحة', 'التاريخ', 'الحالة']);
            // Visitors write these fields: a leading = + - @ (or tab / CR) would run as a formula in Excel.
            $cell = fn ($v) => is_string($v) && preg_match('/^[=+\-@\t\r]/', $v) ? "'".$v : $v;
            foreach ($rows as $m) {
                fputcsv($out, array_map($cell, [
                    $m->name, $m->company, $m->email, $m->estimated_budget, $m->message, $m->locale, $m->page_uri,
                    ($m->submitted_at ?? $m->created_at)?->format('Y-m-d H:i'),
                    $m->read_at ? 'مقروءة' : 'جديدة',
                ]));
            }
            fclose($out);
        }, 'sekka-messages-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function query(Request $request): Builder
    {
        return ContactMessage::query()
            ->when($request->input('filter') === 'unread', fn ($q) => $q->whereNull('read_at'))
            ->when($request->string('q')->trim()->value(), fn ($q, $term) => $q->where(fn ($q) => $q
                ->where('name', 'like', "%{$term}%")
                ->orWhere('email', 'like', "%{$term}%")
                ->orWhere('company', 'like', "%{$term}%")
                ->orWhere('message', 'like', "%{$term}%")))
            ->latest('id');
    }
}
