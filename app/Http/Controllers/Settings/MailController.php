<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Support\MailSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/** Settings → Email: the SMTP server the dashboard sends from (admins only). */
class MailController extends Controller
{
    public function edit(): Response
    {
        $s = MailSettings::get();

        return Inertia::render('settings/mail', [
            'settings' => [...$s, 'password' => '', 'hasPassword' => $s['password'] !== ''],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'enabled' => ['boolean'],
            'host' => ['required_if:enabled,true', 'nullable', 'string', 'max:255'],
            'port' => ['required', 'integer', 'between:1,65535'],
            'username' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'max:255'],
            'encryption' => ['required', Rule::in(['tls', 'ssl', 'none'])],
            'from_address' => ['required_if:enabled,true', 'nullable', 'email', 'max:320'],
            'from_name' => ['nullable', 'string', 'max:100'],
        ]);

        $password = $data['password'] ?? null;
        unset($data['password']);
        MailSettings::save([
            ...$data,
            'enabled' => (bool) ($data['enabled'] ?? false),
            'host' => (string) ($data['host'] ?? ''),
            'username' => (string) ($data['username'] ?? ''),
            'from_address' => (string) ($data['from_address'] ?? ''),
            'from_name' => (string) ($data['from_name'] ?? ''),
        ], $password === '' ? null : $password);

        return back()->with('success', 'تم حفظ إعدادات البريد.');
    }

    /** Send a test email to the signed-in admin with the saved settings. */
    public function test(Request $request): RedirectResponse
    {
        MailSettings::apply();
        try {
            Mail::raw('هذه رسالة تجريبية من لوحة تحكم سكة. إذا وصلتك، فإعدادات البريد تعمل.', function ($m) use ($request) {
                $m->to($request->user()->email)->subject('رسالة تجريبية من لوحة سكة');
            });
        } catch (Throwable $e) {
            return back()->with('error', 'فشل الإرسال: '.$e->getMessage());
        }

        return back()->with('success', "تم إرسال رسالة تجريبية إلى {$request->user()->email}.");
    }
}
