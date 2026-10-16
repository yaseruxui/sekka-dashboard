<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Models\User;
use App\Notifications\NewEnquiry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Throwable;

/**
 * The site's contact form webhook: sekka-next posts each submission here
 * (CONTACT_WEBHOOK_URL = {APP_URL}/api/contact?key={CONTACT_WEBHOOK_KEY}),
 * already validated and with the honeypot removed. Body as in the site's
 * features/contact/services/deliver.ts.
 */
class ContactController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $expected = (string) config('sekka.contact_webhook_key');
        if ($expected === '') {
            return response()->json(['error' => 'not_configured'], 503);
        }
        if (! hash_equals($expected, (string) $request->query('key', ''))) {
            return response()->json(['error' => 'unauthorized'], 401);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:200'],
            'company' => ['nullable', 'string', 'max:200'],
            'email' => ['required', 'email', 'max:320'],
            'message' => ['nullable', 'string', 'max:5000'],
            'estimatedBudget' => ['nullable', 'string', 'max:200'],
            'locale' => ['nullable', 'string', 'max:8'],
            'pageUri' => ['nullable', 'string', 'max:2048'],
            'submittedAt' => ['nullable', 'date'],
        ]);

        $message = ContactMessage::create([
            'name' => $data['name'],
            'company' => (string) ($data['company'] ?? ''),
            'email' => $data['email'],
            'message' => $data['message'] ?? null,
            'estimated_budget' => $data['estimatedBudget'] ?? null,
            'locale' => $data['locale'] ?? null,
            'page_uri' => $data['pageUri'] ?? null,
            'submitted_at' => isset($data['submittedAt']) ? now()->parse($data['submittedAt']) : now(),
        ]);

        $this->notifyInbox($message);

        return response()->json(['ok' => true, 'id' => $message->id], 201);
    }

    /** Email everyone who handles the inbox (active accounts only). A mail failure never loses the enquiry. */
    private function notifyInbox(ContactMessage $message): void
    {
        try {
            $staff = User::whereNull('invited_at')->get()->filter(fn (User $u) => $u->hasPermission('inbox'));
            Notification::send($staff, new NewEnquiry($message));
        } catch (Throwable $e) {
            report($e);
        }
    }
}
