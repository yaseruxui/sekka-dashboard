<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use App\Models\ContactMessageNote;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Enquiries from the site's contact form (posted to /api/contact). A message
 * opens in a side sheet on the list. Its status only changes by hand, from
 * the status menu; status changes and notes are kept in an activity log.
 * Only admins (the `users` permission) delete; staff close or mark as spam.
 */
class InboxController extends Controller
{
    private const STATUS_LABELS = ['new' => 'جديد', 'in_progress' => 'قيد المتابعة', 'replied' => 'تم الرد', 'closed' => 'مغلق', 'spam' => 'مزعج'];

    public function index(Request $request): Response
    {
        $counts = ContactMessage::query()->selectRaw('status, count(*) as n')->groupBy('status')->pluck('n', 'status');
        $with = ['notes.user:id,name', 'events.user:id,name'];
        $messages = $this->query($request)->with($with)->paginate(25)->withQueryString();

        // ?open={id} (links from the home page and the new-enquiry email) opens
        // that message even when it is not on the current page of the list.
        $openId = $request->integer('open');
        $opened = $openId && ! $messages->getCollection()->contains('id', $openId)
            ? ContactMessage::with($with)->find($openId)
            : null;

        return Inertia::render('inbox/index', [
            'messages' => $messages,
            'opened' => $opened,
            'filters' => $request->only(['filter', 'q']),
            'counts' => [
                'all' => ContactMessage::where('status', '!=', 'spam')->count(),
                ...collect(ContactMessage::STATUSES)->mapWithKeys(fn ($s) => [$s => (int) ($counts[$s] ?? 0)]),
            ],
            'canDelete' => $request->user()->hasPermission('users'),
        ]);
    }

    public function status(Request $request, ContactMessage $message): RedirectResponse
    {
        $to = $request->validate(['status' => ['required', Rule::in(ContactMessage::STATUSES)]])['status'];
        if ($to === $message->status) {
            return back();
        }

        $message->log($request->user(), 'status', ['from' => $message->status, 'to' => $to]);
        $message->update(['status' => $to]);

        return back()->with('success', 'الحالة الآن: '.self::STATUS_LABELS[$to]);
    }

    /** Same status for several messages at once (the list's selection bar). */
    public function bulkStatus(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'max:100'],
            'ids.*' => ['integer'],
            'status' => ['required', Rule::in(ContactMessage::STATUSES)],
        ]);

        $changed = 0;
        foreach (ContactMessage::whereIn('id', $data['ids'])->where('status', '!=', $data['status'])->get() as $message) {
            $message->log($request->user(), 'status', ['from' => $message->status, 'to' => $data['status']]);
            $message->update(['status' => $data['status']]);
            $changed++;
        }

        return back()->with('success', "تم تغيير حالة {$changed} طلب إلى: ".self::STATUS_LABELS[$data['status']]);
    }

    public function note(Request $request, ContactMessage $message): RedirectResponse
    {
        $body = $request->validate(['body' => ['required', 'string', 'max:5000']])['body'];
        $message->notes()->create(['user_id' => $request->user()->id, 'body' => $body]);
        $message->log($request->user(), 'note');

        return back()->with('success', 'تمت إضافة الملاحظة.');
    }

    /** Notes are edited or deleted by their author, or by an admin. */
    public function updateNote(Request $request, ContactMessageNote $note): RedirectResponse
    {
        $this->authorizeNote($request, $note);
        $note->update($request->validate(['body' => ['required', 'string', 'max:5000']]));

        return back()->with('success', 'تم تعديل الملاحظة.');
    }

    public function destroyNote(Request $request, ContactMessageNote $note): RedirectResponse
    {
        $this->authorizeNote($request, $note);
        $note->delete();

        return back()->with('success', 'تم حذف الملاحظة.');
    }

    private function authorizeNote(Request $request, ContactMessageNote $note): void
    {
        $user = $request->user();
        abort_unless($note->user_id === $user->id || $user->hasPermission('users'), 403, 'تعدّل أو تحذف ملاحظاتك فقط.');
    }

    public function destroy(Request $request, ContactMessage $message): RedirectResponse
    {
        abort_unless($request->user()->hasPermission('users'), 403, 'الحذف للمسؤولين فقط. أغلق الطلب أو علّمه كمزعج.');
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
                    self::STATUS_LABELS[$m->status] ?? $m->status,
                ]));
            }
            fclose($out);
        }, 'sekka-messages-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function query(Request $request): Builder
    {
        $filter = $request->input('filter');

        return ContactMessage::query()
            ->when(in_array($filter, ContactMessage::STATUSES, true), fn ($q) => $q->where('status', $filter), fn ($q) => $q->where('status', '!=', 'spam'))
            ->when($request->string('q')->trim()->value(), fn ($q, $term) => $q->where(fn ($q) => $q
                ->where('name', 'like', "%{$term}%")
                ->orWhere('email', 'like', "%{$term}%")
                ->orWhere('company', 'like', "%{$term}%")
                ->orWhere('message', 'like', "%{$term}%")))
            ->latest('id');
    }
}
