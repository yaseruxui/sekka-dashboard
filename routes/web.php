<?php

use App\Http\Controllers\ContentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InboxController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\ProjectController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard')->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::post('projects/reorder', [ProjectController::class, 'reorder'])->name('projects.reorder');
    Route::patch('projects/{project}/publish', [ProjectController::class, 'publish'])->name('projects.publish');
    Route::resource('projects', ProjectController::class)->except('show');

    Route::get('media/list', [MediaController::class, 'list'])->name('media.list');
    Route::resource('media', MediaController::class)->only(['index', 'store', 'update', 'destroy'])->parameters(['media' => 'media']);

    Route::controller(ContentController::class)->prefix('content')->name('content.')->group(function () {
        foreach (['home', 'texts', 'contact', 'policy'] as $section) {
            Route::get($section, $section)->name($section);
            Route::put($section, 'update'.ucfirst($section))->name($section.'.update');
        }
    });

    Route::get('inbox', [InboxController::class, 'index'])->name('inbox.index');
    Route::get('inbox/{message}', [InboxController::class, 'show'])->name('inbox.show');
    Route::patch('inbox/{message}/read', [InboxController::class, 'markRead'])->name('inbox.read');
    Route::delete('inbox/{message}', [InboxController::class, 'destroy'])->name('inbox.destroy');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
