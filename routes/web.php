<?php

use App\Http\Controllers\DashboardController;
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
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
