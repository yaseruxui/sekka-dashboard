<?php

use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\PublicContentController;
use Illuminate\Support\Facades\Route;

/*
 * Read by the site (sekka-next) on the server: published projects in
 * dashboard order, and the edited content sections.
 */
Route::get('public/projects', [PublicContentController::class, 'projects']);
Route::get('public/content', [PublicContentController::class, 'content']);

/* The site's contact form: CONTACT_WEBHOOK_URL = {APP_URL}/api/contact?key={CONTACT_WEBHOOK_KEY} */
Route::post('contact', ContactController::class)->middleware('throttle:30,1');
