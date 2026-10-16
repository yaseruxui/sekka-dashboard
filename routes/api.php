<?php

use App\Http\Controllers\Api\PublicContentController;
use Illuminate\Support\Facades\Route;

/*
 * Read by the site (sekka-next) on the server: published projects in
 * dashboard order, and the edited content sections.
 */
Route::get('public/projects', [PublicContentController::class, 'projects']);
Route::get('public/content', [PublicContentController::class, 'content']);
