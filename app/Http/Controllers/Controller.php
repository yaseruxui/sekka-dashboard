<?php

namespace App\Http\Controllers;

use App\Support\SiteClient;
use Illuminate\Http\RedirectResponse;

abstract class Controller
{
    /**
     * After a change the site shows: asks it to refresh its cache, then goes
     * back with a toast. If the site is set up but did not confirm, says so
     * (the change still shows once the site's 5-minute cache runs out).
     */
    protected function savedAndRevalidated(RedirectResponse $redirect, string $message): RedirectResponse
    {
        if (SiteClient::configured() && ! SiteClient::revalidate()) {
            return $redirect->with('error', $message.' لكن الموقع ما أكّد التحديث، رح يتحدّث خلال 5 دقائق.');
        }

        return $redirect->with('success', $message);
    }
}
