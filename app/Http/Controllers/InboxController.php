<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Enquiries from the site's contact form (posted to /api/contact).
 */
class InboxController extends Controller
{
    public function index(Request $request): Response
    {
        $messages = ContactMessage::query()
            ->when($request->input('filter') === 'unread', fn ($q) => $q->whereNull('read_at'))
            ->when($request->string('q')->trim()->value(), fn ($q, $term) => $q->where(fn ($q) => $q
                ->where('name', 'like', "%{$term}%")
                ->orWhere('email', 'like', "%{$term}%")
                ->orWhere('company', 'like', "%{$term}%")
                ->orWhere('message', 'like', "%{$term}%")))
            ->latest('id')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('inbox/index', [
            'messages' => $messages,
            'filters' => $request->only(['filter', 'q']),
        ]);
    }

    /** Opening a message marks it read. */
    public function show(ContactMessage $message): Response
    {
        if (! $message->read_at) {
            $message->update(['read_at' => now()]);
        }

        return Inertia::render('inbox/show', ['message' => $message]);
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

        return to_route('inbox.index')->with('success', 'Message deleted.');
    }
}
