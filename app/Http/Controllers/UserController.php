<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Notifications\Invitation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The dashboard's users and what each may open (User::PERMISSIONS). New users
 * are invited by email and pick their own password (Auth\InvitationController).
 * Someone must always be able to manage users: nobody removes their own
 * `users` permission or account, and the last user manager cannot be removed.
 */
class UserController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('users/index', [
            'users' => User::orderBy('created_at')->get()
                ->map(fn (User $u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'createdAt' => $u->created_at?->toIso8601String(),
                    'invitedAt' => $u->invited_at?->toIso8601String(),
                    'isMe' => $u->id === $request->user()->id,
                    'permissions' => $u->permissionList(),
                ]),
            'permissions' => User::PERMISSIONS,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            ...$this->permissionRules(),
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            // Unusable until they accept and pick their own.
            'password' => Hash::make(Str::random(64)),
            'permissions' => $this->clean($data['permissions']),
        ]);
        $this->invite($user, $request->user());

        return back()->with('success', "تم إرسال دعوة إلى {$user->email}.");
    }

    /** Sends the invitation again (a fresh week), e.g. when the first expired. */
    public function resend(Request $request, User $user): RedirectResponse
    {
        if (! $user->invited_at) {
            return back()->with('error', "{$user->name} قبل الدعوة من قبل.");
        }
        $this->invite($user, $request->user());

        return back()->with('success', "تم إرسال الدعوة من جديد إلى {$user->email}.");
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $permissions = $this->clean($request->validate($this->permissionRules())['permissions']);

        if ($user->is($request->user()) && ! in_array('users', $permissions, true)) {
            return back()->with('error', 'لا يمكنك إزالة صلاحية «المستخدمون» عن نفسك.');
        }
        if ($user->hasPermission('users') && ! in_array('users', $permissions, true) && $this->managers() <= 1) {
            return back()->with('error', 'لازم يبقى مستخدم واحد على الأقل يقدر يدير المستخدمين.');
        }

        $user->update(['permissions' => $permissions]);

        return back()->with('success', "تم حفظ صلاحيات {$user->name}.");
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($user->is($request->user())) {
            return back()->with('error', 'لا يمكنك حذف حسابك أنت.');
        }
        if ($user->hasPermission('users') && $this->managers() <= 1) {
            return back()->with('error', 'لازم يبقى مستخدم واحد على الأقل يقدر يدير المستخدمين.');
        }

        $user->delete();

        return back()->with('success', $user->invited_at ? "تم إلغاء دعوة {$user->email}." : "تم حذف {$user->name}.");
    }

    private function invite(User $user, User $by): void
    {
        $user->forceFill(['invited_at' => now()])->save();
        $user->notify(new Invitation(Password::broker('invites')->createToken($user), $by->name));
    }

    /** @return array<string, list<mixed>> */
    private function permissionRules(): array
    {
        return [
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', Rule::in(User::PERMISSIONS)],
        ];
    }

    /**
     * @param  list<string>  $permissions
     * @return list<string>
     */
    private function clean(array $permissions): array
    {
        return array_values(array_intersect(User::PERMISSIONS, $permissions));
    }

    /** Users who can manage users. */
    private function managers(): int
    {
        return User::all()->filter(fn (User $u) => $u->hasPermission('users'))->count();
    }
}
