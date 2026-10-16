<?php

use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InboxController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\SiteController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard')->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::post('site/refresh', [DashboardController::class, 'refreshSite'])->name('site.refresh');

    Route::controller(ProjectController::class)->group(function () {
        Route::get('projects', 'index')->name('projects.index');
        Route::post('projects', 'store')->name('projects.store');
        Route::post('projects/reorder', 'reorder')->name('projects.reorder');
        Route::get('projects/{project}/edit', 'edit')->name('projects.edit');
        Route::put('projects/{project}/draft', 'saveDraft')->name('projects.draft');
        Route::delete('projects/{project}/draft', 'discardDraft')->name('projects.draft.discard');
        Route::post('projects/{project}/publish', 'publish')->name('projects.publish');
        Route::patch('projects/{project}/visibility', 'visibility')->name('projects.visibility');
        Route::post('projects/{project}/duplicate', 'duplicate')->name('projects.duplicate');
        Route::delete('projects/{project}', 'destroy')->name('projects.destroy');
    });
    Route::post('categories', [CategoryController::class, 'store'])->name('categories.store');

    Route::get('media/list', [MediaController::class, 'list'])->name('media.list');
    Route::resource('media', MediaController::class)->only(['index', 'store', 'update', 'destroy'])->parameters(['media' => 'media']);

    Route::get('site/{page}', [SiteController::class, 'show'])->whereIn('page', SiteController::PAGES)->name('site.show');
    Route::put('site', [SiteController::class, 'update'])->name('site.update');

    Route::get('inbox', [InboxController::class, 'index'])->name('inbox.index');
    Route::get('inbox/export', [InboxController::class, 'export'])->name('inbox.export');
    Route::patch('inbox/{message}/read', [InboxController::class, 'markRead'])->name('inbox.read');
    Route::delete('inbox/{message}', [InboxController::class, 'destroy'])->name('inbox.destroy');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
