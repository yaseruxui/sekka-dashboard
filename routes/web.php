<?php

use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InboxController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\SiteController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard')->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::get('notifications/{id}', [NotificationController::class, 'open'])->name('notifications.open');
    Route::post('notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.read-all');

    Route::middleware('permission:projects')->group(function () {
        Route::controller(ProjectController::class)->group(function () {
            Route::get('projects', 'index')->name('projects.index');
            Route::post('projects', 'store')->name('projects.store');
            Route::post('projects/reorder', 'reorder')->name('projects.reorder');
            Route::post('projects/bulk', 'bulk')->name('projects.bulk');
            Route::get('projects/{project}/edit', 'edit')->name('projects.edit');
            Route::put('projects/{project}/draft', 'saveDraft')->name('projects.draft');
            Route::delete('projects/{project}/draft', 'discardDraft')->name('projects.draft.discard');
            Route::post('projects/{project}/publish', 'publish')->name('projects.publish');
            Route::patch('projects/{project}/visibility', 'visibility')->name('projects.visibility');
            Route::post('projects/{project}/duplicate', 'duplicate')->name('projects.duplicate');
            Route::delete('projects/{project}', 'destroy')->name('projects.destroy');
        });
        Route::post('categories', [CategoryController::class, 'store'])->name('categories.store');
    });

    // The project and site editors pick and upload files too.
    Route::middleware('permission:media,projects,site')->group(function () {
        Route::get('media/list', [MediaController::class, 'list'])->name('media.list');
        Route::get('media/{media}/usage', [MediaController::class, 'usage'])->name('media.usage');
        Route::post('media', [MediaController::class, 'store'])->name('media.store');
    });
    // The library itself: browsing all of it, editing and deleting files.
    Route::middleware('permission:media')->group(function () {
        Route::get('media', [MediaController::class, 'index'])->name('media.index');
        Route::match(['put', 'patch'], 'media/{media}', [MediaController::class, 'update'])->name('media.update');
        Route::post('media/bulk', [MediaController::class, 'bulk'])->name('media.bulk');
        Route::delete('media/{media}', [MediaController::class, 'destroy'])->name('media.destroy');
    });

    Route::middleware('permission:site')->group(function () {
        Route::get('site/{page}', [SiteController::class, 'show'])->whereIn('page', SiteController::PAGES)->name('site.show');
        Route::put('site', [SiteController::class, 'update'])->name('site.update');
        Route::get('services', [ServiceController::class, 'index'])->name('services.index');
        Route::post('services', [ServiceController::class, 'store'])->name('services.store');
        Route::post('services/bulk', [ServiceController::class, 'bulk'])->name('services.bulk');
        Route::put('services/{service}', [ServiceController::class, 'update'])->name('services.update');
        Route::delete('services/{service}', [ServiceController::class, 'destroy'])->name('services.destroy');
    });

    Route::middleware('permission:users')->controller(UserController::class)->group(function () {
        Route::get('users', 'index')->name('users.index');
        Route::post('users', 'store')->name('users.store');
        Route::post('users/bulk', 'bulk')->name('users.bulk');
        Route::post('users/{user}/invite', 'resend')->name('users.invite');
        Route::patch('users/{user}', 'update')->name('users.update');
        Route::delete('users/{user}', 'destroy')->name('users.destroy');
    });

    Route::middleware('permission:inbox')->group(function () {
        Route::get('inbox', [InboxController::class, 'index'])->name('inbox.index');
        Route::get('inbox/export', [InboxController::class, 'export'])->name('inbox.export');
        Route::patch('inbox/status', [InboxController::class, 'bulkStatus'])->name('inbox.bulk-status');
        Route::post('inbox/bulk', [InboxController::class, 'bulkDestroy'])->name('inbox.bulk');
        Route::patch('inbox/{message}/status', [InboxController::class, 'status'])->name('inbox.status');
        Route::post('inbox/{message}/notes', [InboxController::class, 'note'])->name('inbox.notes');
        Route::patch('inbox/notes/{note}', [InboxController::class, 'updateNote'])->name('inbox.notes.update');
        Route::delete('inbox/notes/{note}', [InboxController::class, 'destroyNote'])->name('inbox.notes.destroy');
        Route::delete('inbox/{message}', [InboxController::class, 'destroy'])->name('inbox.destroy');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
