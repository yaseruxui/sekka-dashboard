<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** Accepting an invitation (Notifications\Invitation): pick a password, then straight in. */
class InvitationController extends Controller
{
    public function show(Request $request, string $token): Response
    {
        return Inertia::render('auth/reset-password', [
            'email' => $request->string('email')->value(),
            'token' => $token,
            'invitation' => true,
        ]);
    }

    public function accept(Request $request): RedirectResponse
    {
        $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $accepted = null;
        $status = Password::broker('invites')->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user) use ($request, &$accepted) {
                $user->forceFill([
                    'password' => Hash::make($request->password),
                    'remember_token' => Str::random(60),
                    'invited_at' => null,
                    'email_verified_at' => $user->email_verified_at ?? now(),
                ])->save();
                event(new PasswordReset($user));
                $accepted = $user;
            },
        );

        if ($status !== Password::PasswordReset || ! $accepted) {
            throw ValidationException::withMessages([
                'email' => 'رابط الدعوة غير صالح أو انتهت صلاحيته. اطلب دعوة جديدة.',
            ]);
        }

        Auth::login($accepted);
        $request->session()->regenerate();

        return redirect()->route('dashboard')->with('success', "أهلاً {$accepted->name}، تم تفعيل حسابك.");
    }
}
