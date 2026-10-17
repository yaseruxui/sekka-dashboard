<?php

use App\Http\Controllers\Settings\MailController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::redirect('settings', 'settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::post('settings/avatar', [ProfileController::class, 'updateAvatar'])->name('avatar.update');
    Route::delete('settings/avatar', [ProfileController::class, 'destroyAvatar'])->name('avatar.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('password.edit');
    Route::put('settings/password', [PasswordController::class, 'update'])->name('password.update');

    Route::redirect('settings/appearance', 'settings/dashboard');
    Route::get('settings/dashboard', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance');
});

Route::middleware(['auth', 'permission:users'])->group(function () {
    Route::get('settings/mail', [MailController::class, 'edit'])->name('mail.edit');
    Route::put('settings/mail', [MailController::class, 'update'])->name('mail.update');
    Route::post('settings/mail/test', [MailController::class, 'test'])->name('mail.test');
});
